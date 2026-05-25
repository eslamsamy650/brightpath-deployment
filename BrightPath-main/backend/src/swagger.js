const { env } = require('./config/env');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'BrightPath API',
    version: '1.0.0',
    description: 'API documentation for the BrightPath backend.',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Local backend server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [{ BearerAuth: [] }],
  tags: [
    { name: 'Health', description: 'Health check endpoint' },
    { name: 'Auth', description: 'Authentication and token management' },
    { name: 'Users', description: 'Current user profile endpoints' },
    { name: 'Schools', description: 'School administration endpoints' },
    { name: 'Classes', description: 'Class administration endpoints' },
    { name: 'Attendance', description: 'Attendance tracking endpoints' },
    { name: 'Assignments', description: 'Assessment-backed assignment endpoints' },
    { name: 'Grades', description: 'Student grade endpoints' },
    { name: 'Messages', description: 'Direct school messaging endpoints' },
    { name: 'Notifications', description: 'Notification inbox endpoints' },
    { name: 'Announcements', description: 'School announcement endpoints' },
    { name: 'Calendar', description: 'School and class calendar endpoints' },
    { name: 'Resources', description: 'School and class resource endpoints' },
    { name: 'Dashboard', description: 'Role-aware dashboard collection endpoints' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns service health information.',
        security: [],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    environment: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', example: 'admin@brightpath.eg' },
                  password: { type: 'string', example: 'Admin@1234' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Refresh access token',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'New tokens',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string' },
                    refreshToken: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Logout',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  refreshToken: { type: 'string' },
                },
                required: ['refreshToken'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Logout successful',
          },
        },
      },
    },
    '/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current user profile',
        security: [{ BearerAuth: [] }],
        responses: { '200': { description: 'Current user profile' } },
      },
    },
    '/schools': {
      get: {
        tags: ['Schools'],
        summary: 'List visible schools',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'isActive', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { '200': { description: 'Schools' } },
      },
      post: {
        tags: ['Schools'],
        summary: 'Create a school',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nameAr', 'nameEn', 'licenseNumber'],
                properties: {
                  nameAr: { type: 'string' },
                  nameEn: { type: 'string' },
                  licenseNumber: { type: 'string' },
                  email: { type: 'string' },
                  phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'School created' } },
      },
    },
    '/schools/{id}': {
      get: {
        tags: ['Schools'],
        summary: 'Get a school',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'School' } },
      },
      put: {
        tags: ['Schools'],
        summary: 'Update a school',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'School updated' } },
      },
      delete: {
        tags: ['Schools'],
        summary: 'Deactivate a school',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'School deactivated' } },
      },
    },
    '/classes': {
      get: {
        tags: ['Classes'],
        summary: 'List visible classes',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'schoolId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'academicYearId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'gradeLevelId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Classes' } },
      },
      post: {
        tags: ['Classes'],
        summary: 'Create a class',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Class created' } },
      },
    },
    '/classes/{id}': {
      get: {
        tags: ['Classes'],
        summary: 'Get a class',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Class' } },
      },
      put: {
        tags: ['Classes'],
        summary: 'Update a class',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Class updated' } },
      },
      delete: {
        tags: ['Classes'],
        summary: 'Delete a class',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'Class deleted' } },
      },
    },
    '/classes/{id}/students': {
      get: {
        tags: ['Classes'],
        summary: 'List students in a class',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Class students' } },
      },
    },
    '/attendance': {
      post: {
        tags: ['Attendance'],
        summary: 'Take attendance',
        description: 'Requires teacher or admin role.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  classId: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  records: { type: 'array', items: { type: 'object' } },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Attendance recorded',
          },
        },
      },
    },
    '/attendance/class/{classId}': {
      get: {
        tags: ['Attendance'],
        summary: 'Get class attendance',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'classId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Attendance list',
          },
        },
      },
    },
    '/attendance/student/{studentId}/month': {
      get: {
        tags: ['Attendance'],
        summary: 'Get monthly student attendance',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'studentId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
          {
            name: 'month',
            in: 'query',
            required: true,
            schema: { type: 'integer', example: 5 },
          },
          {
            name: 'year',
            in: 'query',
            required: true,
            schema: { type: 'integer', example: 2025 },
          },
        ],
        responses: {
          '200': {
            description: 'Attendance summary',
          },
        },
      },
    },
    '/assignments': {
      get: {
        tags: ['Assignments'],
        summary: 'List visible assignments',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'classId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'classSubjectId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'termId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['DRAFT', 'PUBLISHED'] } },
        ],
        responses: { '200': { description: 'Assignments' } },
      },
      post: {
        tags: ['Assignments'],
        summary: 'Create an assessment-backed assignment',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['classSubjectId', 'assessmentTypeId', 'title', 'totalMarks'],
                properties: {
                  classSubjectId: { type: 'string', format: 'uuid' },
                  assessmentTypeId: { type: 'string', format: 'uuid' },
                  title: { type: 'string' },
                  totalMarks: { type: 'number' },
                  assessmentDate: { type: 'string', format: 'date' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Assignment created' } },
      },
    },
    '/assignments/{id}': {
      put: {
        tags: ['Assignments'],
        summary: 'Update an assignment',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Assignment updated' } },
      },
      delete: {
        tags: ['Assignments'],
        summary: 'Delete an assignment',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '204': { description: 'Assignment deleted' } },
      },
    },
    '/assignments/{id}/publish': {
      patch: {
        tags: ['Assignments'],
        summary: 'Publish an assignment',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Assignment published' } },
      },
    },
    '/assignments/{id}/submissions': {
      post: {
        tags: ['Assignments'],
        summary: 'Submit an assignment',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '201': { description: 'Submission created' } },
      },
    },
    '/assignments/{id}/submissions/{sid}/grade': {
      patch: {
        tags: ['Assignments'],
        summary: 'Grade an assignment submission',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'sid', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Submission graded' } },
      },
    },
    '/grades': {
      get: {
        tags: ['Grades'],
        summary: 'List visible grades',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'studentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'assessmentId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'termId', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'classId', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: { '200': { description: 'Grades' } },
      },
      post: {
        tags: ['Grades'],
        summary: 'Record a grade',
        security: [{ BearerAuth: [] }],
        responses: { '201': { description: 'Grade recorded' } },
      },
    },
    '/grades/{id}': {
      put: {
        tags: ['Grades'],
        summary: 'Update a grade',
        security: [{ BearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Grade updated' } },
      },
    },
    '/messages': {
      get: {
        tags: ['Messages'],
        summary: 'Get inbox conversations',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
          { name: 'unreadOnly', in: 'query', schema: { type: 'boolean', example: false } },
        ],
        responses: {
          '200': {
            description: 'Inbox conversation summaries',
          },
        },
      },
      post: {
        tags: ['Messages'],
        summary: 'Send a message',
        description:
          'Users may message eligible contacts according to school role rules. Super admins may message any active user.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['receiverId', 'body'],
                properties: {
                  receiverId: { type: 'string', format: 'uuid' },
                  body: { type: 'string', maxLength: 4000 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Message sent',
          },
        },
      },
    },
    '/messages/contacts': {
      get: {
        tags: ['Messages'],
        summary: 'List eligible message recipients',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string' } },
          { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
        ],
        responses: {
          '200': { description: 'Eligible recipients' },
        },
      },
    },
    '/messages/conversations/{userId}': {
      get: {
        tags: ['Messages'],
        summary: 'Get a conversation with another user',
        description: 'Returns visible messages with a participant and marks received unread messages as read.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'userId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
          { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
        ],
        responses: {
          '200': {
            description: 'Conversation messages',
          },
        },
      },
    },
    '/messages/{id}': {
      get: {
        tags: ['Messages'],
        summary: 'Get a single message',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Message detail',
          },
        },
      },
      delete: {
        tags: ['Messages'],
        summary: 'Delete a message for the current user',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': {
            description: 'Message deleted',
          },
        },
      },
    },
    '/messages/{id}/attachments': {
      post: {
        tags: ['Messages'],
        summary: 'Upload attachments for a message',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  attachments: {
                    type: 'array',
                    items: { type: 'string', format: 'binary' },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Message with uploaded attachments' },
        },
      },
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications for the current user',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
          { name: 'unreadOnly', in: 'query', schema: { type: 'boolean', example: false } },
        ],
        responses: {
          '200': { description: 'Notifications' },
        },
      },
    },
    '/notifications/{id}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark notification read',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Notification read state' },
        },
      },
    },
    '/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all visible notifications read',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': { description: 'Read count' },
        },
      },
    },
    '/announcements': {
      get: {
        tags: ['Announcements'],
        summary: 'List visible announcements',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', example: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', example: 20 } },
        ],
        responses: {
          '200': { description: 'Announcements' },
        },
      },
      post: {
        tags: ['Announcements'],
        summary: 'Create an announcement',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  body: { type: 'string' },
                  audience: {
                    type: 'string',
                    enum: ['ALL', 'TEACHERS', 'STUDENTS', 'PARENTS', 'CLASS'],
                  },
                  priority: { type: 'string', enum: ['NORMAL', 'URGENT', 'INFO'] },
                  classId: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Announcement created' },
        },
      },
    },
    '/announcements/{id}': {
      delete: {
        tags: ['Announcements'],
        summary: 'Delete an announcement',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Announcement deleted' },
        },
      },
    },
  },
};

