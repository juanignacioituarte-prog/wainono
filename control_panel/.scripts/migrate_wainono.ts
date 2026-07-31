import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config(); // Fallback to .env

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting Wainono Data Migration...');
  
  // 1. Create or Find Wainono Farm
  let farm = await prisma.farm.findFirst({ where: { name: 'Wainono' } });
  if (!farm) {
    farm = await prisma.farm.create({ data: { name: 'Wainono' } });
    console.log('Created Farm: Wainono (' + farm.id + ')');
  } else {
    console.log('Found existing Farm: Wainono (' + farm.id + ')');
  }

  // 2. Fetch GeoJSON Paddocks
  console.log('Fetching Wainono GeoJSON...');
  const geojsonRes = await fetch('https://storage.googleapis.com/ndvi-exports/wainono.geojson');
  const geojson = await geojsonRes.json();
  
  // Delete existing paddocks for this farm to avoid duplicates
  await prisma.paddock.deleteMany({ where: { farmId: farm.id } });
  
  const paddockMap = new Map(); // Keep track of name -> id mapping for later

  console.log('Inserting Paddocks...');
  for (const feature of geojson.features) {
    const name = feature.properties?.name || feature.properties?.Name || feature.properties?.paddock_name || 'Unknown';
    
    const paddock = await prisma.paddock.create({
      data: {
        farmId: farm.id,
        name: name.toString(),
        boundary: JSON.stringify(feature.geometry)
      }
    });
    paddockMap.set(paddock.name.toLowerCase(), paddock.id);
  }
  console.log(`Inserted ${geojson.features.length} paddocks.`);

  // 3. Fetch Health & Safety Data
  console.log('Fetching H&S Data...');
  const hsRes = await fetch('https://script.google.com/macros/s/AKfycbxMYjvvuAoNrqzQSECZ_Jit2hN7L1uRyAQCmg1qzusXeRmZiZ4DLoOCxJCsorPBNcRu/exec?type=hs_get_all');
  const hsData = await hsRes.json();
  
  if (hsData.incidents) {
    await prisma.hS_Incident.deleteMany({ where: { farmId: farm.id } });
    for (const inc of hsData.incidents) {
      if (!inc.date) continue;
      await prisma.hS_Incident.create({
        data: {
          farmId: farm.id,
          date: new Date(inc.date),
          reportedBy: inc.reportedBy || 'Unknown',
          description: inc.description || '',
          severity: inc.severity || 'Minor',
          actionTaken: inc.actionTaken || '', status: inc.status || 'Open'
        }
      });
    }
    console.log(`Inserted ${hsData.incidents.length} H&S Incidents.`);
  }

  // 4. Fetch Vehicle Maintenance Data
  console.log('Fetching Vehicle Data...');
  const vmRes = await fetch('https://script.google.com/macros/s/AKfycbwLagHHxQCqTaKWmW9XaopIPBwWAVmL9Z_bk0v22eFEvIuz7ucY9oHNOEdVdDpaRkZ_cA/exec?type=vm_get_all');
  const vmData = await vmRes.json();
  
  if (vmData.vehicles) {
    await prisma.vehicle.deleteMany({ where: { farmId: farm.id } });
    const vehicleIdMap = new Map();
    for (const v of vmData.vehicles) {
      if (!v.name) continue;
      const vehicle = await prisma.vehicle.create({
        data: {
          farmId: farm.id,
          name: v.name,
          type: v.type || 'Unknown',
          status: v.status || 'in_service'
        }
      });
      vehicleIdMap.set(v.id, vehicle.id);
    }
    console.log(`Inserted ${vmData.vehicles.length} Vehicles.`);
    
    if (vmData.logs) {
      await prisma.maintenanceLog.deleteMany({ where: { vehicle: { farmId: farm.id } } });
      for (const log of vmData.logs) {
        if (!log.date || !vehicleIdMap.has(log.vehicleId)) continue;
        await prisma.maintenanceLog.create({
          data: {
            vehicleId: vehicleIdMap.get(log.vehicleId),
            date: new Date(log.date),
            performedBy: log.performedBy || 'Unknown',
            notes: log.notes || '',
            checkedPoints: typeof log.checkedPoints === 'string' ? log.checkedPoints : JSON.stringify(log.checkedPoints)
          }
        });
      }
      console.log(`Inserted ${vmData.logs.length} Maintenance Logs.`);
    }
  }

  console.log('Migration Complete!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
