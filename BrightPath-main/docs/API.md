# BrightPath API — Reference

Base URL: `http://localhost:4000/api/v1`

All endpoints (except `/auth/*`) require:
```
Authorization: Bearer <access_token>
```

All responses follow the shape:
```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "meta": { ... }   // pagination only
}
```

---

## Authentication

### POST `/auth/login`
```json
// Body
{ "email": "admin@brightpath.eg", "password": "Admin@1234" }

// Response
{
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": "uuid", "email": "...", "role": "ADMIN" }
  }
}
```

### POST `/auth/refresh`
```json
{ "refreshToken": "eyJ..." }
```

### POST `/auth/logout`
```json
{ "refreshToken": "eyJ..." }
```

---

## Users

### GET `/users/me`
Returns the current user's profile based on their role.

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/users` | SUPER_ADMIN, ADMIN, REGISTRAR, ACCOUNTANT | List users in scope |
| POST | `/users` | SUPER_ADMIN, ADMIN, REGISTRAR | Create user account |
| GET | `/users/:id` | SUPER_ADMIN, ADMIN, REGISTRAR, ACCOUNTANT | Get user in scope |
| PUT | `/users/:id` | SUPER_ADMIN, ADMIN, REGISTRAR | Update user account |
| POST | `/users/:id/password` | SUPER_ADMIN, ADMIN, REGISTRAR | Reset user password |
| GET | `/users/me/settings` | ALL | Get my settings |
| PUT | `/users/me/settings` | ALL | Update my language/direction/notification settings |
| POST | `/users/me/password` | ALL | Change my password |

`GET/PUT /settings` is also available as a top-level alias for the signed-in user's settings.

---

## Schools

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/schools?page=1&limit=20&q=&isActive=true` | ALL | List schools visible to the signed-in user |
| POST | `/schools` | SUPER_ADMIN | Create a school |
| GET | `/schools/:id` | ALL | Get a visible school |
| PUT | `/schools/:id` | SUPER_ADMIN, ADMIN | Update a school |
| DELETE | `/schools/:id` | SUPER_ADMIN, ADMIN | Deactivate a school |

School create/update accepts `nameAr`, `nameEn`, `licenseNumber`, optional address/governorate/contact fields, `logoUrl`, and `isActive`.

---

## Classes

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/classes?schoolId=&academicYearId=&gradeLevelId=&teacherId=` | ALL | List classes visible to the signed-in user |
| POST | `/classes` | SUPER_ADMIN, ADMIN, REGISTRAR | Create a class |
| GET | `/classes/:id` | ALL | Get a visible class |
| GET | `/classes/:id/students` | ALL | List active students in a visible class |
| PUT | `/classes/:id` | SUPER_ADMIN, ADMIN, REGISTRAR | Update a class |
| DELETE | `/classes/:id` | SUPER_ADMIN, ADMIN, REGISTRAR | Delete a class |

Class access is scoped by school for admins/registrars, by taught classes for teachers, and by enrollment/guardian links for students and parents.

---

## Academic Master Data

| Resource | Paths | Roles |
|----------|-------|-------|
| Academic years | `GET/POST /academic-years`, `GET/PUT/DELETE /academic-years/:id` | Read: ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR |
| Terms | `GET/POST /terms`, `PUT/DELETE /terms/:id` | Read: ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR |
| Grade levels | `GET/POST /grade-levels`, `PUT/DELETE /grade-levels/:id` | Read: ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR |
| Subjects | `GET/POST /subjects`, `PUT/DELETE /subjects/:id` | Read: ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR |
| Class subjects | `GET/POST /class-subjects`, `PUT/DELETE /class-subjects/:id` | Read: ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR |
| Assessment types | `GET/POST /assessment-types`, `PUT/DELETE /assessment-types/:id` | Read: ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR |
| Grading scales | `GET/POST /grading-scales`, `PUT/DELETE /grading-scales/:id` | Read: ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR |

These endpoints create the IDs required by class, assignment, and grade workflows.

---

## People & Enrollment

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET/POST/PUT | `/staff`, `/staff/:id` | Read: ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR | Staff profile management |
| GET/POST/PUT | `/students`, `/students/:id` | Read: scoped ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR | Student profile management |
| GET/POST/PUT | `/guardians`, `/guardians/:id` | Read: scoped ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR | Guardian profile management |
| POST | `/guardians/links` | SUPER_ADMIN, ADMIN, REGISTRAR | Link guardian to student |
| POST/PUT | `/enrollments`, `/enrollments/:id` | SUPER_ADMIN, ADMIN, REGISTRAR | Enroll/withdraw students from classes |

---

## Attendance

### POST `/attendance`
**Roles:** TEACHER, ADMIN

Records a full class roll call for a date. Automatically notifies parents of absent/late students.

```json
{
  "classId": "uuid",
  "date": "2025-03-19",
  "records": [
    { "studentId": "uuid", "status": "PRESENT" },
    { "studentId": "uuid", "status": "ABSENT", "note": "Called in sick" },
    { "studentId": "uuid", "status": "LATE" }
  ]
}
```

**Status values:** `PRESENT` | `ABSENT` | `LATE` | `EXCUSED`

### GET `/attendance/class/:classId?date=YYYY-MM-DD`
**Roles:** TEACHER, ADMIN

Returns all attendance records for a class on a given date.

### GET `/attendance/student/:studentId/month?year=2025&month=3`
**Roles:** ALL

Returns a student's monthly attendance calendar with summary counts.

```json
{
  "data": {
    "records": [
      { "date": "2025-03-03", "status": "PRESENT" },
      { "date": "2025-03-12", "status": "LATE", "note": "..." }
    ],
    "summary": { "PRESENT": 18, "LATE": 1, "ABSENT": 0 }
  }
}
```

---

## Assignments

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/assignments?classId=&classSubjectId=&termId=&assessmentTypeId=&status=` | ALL | List visible assignments |
| POST | `/assignments` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Create an assignment |
| GET | `/assignments/:id` | ALL | Get visible assignment details |
| PUT | `/assignments/:id` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Update an assignment |
| PATCH | `/assignments/:id/publish` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Publish a draft |
| DELETE | `/assignments/:id` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Delete an assignment |
| POST | `/assignments/:id/submissions` | STUDENT | Submit work |
| PATCH | `/assignments/:id/submissions/:sid/grade` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Grade a submission |

