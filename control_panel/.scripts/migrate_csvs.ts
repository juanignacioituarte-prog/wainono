import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { config } from 'dotenv';
config();

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const FARM_ID = 'c7972aad-664f-43ad-934d-d88708d3e315';

async function fetchCSV(url: string): Promise<string> {
  const res = await fetch(url);
  return await res.text();
}

async function migrateExclusions() {
  const text = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=653318078&single=true&output=csv');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith(','));
  
  for (const line of lines) {
    if (line === 'paddock,reason') continue; // header fallback
    const [paddockName, reason] = line.split(',');
    if (!paddockName) continue;
    await prisma.paddockExclusion.upsert({
      where: { farmId_paddockName: { farmId: FARM_ID, paddockName } },
      update: { reason },
      create: { farmId: FARM_ID, paddockName, reason }
    });
  }
  console.log(`Migrated ${lines.length} exclusions.`);
}

async function migratePartial() {
  const text = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=369172552&single=true&output=csv');
  const lines = text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith(','));
  
  for (const line of lines) {
    const [paddockName, status] = line.split(',');
    if (!paddockName) continue;
    await prisma.paddockPartial.upsert({
      where: { farmId_paddockName: { farmId: FARM_ID, paddockName } },
      update: { status },
      create: { farmId: FARM_ID, paddockName, status }
    });
  }
  console.log(`Migrated ${lines.length} partial paddocks.`);
}

async function migrateCal() {
  const text = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=2878588&single=true&output=csv');
  const lines = text.split('\n').map(l => l.trim()).slice(1).filter(l => l); // skip header
  
  for (const line of lines) {
    const [paddockName, cover, dateStr] = line.split(',');
    if (!paddockName || paddockName === '#N/A') continue;
    
    let date = null;
    if (dateStr) {
      const parts = dateStr.split('/');
      if (parts.length === 3) date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }

    await prisma.calibration.upsert({
      where: { farmId_paddockName: { farmId: FARM_ID, paddockName } },
      update: { measuredCover: cover ? parseFloat(cover) : null, date },
      create: { farmId: FARM_ID, paddockName, measuredCover: cover ? parseFloat(cover) : null, date }
    });
  }
  console.log(`Migrated ${lines.length} calibration records.`);
}

async function migrateManualMode() {
  const text = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=1312869086&single=true&output=csv');
  
  await prisma.manualMode.upsert({
    where: { farmId: FARM_ID },
    update: { data: text },
    create: { farmId: FARM_ID, paddockName: 'all', data: text }
  });
  console.log(`Migrated manual mode CSV to JSON field.`);
}

async function main() {
  try {
    await migrateExclusions();
    await migratePartial();
    await migrateCal();
    await migrateManualMode();
    console.log('Migration complete.');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
