process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/brightpath';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-chars';

const {
  contactsQuerySchema,
  sendMessageSchema,
} = require('../../src/controllers/message.controller');
const { makePreview } = require('../../src/services/message.service');

describe('sendMessageSchema', () => {
  it('accepts a receiver and body', () => {
    const parsed = sendMessageSchema.parse({
      receiverId: '11111111-1111-4111-8111-111111111111',
      body: 'Hello from BrightPath',
    });

    expect(parsed.body).toBe('Hello from BrightPath');
  });

  it('requires at least one message body field', () => {
    const result = sendMessageSchema.safeParse({
      receiverId: '11111111-1111-4111-8111-111111111111',
    });

    expect(result.success).toBe(false);
  });
});

describe('contactsQuerySchema', () => {
  it('accepts contact search filters', () => {
    const parsed = contactsQuerySchema.parse({
      q: 'fatima',
      role: 'TEACHER',
      page: '2',
      limit: '10',
    });

    expect(parsed).toMatchObject({ q: 'fatima', role: 'TEACHER', page: 2, limit: 10 });
  });

  it('rejects unknown contact roles', () => {
    const result = contactsQuerySchema.safeParse({ role: 'PEER' });

    expect(result.success).toBe(false);
  });
});

describe('makePreview', () => {
  it('keeps short message previews unchanged', () => {
    expect(makePreview('Short message')).toBe('Short message');
  });

  it('truncates long message previews', () => {
    const preview = makePreview('a'.repeat(160));

    expect(preview).toHaveLength(140);
    expect(preview.endsWith('...')).toBe(true);
  });
});
