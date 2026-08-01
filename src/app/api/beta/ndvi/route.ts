import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get('farmId') || 'c7972aad-664f-43ad-934d-d88708d3e315'; // Default to Wainono
  
  if (!farmId) {
    return NextResponse.json({ error: 'farmId is required' }, { status: 400 });
  }

  const records = await prisma.pastureRecord.findMany({
    where: { paddock: { farmId }, type: 'SATELLITE' },
    include: { paddock: true }
  });
  
  // Format as array of arrays: [Paddock Name, Date (dd/MM/yyyy), NDVI, Cloud%, TileURL]
  const rows = records.map((r: any) => {
    const d = r.date;
    const dateStr = `${d.getUTCDate().toString().padStart(2, '0')}/${(d.getUTCMonth()+1).toString().padStart(2, '0')}/${d.getUTCFullYear()}`;
    return `${r.paddock.name},${dateStr},${r.ndvi || ""},0,`;
  });

  rows.unshift('paddock_name,date,ndvi_mean,cloud_pc,map_id');
  const csvStr = rows.join('\n');

  return new NextResponse(csvStr, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Content-Type': 'text/csv'
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  });
}
