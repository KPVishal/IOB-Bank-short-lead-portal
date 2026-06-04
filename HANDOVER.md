# Bijlipay — IOB Bank Portal · Handover Document

**Purpose:** Bring a new Claude session (or developer) up to speed on the full-stack project so they can continue building screen-by-screen without losing context.

**Last updated:** 3 June 2026
**Project path:** `C:\Users\sarve\Downloads\AI-Projects\iob-portal\`

> **Important context for incoming sessions:**
> An earlier iteration of this project was a single-file HTML prototype (`mockups.html`). It is still in the repo as a **design reference only** — the actual application is now a full Spring Boot + React + MySQL stack scaffolded under `backend/` and `frontend/`. When the user asks to "build screen X", port the visual/UX from `mockups.html` into the React app, with a real Spring Boot backend + MySQL persistence.

---

## 1. Project Overview

**Bijlipay — IOB Bank Portal** is a co-branded merchant onboarding & lifecycle management portal that Bijlipay (Skilworth Technologies) is building for Indian Overseas Bank (IOB). The portal captures merchant leads from IOB branches, assigns them to RSMs, tracks them through a pipeline, onboards merchants, and exposes transaction & settlement data.

- **Client:** Indian Overseas Bank (IOB)
- **Vendor:** Bijlipay / Skilworth Technologies
- **Active user (account):** `yogeshgupta@bijlipay.co.in`
- **Two roles:** Admin (full access, 8 modules) · Branch Manager (3 modules, scoped to own Sole ID)

---

## 2. Tech stack

| Layer | Technology |
|------|------------|
| **Backend** | Spring Boot **3.2.5** · Java **17** · Maven |
| **Persistence** | MySQL **8.0** · Spring Data JPA (Hibernate 6) · Flyway migrations |
| **Auth** | JWT (HS256, jjwt 0.12.5) in `Authorization: Bearer …` header · BCrypt password hashing · Spring Security stateless |
| **Excel** | Apache POI **5.2.5** (template generation + bulk upload parsing) |
| **Email** | `spring-boot-starter-mail` → SMTP → **MailHog** (dev mail catcher) |
| **Frontend** | React **18** · Vite 5 · React Router 6 · axios · Tailwind CSS 3 |
| **Infra** | Docker Compose — `mysql` + `backend` + `frontend` + `mailhog` |

---

## 3. Repository layout

```
iob-portal/
├── HANDOVER.md                ← this file
├── mockups.html               ← original single-file prototype, design reference only
├── docker-compose.yml         ← mysql + backend + frontend + mailhog
├── .env.example               ← copy to .env to override defaults
├── .gitignore
│
├── backend/                   ← Spring Boot 3.2 + Java 17 + Maven
│   ├── pom.xml
│   ├── Dockerfile             ← multi-stage: maven build → JRE alpine runtime
│   ├── .dockerignore
│   └── src/main/
│       ├── resources/
│       │   ├── application.yml
│       │   ├── data/
│       │   │   ├── states.json    ← 36 Indian states/UTs
│       │   │   └── cities.json    ← 315 major cities mapped to states
│       │   └── db/migration/
│       │       ├── V1__init_schema.sql
│       │       ├── V2__branches.sql
│       │       └── V3__user_must_change_password.sql
│       └── java/com/bijlipay/iob/
│           ├── IobPortalApplication.java   (@SpringBootApplication @EnableAsync)
│           ├── config/
│           │   ├── SecurityConfig.java     (JWT filter, CORS, @EnableMethodSecurity)
│           │   └── BootstrapRunner.java    (seeds 4 demo users if users table empty)
│           ├── common/
│           │   ├── dto/PageResponse.java
│           │   └── exception/ (ApiException, ApiError, GlobalExceptionHandler)
│           ├── auth/
│           │   ├── AuthController.java     (login, verify-otp, change-password, me)
│           │   ├── AuthService.java
│           │   ├── JwtService.java         (PURPOSE: ACCESS | OTP_CHALLENGE | CHANGE_PASSWORD)
│           │   ├── JwtAuthFilter.java
│           │   └── dto/ (LoginRequest, LoginResponse, OtpVerifyRequest,
│           │            ChangePasswordRequest, MeResponse)
│           ├── user/
│           │   ├── User.java               (id, email, passwordHash, role, status,
│           │   │                            displayName, mobile, soleId,
│           │   │                            mustChangePassword, createdAt, updatedAt)
│           │   ├── Role.java               (ADMIN | BRANCH_MANAGER)
│           │   ├── UserStatus.java         (ACTIVE | INACTIVE)
│           │   ├── UserRepository.java     (extends JpaSpecificationExecutor)
│           │   ├── UserSpecifications.java
│           │   ├── UserService.java        (list with branch enrichment, create + email)
│           │   ├── UserBulkService.java    (POI template + bulk import with async emails)
│           │   ├── UserController.java     (@PreAuthorize hasRole ADMIN)
│           │   └── dto/ (UserCreateRequest, UserResponse, UserBulkImportResponse)
│           ├── branch/
│           │   ├── Branch.java             (id, soleId UNIQUE, branchName, city, state,
│           │   │                            pincode, status, createdAt, updatedAt)
│           │   ├── BranchStatus.java       (ACTIVE | INACTIVE)
│           │   ├── BranchRepository.java
│           │   ├── BranchSpecifications.java
│           │   ├── BranchService.java
│           │   ├── BranchBulkService.java  (POI template + bulk import)
│           │   ├── BranchController.java
│           │   └── dto/ (BranchRequest, BranchResponse, BulkImportResponse)
│           ├── reference/
│           │   ├── ReferenceService.java   (loads states.json + cities.json on @PostConstruct)
│           │   ├── ReferenceController.java
│           │   └── dto/CityRef.java
│           └── email/
│               └── EmailService.java       (@Async sendWelcomeEmail)
│
└── frontend/                  ← React 18 + Vite + Tailwind
    ├── package.json
    ├── vite.config.js         ← dev proxy /api → backend
    ├── tailwind.config.js     ← bp-purple / iob-blue tokens
    ├── postcss.config.js
    ├── index.html
    ├── Dockerfile             ← node:20-alpine, npm install + dev server
    └── src/
        ├── main.jsx           ← React + Router + AuthProvider boot
        ├── App.jsx            ← Routes (login + protected layout + role-guarded pages)
        ├── index.css          ← Tailwind directives + brand vars
        ├── api/
        │   ├── client.js      ← axios; 401 interceptor clears token + redirects
        │   ├── auth.js        ← login / verifyOtp / changePassword / me
        │   ├── branches.js    ← list / create / template / bulkImport
        │   ├── users.js       ← list / create / template / bulkImport
        │   └── reference.js   ← states / cities
        ├── auth/
        │   ├── AuthContext.jsx   ← user + login() + logout(), hydrates via /me on boot
        │   ├── ProtectedRoute.jsx
        │   └── RoleGuard.jsx
        ├── components/
        │   ├── Layout.jsx        ← Header + Sidebar + main outlet + footer
        │   ├── Header.jsx        ← brand bar + user dropdown w/ logout
        │   ├── Sidebar.jsx       ← role-filtered NAV_ITEMS
        │   ├── Modal.jsx         ← backdrop + esc + click-outside-to-close
        │   ├── Autocomplete.jsx  ← static OR async, kbd nav, allowFree flag
        │   └── PlaceholderPage.jsx
        ├── config/
        │   └── navigation.js     ← NAV_ITEMS with per-item roles array
        └── pages/
            ├── Login.jsx          ← 3 steps: CREDENTIALS → OTP/CHANGE_PASSWORD → DONE
            ├── Dashboard.jsx      ← stub KPIs (no live data yet)
            ├── branches/
            │   ├── BranchesPage.jsx
            │   ├── CreateBranchModal.jsx
            │   └── BulkUploadModal.jsx
            └── users/
                ├── UsersPage.jsx
                ├── CreateUserModal.jsx
                └── BulkUploadUserModal.jsx
