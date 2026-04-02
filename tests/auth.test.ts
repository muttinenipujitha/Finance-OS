// tests/auth.test.ts

import request from 'supertest';
import app from '../src/app';
import { cleanDb, createTestUser } from './helpers';
import { prisma } from '../src/config/database';

beforeEach(cleanDb);
afterAll(() => prisma.$disconnect());

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'new@test.com',
      password: 'Password123!',
      name: 'New User',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined(); // never expose hash
  });

  it('rejects duplicate email', async () => {
    await createTestUser('VIEWER');
    const user = await prisma.user.findFirst();

    const res = await request(app).post('/api/v1/auth/register').send({
      email: user!.email,
      password: 'Password123!',
      name: 'Duplicate',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('rejects weak password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      email: 'weak@test.com',
      password: 'weak',
      name: 'Weak',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns tokens for valid credentials', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'login@test.com',
      password: 'Password123!',
      name: 'Login User',
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'login@test.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it('rejects wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send({
      email: 'wrong@test.com',
      password: 'Password123!',
      name: 'Wrong',
    });

    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'wrong@test.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns current user when authenticated', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      email: 'me@test.com',
      password: 'Password123!',
      name: 'Me',
    });

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${reg.body.data.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('me@test.com');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});
