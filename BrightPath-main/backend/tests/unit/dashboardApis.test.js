process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/brightpath';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-chars';

const request = require('supertest');
const { createApp } = require('../../src/app');
const { signAccessToken } = require('../../src/utils/jwt');

const app = createApp();
const tokenFor = role =>
  signAccessToken({
    sub: '11111111-1111-4111-8111-111111111111',
    email: `${role.toLowerCase()}@example.com`,
    role,
  });

function auth(role) {
  return `Bearer ${tokenFor(role)}`;
}

describe('dashboard-backed API routes', () => {
  it.each([
    ['get', '/api/v1/calendar'],
    ['get', '/api/v1/resources'],
    ['get', '/api/v1/settings'],
    ['get', '/api/v1/dashboard/view-all/calendar'],
  ])('%s %s requires authentication instead of falling through to 404', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it.each([
    ['post', '/api/v1/calendar'],
    ['post', '/api/v1/resources'],
  ])('%s %s rejects student writes before service execution', async (method, path) => {
    const res = await request(app)[method](path).set('Authorization', auth('STUDENT')).send({});
    expect(res.status).toBe(403);
  });

  it.each([
    ['post', '/api/v1/calendar', 'TEACHER'],
    ['post', '/api/v1/resources', 'TEACHER'],
  ])('%s %s validates request bodies', async (method, path, role) => {
    const res = await request(app)[method](path).set('Authorization', auth(role)).send({});
    expect(res.status).toBe(422);
  });

  it.each([
    ['get', '/api/v1/calendar/not-a-uuid'],
    ['put', '/api/v1/resources/not-a-uuid'],
  ])('%s %s validates ids before service execution', async (method, path) => {
    const res = await request(app)[method](path).set('Authorization', auth('ADMIN')).send({ title: 'x' });
    expect(res.status).toBe(422);
  });

  it('validates settings payloads on the top-level settings API', async () => {
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', auth('TEACHER'))
      .send({ preferredLanguage: 'fr' });

    expect(res.status).toBe(422);
  });

  it('validates dashboard view-all sections before service execution', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/view-all/not-a-section')
      .set('Authorization', auth('ADMIN'));

    expect(res.status).toBe(422);
  });
});