```

---

## 4. How to run

### One-command start (Docker Compose)
```powershell
cd C:\Users\sarve\Downloads\AI-Projects\iob-portal
docker compose up --build
```

Wait ~20 seconds for backend (Spring Boot starts in ~13s, plus Maven build first time). Then open **http://localhost:5173**.

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:5173 | React app |
| Backend API | http://localhost:8080 | Spring Boot REST |
| MailHog UI | http://localhost:8025 | Inspect outgoing emails |
| MySQL | localhost:3306 | DB: `iob_portal`, user `iob` / pass `iobpass` |

### Local dev (without docker)
1. Run MySQL via `docker compose up mysql mailhog` then keep it running.
2. Backend: `cd backend && mvn spring-boot:run`
3. Frontend: `cd frontend && npm install && npm run dev`

### Rebuild only the backend (after Java change)
```powershell
docker compose up -d --build backend
```

---

## 5. Demo credentials & login flows

The `BootstrapRunner` creates these users only when the `users` table is empty. They were seeded on first startup.

| Role | Email | Password | Login flow |
|------|-------|----------|-----------|
| **Admin** | `rejin@bijlipay.co.in` | `Bijli@123` | Credentials → **OTP step** (any 6 digits) → Dashboard |
| **Branch Manager** | `ravi.kumar@iob.in` | `Branch@123` | Direct → Dashboard |
| **Branch Manager** | `branch.user@iob.in` | `Branch@123` | Direct → Dashboard |
| **Inactive demo** | `anitha.s@iob.in` | `Branch@123` | Blocked (403 "Your account is inactive") |

**Default password for users created via the Admin → User Management UI:** `Welcome@123` (configurable via `USER_DEFAULT_PASSWORD`). They are forced to change it on first login.

### Login state machine

```
POST /api/auth/login
  ├─ inactive       → 403
  ├─ wrong creds    → 401
  ├─ mustChangePw   → step: CHANGE_PASSWORD, changeToken (15 min JWT)
  ├─ role=ADMIN     → step: OTP, challengeToken (5 min JWT)
  └─ role=BRANCH_MANAGER → step: DONE, token (2 hr JWT) + user

