// tests/transactions.test.ts

import request from 'supertest';
import app from '../src/app';
import { cleanDb, loginAs } from './helpers';
import { prisma } from '../src/config/database';

beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

const validTx = {
  amount: 1500.00,
  type: 'INCOME',
  category: 'Salary',
  date: new Date().toISOString(),
  notes: 'Monthly salary',
};

describe('POST /api/v1/transactions', () => {
  it('ADMIN can create a transaction', async () => {
    const { accessToken } = await loginAs('ADMIN');

    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validTx);

    expect(res.status).toBe(201);
    expect(res.body.data.category).toBe('Salary');
    expect(Number(res.body.data.amount)).toBe(1500);
  });

  it('VIEWER cannot create a transaction', async () => {
    const { accessToken } = await loginAs('VIEWER');

    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validTx);

    expect(res.status).toBe(403);
  });

  it('ANALYST cannot create a transaction', async () => {
    const { accessToken } = await loginAs('ANALYST');

    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validTx);

    expect(res.status).toBe(403);
  });

  it('rejects negative amount', async () => {
    const { accessToken } = await loginAs('ADMIN');

    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validTx, amount: -100 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/v1/transactions', () => {
  it('VIEWER can list transactions', async () => {
    const { accessToken: adminToken } = await loginAs('ADMIN');
    const { accessToken: viewerToken } = await loginAs('VIEWER');

    // Admin creates one
    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validTx);

    const res = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toBeDefined();
  });

  it('supports filtering by type', async () => {
    const { accessToken } = await loginAs('ADMIN');

    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validTx);

    await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ ...validTx, type: 'EXPENSE', category: 'Food', amount: 50 });

    const res = await request(app)
      .get('/api/v1/transactions?type=INCOME')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { type: string }) => t.type === 'INCOME')).toBe(true);
  });
});

describe('DELETE /api/v1/transactions/:id (soft delete)', () => {
  it('ADMIN can soft-delete a transaction', async () => {
    const { accessToken } = await loginAs('ADMIN');

    const create = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(validTx);

    const id = create.body.data.id;

    const del = await request(app)
      .delete(`/api/v1/transactions/${id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(del.status).toBe(200);

    // Should not appear in list
    const list = await request(app)
      .get('/api/v1/transactions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(list.body.data.find((t: { id: string }) => t.id === id)).toBeUndefined();
  });
});
