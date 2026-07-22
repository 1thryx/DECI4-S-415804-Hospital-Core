#!/usr/bin/env bash
# One-command bring-up of the whole platform on a local Minikube cluster.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> [1/7] Starting Minikube"
# Sized to leave headroom on a 4-core / 16GB host: taking every core starves the
# Docker VM and the host, and the cluster gets slower rather than faster.
# Override for a bigger machine: MINIKUBE_CPUS=4 MINIKUBE_MEMORY=8192 ./deploy-minikube.sh
MINIKUBE_CPUS="${MINIKUBE_CPUS:-2}"
MINIKUBE_MEMORY="${MINIKUBE_MEMORY:-4096}"

minikube status >/dev/null 2>&1 || \
  minikube start --cpus="$MINIKUBE_CPUS" --memory="$MINIKUBE_MEMORY" --driver=docker

echo "==> [2/7] Enabling ingress + metrics-server (metrics-server is what feeds the HPA)"
minikube addons enable ingress
minikube addons enable metrics-server

echo "==> [3/7] Pointing the shell at Minikube's Docker daemon"
eval "$(minikube docker-env)"

echo "==> [4/7] Building images inside the cluster"
docker build -t hospital-core/backend:latest "$ROOT/backend"
docker build -t hospital-core/appointment-service:latest "$ROOT/services/appointment-service"
docker build -t hospital-core/frontend:latest "$ROOT/frontend"

echo "==> [5/7] Applying manifests"
kubectl apply -f "$ROOT/infra/k8s/00-namespace.yaml"
kubectl apply -f "$ROOT/infra/k8s/01-config-secret.yaml"
bash "$ROOT/infra/scripts/generate-certs.sh"
kubectl apply -f "$ROOT/infra/k8s/"

echo "==> [6/7] Waiting for rollouts"
kubectl rollout status statefulset/mongo -n hospital --timeout=180s
kubectl rollout status deployment/backend -n hospital --timeout=180s
kubectl rollout status deployment/appointment-service -n hospital --timeout=180s
kubectl rollout status deployment/frontend -n hospital --timeout=180s

echo "==> [7/7] Seeding the database"
kubectl run hospital-seed -n hospital \
  --image=hospital-core/backend:latest \
  --image-pull-policy=Never \
  --restart=Never --rm -i --command -- node seed.js || true

cat <<EOF

=========================================================================
 Deployment complete.

 Add this line to your hosts file (once):
   $(minikube ip)  hospital.local

   Linux/macOS : sudo nano /etc/hosts
   Windows     : C:\\Windows\\System32\\drivers\\etc\\hosts (as Administrator)

 Then open:  https://hospital.local
 (Your browser will warn about the self-signed cert — that is expected.)

 Verify:
   kubectl get all -n hospital
   kubectl get hpa -n hospital
   kubectl get ingress -n hospital
=========================================================================
EOF
