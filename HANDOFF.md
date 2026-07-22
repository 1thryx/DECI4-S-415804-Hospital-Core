# Hospital Core — Build Status & Handoff

**Location:** `c:\Users\Elsayad\Documents\project`
**Date:** 2026-07-22
**Status:** Code complete and verified. Remaining work is deployment + recording, which needs you.

Paste this file back into a new session to resume.

---

## What exists and is verified

**46/46 automated tests pass** (run `npm test` from the project root):

| Suite | Tests | Command |
|---|---|---|
| Backend integration + E2E | 21 | `npm run test:backend` |
| Frontend components | 17 | `npm run test:frontend` |
| Appointment microservice | 8 | `npm run test:appointments` |

Also verified: the frontend production build succeeds (`npm run build`), every JSON
config parses, and all 11 YAML files (compose, 8 k8s manifests, 2 workflows) parse.

### Rubric coverage

| Task | Requirement | Status |
|---|---|---|
| 1 | Mono-repo `/frontend` `/backend` `/infra` | ✅ built |
| 1 | React SPA — dashboard, patients, appointments | ✅ built |
| 1 | Node/Express MVC + MongoDB | ✅ built |
| 1 | Appointment microservice decoupled | ✅ `services/appointment-service/` |
| 1 | `seed.js` — patients, appointments, histories | ✅ built |
| 1 | Jest unit + integration + E2E | ✅ 46 tests passing |
| 1 | `.github/workflows/test.yml` | ✅ built |
| 1 | Lighthouse CI + semantic versioning | ✅ `lighthouserc.js`, `.releaserc.json` |
| 2 | Dockerfiles frontend + backend | ✅ multi-stage, non-root |
| 2 | `docker-compose.yml` | ✅ 4 services + seed profile |
| 2 | Hot reload via volumes | ✅ bind mounts + polling |
| 2 | VPC blueprint | ✅ `infra/docs/vpc-blueprint.md` |
| 2 | Netlify + Vercel + Atlas | ⚠️ **configs ready, not deployed — needs you** |
| 2 | React Query caching | ✅ built |
| 2 | Optimistic UI | ✅ 5 mutations |
| 3 | Minikube manifests | ✅ 8 files, schema-valid |
| 3 | ReplicaSets / autoscaling | ✅ HPA 2→10 backend, 2→8 appointments |
| 3 | NGINX Ingress + TLS secret | ✅ `06-ingress.yaml` + `generate-certs.sh` |
| 4 | Demo video | ❌ **you must record** |
| 4 | README + diagrams | ✅ full README + 2 architecture docs, Mermaid diagrams |
| 4 | PR merged with passing tests | ❌ **needs git init + GitHub** |

---

## What is NOT done (needs you, not code)

These could not be completed from this machine:

1. **Not a git repo yet** — `git init` was never run. No commits, no GitHub remote, no PR.
2. **Docker/Kubernetes never actually executed** — manifests and compose file are
   schema-valid and internally consistent, but no Docker daemon or Minikube cluster
   was run against them. Expect to debug on first `docker compose up`.
3. **No live deployments** — Netlify, Vercel, and Atlas configs are written but nothing
   is deployed. The README has placeholder URLs to fill in.
4. **No demo video** — script is below.
5. **Repo not renamed** — must be `<Student-ID>-Hospital-Core`.

---

## Next steps, in order

### Step 1 — Git + GitHub (required for Task 4)

```bash
cd c:/Users/Elsayad/Documents/project
git init
git add .
git commit -m "feat: initial Hospital Core platform"

# Create the repo named <Student-ID>-Hospital-Core on GitHub, then:
git remote add origin https://github.com/<you>/<Student-ID>-Hospital-Core.git
git branch -M main
git push -u origin main
```

Then, for the "PR merged with passing tests" criterion:

```bash
git checkout -b feature/final-submission
# make a small change, e.g. fill in the live URLs in README.md
git commit -am "docs: add live deployment URLs"
git push -u origin feature/final-submission
# Open a PR on GitHub, wait for the CI checks to go green, then Merge.
# Screenshot the green checks + the merged PR.
```

### Step 2 — Verify Docker locally

```bash
docker compose up --build
docker compose run --rm seed
# Open http://localhost:5173 — register a patient, book an appointment
```

### Step 3 — Deploy (Task 2)

Full instructions are in README §11. Order matters:
1. **Atlas** first — create M0 cluster, get the SRV string, seed it
2. **Vercel** second — `cd backend && vercel --prod`, set `MONGO_URI`
3. **Netlify** third — set `VITE_API_URL` to the Vercel URL, then deploy
4. Add the Netlify URL to `CORS_ORIGINS` on Vercel, redeploy

