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
  console.log('Starting NDVI Data Migration...');
  
  const farm = await prisma.farm.findFirst({ where: { name: 'Wainono' } });
  if (!farm) {
    console.error('Wainono farm not found!');
    return;
  }

  // Build paddock name to ID map
  const paddocks = await prisma.paddock.findMany({ where: { farmId: farm.id } });
  const paddockMap = new Map();
  paddocks.forEach(p => paddockMap.set(p.name.toLowerCase().trim(), p.id));

  // CSV URL from index.html
  const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=1426555702&single=true&output=csv";
  
  console.log('Fetching NDVI CSV...');
  const res = await fetch(csvUrl);
  const csvText = await res.text();
  
  console.log('Parsing CSV...');
  const { data } = Papa.parse(csvText, { skipEmptyLines: true });
  
  // Clear old NDVI records for Wainono
  await prisma.pastureRecord.deleteMany({
    where: {
      paddock: { farmId: farm.id },
      type: 'SATELLITE'
    }
  });

  let count = 0;
  for (const row of data) {
    // Format: Paddock Name, Date, NDVI, Cloud%, TileURL
    if (row.length < 3) continue;
    
    const paddockName = (row[0] || '').toLowerCase().trim();
    const dateStr = row[1]; // dd/MM/yyyy
    const ndviStr = row[2];
    
    if (!paddockMap.has(paddockName) || !ndviStr) continue;
    
    const paddockId = paddockMap.get(paddockName);
    const ndvi = parseFloat(ndviStr);
    
    if (isNaN(ndvi)) continue;
    
    // Parse date dd/MM/yyyy
    const parts = dateStr.split('/');
    if (parts.length !== 3) continue;
    const date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
    
    await prisma.pastureRecord.create({
      data: {
        paddockId,
        date,
        ndvi,
        type: 'SATELLITE'
      }
    });
    count++;
  }
  
  console.log(`Inserted ${count} Pasture Records for Wainono.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
