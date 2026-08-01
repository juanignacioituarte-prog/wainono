import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const farmId = searchParams.get('farmId') || 'c7972aad-664f-43ad-934d-d88708d3e315'; 

  if (type === 'vm_get_all') {
    const vehicles = await prisma.vehicle.findMany({ where: { farmId } });
    const logs = await prisma.maintenanceLog.findMany({ where: { vehicle: { farmId } } });
    
    return NextResponse.json({
      vehicles,
      logs: logs.map((l: any) => ({
        ...l,
        date: l.date.toISOString(),
        checkedPoints: typeof l.checkedPoints === 'string' ? JSON.parse(l.checkedPoints) : l.checkedPoints
      }))
    }, { headers: getCorsHeaders() });
  }

  return NextResponse.json({ error: 'invalid type' }, { status: 400, headers: getCorsHeaders() });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get('farmId') || 'c7972aad-664f-43ad-934d-d88708d3e315';
  
  try {
    const body = await request.json();
    const type = body.type;

    if (type === 'vm_sync_all') {
      // Mock successful sync for now, data persists in localStorage.
      return NextResponse.json({ success: true, status: 'success' }, { headers: getCorsHeaders() });
    }

    return NextResponse.json({ success: false, error: 'Unknown type' }, { headers: getCorsHeaders() });
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500, headers: getCorsHeaders() });
  }
}

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders() });
}