Assignments are backed by the Prisma `Assessment` model. Submission/grade records are backed by `StudentGrade`.

---

## Grades

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/grades?studentId=&assessmentId=&termId=&classId=` | ALL | Get visible grades |
| POST | `/grades` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Record or replace a student's grade for an assessment |
| PUT | `/grades/:id` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Update a grade |

Grade responses include `marksObtained`, `totalMarks`, computed `percentage`, `letterGrade`, and `gpaPoints`.

---

## Messages

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/messages?page=1&limit=20&unreadOnly=false` | ALL | Get inbox conversation summaries |
| GET | `/messages/contacts?q=&role=&page=1&limit=20` | ALL | List eligible recipients the signed-in user may message |
| POST | `/messages` | ALL | Send a message |
| GET | `/messages/conversations/:userId?page=1&limit=20` | ALL | Get a thread with another user and mark received messages read |
| GET | `/messages/:id` | ALL | Get single message and mark it read if received |
| POST | `/messages/:id/attachments` | ALL | Upload up to 5 PDF/image attachments for a visible message |
| DELETE | `/messages/:id` | ALL | Soft-delete a message for the current user |

Messages are limited to active users allowed by school role rules. Admin/staff can message within their school; teachers can message students and parents in their classes plus staff; parents and students can message their linked teachers/admin staff; `SUPER_ADMIN` can message any active user.

```json
// POST /messages
{ "receiverId": "uuid", "body": "Can we schedule a meeting next week?" }

// GET /messages response data item
{
  "id": "conversation-uuid",
  "participant": { "id": "uuid", "email": "fatima@brightpath.eg", "role": "TEACHER", "name": "Fatima Al-Rashid" },
  "lastMessage": {
    "id": "message-uuid",
    "conversationId": "conversation-uuid",
    "senderId": "uuid",
    "receiverId": "uuid",
    "body": "Can we schedule a meeting next week?",
    "preview": "Can we schedule a meeting next week?",
    "readAt": null,
    "createdAt": "2025-03-19T09:22:00.000Z"
  },
  "unreadCount": 1,
  "lastMessageAt": "2025-03-19T09:22:00.000Z"
}
```

---

