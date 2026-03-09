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
    // Match patterns like "(2,000 to 2,999 SQFT)" or "(Up to 2,999 SQFT)"
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
  // Some order forms encode property size in the service tier name
  for (const item of items) {
    const title = (item.title || '').toLowerCase();
    // Look for patterns like "4/3" or "5 bed 3 bath" in titles
    const slashMatch = title.match(/(\d+)\s*\/\s*(\d+)/);
    if (slashMatch && slashMatch[1] && slashMatch[2]) {
      return { beds: parseInt(slashMatch[1]), baths: parseInt(slashMatch[2]) };
    }
  }
  return { beds: 0, baths: 0 };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const dateStr: string = searchParams.get('date') || new Date().toISOString().split('T')[0]!;

  // If no API key, return mock data for development
  if (!ARYEO_API_KEY) {
    return NextResponse.json({
      appointments: getMockAppointments(dateStr),
    });
  }

  try {
    // Fetch from Aryeo API
    // Valid includes: items, appointments, appointments.users, customer, listing, payments
    // Note: 'address' is NOT a valid include — address data is always on the order object
    const res = await fetch(
      `${ARYEO_BASE_URL}/orders?include=items,appointments,appointments.users,customer,listing,payments&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${ARYEO_API_KEY}`,
          Accept: 'application/json',
        },
        next: { revalidate: 300 }, // 5-minute cache
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

    // Filter and map orders to appointments
    const startOfDay = new Date(`${dateStr}T00:00:00`);
    const endOfDay = new Date(`${dateStr}T23:59:59`);

    const appointments: AryeoAppointment[] = orders
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((order: any): AryeoAppointment | null => {
        // Skip orders with no address
        const orderAddress = order.address;
        if (!orderAddress) return null;

        const address = orderAddress.unparsed_address_part_one || orderAddress.unparsed_address || '';
        const city = orderAddress.city || '';
        const state = orderAddress.state_or_province || 'FL';
        const zip = orderAddress.postal_code || '';

        // Get the first appointment
        const appointment = (order.appointments || [])[0];
        if (!appointment) return null;

        const startAt = appointment.start_at;
        if (!startAt) return null;

        // Filter by date — only show appointments for the requested day
        const aptDate = new Date(startAt);
        if (aptDate < startOfDay || aptDate > endOfDay) return null;

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
        let beds = building.bedrooms || building.bedrooms_number || 0;
        let baths = building.bathrooms || 0;
        let sqft = building.square_feet || 0;

        // Fallback: try custom_fields if building data is empty
        if (order.custom_fields && Array.isArray(order.custom_fields)) {
          for (const field of order.custom_fields) {
            const label = String(field.label || '').toLowerCase();
            const value = String(field.value || '');
            if (beds === 0 && label.includes('bed')) beds = parseInt(value) || 0;
            if (baths === 0 && label.includes('bath')) baths = parseInt(value) || 0;
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
        if (beds === 0 && baths === 0) {
          const inferred = inferBedsFromServiceTitle(items);
          beds = inferred.beds;
          baths = inferred.baths;
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

        // Get ordered services (clean titles)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const services: string[] = items.map((item: any) => {
          const title = item.title || 'Service';
          // Clean up common prefixes
          return title
            .replace(/^Economy\s+/i, '')
            .replace(/\s*\(Standard\)\s*/i, '')
            .replace(/\s*\(Premium\)\s*/i, ' (Premium)')
            .trim();
        });

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