POST /api/auth/verify-otp
  (requires challengeToken; any 6 digits accepted — mock OTP)
  ├─ mustChangePw   → step: CHANGE_PASSWORD
  └─ ok             → step: DONE

POST /api/auth/change-password
  (requires changeToken)
  ├─ ok + ADMIN     → step: OTP (still needs OTP after change)
  └─ ok + BRANCH    → step: DONE
```

---

## 6. Modules built so far

### ✅ 6.1 Auth (`/login`)
- Credentials, OTP step (mock — any 6 digits), forced password change on first login
- JWT in `localStorage` (`iob.token`)
- AuthContext rehydrates on page reload by calling `/api/auth/me`
- 401 from any API call → token cleared, redirect to `/login`

### ✅ 6.2 Branch Management (`/branches`) — Admin only
- `BranchesPage` — table with search (Sole ID / Branch name), filters (City autocomplete, State autocomplete, Active/Inactive pills), pagination
- Empty state with 🏛️ icon and "No branch added"
- `CreateBranchModal` — Sole ID, Branch Name, City (autocomplete from ~315 cities), State (autocomplete from 36 states/UTs), Pincode (6-digit), Status. Backend validates state against the canonical list.
- `BulkUploadModal` — download POI-generated template (purple header, Instructions sheet, status dropdown via data validation), drag-drop / browse upload, single-shot import returns `{ imported[], failed[] }`. Failed rows highlight missing-required-field cells in red.

**Endpoints:**
- `GET    /api/branches?q=&city=&state=&status=&page=&size=`
- `POST   /api/branches` (BranchRequest)
- `GET    /api/branches/{id}`
- `GET    /api/branches/template` → xlsx download
- `POST   /api/branches/bulk-import` (multipart `file`)

### ✅ 6.3 User Management (`/users`) — Admin only
- `UsersPage` — table (User Name, Email, Mobile, Sole ID, Branch, City, State, Status), text search across email/name/mobile/soleId, City + State filters (which resolve to matching Sole IDs and then filter users), pagination, "Pending PW" chip on users who haven't changed default password
- `CreateUserModal` — **Sole ID autocomplete fetches from `/api/branches?q=&status=ACTIVE`**. When selected, the modal shows a "Selected branch" preview card with Branch Name, City, State, Pincode, Status. Then User Name, Email, 10-digit Mobile. Role is locked to "Branch Manager".
- On create: password hash = `BCrypt(Welcome@123)`, `mustChangePassword=true`, and an async welcome email goes out via MailHog.
- `BulkUploadUserModal` — same UX as branch bulk upload. Each successful row triggers an async welcome email. MailHog accumulates them at http://localhost:8025.

**Endpoints:**
- `GET    /api/users?q=&city=&state=&page=&size=`
- `POST   /api/users` (UserCreateRequest)
- `GET    /api/users/template`
- `POST   /api/users/bulk-import`

### ✅ 6.4 Reference data — All authenticated users
- `GET /api/reference/states` → 36 strings
- `GET /api/reference/cities?q=&state=&limit=` → array of `{ name, state }`
- Loaded once from classpath JSON at startup. To extend: edit `backend/src/main/resources/data/cities.json` and rebuild backend.

---

## 7. Modules NOT yet built (next-up backlog)

The sidebar shows these for Admin; they currently render `PlaceholderPage`. Build them in the same pattern as Branches/Users.

| Module | Path | Role visibility | Notes |
|--------|------|-----------------|-------|
| Dashboard live data | `/dashboard` | both | KPIs/charts/aging trackers currently mocked. Wire to real counts from `branches`, `users`, future `leads`, `terminals`, `transactions`. |
| Bank Lead Entry | `/lead-entry` | both | Single + bulk lead capture. Branch users locked to own Sole ID. Pincode → city/state/region auto-fill. Assigns RSM by region. Generates `LD-XXXXX` Lead ID. |
| Status Tracker | `/status-tracker` | both | Tabs: **Lead Status** (17 cols, 7-stage pipeline + Refer Back) and **Terminal Status** (14 cols, 4-stage pipeline). Per-row Timeline modal. |
| Merchant Details | `/merchants` | admin | 13 cols (TID, MID, Sole ID, etc.). Download Report (date range → xlsx). |
| Transactions | `/transactions` | admin | 12 cols with MTI (100=UPI, 200=Card). Card masking + brand badges. Download Report. |
| Settled Transactions | `/settled` | admin | 15 cols including MDR, GST, Net Amount. 3 KPI cards. Download Report. |

See `mockups.html` for visual/UX reference of all of these.

---

## 8. Architecture patterns

### How to add a new module (the established recipe)

Copy the Branches/Users pattern. For a module `Foo`:

**Backend** (`com.bijlipay.iob.foo`):
1. Add Flyway migration `V{N}__foos.sql` with table + indexes.
2. `Foo.java` entity with `@Entity @Table` and lifecycle hooks for createdAt/updatedAt.
3. `FooStatus` enum if applicable, annotated with `@JdbcTypeCode(SqlTypes.VARCHAR)` to avoid the MySQL native ENUM trap (see Gotcha #1).
4. `FooRepository extends JpaRepository<Foo, Long>, JpaSpecificationExecutor<Foo>`.
5. `FooSpecifications` static class with composable predicates.
6. DTOs: `FooRequest`, `FooResponse`, `FooBulkImportResponse` (if bulk).
7. `FooService` (transactional, with `PageResponse.of(page, mapper)`).
8. `FooController` annotated `@PreAuthorize("hasRole('ADMIN')")` (or whatever role).
9. For bulk: `FooBulkService` extends the POI template pattern from `BranchBulkService` / `UserBulkService`. Single-shot import returning `{ imported, failed }`.

**Frontend** (`src/pages/foos/`):
1. `src/api/foos.js` — typed methods.
2. `pages/foos/FoosPage.jsx` — search + filter form + table + pagination + empty state.
3. `pages/foos/CreateFooModal.jsx` — uses `<Autocomplete>` for any reference fields.
4. `pages/foos/BulkUploadFooModal.jsx` — single-shot import with imported/failed result view.
5. Wire route in `src/App.jsx` (wrapped in `<RoleGuard>` if admin-only).
6. Add a `NAV_ITEMS` entry in `src/config/navigation.js` with the `roles` array.

### JWT purpose claims
Every token includes a `purpose` claim. The `JwtAuthFilter` only authenticates requests with `purpose=ACCESS`. The other purposes are used as challenge tokens that gate specific public endpoints:
- `OTP_CHALLENGE` — gates `POST /api/auth/verify-otp` (5 min TTL)
- `CHANGE_PASSWORD` — gates `POST /api/auth/change-password` (15 min TTL)
- `ACCESS` — used by `JwtAuthFilter` to populate `SecurityContextHolder` (configurable TTL, default 120 min)

### Method security
`@EnableMethodSecurity` is on `SecurityConfig`. Use `@PreAuthorize("hasRole('ADMIN')")` on controllers/methods. The JWT filter adds `ROLE_ADMIN` / `ROLE_BRANCH_MANAGER` authorities derived from the `role` claim.

### Frontend Autocomplete contract
`<Autocomplete>` accepts either:
- `options={array}` — static list, in-memory filter by `getLabel(item).toLowerCase().includes(query)`, OR
- `fetchOptions={async (query) => items[]}` — debounced 150ms remote call

For the Sole ID picker in `CreateUserModal`, the autocomplete passes the **full branch object** to `onChange` when an item is picked, so the form can render the "Selected branch" preview without a follow-up API call.

### Bulk upload pattern (single-shot)
Server-side: parse all rows up front, validate, save valid ones row-by-row (so a single DB error doesn't kill the whole batch), return `{ totalRows, importedCount, failedCount, imported[], failed[{ rowNumber, data, errors[], missingFields[] }] }`. Frontend highlights `missingFields` in red.

---

## 9. Environment variables

Copy `.env.example` to `.env` to override defaults. All are also defaulted inline in `docker-compose.yml`.

| Var | Default | Purpose |
|-----|---------|---------|
| `DB_NAME` | `iob_portal` | MySQL DB name |
| `DB_USER` / `DB_PASSWORD` | `iob` / `iobpass` | App DB user |
| `MYSQL_ROOT_PASSWORD` | `rootpass` | MySQL root |
| `JWT_SECRET` | (long dev string) | HMAC SHA-256 signing key. Must be ≥ 256 bits. |
| `JWT_EXPIRY_MINUTES` | `120` | Access token TTL |
| `BOOTSTRAP_ENABLED` | `true` | If true, seed demo users when users table is empty |
| `MAIL_HOST` / `MAIL_PORT` | `mailhog` / `1025` | SMTP target |
| `MAIL_AUTH` / `MAIL_STARTTLS` | `false` / `false` | MailHog needs neither |
| `EMAIL_ENABLED` | `true` | Set false to suppress all outgoing email |
| `EMAIL_FROM` / `EMAIL_FROM_NAME` | `no-reply@bijlipay.local` / `Bijlipay IOB Portal` | Welcome email sender |
| `FRONTEND_BASE_URL` | `http://localhost:5173` | Used in welcome email login link |
| `USER_DEFAULT_PASSWORD` | `Welcome@123` | New users get this; must change on first login |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | CSV list |