Then fill the live URLs into README §11.

### Step 4 — Minikube (Task 3)

```bash
npm run k8s:deploy       # builds images, applies manifests, seeds
# Add "$(minikube ip) hospital.local" to your hosts file
npm run k8s:verify       # this is the output to record
npm run k8s:load-test    # watch the HPA scale in another terminal
```

### Step 5 — Record the demo video (Task 4)

Suggested 8–10 minute structure:

1. **Repo tour** (1 min) — show `/frontend`, `/backend`, `/infra`, `/services`
2. **Tests** (1 min) — `npm test`, show 46 passing
3. **Clinical workflow** (3 min) — register a patient → book an appointment →
   check in → complete → file a diagnosis → show the dashboard counters move.
   Call out the optimistic UI: the row appears *before* the server responds.
4. **Docker** (1 min) — `docker compose ps`, edit a file, show hot reload
5. **Kubernetes** (2 min) — `npm run k8s:verify`, then `kubectl get hpa -w` beside
   `npm run k8s:load-test` so pods visibly scale. Show `https://hospital.local`.
6. **CI/CD** (1 min) — the green Actions run, the Lighthouse scores in the log,
   the merged PR, and `CHANGELOG.md`
7. **Live URLs** (30s) — open the Netlify site and hit the Vercel `/api/health`

---

## Architecture notes (context for a future session)

- **Appointment microservice has a deliberate dual mode.** `backend/src/controllers/appointmentController.js`
  proxies booking writes to the microservice when `APPOINTMENT_SERVICE_URL` is set, and
  falls back to identical in-process logic when it isn't. This is why Vercel (single
  serverless function) and CI both work without a second process. The schema is
  *duplicated* in the service rather than imported — importing across directories would
  recouple the two deployables.

- **`__API_BASE__` instead of `import.meta.env`.** Vite substitutes it at build time
  (`vite.config.js` `define`), and Jest supplies it via `globals` in
  `frontend/package.json`. Babel-jest cannot parse `import.meta`, so this avoids the
  whole problem. Don't reintroduce `import.meta.env` in anything under test.

- **Optimistic mutations follow a strict 4-phase contract** — `onMutate` snapshots
  the cache before writing predicted state, `onError` restores that exact snapshot,
  `onSettled` invalidates. The snapshot is what makes rollback correct.

- **Double-booking is prevented by a unique index** on `{doctor, scheduledFor}`, not
  by application logic alone — so the guarantee holds under concurrent writes from
  both the core API and the microservice.

- **Frontend optimistic-UI tests hold the mock response open** (an unresolved promise)
  so the assertion can only pass via the optimistic cache write. If you make the mock
  resolve instantly the test passes vacuously — the refetch overwrites the optimistic
  state before the assertion runs.

- **Patients are soft-deleted** (`status: 'inactive'`); clinical records are never
  destroyed by an API call.

---

## Key file map

| Need | File |
|---|---|
| API routes | `backend/src/routes/index.js` |
| Booking logic + proxy | `backend/src/controllers/appointmentController.js` |
| Dashboard aggregates | `backend/src/controllers/statsController.js` |
| E2E workflow test | `backend/tests/e2e.workflow.test.js` |
| Seed data | `backend/seed.js` |
| Optimistic mutations | `frontend/src/hooks/usePatients.js`, `useAppointments.js` |
| API client | `frontend/src/api/client.js` |
| Compose stack | `docker-compose.yml` |
| K8s manifests | `infra/k8s/00-…` → `07-…` |
| Cluster verification | `infra/scripts/verify-cluster.sh` |
| CI pipeline | `.github/workflows/test.yml` |
| Lighthouse thresholds | `lighthouserc.js` |
| VPC blueprint | `infra/docs/vpc-blueprint.md` |
| Architecture + diagrams | `infra/docs/architecture.md` |

---

## Commands cheat sheet

```bash
npm run install:all      # install all three packages
npm test                 # all 46 tests
npm run seed             # populate mock data
npm run dev:backend      # :5000
npm run dev:frontend     # :5173
npm run dev:appointments # :5001
npm run docker:up        # full stack
npm run docker:seed      # seed inside docker
npm run k8s:deploy       # minikube bring-up
npm run k8s:verify       # cluster proof (record this)
npm run k8s:load-test    # trigger autoscaling
npm run lighthouse       # local Lighthouse audit
```
