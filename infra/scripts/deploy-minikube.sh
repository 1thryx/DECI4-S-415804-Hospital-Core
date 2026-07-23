#!/usr/bin/env bash
# One-command bring-up of the whole platform on a local Minikube cluster.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

# Fail on a missing prerequisite with a fixable message rather than a bare
# "command not found" seven steps into a bring-up.
for tool in minikube kubectl docker openssl; do
  command -v "$tool" >/dev/null 2>&1 || {
    echo "!! Required tool '$tool' is not on PATH."
    echo "   minikube: https://minikube.sigs.k8s.io/docs/start/"
    exit 1
  }
done

docker info >/dev/null 2>&1 || {
  echo "!! The Docker daemon is not reachable. Start Docker Desktop and retry."
  exit 1
}

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
# --shell bash is explicit because minikube infers the shell from its parent
# process, and under Git Bash on Windows that inference can yield PowerShell
# syntax, which eval then chokes on.
eval "$(minikube docker-env --shell bash)"

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
# The seed pod needs the same MONGO_URI the backend gets. Sourcing it via envFrom
# keeps the Secret authoritative rather than duplicating the URI here, and keeps
# the credential out of the process arguments.
if kubectl run hospital-seed -n hospital \
  --image=hospital-core/backend:latest \
  --image-pull-policy=Never \
  --restart=Never --rm -i \
  --overrides='{
    "spec": {
      "containers": [{
        "name": "hospital-seed",
        "image": "hospital-core/backend:latest",
        "imagePullPolicy": "Never",
        "command": ["node", "seed.js"],
        "envFrom": [
          { "configMapRef": { "name": "hospital-config" } },
          { "secretRef": { "name": "hospital-db-secret" } }
        ]
      }]
    }
  }'; then
  echo "==> Seed complete."
else
  # Loud on purpose. A silent seed failure leaves a running cluster serving an
  # empty database — which only becomes obvious mid-demo.
  printf '\n\033[1;31m  !!  SEEDING FAILED — the cluster is up but the database is EMPTY.\033[0m\n'
  printf '\033[1;31m      Fix this before recording the demo.\033[0m\n\n'
fi

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