---

## 10. Known issues & gotchas

1. **Hibernate 6 + MySQL ENUM trap.** When using `@Enumerated(EnumType.STRING)` on MySQL, Hibernate 6 will validate the column as a native `ENUM(...)` type unless you also annotate with `@JdbcTypeCode(SqlTypes.VARCHAR)`. Already done on `User.role`, `User.status`, `Branch.status`. Apply to all future enum columns.

2. **CommandLineRunner bootstrap is idempotent but path-dependent.** It only seeds when `users.count() == 0`. If you want to reseed after manual deletions, drop the DB volume: `docker compose down -v`.

3. **`anyRequest().authenticated()` blocks reference endpoints for anonymous users.** This is intentional — even `/api/reference/states` needs a valid JWT. The login response includes the JWT directly, so by the time the user lands on the Branches page, they're authenticated.

4. **MailHog is dev-only.** It accepts SMTP without auth/TLS. For real deploys, switch `MAIL_HOST` to a real SMTP server and set `MAIL_AUTH=true`, `MAIL_STARTTLS=true`, plus `MAIL_USERNAME` / `MAIL_PASSWORD`.

5. **Bulk imports run synchronously in the request thread.** Welcome emails are `@Async` so they don't block. For very large files (>1000 rows) consider streaming or backgrounding the whole import — not built yet.

