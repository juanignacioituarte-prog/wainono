import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import Papa from 'papaparse';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting Wainono Rest Data Migration...');
  
  const farm = await prisma.farm.findFirst({ where: { name: 'Wainono' } });
  if (!farm) {
    console.error('Wainono farm not found!');
    return;
  }

  // 1. Fetch Health & Safety Data
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
          description: inc.description || '',
          status: inc.status || 'Open'
        }
      });
    }
    console.log(`Inserted ${hsData.incidents.length} H&S Incidents.`);
  }

  if (hsData.observations) {
    await prisma.hS_Observation.deleteMany({ where: { farmId: farm.id } });
    for (const obs of hsData.observations) {
      if (!obs.date) continue;
      await prisma.hS_Observation.create({
        data: {
          farmId: farm.id,
          date: new Date(obs.date),
          observer: obs.observer || 'Unknown',
          description: obs.description || ''
        }
      });
    }
  }

  // 2. Fetch Vehicle Maintenance Data
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

  // 3. Fetch Breaks
  console.log('Fetching Breaks...');
  const breaksRes = await fetch('https://script.google.com/macros/s/AKfycbzRkkZ9pxJnFYiBpbLdgy_WXoG_itdfnjL199NvOLLxCGrPfh2drA1lcCVditsKxbe2/exec?type=breaks');
  const breaksData = await breaksRes.json();
  
  if (breaksData.breaks) {
    await prisma.break.deleteMany({ where: { farmId: farm.id } });
    const paddocks = await prisma.paddock.findMany({ where: { farmId: farm.id } });
    const paddockMap = new Map();
    paddocks.forEach(p => paddockMap.set(p.name.toLowerCase().trim(), p.id));

    let count = 0;
    for (const b of breaksData.breaks) {
      if (!b.paddockId && !b.paddockName) continue;
      
      const paddockName = (b.paddockName || b.paddockId || '').toLowerCase().trim();
      const pid = paddockMap.get(paddockName);
      if (!pid) continue;

      await prisma.break.create({
        data: {
          farmId: farm.id,
          paddockId: pid,
          name: b.name || b.id || 'Unnamed',
          vertices: typeof b.vertices === 'string' ? b.vertices : JSON.stringify(b.vertices || []),
          areaHa: parseFloat(b.areaHa) || 0,
          distanceMeters: parseFloat(b.distanceMeters) || 0,
          cropMode: b.cropMode || 'polygon',
          isCropBreak: Boolean(b.isCropBreak),
          status: b.status || 'marked',
          createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
          createdBy: b.createdBy || null
        }
      });
      count++;
    }
    console.log(`Inserted ${count} Breaks.`);
  }

  // 4. Fetch Feed Settings
  console.log('Fetching Feed Settings...');
  const feedCsvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=1218249029&single=true&output=csv";
  const feedRes = await fetch(feedCsvUrl);
  const feedCsv = await feedRes.text();
  const { data: feedData } = Papa.parse(feedCsv, { skipEmptyLines: true });
  
  await prisma.feedSetting.deleteMany({ where: { farmId: farm.id } });
  let fCount = 0;
  for (const row of feedData) {
    if (row.length < 2) continue;
    const key = (row[0] || '').toString().trim();
    const value = (row[1] || '').toString().trim();
    if (!key) continue;
    await prisma.feedSetting.create({
      data: {
        farmId: farm.id,
        key: key,
        value: value
      }
    });
    fCount++;
  }
  console.log(`Inserted ${fCount} Feed Settings.`);

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
