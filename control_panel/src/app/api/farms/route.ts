import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all farms
export async function GET() {
  try {
    const farms = await prisma.farm.findMany();
    return NextResponse.json(farms);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch farms' }, { status: 500 });
  }
}

// POST create a new farm
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const farm = await prisma.farm.create({
      data: {
        name
      }
    });

    return NextResponse.json(farm, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create farm' }, { status: 500 });
  }
}