swaggerDocument.tags.push(
  { name: 'Academic Master Data', description: 'Academic year, term, subject, and grading setup' },
  { name: 'People', description: 'Users, staff, students, guardians, and enrollment management' },
  { name: 'Finance', description: 'Fees, installment plans, payments, and discounts' },
  { name: 'Compliance', description: 'Data consent and audit log endpoints' }
);

Object.assign(swaggerDocument.paths, {
  '/users': {
    get: { tags: ['People'], summary: 'List users', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Users' } } },
    post: { tags: ['People'], summary: 'Create user', security: [{ BearerAuth: [] }], responses: { '201': { description: 'User created' } } },
  },
  '/users/{id}': {
    get: { tags: ['People'], summary: 'Get user', security: [{ BearerAuth: [] }], responses: { '200': { description: 'User' } } },
    put: { tags: ['People'], summary: 'Update user', security: [{ BearerAuth: [] }], responses: { '200': { description: 'User updated' } } },
  },
  '/users/{id}/password': {
    post: { tags: ['People'], summary: 'Reset user password', security: [{ BearerAuth: [] }], responses: { '204': { description: 'Password reset' } } },
  },
  '/users/me/settings': {
    get: { tags: ['Users'], summary: 'Get my settings', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Settings' } } },
    put: { tags: ['Users'], summary: 'Update my settings', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Settings updated' } } },
  },
  '/settings': {
    get: { tags: ['Users'], summary: 'Get my settings', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Settings' } } },
    put: { tags: ['Users'], summary: 'Update my settings', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Settings updated' } } },
  },
  '/users/me/password': {
    post: { tags: ['Users'], summary: 'Change my password', security: [{ BearerAuth: [] }], responses: { '204': { description: 'Password changed' } } },
  },
  '/academic-years': {
    get: { tags: ['Academic Master Data'], summary: 'List academic years', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Academic years' } } },
    post: { tags: ['Academic Master Data'], summary: 'Create academic year', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Academic year created' } } },
  },
  '/academic-years/{id}': {
    get: { tags: ['Academic Master Data'], summary: 'Get academic year', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Academic year' } } },
    put: { tags: ['Academic Master Data'], summary: 'Update academic year', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Academic year updated' } } },
    delete: { tags: ['Academic Master Data'], summary: 'Delete academic year', security: [{ BearerAuth: [] }], responses: { '204': { description: 'Academic year deleted' } } },
  },
  '/terms': {
    get: { tags: ['Academic Master Data'], summary: 'List terms', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Terms' } } },
    post: { tags: ['Academic Master Data'], summary: 'Create term', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Term created' } } },
  },
  '/grade-levels': {
    get: { tags: ['Academic Master Data'], summary: 'List grade levels', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Grade levels' } } },
    post: { tags: ['Academic Master Data'], summary: 'Create grade level', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Grade level created' } } },
  },
  '/subjects': {
    get: { tags: ['Academic Master Data'], summary: 'List subjects', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Subjects' } } },
    post: { tags: ['Academic Master Data'], summary: 'Create subject', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Subject created' } } },
  },
  '/class-subjects': {
    get: { tags: ['Academic Master Data'], summary: 'List class subjects', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Class subjects' } } },
    post: { tags: ['Academic Master Data'], summary: 'Assign subject to class', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Class subject created' } } },
  },
  '/assessment-types': {
    get: { tags: ['Academic Master Data'], summary: 'List assessment types', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Assessment types' } } },
    post: { tags: ['Academic Master Data'], summary: 'Create assessment type', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Assessment type created' } } },
  },
  '/grading-scales': {
    get: { tags: ['Academic Master Data'], summary: 'List grading scales', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Grading scales' } } },
    post: { tags: ['Academic Master Data'], summary: 'Create grading scale', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Grading scale created' } } },
  },
  '/staff': {
    get: { tags: ['People'], summary: 'List staff', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Staff' } } },
    post: { tags: ['People'], summary: 'Create staff profile', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Staff profile created' } } },
  },
  '/students': {
    get: { tags: ['People'], summary: 'List students', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Students' } } },
    post: { tags: ['People'], summary: 'Create student', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Student created' } } },
  },
  '/guardians': {
    get: { tags: ['People'], summary: 'List guardians', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Guardians' } } },
    post: { tags: ['People'], summary: 'Create guardian', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Guardian created' } } },
  },
  '/guardians/links': {
    post: { tags: ['People'], summary: 'Link guardian to student', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Guardian link saved' } } },
  },
  '/enrollments': {
    post: { tags: ['People'], summary: 'Create or update enrollment', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Enrollment saved' } } },
  },
  '/finance/fee-structures': {
    get: { tags: ['Finance'], summary: 'List fee structures', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Fee structures' } } },
    post: { tags: ['Finance'], summary: 'Create fee structure', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Fee structure created' } } },
  },
  '/finance/installment-plans': {
    get: { tags: ['Finance'], summary: 'List installment plans', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Installment plans' } } },
    post: { tags: ['Finance'], summary: 'Create installment plan', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Installment plan created' } } },
  },
  '/finance/transactions': {
    get: { tags: ['Finance'], summary: 'List transactions', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Transactions' } } },
    post: { tags: ['Finance'], summary: 'Create transaction', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Transaction created' } } },
  },
  '/finance/discounts': {
    get: { tags: ['Finance'], summary: 'List discounts', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Discounts' } } },
    post: { tags: ['Finance'], summary: 'Create discount', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Discount created' } } },
  },
  '/finance/discounts/apply': {
    post: { tags: ['Finance'], summary: 'Apply discount to student fee', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Discount applied' } } },
  },
  '/consents': {
    get: { tags: ['Compliance'], summary: 'List data consents', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Consents' } } },
    post: { tags: ['Compliance'], summary: 'Capture consent', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Consent captured' } } },
  },
  '/consents/{id}/revoke': {
    patch: { tags: ['Compliance'], summary: 'Revoke consent', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Consent revoked' } } },
  },
  '/audit-logs': {
    get: { tags: ['Compliance'], summary: 'List audit logs', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Audit logs' } } },
  },
  '/calendar': {
    get: { tags: ['Calendar'], summary: 'List visible calendar events', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Calendar events' } } },
    post: { tags: ['Calendar'], summary: 'Create calendar event', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Calendar event created' } } },
  },
  '/calendar/{id}': {
    get: { tags: ['Calendar'], summary: 'Get calendar event', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Calendar event' } } },
    put: { tags: ['Calendar'], summary: 'Update calendar event', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Calendar event updated' } } },
    delete: { tags: ['Calendar'], summary: 'Delete calendar event', security: [{ BearerAuth: [] }], responses: { '204': { description: 'Calendar event deleted' } } },
  },
  '/resources': {
    get: { tags: ['Resources'], summary: 'List visible resources', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Resources' } } },
    post: { tags: ['Resources'], summary: 'Create resource', security: [{ BearerAuth: [] }], responses: { '201': { description: 'Resource created' } } },
  },
  '/resources/{id}': {
    get: { tags: ['Resources'], summary: 'Get resource', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Resource' } } },
    put: { tags: ['Resources'], summary: 'Update resource', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Resource updated' } } },
    delete: { tags: ['Resources'], summary: 'Delete resource', security: [{ BearerAuth: [] }], responses: { '204': { description: 'Resource deleted' } } },
  },
  '/dashboard/view-all/{section}': {
    get: { tags: ['Dashboard'], summary: 'List a dashboard section with pagination', security: [{ BearerAuth: [] }], responses: { '200': { description: 'Dashboard section' } } },
  },
});

swaggerDocument.paths = Object.fromEntries(
  Object.entries(swaggerDocument.paths).map(([path, config]) => [
    path === '/health' ? path : `${env.API_PREFIX}${path}`,
    config,
  ])
);

module.exports = { swaggerDocument };