## Announcements

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/announcements` | ALL | List announcements |
| POST | `/announcements` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Create announcement |
| DELETE | `/announcements/:id` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Delete announcement. Teachers can delete their own announcements; admins/registrars can delete school-scoped announcements. |

Announcement bodies accept `title`/`body` or bilingual `titleAr/titleEn` and `bodyAr/bodyEn`. `audience` is one of `ALL`, `TEACHERS`, `STUDENTS`, `PARENTS`, `CLASS`; `CLASS` requires `classId`.

---

## Calendar

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/calendar?from=&to=&schoolId=&classId=&audience=` | ALL | List visible calendar events |
| POST | `/calendar` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Create a school or class calendar event |
| GET | `/calendar/:id` | ALL | Get a visible calendar event |
| PUT | `/calendar/:id` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Update a calendar event |
| DELETE | `/calendar/:id` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Delete a calendar event |

Calendar bodies accept `title`/`description` or bilingual fields, `startAt`, `endAt`, optional `location`, `color`, `metadata`, and `audience`. Teachers can create class-scoped events for classes they teach; school-scoped events require admin/registrar/super admin access.

---

## Resources

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/resources?q=&schoolId=&classId=&audience=&type=` | ALL | List visible school/class resources |
| POST | `/resources` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Create a link/file resource |
| GET | `/resources/:id` | ALL | Get a visible resource |
| PUT | `/resources/:id` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Update a resource |
| DELETE | `/resources/:id` | TEACHER, ADMIN, REGISTRAR, SUPER_ADMIN | Delete a resource |

Resource bodies accept `title`/`description` or bilingual fields, `type` (`LINK`, `FILE`, `DOCUMENT`, `IMAGE`, `VIDEO`, `OTHER`), optional `url`/file metadata, `publishedAt`, `expiresAt`, `metadata`, and `audience`. `CLASS` resources require `classId`.

---

## Dashboard View All

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/dashboard/view-all/:section?page=1&limit=20` | ALL | Return a paginated dashboard section backed by live APIs |

Supported sections: `assignments`, `grades`, `announcements`, `notifications`, `classes`, `students`, `transactions`, `messages`, `calendar`, and `resources`.

---

## Notifications

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/notifications?page=1&limit=20&unreadOnly=false` | ALL | Get my notifications |
| PATCH | `/notifications/:id/read` | ALL | Mark as read |
| PATCH | `/notifications/read-all` | ALL | Mark all as read |

---

## Finance

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET/POST/PUT | `/finance/fee-structures`, `/finance/fee-structures/:id` | Read: scoped ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR, ACCOUNTANT | Configure fees |
| GET/POST/PUT | `/finance/installment-plans`, `/finance/installment-plans/:id` | Read: scoped ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR, ACCOUNTANT | Student installment plans |
| PATCH | `/finance/installments/:id` | SUPER_ADMIN, ADMIN, REGISTRAR, ACCOUNTANT | Update installment status |
| GET/POST/PUT | `/finance/transactions`, `/finance/transactions/:id` | Read: scoped ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR, ACCOUNTANT | Payment transactions and receipts |
| GET/POST/PUT | `/finance/discounts`, `/finance/discounts/:id` | Read: scoped ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR, ACCOUNTANT | Discount catalogue |
| POST | `/finance/discounts/apply` | SUPER_ADMIN, ADMIN, REGISTRAR, ACCOUNTANT | Apply discount to student fee |

---

## Compliance & Audit

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET/POST/PUT | `/consents`, `/consents/:id` | Read: scoped ALL, Write: SUPER_ADMIN, ADMIN, REGISTRAR | Student data consent records |
| PATCH | `/consents/:id/revoke` | SUPER_ADMIN, ADMIN, REGISTRAR | Revoke consent |
| GET | `/audit-logs` | SUPER_ADMIN, ADMIN | View audit trail |

---

## Error Codes

| Status | Meaning |
|--------|---------|
| 400 | Bad request / invalid body |
| 401 | Missing or invalid token |
| 403 | Insufficient role permissions |
| 404 | Resource not found |
| 409 | Unique constraint conflict |
| 422 | Validation failed (field errors included) |
| 429 | Too many requests |
| 500 | Internal server error |

---

## WebSocket Events (Socket.io)

Connect with: `io('http://localhost:4000', { auth: { token: '<access_token>' } })`

| Event | Direction | Payload |
|-------|-----------|---------|
| `message:send` | Client → Server | `{ receiverId, body }` (`content`/`preview` aliases are accepted) |
| `message:sent` | Server → Client | Full message object for sender confirmation |
| `message:new` | Server → Client | Full message object including sender/receiver summaries and attachments |
| `message:error` | Server → Client | `{ message }` |
| `notification:push` | Server → Client | `{ type, title, body, data }` |
