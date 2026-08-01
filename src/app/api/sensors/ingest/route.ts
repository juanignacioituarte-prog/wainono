import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST endpoint for ESP32 devices to push data
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // The ESP32 needs to send its MAC address or a unique token, plus the payload
    const { macAddress, payload } = data;

    if (!macAddress || !payload) {
      return NextResponse.json({ error: 'Missing macAddress or payload' }, { status: 400 });
    }

    // Find the sensor in the database to link the reading to the correct farm
    const sensor = await prisma.sensor.findUnique({
      where: { macAddress }
    });

    if (!sensor) {
      return NextResponse.json({ error: 'Unregistered sensor' }, { status: 404 });
    }

    // Save the reading
    await prisma.sensorReading.create({
      data: {
        sensorId: sensor.id,
        payload: typeof payload === 'string' ? payload : JSON.stringify(payload)
      }
    });
    
    // Update the sensor's lastActive timestamp
    await prisma.sensor.update({
      where: { id: sensor.id },
      data: { lastActive: new Date() }
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error ingesting sensor data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
