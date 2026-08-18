import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
  const passwordHash = await bcrypt.hash('SecurePass123!', 12);
  for (const [email, role] of [['responsable@impactc.local', 'RESPONSABLE'], ['admin@impactc.local', 'ADMIN']] as const) {
    await prisma.user.upsert({ where: { email }, update: { role, passwordHash, isActive: true }, create: { email, role, passwordHash } });
  }
}

main().finally(async () => prisma.$disconnect());
