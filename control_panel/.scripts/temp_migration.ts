import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DIRECT_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function parseCSV(text: string) {
  const lines = text.split('\n');
  return lines.map(line => {
    const values = [];
    let curVal = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        inQuotes = !inQuotes;
      } else if (line[i] === ',' && !inQuotes) {
        values.push(curVal.trim());
        curVal = '';
      } else {
        curVal += line[i];
      }
    }
    values.push(curVal.trim());
    return values;
  });
}

async function fetchCSV(url: string) {
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  return parseCSV(text);
}

async function main() {
  console.log('Starting Migration Extensions...');
  const farm = await prisma.farm.findFirst({ where: { name: 'Wainono' } });
  if (!farm) throw new Error('Farm not found!');

  const paddocks = await prisma.paddock.findMany({ where: { farmId: farm.id } });
  const paddockMap = new Map();
  paddocks.forEach(p => paddockMap.set(p.name.toLowerCase().trim(), p.id));

  // 1. NDVI (PastureRecord)
  console.log('Fetching NDVI...');
  const ndviRows = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=1426555702&single=true&output=csv');
  await prisma.pastureRecord.deleteMany({ where: { paddock: { farmId: farm.id }, type: 'SATELLITE' } });
  const ndviData = [];
  for (const row of ndviRows) {
    if (row.length < 5 || row[0].includes('Date') || row[0] === 'Paddock') continue;
    const [pName, dateStr, ndvi, cloud, tileUrl] = row;
    const pId = paddockMap.get(pName.toLowerCase().trim());
    if (pId && dateStr) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        ndviData.push({ paddockId: pId, date, ndvi: parseFloat(ndvi), cloudCover: parseFloat(cloud), tileUrl, type: 'SATELLITE' });
      }
    }
  }
  
  if (ndviData.length > 0) {
     await prisma.pastureRecord.createMany({ data: ndviData });
  }
  console.log(`Inserted ${ndviData.length} NDVI records.`);

  // 2. Exclusions
  console.log('Fetching Exclusions...');
  const excRows = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=653318078&single=true&output=csv');
  await prisma.paddockExclusion.deleteMany({ where: { farmId: farm.id } });
  for (const row of excRows) {
    if (row.length < 2) continue;
    const pId = paddockMap.get(row[0].toLowerCase().trim());
    if (pId) await prisma.paddockExclusion.create({ data: { farmId: farm.id, paddockName: row[0], reason: row[1] || '' } });
  }

  // 3. Partials
  console.log('Fetching Partials...');
  const partialRows = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=369172552&single=true&output=csv');
  await prisma.paddockPartial.deleteMany({ where: { farmId: farm.id } });
  for (const row of partialRows) {
    if (row.length < 2) continue;
    const pId = paddockMap.get(row[0].toLowerCase().trim());
    if (pId) await prisma.paddockPartial.create({ data: { farmId: farm.id, paddockName: row[0], status: row[1] || 'partial' } });
  }

  // 4. Calibrations
  console.log('Fetching Calibrations...');
  const calRows = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=2878588&single=true&output=csv');
  await prisma.calibration.deleteMany({ where: { farmId: farm.id } });
  for (const row of calRows) {
    if (row.length < 3) continue;
    const pId = paddockMap.get(row[0].toLowerCase().trim());
    if (pId) {
      const parts = row[1].split('/');
      const date = parts.length === 3 ? new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])) : null;
      await prisma.calibration.create({ data: { farmId: farm.id, paddockName: row[0], date, measuredCover: parseFloat(row[2]) || 0 } });
    }
  }

  // 5. Manual Mode
  console.log('Fetching Manual Mode...');
  const manRows = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=1312869086&single=true&output=csv');
  await prisma.manualMode.deleteMany({ where: { farmId: farm.id } });
  for (const row of manRows) {
    if (row.length < 2 || row[0].includes('<html>') || row[0].includes('Redirect')) continue;
    const pId = paddockMap.get(row[0].toLowerCase().trim());
    if (pId) await prisma.manualMode.create({ data: { farmId: farm.id, paddockName: row[0], data: JSON.stringify(row.slice(1)) } });
  }

  // 6. Feed Settings
  console.log('Fetching Feed Settings...');
  const feedRows = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vRBBRftvApfrkHKVQh9FV1qsYVy3Y2whaHKfyAWJ5Ymbc1cTcw7IzB4epF8h_-rN1dxD-N7bdaJyp1V/pub?gid=1218249029&single=true&output=csv');
  await prisma.feedSetting.deleteMany({ where: { farmId: farm.id } });
  for (const row of feedRows) {
    if (row.length < 2 || row[0].includes('<html>') || row[0].includes('Redirect')) continue;
    try {
      await prisma.feedSetting.create({ data: { farmId: farm.id, key: row[0], value: row[1] } });
    } catch(e) {}
  }

  // 7. Auth Users
  console.log('Fetching Auth Users...');
  const authRows = await fetchCSV('https://docs.google.com/spreadsheets/d/e/2PACX-1vQ1OhQkUXzp_TuFwnePsBSp2XlHE7Pw165eReEsOUyLwSldUuvviIdx-M8j0bbII2SYc7trwpjfM6aA/pub?gid=581275033&single=true&output=csv');
  for (const row of authRows) {
    if (row.length < 1 || !row[0].includes('@')) continue;
    const email = row[0].toLowerCase().trim();
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) user = await prisma.user.create({ data: { email, role: 'USER' } });
    
    const role = row[1] || 'VIEWER';
    const link = await prisma.farmUser.findUnique({ where: { farmId_userId: { farmId: farm.id, userId: user.id } } });
    if (!link) await prisma.farmUser.create({ data: { farmId: farm.id, userId: user.id, role } });
  }

  // 8. Breaks
  console.log('Fetching Breaks...');
  const breaksRes = await fetch('https://script.google.com/macros/s/AKfycbzRkkZ9pxJnFYiBpbLdgy_WXoG_itdfnjL199NvOLLxCGrPfh2drA1lcCVditsKxbe2/exec?type=breaks', { redirect: 'follow' });
  const breaksText = await breaksRes.text();
  try {
      const breaksData = JSON.parse(breaksText);
      if (breaksData.breaks) {
        await prisma.break.deleteMany({ where: { farmId: farm.id } });
        for (const b of breaksData.breaks) {
          const pId = paddockMap.get(b.paddock.toLowerCase().trim());
          if (pId) {
            await prisma.break.create({
              data: {
                farmId: farm.id,
                paddockId: pId,
                name: b.name || 'Break',
                vertices: JSON.stringify(b.lines || []),
                areaHa: b.area || 0,
                distanceMeters: b.distance || 0,
                cropMode: b.cropMode || 'false',
                isCropBreak: b.isCropBreak === true,
                status: b.status || 'active',
                createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
                createdBy: b.createdBy || 'Unknown'
              }
            });
          }
        }
      }
      console.log('Inserted Breaks');
  } catch(e) {
      console.log('Error parsing breaks JSON:', e.message);
  }

  console.log('Extensions Migration Complete!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
