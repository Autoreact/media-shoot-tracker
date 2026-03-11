import { NextRequest, NextResponse } from 'next/server';
import { AryeoAppointment, PhotographerId } from '@/types';

const ARYEO_API_KEY = process.env.ARYEO_API_KEY;
const ARYEO_BASE_URL = 'https://api.aryeo.com/v1';

/** Map Aryeo user name to our photographer IDs */
function mapPhotographer(firstName?: string): PhotographerId | null {
  if (!firstName) return null;
  const lower = firstName.toLowerCase();
  if (lower.includes('nick')) return 'nick';
  if (lower.includes('jared')) return 'jared';
  if (lower.includes('ben')) return 'ben';
  return null;
}

/** Try to extract sqft range from item subtitles (e.g. "Economy Photos+ Standard (2,000 to 2,999 SQFT)") */
function parseSqftFromItems(items: { subtitle?: string; sub_title?: string }[]): number {
  for (const item of items) {
    const text = item.subtitle || item.sub_title || '';
    const rangeMatch = text.match(/(\d[\d,]*)\s*to\s*(\d[\d,]*)\s*SQFT/i);
    if (rangeMatch && rangeMatch[1] && rangeMatch[2]) {
      const low = parseInt(rangeMatch[1].replace(/,/g, ''));
      const high = parseInt(rangeMatch[2].replace(/,/g, ''));
      return Math.round((low + high) / 2);
    }
    const upToMatch = text.match(/Up to\s*(\d[\d,]*)\s*SQFT/i);
    if (upToMatch && upToMatch[1]) {
      return parseInt(upToMatch[1].replace(/,/g, ''));
    }
    const singleMatch = text.match(/(\d[\d,]*)\s*SQFT/i);
    if (singleMatch && singleMatch[1]) {
      return parseInt(singleMatch[1].replace(/,/g, ''));
    }
  }
  return 0;
}

/** Infer bed/bath count from item titles when listing.building has no data */
function inferBedsFromServiceTitle(items: { title?: string; subtitle?: string; sub_title?: string }[]): { beds: number; baths: number } {
  for (const item of items) {
    const title = (item.title || '').toLowerCase();
    const slashMatch = title.match(/(\d+)\s*\/\s*(\d+)/);
    if (slashMatch && slashMatch[1] && slashMatch[2]) {
      return { beds: parseInt(slashMatch[1]), baths: parseInt(slashMatch[2]) };
    }
  }
  return { beds: 0, baths: 0 };
}

/**
 * Parse service names from Aryeo items into clean display names.
 * Examples:
 *   "Economy Photos+ Standard" → "Economy Standard Photos"
 *   "Economy Photos+ Express" → "Economy Express Photos"
 *   "Ultra High Def Photos+ Standard" → "Ultra HD Standard Photos"
 *   "Drone Photos" → "Drone"
 *   "3D Tour" → "3D Tour"
 */
