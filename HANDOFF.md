# Hospital Core — Build Status & Handoff

**Location:** `c:\Users\Elsayad\Documents\project`
**Date:** 2026-07-22, revised 2026-07-23
**Repo:** https://github.com/1thryx/DECI4-S-415804-Hospital-Core
**Status:** 23 of 25 rubric subtasks verified. Cloud deployment live (Netlify + Vercel
+ Atlas), Docker Compose verified running, Minikube cluster verified running with
observed HPA autoscaling and working TLS ingress. **Only the demo video remains.**

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
| 2 | Netlify + Vercel + Atlas | ✅ deployed and live |
| 2 | React Query caching | ✅ built |
| 2 | Optimistic UI | ✅ 5 mutations |
| 3 | Minikube manifests | ✅ **ran on a real cluster** — all 7 pods 1/1 |
| 3 | ReplicaSets / autoscaling | ✅ **observed 2→4→5→6** under load |
| 3 | NGINX Ingress + TLS secret | ✅ **verified** — TLS terminates, /api splits, 308 redirect |
| 4 | Demo video | ❌ **you must record** |
| 4 | README + diagrams | ✅ full README + 2 architecture docs, Mermaid diagrams |
| 4 | PR merged with passing tests | ✅ PR #1 merged, CI green, semantic-release at v1.1.1 |

Task 2's compose rows and all three Task 3 rows are graded on *observed execution*,
not on the manifests being correct. All five have now been executed and observed
(2026-07-23). The only outstanding subtasks are the two video rows.

---

## What is NOT done (needs you, not code)

1. **No demo video** — shot list is below. This is the only remaining rubric gap.
2. **Hosts entry, if you want browser access to the cluster** — see the Windows
   note below. Needs an elevated shell, which an agent session cannot obtain.

---

## Running the cluster on Windows — read before re-running

Five bugs surfaced on the first real Minikube run that CI could never have caught
(CI validates manifests against a schema on Linux; it never applies them, and MSYS
does not exist there). All five are fixed, but the *reasons* are worth keeping:

- **Git Bash rewrites path-like arguments.** MSYS turns `/CN=...` into
  `C:/Program Files/Git/CN=...` and `/bin/sh` into `C:/Program Files/Git/usr/bin/sh`
  before the native binary sees them. `generate-certs.sh` and `load-test.sh` both use
  `MSYS2_ARG_CONV_EXCL` to exclude just the affected argument. Do **not** replace this
  with a blanket `MSYS_NO_PATHCONV=1` — that also stops `-keyout`/`-out` being
  translated, so openssl can no longer open its own output paths.

- **`kubectl run` attaches no ConfigMap or Secret.** The seed pod needs `envFrom`
  (see step 7 of `deploy-minikube.sh`) or it starts with no `MONGO_URI` and exits.
  The old `|| true` hid this completely — a "successful" bring-up serving an empty
  database.

- **Probe `timeoutSeconds` defaults to 1s.** `mongosh` needs ~1.5–2.5s just to boot
  Node before it can ping, so the Mongo probes always timed out and the pod never
  went Ready — while mongod was serving fine. Backend then crash-looped against a
  healthy database, which looks like an application bug and is not.

- **nginx resolves upstreams once, at startup, and exits if resolution fails.**
  `frontend/nginx.conf` ships only in the production image, which only the cluster
  runs, so its upstream must be `backend-service` (the k8s Service), not `backend`
  (the compose service). Compose is unaffected — it builds `Dockerfile.dev` and
  proxies through Vite.

- **The minikube IP is not routable from Windows under the docker driver.**
  `192.168.49.2` is inside Docker's network; both :80 and :443 time out from the
  host. A hosts entry pointing at it will never resolve. Use loopback instead:

  ```bash
  kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 443:443
  # then, elevated: add "127.0.0.1  hospital.local" to
  # C:\Windows\System32\drivers\etc\hosts
  ```

  Leave the port-forward running for as long as you need browser access. To check
  the ingress *without* any host routing, run a curl pod inside the cluster against
  the ingress controller's ClusterIP with `--resolve` — `verify-cluster.sh` prints
  the exact command when it cannot reach the host.

---

## Next steps, in order

Steps 1 (git/GitHub) and 3 (cloud deploy) from the original plan are **done**.
What follows is what is left.

### Step 1 — Fill the live URLs into README §11

The three blanks under "Live URLs". Do it on a branch so it produces a second
green-CI PR, which is more evidence for the Task 4 merge criterion.

### Step 2 — Minikube (Task 3 — 3 subtasks)

Tooling state as of 2026-07-23: **minikube v1.38.1 installed** via winget,
`kubectl` v1.36.1 present, Docker Desktop installed but was not running.

```bash
npm run k8s:deploy       # builds images, applies manifests, seeds
# Add "$(minikube ip) hospital.local" to C:\Windows\System32\drivers\etc\hosts (as Admin)
npm run k8s:verify       # this is the output to record
npm run k8s:load-test    # watch the HPA scale in another terminal
```

Watch for: the HPA reports `<unknown>/60%` until metrics-server has scraped
(~60s). Don't start recording before it shows a real percentage.

### Step 3 — Docker Compose (Task 2 — 2 subtasks)

```bash
docker compose up --build
docker compose run --rm seed
# Open http://localhost:5173 — register a patient, book an appointment
# Then edit a source file on the host and show the change appear live (hot-reload subtask)
```

### Step 4 — Record the demo video (Task 4 — 2 subtasks)

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

- **The k8s seed step uses `kubectl run --overrides`, not plain `--env`.** `kubectl run`
  attaches no ConfigMap or Secret by default, so the original `node seed.js` pod started
  with no `MONGO_URI` and died — silently, because the call ended in `|| true`. The
  override injects `envFrom` the same way `03-backend.yaml` does, so the Secret stays the
  single source of truth and the URI never lands in process arguments. Don't simplify it
  back to `--env=MONGO_URI=...`; that re-duplicates the credential.

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
