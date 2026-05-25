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

describe('academic route mounting and validation', () => {
  it.each([
    ['get', '/api/v1/schools'],
    ['get', '/api/v1/classes'],
    ['get', '/api/v1/assignments'],
    ['get', '/api/v1/grades'],
    ['get', '/api/v1/academic-years'],
    ['get', '/api/v1/terms'],
    ['get', '/api/v1/grade-levels'],
    ['get', '/api/v1/subjects'],
    ['get', '/api/v1/class-subjects'],
    ['get', '/api/v1/assessment-types'],
    ['get', '/api/v1/grading-scales'],
    ['get', '/api/v1/students'],
    ['get', '/api/v1/staff'],
    ['get', '/api/v1/guardians'],
    ['get', '/api/v1/finance/transactions'],
    ['get', '/api/v1/consents'],
    ['get', '/api/v1/audit-logs'],
  ])('%s %s requires authentication instead of falling through to 404', async (method, path) => {
    const res = await request(app)[method](path);
    expect(res.status).toBe(401);
  });

  it.each([
    ['post', '/api/v1/schools', 'STUDENT', 403],
    ['post', '/api/v1/classes', 'STUDENT', 403],
    ['post', '/api/v1/assignments', 'STUDENT', 403],
    ['post', '/api/v1/grades', 'STUDENT', 403],
    ['post', '/api/v1/academic-years', 'STUDENT', 403],
    ['post', '/api/v1/students', 'STUDENT', 403],
    ['post', '/api/v1/finance/transactions', 'STUDENT', 403],
    ['post', '/api/v1/consents', 'STUDENT', 403],
  ])('%s %s enforces write role gates', async (method, path, role, expected) => {
    const res = await request(app)[method](path).set('Authorization', auth(role)).send({});
    expect(res.status).toBe(expected);
  });

  it.each([
    ['post', '/api/v1/schools', 'SUPER_ADMIN'],
    ['post', '/api/v1/classes', 'ADMIN'],
    ['post', '/api/v1/assignments', 'TEACHER'],
    ['post', '/api/v1/grades', 'TEACHER'],
    ['post', '/api/v1/academic-years', 'ADMIN'],
    ['post', '/api/v1/subjects', 'ADMIN'],
    ['post', '/api/v1/students', 'ADMIN'],
    ['post', '/api/v1/finance/transactions', 'ACCOUNTANT'],
    ['post', '/api/v1/consents', 'REGISTRAR'],
  ])('%s %s validates request bodies before hitting services', async (method, path, role) => {
    const res = await request(app)[method](path).set('Authorization', auth(role)).send({});
    expect(res.status).toBe(422);
  });

  it.each([
    ['put', '/api/v1/classes/not-a-uuid', 'ADMIN'],
    ['patch', '/api/v1/assignments/not-a-uuid/publish', 'TEACHER'],
    ['post', '/api/v1/assignments/not-a-uuid/submissions', 'STUDENT'],
    ['patch', '/api/v1/assignments/not-a-uuid/submissions/also-bad/grade', 'TEACHER'],
    ['put', '/api/v1/grades/not-a-uuid', 'TEACHER'],
  ])('%s %s validates route params', async (method, path, role) => {
    const res = await request(app)[method](path).set('Authorization', auth(role)).send({ marksObtained: 90 });
    expect(res.status).toBe(422);
  });

  it('validates class attendance date query params', async () => {
    const res = await request(app)
      .get('/api/v1/attendance/class/11111111-1111-4111-8111-111111111111?date=not-a-date')
      .set('Authorization', auth('TEACHER'));

    expect(res.status).toBe(422);
  });
});
