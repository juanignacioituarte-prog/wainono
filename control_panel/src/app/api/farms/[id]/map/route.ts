import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // Fetch paddocks
    const paddocks = await prisma.paddock.findMany({
      where: { farmId: id },
      select: {
        id: true,
        name: true,
        boundary: true
      }
    });

    // Fetch breaks
    const breaks = await prisma.break.findMany({
      where: { farmId: id },
      select: {
        id: true,
        name: true,
        paddockId: true,
        vertices: true,
        cropMode: true
      }
    });

    // Fetch hazards
    const hazards = await prisma.hS_Hazard.findMany({
      where: { farmId: id },
      select: {
        id: true,
        description: true,
        status: true,
        coordinates: true,
        mitigation: true
      }
    });

    return NextResponse.json({
      paddocks: paddocks.map(p => ({
        ...p,
        boundary: p.boundary ? JSON.parse(p.boundary) : null
      })),
      breaks: breaks.map(b => ({
        ...b,
        vertices: b.vertices ? JSON.parse(b.vertices) : null
      })),
      hazards: hazards.map(h => ({
        ...h,
        coordinates: h.coordinates ? JSON.parse(h.coordinates) : null
      }))
    });
  } catch (error) {
    console.error('Error fetching map data:', error);
    return NextResponse.json({ error: 'Failed to fetch map data' }, { status: 500 });
  }
}
