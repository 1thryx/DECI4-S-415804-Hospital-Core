# 🏥 Hospital Core — Cloud-Native Healthcare Management Platform

A production-shaped healthcare management system: a React SPA, an Express MVC API, a
decoupled appointment-booking microservice, MongoDB, full Docker containerisation,
local Kubernetes orchestration with autoscaling and TLS ingress, and a CI/CD pipeline
that gates every merge on tests, Lighthouse scores, image builds, and manifest validation.

> **Repository naming:** rename the repo to `<Student-ID>-Hospital-Core`
> (e.g. `2021456-Hospital-Core`) before submitting.

---

## Table of contents

1. [Features](#1-features)
2. [Architecture](#2-architecture)
3. [Repository structure](#3-repository-structure)
4. [Quick start](#4-quick-start)
5. [Environment variables](#5-environment-variables)
6. [API documentation](#6-api-documentation)
7. [Testing](#7-testing)
8. [Docker](#8-docker)
9. [Kubernetes](#9-kubernetes)
10. [CI/CD](#10-cicd)
11. [Cloud deployment](#11-cloud-deployment)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Features

**Clinical**
- Doctor dashboard — live ward statistics, today's clinic list, load by specialty, audit feed
- Patient management — register, search, archive, full clinical timeline
- Appointment scheduling — book, reschedule, check in, complete, cancel
- Medical histories — diagnoses, prescriptions, lab results, procedures, notes
- Audit logging — every mutating request recorded with actor, status, and IP

**Engineering**
- MVC backend (routes → controllers → models) with centralised error translation
- Appointment booking decoupled into an independently deployable microservice
- React Query caching with **optimistic UI** on all five critical mutations
- Multi-stage Docker builds, non-root runtime users, health checks
- Kubernetes: HPA autoscaling, rolling zero-downtime updates, NetworkPolicies, TLS ingress
- CI: 46 automated tests, Lighthouse CI thresholds, image builds, manifest validation
- Automated semantic versioning with generated changelogs

---

## 2. Architecture

```mermaid
graph TB
    subgraph CLIENT["Browser"]
        SPA["React 18 SPA<br/>React Router · React Query"]
    end

    subgraph EDGE["Edge — public"]
        ING["NGINX Ingress<br/>TLS termination"]
    end

    subgraph APP["Application tier — private"]
        FE["frontend<br/>nginx :80"]
        CORE["hospital-core API<br/>Express MVC :5000"]
        APPT["appointment-service<br/>Express :5001"]
    end

    subgraph DATA["Data tier — private"]
        MONGO[("MongoDB<br/>patients · doctors · appointments<br/>histories · auditlogs")]
    end

    SPA -->|HTTPS| ING
    ING -->|"/"| FE
    ING -->|"/api"| CORE
    CORE -->|booking writes| APPT
    APPT -->|"validate refs"| CORE
    CORE --> MONGO
    APPT --> MONGO

    classDef edge fill:#fde8e8,stroke:#b02a37,stroke-width:2px
    classDef app fill:#e3effa,stroke:#0f4c81,stroke-width:2px
    classDef data fill:#e0f3ea,stroke:#1a6b4a,stroke-width:3px
    class ING edge
    class FE,CORE,APPT app
    class MONGO data
```

**Deeper diagrams:**
- [`infra/docs/architecture.md`](infra/docs/architecture.md) — MVC layering, booking sequence diagram, ER model, cache strategy
- [`infra/docs/vpc-blueprint.md`](infra/docs/vpc-blueprint.md) — VPC subnets, security groups, public/private boundary

### Docker container boundaries

```
┌──────────────────── hospital-net (bridge) ─────────────────────┐
│                                                                │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │   frontend     │  │    backend     │  │ appointment-     │ │
│  │  node:20-alpine│  │ node:20-alpine │  │ service          │ │
│  │  vite :5173    │──│  express :5000 │──│ express :5001    │ │
│  └────────────────┘  └───────┬────────┘  └────────┬─────────┘ │
│         ▲                    │                    │           │
│         │                    ▼                    ▼           │
│         │            ┌───────────────────────────────┐        │
│         │            │      mongo :27017             │        │
│         │            │   volume: mongo-data          │        │
│         │            └───────────────────────────────┘        │
└─────────┼──────────────────────────────────────────────────────┘
          │
      host :5173                      published: 5173, 5000, 5001, 27017*
                                      * 27017 is dev-convenience only
```

---

## 3. Repository structure

```
<Student-ID>-Hospital-Core/
├── frontend/                       React SPA
│   ├── src/
│   │   ├── components/             DoctorDashboard · PatientManagement
│   │   │                           AppointmentScheduling · PatientDetail · StatCard
│   │   ├── hooks/                  React Query hooks + optimistic mutations
│   │   ├── api/client.js           single fetch wrapper
│   │   ├── __tests__/              Jest + React Testing Library (17 tests)
│   │   ├── App.jsx · main.jsx · styles.css
│   ├── Dockerfile                  multi-stage → nginx
│   ├── Dockerfile.dev              Vite dev server + HMR
│   ├── nginx.conf · netlify.toml · vite.config.js · babel.config.cjs
│
├── backend/                        Core API (MVC)
│   ├── src/
│   │   ├── models/                 Patient · Doctor · Appointment
│   │   │                           MedicalHistory · AuditLog
│   │   ├── controllers/            patient · doctor · appointment · stats
│   │   ├── routes/                 route definitions + validation rules
│   │   ├── middleware/             validate · audit · errorHandler
│   │   ├── config/db.js · utils/asyncHandler.js · app.js
│   ├── tests/                      integration + E2E (21 tests)
│   ├── seed.js                     mock clinical data
│   ├── postman_collection.json     API integration collection
│   ├── Dockerfile · Dockerfile.dev · vercel.json · server.js
│
├── services/
│   └── appointment-service/        independently deployable microservice
│       ├── src/{models,controllers,routes,config}
│       ├── tests/                  booking rule tests (8 tests)
│       ├── Dockerfile · server.js · package.json
│
├── infra/
│   ├── k8s/                        00-namespace → 07-network-policy
│   ├── scripts/                    deploy-minikube · verify-cluster
│   │                               load-test · generate-certs
│   └── docs/                       architecture.md · vpc-blueprint.md
│
├── .github/workflows/
│   ├── test.yml                    CI: tests · Lighthouse · images · manifests
│   └── release.yml                 semantic-release + changelog
│
├── docker-compose.yml · lighthouserc.js · .releaserc.json
└── .env.example · package.json · README.md
```

---

## 4. Quick start

### Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| Node.js | ≥ 20 | Local development |
| npm | ≥ 10 | Package management |
| MongoDB | 7.x | Local database (or use Docker) |
| Docker + Compose | latest | Containerised stack |
| Minikube + kubectl | latest | Kubernetes deployment |

### Option A — Docker Compose (recommended)

```bash
git clone <your-repo-url>
cd <Student-ID>-Hospital-Core

docker compose up --build          # mongo + API + booking service + UI
docker compose run --rm seed       # populate mock clinical data
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Core API | http://localhost:5000/api/health |
| Appointment service | http://localhost:5001/health |
| MongoDB | mongodb://localhost:27017/hospital |

Hot reload is active: edit any file under `frontend/src` or `backend/src` and the
change appears without rebuilding the image.

```bash
docker compose down -v             # stop and remove volumes
```

### Option B — Local Node

```bash
cp .env.example .env               # then edit MONGO_URI if needed
npm run install:all

# Terminal 1 — MongoDB
mongod --dbpath ./data

# Terminal 2 — core API
npm run dev:backend                # :5000

# Terminal 3 — appointment microservice
npm run dev:appointments           # :5001

# Terminal 4 — frontend
npm run dev:frontend               # :5173

# Seed mock data
npm run seed
```

> Running the core API alone works fine: leave `APPOINTMENT_SERVICE_URL` unset and
> booking is handled in-process.

---

## 5. Environment variables

Full annotated template: [`.env.example`](.env.example). Copy it with `cp .env.example .env`.

### Backend — `backend/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `5000` | API listen port |
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test` |
| `MONGO_URI` | **yes** | — | MongoDB connection string |
| `CORS_ORIGINS` | no | `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins |
| `APPOINTMENT_SERVICE_URL` | no | *(unset)* | Booking service URL. **Unset ⇒ monolith mode** |
| `APPOINTMENT_SERVICE_TIMEOUT_MS` | no | `5000` | Proxy timeout |

**`MONGO_URI` by environment**

```bash
mongodb://localhost:27017/hospital                    # local
mongodb://mongo:27017/hospital                        # docker compose
mongodb://mongo-service:27017/hospital                # kubernetes
mongodb+srv://USER:PASS@cluster.mongodb.net/hospital?retryWrites=true&w=majority   # atlas
```

### Appointment service — `services/appointment-service/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `5001` | Service listen port |
| `MONGO_URI` | **yes** | — | Same database as the core API |
| `CORE_API_URL` | no | `http://localhost:5000/api` | Used to validate patient/doctor references |
| `SKIP_CORE_VALIDATION` | no | `false` | `true` only in isolated tests |

### Frontend — `frontend/.env`

Vite exposes only `VITE_`-prefixed variables, and **bakes them in at build time** —
changing one requires a rebuild, not a restart.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `/api` | API base URL compiled into the bundle |
| `VITE_PROXY_TARGET` | `http://localhost:5000` | Dev-server proxy target |

```bash
# frontend/.env — local
VITE_API_URL=/api
VITE_PROXY_TARGET=http://localhost:5000

# frontend/.env.production — Netlify
VITE_API_URL=https://your-api.vercel.app/api
```

---

## 6. API documentation

**Base URL:** `http://localhost:5000/api` (local) · `https://your-api.vercel.app/api` (production)

All responses share one envelope:

```jsonc
// success
{ "success": true, "data": { /* … */ } }

// failure
{ "success": false, "error": "Human-readable message", "details": [ /* optional */ ] }
```

| Code | Meaning |
|---|---|
| `200` | OK |
| `201` | Created |
| `400` | Malformed request (bad ObjectId, invalid date) |
| `404` | Resource not found |
| `409` | Conflict (slot taken, duplicate key, inactive doctor) |
| `422` | Validation failed — see `details[]` |
| `429` | Rate limit exceeded (500 requests / 15 min) |
| `503` | Database or dependency unavailable |

### Endpoint index

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Liveness + DB status |
| `GET` | `/patients` | List (`?search=`, `?status=`, `?page=`, `?limit=`) |
| `POST` | `/patients` | Register a patient |
| `GET` | `/patients/:id` | Patient + history + appointments |
| `PUT` | `/patients/:id` | Update |
| `DELETE` | `/patients/:id` | Archive (soft delete) |
| `GET` | `/patients/:id/history` | Clinical timeline |
| `POST` | `/patients/:id/history` | File a clinical record |
| `GET` | `/doctors` | List (`?specialty=`, `?active=`) |
| `POST` | `/doctors` | Add a clinician |
| `GET` | `/doctors/:id` | Single clinician |
| `PUT` | `/doctors/:id` | Update |
| `GET` | `/doctors/:id/schedule` | Day schedule (`?date=YYYY-MM-DD`) |
| `GET` | `/appointments` | List (`?status=`, `?doctor=`, `?patient=`, `?from=`, `?to=`) |
| `POST` | `/appointments` | Book |
| `GET` | `/appointments/:id` | Single appointment |
| `PUT` | `/appointments/:id` | Reschedule |
| `PATCH` | `/appointments/:id/status` | Change status |
| `DELETE` | `/appointments/:id` | Cancel |
| `GET` | `/stats/dashboard` | Dashboard aggregates |
| `GET` | `/stats/patient-flow` | Trend data (`?days=7`) |

---

### `GET /api/health`

```bash
curl http://localhost:5000/api/health
```

```json
{
  "success": true,
  "service": "hospital-core-api",
  "version": "1.0.0",
  "database": "connected",
  "appointmentService": "delegated",
  "uptime": 132.4,
  "timestamp": "2026-07-22T09:14:03.118Z"
}
```

---

### `POST /api/patients`

```bash
curl -X POST http://localhost:5000/api/patients \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ziad",
    "lastName": "Hafez",
    "dateOfBirth": "1991-09-17",
    "gender": "male",
    "email": "ziad.hafez@example.com",
    "phone": "+20 100 666 7788",
    "bloodType": "A-",
    "allergies": ["iodine"]
  }'
```

**`201 Created`**

```json
{
  "success": true,
  "data": {
    "_id": "66c1f4a2e8b9d3f1a2c45678",
    "mrn": "MRN-LX8K2P-4471",
    "firstName": "Ziad",
    "lastName": "Hafez",
    "fullName": "Ziad Hafez",
    "dateOfBirth": "1991-09-17T00:00:00.000Z",
    "gender": "male",
    "email": "ziad.hafez@example.com",
    "phone": "+20 100 666 7788",
    "bloodType": "A-",
    "allergies": ["iodine"],
    "status": "active",
    "createdAt": "2026-07-22T09:14:03.118Z",
    "updatedAt": "2026-07-22T09:14:03.118Z"
  }
}
```

**`422 Unprocessable Entity`**

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    { "field": "email", "message": "A valid email is required" },
    { "field": "phone", "message": "Phone is required" }
  ]
}
```

The `mrn` is generated server-side — never send one.

---

### `GET /api/patients?search=Hafez`

```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "page": 1,
  "data": [
    {
      "_id": "66c1f4a2e8b9d3f1a2c45678",
      "mrn": "MRN-LX8K2P-4471",
      "firstName": "Ziad",
      "lastName": "Hafez",
      "fullName": "Ziad Hafez",
      "bloodType": "A-",
      "status": "active"
    }
  ]
}
```

`search` matches first name, last name, MRN, or email, case-insensitively.

---

### `GET /api/patients/:id`

Returns the patient with their history and appointments already populated — one
request renders the whole detail view.

```json
{
  "success": true,
  "data": {
    "_id": "66c1f4a2e8b9d3f1a2c45678",
    "mrn": "MRN-LX8K2P-4471",
    "fullName": "Ziad Hafez",
    "allergies": ["iodine"],
    "status": "active",
    "history": [
      {
        "_id": "66c1f6b1e8b9d3f1a2c4567a",
        "type": "diagnosis",
        "title": "Essential hypertension",
        "icd10Code": "I10",
        "description": "BP 148/94 on repeat measurement.",
        "recordedAt": "2026-07-22T09:20:11.402Z",
        "doctor": { "_id": "66c1f3…", "firstName": "Laila", "lastName": "Hassan", "specialty": "General Medicine" }
      }
    ],
    "appointments": [
      {
        "_id": "66c1f5c3e8b9d3f1a2c45679",
        "scheduledFor": "2026-07-22T11:00:00.000Z",
        "reason": "New patient intake",
        "status": "completed",
        "doctor": { "firstName": "Laila", "lastName": "Hassan", "specialty": "General Medicine" }
      }
    ]
  }
}
```

---

### `POST /api/appointments`

```bash
curl -X POST http://localhost:5000/api/appointments \
  -H "Content-Type: application/json" \
  -d '{
    "patient": "66c1f4a2e8b9d3f1a2c45678",
    "doctor": "66c1f3b0e8b9d3f1a2c45670",
    "scheduledFor": "2026-07-23T11:00:00.000Z",
    "durationMinutes": 30,
    "reason": "Blood pressure review"
  }'
```

**`201 Created`**

```json
{
  "success": true,
  "data": {
    "_id": "66c1f5c3e8b9d3f1a2c45679",
    "patient": { "_id": "66c1f4a2…", "firstName": "Ziad", "lastName": "Hafez", "mrn": "MRN-LX8K2P-4471" },
    "doctor": { "_id": "66c1f3b0…", "firstName": "Laila", "lastName": "Hassan", "specialty": "General Medicine" },
    "scheduledFor": "2026-07-23T11:00:00.000Z",
    "durationMinutes": 30,
    "reason": "Blood pressure review",
    "status": "scheduled",
    "createdVia": "appointment-service"
  }
}
```

**`409 Conflict` — slot taken**

```json
{ "success": false, "error": "That slot is already booked for this doctor" }
```

Enforced by a unique index on `{ doctor, scheduledFor }`, so the guarantee holds even
under concurrent writes from both services.

---

### `PATCH /api/appointments/:id/status`

```bash
curl -X PATCH http://localhost:5000/api/appointments/66c1f5c3e8b9d3f1a2c45679/status \
  -H "Content-Type: application/json" \
  -d '{ "status": "checked-in" }'
```

Valid values: `scheduled` · `checked-in` · `completed` · `cancelled` · `no-show`.
Anything else returns `400`.

---

### `GET /api/stats/dashboard`

```json
{
  "success": true,
  "data": {
    "totalPatients": 12,
    "activePatients": 11,
    "totalDoctors": 6,
    "appointmentsToday": 4,
    "upcomingAppointments": 9,
    "appointmentsByStatus": { "scheduled": 9, "completed": 12, "no-show": 3 },
    "appointmentsBySpecialty": [
      { "specialty": "Cardiology", "count": 8 },
      { "specialty": "Neurology", "count": 5 }
    ],
    "recentActivity": [
      {
        "_id": "66c1f7…",
        "action": "POST /api/appointments",
        "entity": "Appointment",
        "actor": "anonymous",
        "statusCode": 201,
        "createdAt": "2026-07-22T09:25:44.001Z"
      }
    ],
    "generatedAt": "2026-07-22T09:26:00.000Z"
  }
}
```

### Postman

Import [`backend/postman_collection.json`](backend/postman_collection.json). The
**E2E clinical workflow** folder runs in order and asserts the full journey —
register doctor → register patient → book → reject double-booking → check in →
file diagnosis → verify the dashboard moved.

```bash
newman run backend/postman_collection.json --env-var baseUrl=http://localhost:5000/api
```

---

## 7. Testing

**46 automated tests across three suites.**

```bash
npm test                    # everything
npm run test:backend        # 21 — integration + E2E
npm run test:frontend       # 17 — component + optimistic UI
npm run test:appointments   #  8 — microservice booking rules
```

| Layer | Tool | Count | Covers |
|---|---|---|---|
| Component | Jest + React Testing Library | 17 | Rendering, forms, optimistic updates + rollback, error states |
| Integration | Jest + Supertest + mongodb-memory-server | 21 | Every endpoint, validation, conflicts, soft deletes |
| Microservice | Jest + Supertest | 8 | Standalone booking rules, clash detection, reschedule |
| API (manual) | Postman / Newman | 7 requests | Full E2E workflow with assertions |

No local MongoDB is needed — `mongodb-memory-server` spins up a real `mongod` in-process
and tears it down after, which is why CI runs the suite with no service containers.

### The E2E workflow test

[`backend/tests/e2e.workflow.test.js`](backend/tests/e2e.workflow.test.js) walks the
exact journey the rubric specifies, over real HTTP with nothing mocked below the transport:

1. Baseline — assert an empty hospital
2. Register a clinician
3. Onboard a patient → assert MRN generated, searchable immediately
4. Book an appointment
5. **Assert the dashboard stats moved** (patients, today's count, status, specialty breakdown)
6. Check in → assert stats shift again → complete
7. File a diagnosis and a prescription
8. Assert the patient record reflects the entire visit

```bash
cd backend && npx jest e2e.workflow --verbose
```

---

## 8. Docker

### Images

| Image | Base | Strategy |
|---|---|---|
| `backend` | `node:20-alpine` | Multi-stage; prod deps only; runs as `node` |
| `appointment-service` | `node:20-alpine` | Multi-stage; prod deps only; runs as `node` |
| `frontend` | `node:20-alpine` → `nginx:1.27-alpine` | Build stage discarded; runtime is static assets only |

Design choices worth noting:

- **Multi-stage** — the frontend runtime image has no Node, no npm, no source
- **Non-root** — containers holding patient data run as UID 1000
- **Layer caching** — `package*.json` copied before source, so code edits don't reinstall
- **Health checks** — the same definition Kubernetes probes use

### Commands

```bash
docker compose up --build            # start everything
docker compose run --rm seed         # seed the database
docker compose logs -f backend       # follow one service
docker compose ps                    # health status
docker compose down -v               # stop + wipe volumes

# build individually
docker build -t hospital-core/backend:latest ./backend
docker build -t hospital-core/frontend:latest ./frontend
docker build -t hospital-core/appointment-service:latest ./services/appointment-service
```

### Hot reloading

`docker-compose.yml` bind-mounts source into the dev containers:

```yaml
volumes:
  - ./backend:/app        # host source shadows the image
  - /app/node_modules     # anonymous volume protects container deps
```

The second line matters: without it the host directory would hide the container's
`node_modules`, and the app would fail to start. Backend uses `nodemon --legacy-watch`
and the frontend uses Vite polling, because inotify events don't cross the Docker
filesystem boundary on Windows or macOS.

---

## 9. Kubernetes

### One-command deploy

```bash
npm run k8s:deploy        # or: bash infra/scripts/deploy-minikube.sh
```

That script starts Minikube, enables `ingress` and `metrics-server`, builds images
into Minikube's Docker daemon, generates TLS certs, applies all manifests, waits for
rollouts, and seeds the database.

Then map the hostname once:

```bash
echo "$(minikube ip) hospital.local" | sudo tee -a /etc/hosts     # Linux/macOS
# Windows (Administrator): C:\Windows\System32\drivers\etc\hosts
```

Open **https://hospital.local** — the self-signed certificate warning is expected.

### Manual deploy

```bash
minikube start --cpus=4 --memory=6144
minikube addons enable ingress
minikube addons enable metrics-server      # required — the HPA has no metrics without it

eval $(minikube docker-env)                # build into the cluster's daemon
docker build -t hospital-core/backend:latest ./backend
docker build -t hospital-core/appointment-service:latest ./services/appointment-service
docker build -t hospital-core/frontend:latest ./frontend

kubectl apply -f infra/k8s/00-namespace.yaml
kubectl apply -f infra/k8s/01-config-secret.yaml
bash infra/scripts/generate-certs.sh
kubectl apply -f infra/k8s/
```

### Manifests

| File | Objects |
|---|---|
| `00-namespace.yaml` | `hospital` namespace |
| `01-config-secret.yaml` | ConfigMap + DB Secret |
| `02-mongo.yaml` | StatefulSet + PVC + headless Service |
| `03-backend.yaml` | Deployment (2 replicas) + Service + **HPA 2→10** |
| `04-appointment-service.yaml` | Deployment + Service + **HPA 2→8** |
| `05-frontend.yaml` | Deployment + Service |
| `06-ingress.yaml` | NGINX Ingress + TLS termination |
| `07-network-policy.yaml` | Public/private tier enforcement |

### Verification (record this for the demo)

```bash
npm run k8s:verify        # or: bash infra/scripts/verify-cluster.sh
```

Prints nodes, all resources, pods with IPs, ReplicaSets, HPAs, services, ingress +
TLS, PVCs, NetworkPolicies, in-cluster health probes, HTTPS through the ingress, and
recent logs.

Individually:

```bash
kubectl get all -n hospital
kubectl get pods -n hospital -o wide
kubectl get hpa -n hospital
kubectl get ingress -n hospital
kubectl describe ingress hospital-ingress -n hospital
kubectl get networkpolicy -n hospital
kubectl logs -n hospital -l app=backend --tail=50
curl -k https://hospital.local/api/health
```

### Autoscaling demo

```bash
# Terminal 1 — watch
kubectl get hpa,pods -n hospital -w

# Terminal 2 — generate load
npm run k8s:load-test
```

The backend HPA targets 60% CPU / 75% memory, scales up aggressively (100% every 30s,
30s stabilisation) and down slowly (1 pod/min, 300s stabilisation) — a brief lull in
clinic traffic should not cause pod thrash.

### Ingress & TLS

```
https://hospital.local/       → frontend-service:80
https://hospital.local/api/*  → backend-service:5000
```

`/api` is declared before `/` so the SPA catch-all cannot swallow API traffic. TLS
terminates at the ingress using the `hospital-tls` secret from
`infra/scripts/generate-certs.sh`, and `force-ssl-redirect` pushes all HTTP to HTTPS.

---

## 10. CI/CD

### `test.yml` — runs on every push and PR

| Job | Does |
|---|---|
| `backend-tests` | 21 integration + E2E tests, uploads coverage |
| `appointment-service-tests` | 8 microservice tests |
| `frontend-tests` | 17 component tests + production build |
| `lighthouse` | **Lighthouse CI against the built bundle** |
| `docker-build` | Builds all three images with layer caching |
| `manifest-validation` | `kubeconform` against the Kubernetes schema |
| `ci-status` | Single required check — fails if any job failed |

Set `ci-status` as the required status check in branch protection: one gate covering
everything, so no PR merges red.

### Lighthouse CI

[`lighthouserc.js`](lighthouserc.js) audits three routes, three runs each, against the
**production** bundle (`npm run preview`) — a dev build would report a misleadingly
poor performance score.

| Category | Threshold | Severity |
|---|---|---|
| Performance | ≥ 0.80 | **error — fails CI** |
| Accessibility | ≥ 0.90 | **error — fails CI** |
| Best Practices | ≥ 0.90 | **error — fails CI** |
| SEO | ≥ 0.80 | warn |
| Cumulative Layout Shift | ≤ 0.1 | **error** |
| `color-contrast`, `html-has-lang`, `label` | — | **error** |

Scores print to the CI log; the HTML report uploads as the `lighthouse-report` artifact.

```bash
npm run lighthouse        # run locally
```

### Semantic versioning

`release.yml` runs `semantic-release` on every push to `main`. It re-runs the test
suites first, then reads [Conventional Commits](https://www.conventionalcommits.org/)
since the last tag:

| Commit prefix | Bump | Example |
|---|---|---|
| `fix:` | **patch** — `1.0.0 → 1.0.1` | `fix(api): reject bookings for inactive doctors` |
| `feat:` | **minor** — `1.0.0 → 1.1.0` | `feat(ui): add optimistic appointment booking` |
| `feat!:` / `BREAKING CHANGE:` | **major** — `1.0.0 → 2.0.0` | `feat(api)!: move bookings to /v2` |
| `chore:`, `test:`, `ci:` | none | |

On a release it generates `CHANGELOG.md`, bumps all four `package.json` files in
lockstep, tags `v{version}`, and publishes a GitHub Release — configured in
[`.releaserc.json`](.releaserc.json).

```bash
git commit -m "feat(dashboard): add specialty load breakdown"
git commit -m "fix(booking): prevent double-booking under concurrent writes"
git commit -m "feat(api)!: rename /appointments to /bookings

BREAKING CHANGE: clients must update their endpoint paths."
```

---

## 11. Cloud deployment

| Layer | Provider |
|---|---|
| Frontend | **Netlify** |
| Backend API | **Vercel** |
| Database | **MongoDB Atlas** |

### 1. MongoDB Atlas

1. Create a free **M0** cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. **Database Access** → add a user with *Read and write to any database*
3. **Network Access** → allow `0.0.0.0/0` for the demo
   *(a real deployment restricts this to the provider's egress ranges or uses a Private Endpoint)*
4. Copy the connection string:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/hospital?retryWrites=true&w=majority
   ```
5. Seed it:
   ```bash
   cd backend
   MONGO_URI="mongodb+srv://…" node seed.js
   ```

### 2. Backend → Vercel

```bash
npm i -g vercel
cd backend
vercel --prod
```

Set in **Project Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `MONGO_URI` | your Atlas SRV string |
| `NODE_ENV` | `production` |
| `CORS_ORIGINS` | your Netlify URL |

[`vercel.json`](backend/vercel.json) routes all traffic to `server.js`, which detects
the serverless environment and connects lazily, reusing the connection across warm
invocations. Leave `APPOINTMENT_SERVICE_URL` unset — bookings run in-process.

Verify: `curl https://your-api.vercel.app/api/health`

### 3. Frontend → Netlify

```bash
npm i -g netlify-cli
cd frontend
netlify deploy --prod
```

Or connect the repo with base `frontend`, build `npm run build`, publish `dist`.

Set **one** environment variable — `VITE_API_URL` = `https://your-api.vercel.app/api` —
then **trigger a fresh deploy**. Vite bakes this in at build time, so changing it
without rebuilding has no effect.

Finally, add the Netlify URL to `CORS_ORIGINS` on Vercel and redeploy the API.

### Live URLs

> Fill these in after deploying:
>
> - **Frontend (Netlify):** `https://__________.netlify.app`
> - **Backend API (Vercel):** `https://__________.vercel.app/api/health`
> - **Database:** MongoDB Atlas — `cluster0.__________.mongodb.net`

---

## 12. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `MONGO_URI is not defined` | No `.env` | `cp .env.example .env` |
| `ECONNREFUSED 127.0.0.1:27017` | MongoDB not running | Start `mongod`, or use `docker compose up mongo` |
| Frontend loads, API calls 404 | Wrong `VITE_API_URL` | Check `frontend/.env`, then **rebuild** |
| CORS error in console | Origin not allowlisted | Add it to `CORS_ORIGINS`, restart the API |
| Hot reload not firing in Docker | inotify doesn't cross the mount | Already handled via polling — confirm the bind mount exists |
| `docker compose up` — port in use | 5000/5173/27017 taken | Change the host side of the port mapping |
| Pods stuck `ImagePullBackOff` | Images not in Minikube's daemon | `eval $(minikube docker-env)` then rebuild |
| HPA shows `<unknown>/60%` | metrics-server missing | `minikube addons enable metrics-server`, wait ~60s |
| `hospital.local` won't resolve | No hosts entry | Add `$(minikube ip) hospital.local` |
| Browser warns about the certificate | Self-signed cert | Expected — proceed, or trust the cert locally |
| Lighthouse fails CI | A score dropped below threshold | Open the `lighthouse-report` artifact for the failing audit |
| Atlas connection times out | IP not allowlisted | Add the IP under Network Access |

### Useful diagnostics

```bash
curl http://localhost:5000/api/health          # is the API up and connected?
docker compose ps                              # container health
docker compose logs -f backend                 # follow logs
kubectl get events -n hospital --sort-by=.lastTimestamp | tail -20
kubectl describe pod -n hospital -l app=backend
```

---

## License

MIT — see [`package.json`](package.json).

Built as a Level 5 final project: full-stack development, CI/CD automation,
containerisation, and Kubernetes orchestration in one deployable system.