6. **City list is curated, not exhaustive.** 315 cities covers tier-1 and tier-2. Free text is allowed (autocomplete suggests, doesn't enforce). To extend: edit `backend/src/main/resources/data/cities.json` and rebuild.

7. **State list IS strict.** Backend validates against the canonical 36 states/UTs on `Branch` creation — typos fail with a 400.

8. **Mockups.html is OUT OF DATE relative to the new build.** It still references the old in-memory `window.__*` stores and the old menu structure. Use it for visual UX reference only, not for data structures or behavior.

9. **No tests yet.** No unit tests, no integration tests. Adding `@SpringBootTest` + Testcontainers for MySQL would be a sensible early-add when you start touching critical business logic (lead pipeline, settlement math).

---

## 11. Recent change history (most recent first)

1. **User Management built** — list/search/filter (with City/State filter resolved to matching Sole IDs), Sole ID autocomplete in Create User with branch preview card, single + bulk creation, async welcome emails via MailHog, forced password change on first login (third login step `CHANGE_PASSWORD`)
2. **MailHog added to docker-compose** — SMTP 1025, web UI 8025
3. **`spring-boot-starter-mail` + `EmailService`** added (async, HTML email)
4. **`must_change_password` column** added to `users` table (V3 migration)
5. **`POST /api/auth/change-password`** endpoint + `CHANGE_PASSWORD` JWT purpose
6. **Branch Management built** — POI template, single + bulk creation, search by Sole ID/Branch name, filter by City (autocomplete) + State (autocomplete), Active/Inactive pills
7. **Reference data** — `states.json` + `cities.json` loaded at startup, `/api/reference/{states,cities}` endpoints, `<Autocomplete>` component
8. **Apache POI added** for template generation & xlsx parsing
9. **Hibernate enum-column fix** — added `@JdbcTypeCode(SqlTypes.VARCHAR)` to all enum fields (was failing schema validation against varchar columns)
10. **Initial auth scaffold** — Spring Boot 3.2 + Java 17 + Maven; React 18 + Vite + Tailwind; JWT login; OTP for admin; role-locked sidebar; protected routes; `BootstrapRunner` seeds 4 demo users; Docker Compose with mysql + backend + frontend

---

## 12. For the next session: where to pick up

1. **Read** this HANDOVER fully, then skim `mockups.html` section 7 (screens 7.1–7.12) for visual reference.
2. **Verify** docker compose comes up clean:
   ```powershell
   docker compose up --build
   ```
   Hit http://localhost:5173, log in as Admin → walk through Branches and Users to confirm the existing modules work.
3. **Ask the user which module to build next.** Most natural next steps:
   - **Bank Lead Entry** — biggest module, creates the core `leads` table that powers Status Tracker, Dashboard KPIs, and downstream merchant onboarding. Building this unlocks the rest.
   - **Dashboard live data** — quick win, mostly counting existing tables. Good warmup before tackling Lead Entry.
   - **Status Tracker** — depends on `leads` and `terminals` tables existing, so build after Lead Entry.
4. **Follow the recipe in §8** to add each module. Stay consistent with the established patterns (PageResponse, Specifications, POI bulk pattern, single-shot import with imported/failed result view, autocomplete for reference fields, modals with `<Modal>`).

---

## 13. Contact & ownership

- **Current account / project owner:** `yogeshgupta@bijlipay.co.in`
- **Project owner (original prototype):** Rejin Raj (`rejin@bijlipay.co.in`)
- **Vendor:** Skilworth Technologies Pvt. Ltd. (Bijlipay)
- **Repo location:** local file system at `C:\Users\sarve\Downloads\AI-Projects\iob-portal\` (no git remote configured yet)
- **Single source of truth:** `backend/` + `frontend/` source. `mockups.html` is a design reference only.

---

*End of handover document. Run `docker compose up --build`, open http://localhost:5173, and you're rolling.*
