// prisma/seed.ts

import { PrismaClient, Role, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const categories = ['Salary', 'Freelance', 'Investment', 'Food', 'Rent', 'Transport', 'Utilities', 'Healthcare', 'Entertainment', 'Shopping'];

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomAmount(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.refreshToken.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('Password123!', 12);

  // Create users
  const admin = await prisma.user.create({
    data: {
      email: 'admin@finance.com',
      password: hashedPassword,
      name: 'Admin User',
      role: Role.ADMIN,
    },
  });

  const analyst = await prisma.user.create({
    data: {
      email: 'analyst@finance.com',
      password: hashedPassword,
      name: 'Analyst User',
      role: Role.ANALYST,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      email: 'viewer@finance.com',
      password: hashedPassword,
      name: 'Viewer User',
      role: Role.VIEWER,
    },
  });

  console.log('✅ Created users:', { admin: admin.email, analyst: analyst.email, viewer: viewer.email });

  // Create transactions for the past 12 months
  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const transactions = [];

  for (let i = 0; i < 120; i++) {
    const isIncome = Math.random() > 0.4;
    transactions.push({
      userId: admin.id,
      amount: isIncome ? randomAmount(500, 8000) : randomAmount(50, 2000),
      type: isIncome ? TransactionType.INCOME : TransactionType.EXPENSE,
      category: isIncome
        ? categories[Math.floor(Math.random() * 3)]
        : categories[Math.floor(Math.random() * 7) + 3],
      date: randomDate(twelveMonthsAgo, now),
      notes: i % 5 === 0 ? `Transaction note ${i + 1}` : null,
    });
  }

  await prisma.transaction.createMany({ data: transactions });
  console.log(`✅ Created ${transactions.length} transactions`);

  console.log('\n🎉 Seed complete!\n');
  console.log('Test credentials (password: Password123!):');
  console.log('  Admin   → admin@finance.com');
  console.log('  Analyst → analyst@finance.com');
  console.log('  Viewer  → viewer@finance.com');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
