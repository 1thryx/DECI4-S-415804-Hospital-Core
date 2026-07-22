# Changelog

All notable changes are documented here. From v1.0.0 onward this file is generated
automatically by [semantic-release](https://semantic-release.gitbook.io/) from
Conventional Commit messages — **do not edit it by hand.**

## 1.0.0 (2026-07-22)

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
