process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/brightpath';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-with-at-least-32-chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-with-at-least-32-chars';

const {
  createAnnouncementSchema,
} = require('../../src/controllers/announcement.controller');

describe('createAnnouncementSchema', () => {
  it('accepts a school-wide announcement', () => {
    const parsed = createAnnouncementSchema.parse({
      title: 'Spring trip',
      body: 'Permission forms are due Friday.',
      audience: 'ALL',
      priority: 'INFO',
    });

    expect(parsed).toMatchObject({
      title: 'Spring trip',
      body: 'Permission forms are due Friday.',
      audience: 'ALL',
      priority: 'INFO',
    });
  });

  it('requires a title and body', () => {
    const result = createAnnouncementSchema.safeParse({ audience: 'ALL' });

    expect(result.success).toBe(false);
  });

  it('rejects unsupported audiences', () => {
    const result = createAnnouncementSchema.safeParse({
      title: 'Hello',
      body: 'World',
      audience: 'EVERYONE',
    });

    expect(result.success).toBe(false);
  });
});