function parseServiceName(title: string): string {
  const t = title.trim();

  // Detect photo quality tier
  const isUltraHD = /ultra\s*(high\s*def|hd)/i.test(t);
  const isEconomy = /economy/i.test(t);

  // Detect delivery speed
  const isExpress = /express/i.test(t);
  const isStandard = /standard/i.test(t);

  // If it's a Photos+ item, build a descriptive name
  if (/photos?\+?/i.test(t) && (isUltraHD || isEconomy)) {
    const tier = isUltraHD ? 'Ultra HD' : 'Economy';
    const speed = isExpress ? 'Express' : isStandard ? 'Standard' : '';
    return `${tier} ${speed} Photos`.replace(/\s+/g, ' ').trim();
  }

  // Non-photo services — clean up common suffixes
  return t
    .replace(/\s*photos?\+?\s*/i, ' Photos ')
    .replace(/\s*\(Standard\)/i, '')
    .replace(/\s*\(Express\)/i, ' Express')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  // Default to today in Eastern timezone (not UTC) to match client behavior
  const now = new Date();
  const defaultDate = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  const dateStr: string = searchParams.get('date') || defaultDate;

  // If no API key, return mock data for development
  if (!ARYEO_API_KEY) {
    return NextResponse.json({
      appointments: getMockAppointments(dateStr),
    });
  }

  try {
    // Fetch from Aryeo API — only what we need, 25 most recent orders
    // Valid includes: items, appointments, appointments.users, customer, listing, payments
    // Note: 'address' is NOT a valid include — address data is always on the order object
    const res = await fetch(
      `${ARYEO_BASE_URL}/orders?include=items,appointments,appointments.users,customer,listing&per_page=25`,
      {
        headers: {
          Authorization: `Bearer ${ARYEO_API_KEY}`,
          Accept: 'application/json',
        },
        next: { revalidate: 120 }, // 2-minute cache
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Aryeo API error:', res.status, errText);
      return NextResponse.json({
        appointments: getMockAppointments(dateStr),
      });
    }

    const data = await res.json();
    const orders = data.data || [];

    // We compare dates using Eastern timezone strings to avoid DST/UTC mismatches
    // This ensures a 1:30 PM EDT appointment always appears on the correct local date

    const appointments: AryeoAppointment[] = orders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((order: any): AryeoAppointment | null => {
        // Skip orders with no address
        const orderAddress = order.address;
        if (!orderAddress) return null;

        const address = orderAddress.unparsed_address_part_one || orderAddress.unparsed_address || '';
        const fullAddress = orderAddress.unparsed_address || address;
        const city = orderAddress.city || '';
        const state = orderAddress.state_or_province || 'FL';
        const zip = orderAddress.postal_code || '';

        // Get the first appointment
        const appointment = (order.appointments || [])[0];
        if (!appointment) return null;

        const startAt = appointment.start_at;
        if (!startAt) return null;

        // Filter by date — compare in Eastern timezone to avoid DST/UTC mismatches
        // en-CA locale gives YYYY-MM-DD format which matches our dateStr
        const aptDateEastern = new Date(startAt).toLocaleDateString('en-CA', {
          timeZone: 'America/New_York',
        });
        if (aptDateEastern !== dateStr) return null;

        // Get photographers from appointment users
        const shooterIds: PhotographerId[] = (appointment.users || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((u: any) => mapPhotographer(u.first_name))
          .filter(Boolean) as PhotographerId[];

        // Customer (agent) info
        const customer = order.customer || {};
        const customerOwner = customer.owner || customer;
        const agentName = customerOwner.full_name || customer.name || '';
        const agentPhone = customerOwner.phone || customer.phone || '';
        const agentEmail = customerOwner.email || customer.email || '';

        // Brokerage from customer_team_membership
        const brokerage =
          order.customer_team_membership?.customer_team?.name || '';

        // Property data from listing.building
        const building = order.listing?.building || {};
        let beds: number | null = building.bedrooms || building.bedrooms_number || null;
        let baths: number | null = building.bathrooms || null;
        let sqft = building.square_feet || 0;

        // Fallback: try custom_fields if building data is empty
        if (order.custom_fields && Array.isArray(order.custom_fields)) {
          for (const field of order.custom_fields) {
            const label = String(field.label || '').toLowerCase();
            const value = String(field.value || '');
            if (!beds && label.includes('bed')) beds = parseInt(value) || null;
            if (!baths && label.includes('bath')) baths = parseInt(value) || null;
            if (sqft === 0 && (label.includes('sqft') || label.includes('sq ft') || label.includes('square')))
              sqft = parseInt(value.replace(/,/g, '')) || 0;
          }
        }

        // Fallback: infer sqft from item subtitles
        const items = order.items || [];
        if (sqft === 0) {
          sqft = parseSqftFromItems(items);
        }

        // Fallback: infer beds/baths from item titles
        if (!beds && !baths) {
          const inferred = inferBedsFromServiceTitle(items);
          beds = inferred.beds || null;
          baths = inferred.baths || null;
        }

        // Furnished detection from custom_fields
        let furnished = true; // Default to furnished
        let notes = '';
        if (order.custom_fields && Array.isArray(order.custom_fields)) {
          for (const field of order.custom_fields) {
            const label = String(field.label || '').toLowerCase();
            const value = String(field.value || '');
            if (label.includes('furnish')) furnished = value.toLowerCase() !== 'vacant';
            if (label.includes('note')) notes = value;
          }
        }

        // Get ordered services — parse into clean display names
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const services: string[] = items.map((item: any) =>
          parseServiceName(item.title || 'Service')
        );

        // Map order status to our status type
        let status: 'CONFIRMED' | 'CANCELLED' | 'RESCHEDULED' = 'CONFIRMED';
        if (order.status === 'CANCELLED' || order.status === 'CANCELED') {
          status = 'CANCELLED';
        } else if (appointment.status === 'RESCHEDULED') {
          status = 'RESCHEDULED';
        }

        return {
          id: order.id || String(order.number),
          orderNumber: String(order.number),
          status,
          address,
          fullAddress,
          city,
          state,
          zip,
          startAt,
          endAt: appointment.end_at || undefined,
          agentName,
          agentPhone,
          agentEmail,
          brokerage,
          services,
          beds,
          baths,
          sqft,
          furnished,
          shooterIds: shooterIds.length > 0 ? shooterIds : ['nick'],
          shooterName: (appointment.users || [])[0]?.first_name,
          notes: notes || undefined,
        };
      })
      .filter(Boolean) as AryeoAppointment[];

    // Sort by appointment time
    appointments.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Aryeo fetch error:', error);
    return NextResponse.json({
      appointments: getMockAppointments(dateStr),
    });
  }
}

/** Mock appointments for development without Aryeo key */
function getMockAppointments(dateStr: string): AryeoAppointment[] {
  return [
    {
      id: 'mock-1',
      orderNumber: '2178',
      status: 'CONFIRMED',
      address: '2848 Lanier Rd',
      fullAddress: '2848 Lanier Rd, Tallahassee, FL 32312',
      city: 'Tallahassee',
      state: 'FL',
      zip: '32312',
      startAt: `${dateStr}T14:00:00Z`,
      agentName: 'Sarah Mitchell',
      agentPhone: '(850) 555-1234',
      agentEmail: 'sarah@realestate.com',
      brokerage: 'Keller Williams',
      services: ['Photos', 'Drone', '3D Tour'],
      beds: 4,
      baths: 3,
      sqft: 2400,
      furnished: true,
      shooterIds: ['nick'],
    },
    {
      id: 'mock-2',
      orderNumber: '2179',
      status: 'CONFIRMED',
      address: '1520 Hermitage Blvd',
      fullAddress: '1520 Hermitage Blvd, Tallahassee, FL 32308',
      city: 'Tallahassee',
      state: 'FL',
      zip: '32308',
      startAt: `${dateStr}T16:00:00Z`,
      agentName: 'David Chen',
      agentPhone: '(850) 555-5678',
      agentEmail: 'david@properties.com',
      brokerage: 'Coldwell Banker',
      services: ['Photos'],
      beds: 3,
      baths: 2,
      sqft: 1800,
      furnished: false,
      shooterIds: ['jared'],
    },
    {
      id: 'mock-3',
      orderNumber: '2180',
      status: 'CANCELLED',
      address: '456 Park Ave',
      fullAddress: '456 Park Ave, Tallahassee, FL 32301',
      city: 'Tallahassee',
      state: 'FL',
      zip: '32301',
      startAt: `${dateStr}T18:00:00Z`,
      agentName: 'Lisa Park',
      agentPhone: '(850) 555-9012',
      agentEmail: 'lisa@homes.com',
      brokerage: 'Century 21',
      services: ['Photos', 'Drone'],
      beds: 5,
      baths: 4,
      sqft: 3200,
      furnished: true,
      shooterIds: ['nick', 'ben'],
    },
    {
      id: 'mock-4',
      orderNumber: '2181',
      status: 'CONFIRMED',
      address: '7890 Thomasville Rd',
      fullAddress: '7890 Thomasville Rd, Tallahassee, FL 32309',
      city: 'Tallahassee',
      state: 'FL',
      zip: '32309',
      startAt: `${dateStr}T19:30:00Z`,
      agentName: 'Marcus Johnson',
      agentPhone: '(850) 555-3456',
      agentEmail: 'marcus@realty.com',
      brokerage: 'EXP Realty',
      services: ['Photos', '3D Tour', 'Floor Plans'],
      beds: 6,
      baths: 5,
      sqft: 4100,
      furnished: true,
      shooterIds: ['ben'],
    },
  ];
}
