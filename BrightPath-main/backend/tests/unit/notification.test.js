process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/brightpath';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-chars';

const {
  notificationParamsSchema,
  notificationQuerySchema,
} = require('../../src/controllers/notification.controller');

describe('notificationQuerySchema', () => {
  it('coerces pagination and unreadOnly filters', () => {
    const parsed = notificationQuerySchema.parse({
      page: '3',
      limit: '15',
      unreadOnly: 'true',
    });

    expect(parsed).toEqual({ page: 3, limit: 15, unreadOnly: true });
  });

  it('rejects invalid unreadOnly filters', () => {
    const result = notificationQuerySchema.safeParse({ unreadOnly: 'yes' });

    expect(result.success).toBe(false);
  });
});

describe('notificationParamsSchema', () => {
  it('requires UUID ids', () => {
    expect(notificationParamsSchema.safeParse({ id: 'not-a-uuid' }).success).toBe(false);
  });
});
