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

function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: getCorsHeaders() });
}
