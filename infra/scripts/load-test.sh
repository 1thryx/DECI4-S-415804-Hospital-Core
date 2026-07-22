#!/usr/bin/env bash
# Drives synthetic load at the API so the HPA visibly scales the backend ReplicaSet.
# Run `kubectl get hpa -n hospital -w` in a second terminal to watch it react.
set -euo pipefail

DURATION="${1:-180}"
WORKERS="${2:-8}"

echo "==> Generating load for ${DURATION}s with ${WORKERS} parallel workers"
echo "==> Watch scaling in another terminal:  kubectl get hpa,pods -n hospital -w"

kubectl run load-generator -n hospital \
  --image=busybox:1.36 \
  --restart=Never --rm -i --command -- /bin/sh -c "
    for i in \$(seq 1 ${WORKERS}); do
      (
        end=\$(( \$(date +%s) + ${DURATION} ))
        while [ \$(date +%s) -lt \$end ]; do
          wget -q -O /dev/null http://backend-service:5000/api/stats/dashboard || true
          wget -q -O /dev/null http://backend-service:5000/api/patients || true
        done
      ) &
    done
    wait
  "

echo "==> Load finished. Final autoscaler state:"
kubectl get hpa -n hospital
kubectl get pods -n hospital -l app=backend
