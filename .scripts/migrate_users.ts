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
  console.log('Migrating Users...');
  
  const farm = await prisma.farm.findFirst({ where: { name: 'Wainono' } });
  if (!farm) {
    console.error('Wainono farm not found!');
    return;
  }

  const emails = ['juanignacioituarte@gmail.com', 'cha.adrian94@gmail.com'];
  
  for (const email of emails) {
    // Upsert User
    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'ADMIN' },
      create: { email, role: 'ADMIN' }
    });
    
    // Upsert FarmUser
    const existing = await prisma.farmUser.findFirst({
      where: { farmId: farm.id, userId: user.id }
    });
    
    if (!existing) {
      await prisma.farmUser.create({
        data: {
          farmId: farm.id,
          userId: user.id,
          role: 'ADMIN'
        }
      });
    }
  }
  
  console.log('Users Migrated!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
