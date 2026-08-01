import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmId } = await context.params;
    const body = await request.json(); // Assuming GeoJSON is sent as JSON body
    
    if (!body || body.type !== 'FeatureCollection') {
      return NextResponse.json({ error: 'Invalid GeoJSON format' }, { status: 400 });
    }

    const features = body.features || [];
    let paddocksCreated = 0;

    // Delete existing paddocks for this farm to replace them
    await prisma.paddock.deleteMany({
      where: { farmId }
    });

    for (const feature of features) {
      // Common properties for paddock names in GeoJSON: Name, name, Paddock, id
      const name = feature.properties?.Name || feature.properties?.name || feature.properties?.Paddock || 'Unnamed Paddock';
      
      await prisma.paddock.create({
        data: {
          farmId,
          name,
          boundary: JSON.stringify(feature)
        }
      });
      paddocksCreated++;
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully imported ${paddocksCreated} paddocks.`,
      paddocksCreated
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error importing GIS:', error);
    return NextResponse.json({ error: 'Failed to process GIS file' }, { status: 500 });
  }
}

// GET all paddocks for a farm
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: farmId } = await context.params;
    const paddocks = await prisma.paddock.findMany({
      where: { farmId }
    });
    return NextResponse.json(paddocks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch paddocks' }, { status: 500 });
  }
}
