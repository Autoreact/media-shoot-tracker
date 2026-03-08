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

/** Parse Aryeo custom_fields for beds/baths/sqft */
function parseCustomFields(customFields: Record<string, unknown>[] | undefined): {
  beds: number;
  baths: number;
  sqft: number;
  furnished: boolean;
  notes: string;
} {
  const result = { beds: 0, baths: 0, sqft: 0, furnished: false, notes: '' };

  if (!customFields || !Array.isArray(customFields)) return result;

  // Look for step-3 data (property details)
  for (const field of customFields) {
    const label = String(field.label || '').toLowerCase();
    const value = String(field.value || '');

    if (label.includes('bed')) result.beds = parseInt(value) || 0;
    if (label.includes('bath')) result.baths = parseInt(value) || 0;
    if (label.includes('sqft') || label.includes('sq ft') || label.includes('square'))
      result.sqft = parseInt(value.replace(/,/g, '')) || 0;
    if (label.includes('furnish')) result.furnished = value.toLowerCase() !== 'vacant';
    if (label.includes('note')) result.notes = value;
  }

  return result;
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
    const startOfDay = `${dateStr}T00:00:00Z`;
    const endOfDay = `${dateStr}T23:59:59Z`;

    const res = await fetch(
      `${ARYEO_BASE_URL}/orders?include=items,appointments,customer,address,payments&filter[appointment_start_gte]=${startOfDay}&filter[appointment_start_lte]=${endOfDay}`,
      {
        headers: {
          Authorization: `Bearer ${ARYEO_API_KEY}`,
          Accept: 'application/json',
        },
        next: { revalidate: 300 }, // 5-minute cache
      }
    );

    if (!res.ok) {
      console.error('Aryeo API error:', res.status);
      return NextResponse.json({
        appointments: getMockAppointments(dateStr),
      });
    }

    const data = await res.json();
    const orders = data.data || [];

    const appointments: AryeoAppointment[] = orders.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (order: any): AryeoAppointment => {
        const address = order.address?.unparsed_address || '';
        const city = order.address?.city || '';
        const state = order.address?.state || 'FL';
        const zip = order.address?.postal_code || '';

        const appointment = order.appointments?.[0] || {};
        const startAt = appointment.start_at || order.created_at;

        // Get photographers from appointment users
        const shooterIds: PhotographerId[] = (appointment.users || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((u: any) => mapPhotographer(u.first_name))
          .filter(Boolean) as PhotographerId[];

        const customer = order.customer || {};
        const brokerage =
          order.customer_team_membership?.customer_team?.name || '';

        // Parse custom fields for property details
        const customData = parseCustomFields(order.custom_fields);

        // Get ordered services
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const services = (order.items || []).map((item: any) => item.title || 'Service');

        return {
          id: order.id || String(order.number),
          orderNumber: String(order.number),
          status: order.status?.toUpperCase() || 'CONFIRMED',
          address,
          city,
          state,
          zip,
          startAt,
          agentName: customer.name || '',
          agentPhone: customer.phone || '',
          agentEmail: customer.email || '',
          brokerage,
          services,
          beds: customData.beds,
          baths: customData.baths,
          sqft: customData.sqft,
          furnished: customData.furnished,
          shooterIds: shooterIds.length > 0 ? shooterIds : ['nick'],
          notes: customData.notes,
        };
      }
    );

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
