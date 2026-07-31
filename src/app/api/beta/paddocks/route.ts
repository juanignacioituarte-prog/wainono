import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const farmId = searchParams.get('farmId');
  
  if (!farmId) {
    return NextResponse.json({ error: 'farmId is required' }, { status: 400 });
  }

  const paddocks = await prisma.paddock.findMany({ where: { farmId } });
  
  // Format as GeoJSON FeatureCollection
  const featureCollection = {
    type: "FeatureCollection",
    name: "Paddocks",
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    features: paddocks.map(p => ({
      type: "Feature",
      properties: {
        id: p.id,
        name: p.name,
      },
      geometry: JSON.parse(p.boundary)
    }))
  };

  return NextResponse.json(featureCollection, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
