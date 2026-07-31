import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get('farmId') || 'c7972aad-664f-43ad-934d-d88708d3e315'; 

  const settings = await prisma.feedSetting.findMany({ where: { farmId } });
  
  // Format as CSV string
  const csvStr = settings.map((s: any) => `${s.key},${s.value}`).join('\n');

  return new NextResponse(csvStr, { 
    headers: {
      ...getCorsHeaders(),
      'Content-Type': 'text/csv'
    }
  });
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
