# CampusHire – College Placement & Recruitment Management Platform

**CampusHire** is a production-grade full-stack **MERN (MongoDB, Express.js, React.js, Node.js)** platform engineered to automate and centralize university placement operations, candidate eligibility verification, multi-stage application workflows, interview scheduling, and placement analytics.

---

## 1. Problem Statement & Solution

University Training & Placement Cells traditionally coordinate campus drives using fragmented WhatsApp groups, Google Forms, spreadsheets, and manual email threads. This leads to missed deadlines, manual CGPA/backlog verification errors, duplicate applications, and zero real-time visibility for students or placement officers.

**CampusHire** solves this with:
- **Automated Backend Job Eligibility Engine**: Evaluates CGPA, Branch, Graduation Year, Active Backlogs, and Required Skills on the server and returns structured diagnostic reasons.
- **Role-Based Access Control (RBAC)**: Strict JWT + middleware separation across **Student**, **Recruiter**, and **Placement Officer (Admin)** roles.
- **Enforced Application State Machine**: Prevents invalid status transitions across `APPLIED → SHORTLISTED → INTERVIEW_SCHEDULED → SELECTED / REJECTED / WITHDRAWN`.
- **Database-Level Duplicate Prevention**: Compound unique index on `{ student: 1, job: 1 }`.
- **Real-Time Analytics & Fail-Open Redis Caching**: Branch-wise placement charts, CTC analytics, and fail-open TTL caching.

---

## 2. Project Architecture Diagram

```text
React 19 Frontend (Vite + React Router + Recharts + Tailwind CSS)
       │
       ▼
Centralized Axios Service (/src/services/api.js — Bearer JWT Interceptor)
       │
       ▼
Express.js REST API (/server/app.js & /server/routes/*.js)
       │
       ▼
Security & Validation Middleware (authMiddleware, roleMiddleware, uploadMiddleware, errorMiddleware)
       │
       ▼
Controllers & Domain Services (eligibilityService, notificationService, emailService, redisCache)
       │
       ▼
Mongoose ODM Models (/server/models/*.js) ──► MongoDB Database
```

---

## 3. Demo Credentials (Pre-Seeded on Startup)

| Role | Name | Email | Password | Profile Highlights |
| :--- | :--- | :--- | :--- | :--- |
| **Student (Eligible)** | Aarav Sharma | `aarav.sharma@nit.edu` | `CampusHire@2027` | CSE · 2027 · **8.65 CGPA** · 0 Backlogs · MERN & Docker |
| **Student (Ineligible Case)** | Rohan Verma | `rohan.verma@nit.edu` | `CampusHire@2027` | ECE · 2027 · **6.85 CGPA** · 1 Active Backlog (Tests Eligibility Reasons) |
| **Recruiter** | Siddharth Malhotra | `recruiter@cloudscale.io` | `CampusHire@2027` | Head of University Talent Acquisition @ **CloudScale Systems** |
| **Placement Officer / Admin** | Dr. Rajeshwari Menon | `tpo.admin@nit.edu` | `CampusHire@2027` | Full Campus Analytics, User Control & Application Override |

---

## 4. REST API Endpoints

### System & Health
- `GET /api/health` — System architecture & database/cache health probe
- `POST /api/seed` — Reset database with fresh demo seed records

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register Student or Recruiter
- `POST /api/auth/login` — Authenticate and receive JWT
- `POST /api/auth/logout` — Clear session cookie
- `GET /api/auth/me` — Fetch logged-in user and role profile

### Student (`/api/students`)
- `GET /api/students/dashboard` — Student KPIs, evaluated jobs, interviews, notifications
- `GET /api/students/profile` — Retrieve student profile
- `PUT /api/students/profile` — Update CGPA, branch, backlogs, skills, projects, education
- `POST /api/students/resume` — Upload validated PDF resume (`multer`)

### Jobs & Eligibility Engine (`/api/jobs`)
- `GET /api/jobs` — Paginated, searchable, filterable jobs with real-time student eligibility evaluation
- `GET /api/jobs/:id` — Detailed job view + backend `evaluateEligibility()` report & reasons
- `POST /api/jobs` — Create job opening with eligibility rules (`RECRUITER`, `ADMIN`)
- `PUT /api/jobs/:id` — Update job & eligibility rules (`RECRUITER`, `ADMIN`)
- `DELETE /api/jobs/:id` — Close job opening (`RECRUITER`, `ADMIN`)

### Applications (`/api/applications`)
- `POST /api/applications` — Submit application (re-verifies backend eligibility & prevents duplicates)
- `GET /api/applications/my` — Student's applications & audit trail
- `GET /api/applications/:id` — Single application dossier
- `PATCH /api/applications/:id/status` — State-machine validated status update

### Recruiter (`/api/recruiters`)
- `GET /api/recruiters/dashboard` — Company hiring KPIs, jobs, recent applicants, pipeline
- `PUT /api/recruiters/company` — Update company & recruiter profile
- `GET /api/recruiters/jobs` — List company jobs with applicant funnel metrics
- `GET /api/recruiters/jobs/:jobId/applicants` — Filter applicants by CGPA, branch, batch, status, search

### Interviews (`/api/interviews`)
- `POST /api/interviews` — Schedule candidate interview & trigger notification/email
- `GET /api/interviews` — Role-scoped interview schedule
- `PUT /api/interviews/:id` — Update interview details, status, or feedback

### Admin / Placement Officer (`/api/admin`)
- `GET /api/admin/dashboard` — Executive summary + Recharts datasets
- `GET /api/admin/analytics` — Branch-wise & company-wise placement metrics
- `GET /api/admin/students` — Search/filter all students
- `GET /api/admin/recruiters` — Manage recruiters
- `GET /api/admin/companies` — Manage partner companies
- `GET /api/admin/applications` — Master campus application ledger
- `PATCH /api/admin/users/:userId/status` — Enable/disable user accounts

---

## 5. Running Locally & Testing

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env

# 3. Seed sample placement database
npm run seed

# 4. Run full-stack development server (Port 3000)
npm run dev

# 5. Run automated backend integration tests
npm test
```
