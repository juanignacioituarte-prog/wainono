import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const farmId = searchParams.get('farmId') || 'c7972aad-664f-43ad-934d-d88708d3e315'; // Default to Wainono for beta

  if (type === 'get_auth') {
    const users = await prisma.user.findMany({ select: { email: true } });
    return NextResponse.json({ emails: users.map((u: any) => u.email) }, { headers: getCorsHeaders() });
  }

  if (type === 'hs_get_all') {
    const incidents = await prisma.hS_Incident.findMany({ where: { farmId } });
    const observations = await prisma.hS_Observation.findMany({ where: { farmId } });
    const staff = await prisma.hS_Staff.findMany({ where: { farmId } });
    
    return NextResponse.json({
      incidents: incidents.map((i: any) => ({ ...i, date: i.date.toISOString() })),
      observations: observations.map((o: any) => ({ ...o, date: o.date.toISOString() })),
      staff: staff
    }, { headers: getCorsHeaders() });
  }

  if (type === 'breaks') {
    const breaks = await prisma.break.findMany({ where: { farmId } });
    const formattedBreaks = breaks.map((b: any) => ({
      ...b,
      vertices: b.vertices ? JSON.parse(b.vertices) : [],
      createdAt: b.createdAt ? b.createdAt.toISOString() : null,
      deletedAt: b.deletedAt ? b.deletedAt.toISOString() : null
    }));
    return NextResponse.json({ breaks: formattedBreaks }, { headers: getCorsHeaders() });
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
