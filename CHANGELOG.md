# Changelog

All notable changes are documented here. This file is generated automatically by semantic-release from Conventional Commit messages — do not edit it by hand.

## [1.1.3](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/compare/v1.1.2...v1.1.3) (2026-07-23)

### Bug Fixes

* **infra:** stop Git Bash rewriting path-like arguments on Windows ([0580587](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/05805870e708a47a9f49214ba961ea70a7de0d80))
* **k8s:** give the mongo probes time to actually run mongosh ([fe36ec1](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/fe36ec10487ae51b180a5db4b5e5fea227dc0089))
* **k8s:** give the seed pod its database credentials ([5e810b3](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/5e810b3baa762f0b8187287d4ca65886c528e053))
* **k8s:** point the nginx upstream at the cluster Service name ([83e65ca](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/83e65caefd69f03f17dd0d76b84d92a7d2021b2c))

### Documentation

* **k8s:** correct the hosts-file guidance for the docker driver on Windows ([bd0e810](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/bd0e81067ec5817fda5a432274b18b2377a08620))
* record live deployment URLs and refresh the handoff ([2e0e83b](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/2e0e83ba1c7241cbb39ca0d82f284c79de2bd791))
* record the verified cluster run and the Windows gotchas ([8565697](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/85656979685e54cc140a492f34a8aa7d6929067f))

## [1.1.2](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/compare/v1.1.1...v1.1.2) (2026-07-22)

### Bug Fixes

* **api:** redial when the cached connection promise is stale ([978b015](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/978b0157aef630cf5d3abdffe793a691348f3d01))

## [1.1.1](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/compare/v1.1.0...v1.1.1) (2026-07-22)

### Bug Fixes

* **deploy:** move netlify.toml to repository root ([4b9c70c](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/4b9c70c52ddcdd25a784236f911f06570a5000cf))

## [1.1.0](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/compare/v1.0.2...v1.1.0) (2026-07-22)

### Features

* **api:** report connection diagnostics from health endpoint ([dcd9d57](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/dcd9d57c36c4026ff546d1054f665e8cc1b74362))

## [1.0.2](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/compare/v1.0.1...v1.0.2) (2026-07-22)

### Bug Fixes

* **api:** establish database connection per request on serverless ([88520fd](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/88520fd337922e20882f36e2898ac1d4fd5b1465))

## [1.0.1](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/compare/v1.0.0...v1.0.1) (2026-07-22)

### Bug Fixes

* **docs:** remove duplicated changelog header ([70d7c0a](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/70d7c0a459f4888cd6976a3f450c8f66642d4ddb))

## 1.0.0 (2026-07-22)

### Features

* initial Hospital Core platform ([df28e2a](https://github.com/1thryx/DECI4-S-415804-Hospital-Core/commit/df28e2abb627feb88dee6f239fdbcf3eabbf96a2))

---

## Appendix — v1.0.0 initial scope

The release entry above is generated from a single squashed commit. This appendix
records what that commit actually contained, broken down by area. Releases from
v1.0.1 onward are itemised automatically above and need no manual entry.

### Features

* **frontend:** React 18 SPA with doctor dashboard, patient management, appointment scheduling, and patient detail views
* **frontend:** React Query caching layer with per-query stale times and background synchronisation
* **frontend:** optimistic UI on patient registration, appointment booking, status changes, history filing, and archiving
* **backend:** Express MVC API — routes, controllers, models — over MongoDB
* **backend:** patient, doctor, appointment, medical-history, and audit-log data models
* **backend:** dashboard and patient-flow aggregation endpoints
* **backend:** audit middleware recording every mutating request without adding request latency
* **appointments:** appointment booking extracted into an independently deployable microservice
* **appointments:** double-booking prevented by a unique `{doctor, scheduledFor}` index
* **seed:** `seed.js` populating 6 doctors, 12 patients, 24 appointments, medical histories, and audit logs

### Infrastructure

* **docker:** multi-stage Dockerfiles for all three services with non-root runtime users
* **docker:** Compose stack with hot reloading via bind mounts and health-gated startup ordering
* **k8s:** Minikube manifests — namespace, ConfigMap/Secret, Mongo StatefulSet, Deployments, Services
* **k8s:** HorizontalPodAutoscalers for the backend (2→10) and appointment service (2→8)
* **k8s:** NGINX Ingress with TLS termination routing `hospital.local` and `hospital.local/api`
* **k8s:** NetworkPolicies enforcing the public/private tier boundary at pod level

### Tests

* **backend:** 21 integration and end-to-end tests over in-memory MongoDB
* **frontend:** 17 component tests covering rendering, forms, optimistic updates, and rollback
* **appointments:** 8 standalone booking-rule tests
* **postman:** API collection with an ordered E2E clinical workflow

### CI/CD

* **ci:** GitHub Actions pipeline — tests, Lighthouse CI, Docker builds, manifest validation
* **ci:** Lighthouse CI thresholds that fail the build on performance, accessibility, or best-practice regressions
* **ci:** automated semantic versioning with generated changelogs and GitHub releases

### Documentation

* **docs:** README with setup, API reference with request/response samples, and environment variable guide
* **docs:** architecture document with MVC layering, booking sequence, ER model, and cache strategy
* **docs:** VPC blueprint mapping containers to public/private subnets with security group rules
