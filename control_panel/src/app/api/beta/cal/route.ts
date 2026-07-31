import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get('farmId') || 'c7972aad-664f-43ad-934d-d88708d3e315';

  const cals = await prisma.calibration.findMany({ where: { farmId } });
  
  // Format as CSV
  const rows = ['paddock_name,measured_cover,date'];
  cals.forEach((c: any) => {
    let dateStr = '';
    if (c.date) {
      dateStr = `${c.date.getUTCDate().toString().padStart(2, '0')}/${(c.date.getUTCMonth()+1).toString().padStart(2, '0')}/${c.date.getUTCFullYear()}`;
    }
    rows.push(`${c.paddockName},${c.measuredCover ?? ''},${dateStr}`);
  });

  // Include #N/A just in case the front end expects it strictly based on the Google Sheet
  rows.push('#N/A,,');

  return new NextResponse(rows.join('\n'), { 
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
    }
  });
}
