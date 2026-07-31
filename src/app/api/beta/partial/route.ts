import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get('farmId') || 'c7972aad-664f-43ad-934d-d88708d3e315';

  const partials = await prisma.paddockPartial.findMany({ where: { farmId } });
  
  // Format as CSV
  const rows = [',']; // Header is empty comma in the google sheet
  partials.forEach(p => rows.push(`${p.paddockName},${p.status}`));

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
