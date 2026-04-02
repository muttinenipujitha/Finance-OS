// tests/dashboard.test.ts

import request from 'supertest';
import app from '../src/app';
import { cleanDb, loginAs } from './helpers';
import { prisma } from '../src/config/database';

beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

async function seedTransactions(accessToken: string) {
  await request(app).post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`)
    .send({ amount: 5000, type: 'INCOME',  category: 'Salary',  date: new Date().toISOString() });
  await request(app).post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`)
    .send({ amount: 3000, type: 'INCOME',  category: 'Freelance', date: new Date().toISOString() });
  await request(app).post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`)
    .send({ amount: 1200, type: 'EXPENSE', category: 'Rent',    date: new Date().toISOString() });
  await request(app).post('/api/v1/transactions').set('Authorization', `Bearer ${accessToken}`)
    .send({ amount:  300, type: 'EXPENSE', category: 'Food',    date: new Date().toISOString() });
}

describe('GET /api/v1/dashboard/summary', () => {
  it('returns correct totals', async () => {
    const { accessToken } = await loginAs('ADMIN');
    await seedTransactions(accessToken);

    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalIncome).toBe(8000);
    expect(res.body.data.totalExpenses).toBe(1500);
    expect(res.body.data.netBalance).toBe(6500);
    expect(res.body.data.totalTransactions).toBe(4);
  });

  it('VIEWER can access summary', async () => {
    const { accessToken } = await loginAs('VIEWER');
    const res = await request(app)
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
  });
});

describe('GET /api/v1/dashboard/categories', () => {
  it('ANALYST can access category totals', async () => {
    const { accessToken: adminToken } = await loginAs('ADMIN');
    await seedTransactions(adminToken);

    const { accessToken: analystToken } = await loginAs('ANALYST');

    const res = await request(app)
      .get('/api/v1/dashboard/categories')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('category');
    expect(res.body.data[0]).toHaveProperty('income');
    expect(res.body.data[0]).toHaveProperty('expense');
    expect(res.body.data[0]).toHaveProperty('net');
  });

  it('VIEWER cannot access category breakdown', async () => {
    const { accessToken } = await loginAs('VIEWER');
    const res = await request(app)
      .get('/api/v1/dashboard/categories')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/v1/dashboard/recent', () => {
  it('returns recent transactions', async () => {
    const { accessToken } = await loginAs('ADMIN');
    await seedTransactions(accessToken);

    const res = await request(app)
      .get('/api/v1/dashboard/recent?limit=3')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(3);
  });
});
