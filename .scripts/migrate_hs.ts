import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting H&S Data Migration...');
  
  const farm = await prisma.farm.findFirst({ where: { name: 'Wainono' } });
  if (!farm) throw new Error('Farm not found!');

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
          description: `${inc.description || ''} (Reported by: ${inc.reportedBy || 'Unknown'}, Severity: ${inc.severity || 'Minor'}, Action Taken: ${inc.actionTaken || ''})`,
          status: inc.status || 'Open'
        }
      });
    }
    console.log(`Inserted ${hsData.incidents.length} H&S Incidents.`);
  }

  if (hsData.staff) {
    await prisma.hS_Staff.deleteMany({ where: { farmId: farm.id } });
    for (const s of hsData.staff) {
      await prisma.hS_Staff.create({
        data: {
          farmId: farm.id,
          name: s.name || 'Unknown',
          role: `${s.role || 'Staff'} (Email: ${s.email || ''}, Phone: ${s.phone || ''}, Training: ${s.training || ''})`,
          status: s.status || 'ACTIVE'
        }
      });
    }
    console.log(`Inserted ${hsData.staff.length} H&S Staff.`);
  }

  if (hsData.hazards) {
    await prisma.hS_Hazard.deleteMany({ where: { farmId: farm.id } });
    for (const h of hsData.hazards) {
      await prisma.hS_Hazard.create({
        data: {
          farmId: farm.id,
          description: `${h.name || 'Hazard'} - ${h.description || ''} (Severity: ${h.severity || ''}, Type: ${h.type || ''})`,
          status: h.status || 'resolved',
          mitigation: null,
          date: h.reportedAt ? new Date(h.reportedAt) : new Date(),
          reportedBy: h.reportedBy || 'Unknown',
          coordinates: h.coordinates ? JSON.stringify(h.coordinates) : null
        }
      });
    }
    console.log(`Inserted ${hsData.hazards.length} H&S Hazards.`);
  }

  if (hsData.meetings) {
    await prisma.hS_Meeting.deleteMany({ where: { farmId: farm.id } });
    for (const m of hsData.meetings) {
      await prisma.hS_Meeting.create({
        data: {
          farmId: farm.id,
          date: m.date ? new Date(m.date) : new Date(),
          topic: `${m.topic || 'Meeting'} - Notes: ${m.notes || ''}`,
          attendees: Array.isArray(m.attendees) ? m.attendees.join(', ') : (m.attendees || '')
        }
      });
    }
    console.log(`Inserted ${hsData.meetings.length} H&S Meetings.`);
  }

  if (hsData.interactions) {
    await prisma.hS_Observation.deleteMany({ where: { farmId: farm.id } });
    for (const i of hsData.interactions) {
      await prisma.hS_Observation.create({
        data: {
          farmId: farm.id,
          date: i.date ? new Date(i.date) : new Date(),
          observer: i.observerId || 'Unknown',
          description: `Observed: ${i.observedId || 'Unknown'}. Type: ${i.type || ''}. Details: ${i.details || ''}. Action: ${i.actionTaken || ''}`
        }
      });
    }
    console.log(`Inserted ${hsData.interactions.length} H&S Observations.`);
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

  console.log('Migration Complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
