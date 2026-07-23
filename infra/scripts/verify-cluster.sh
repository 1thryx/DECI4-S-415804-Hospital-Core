#!/usr/bin/env bash
# The verification commands to run on camera for the Task 4 demo video.
# Each block prints a header so the recording is easy to follow.
set -uo pipefail

banner() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

banner "Cluster nodes"
kubectl get nodes -o wide

banner "Everything in the hospital namespace"
kubectl get all -n hospital

banner "Pods with their assigned nodes and IPs"
kubectl get pods -n hospital -o wide

banner "ReplicaSets (proof the Deployments are managing replicas)"
kubectl get replicasets -n hospital

banner "Horizontal Pod Autoscalers (current vs target utilisation)"
kubectl get hpa -n hospital

banner "Services"
kubectl get svc -n hospital

banner "Ingress routing + TLS"
kubectl get ingress -n hospital
kubectl describe ingress hospital-ingress -n hospital | sed -n '1,40p'

banner "TLS secret"
kubectl get secret hospital-tls -n hospital -o jsonpath='{.metadata.name}{"\t"}{.type}{"\n"}'

banner "Persistent volume claims (patient data durability)"
kubectl get pvc -n hospital

banner "Network policies (public/private tier enforcement)"
kubectl get networkpolicy -n hospital

banner "Backend health endpoint, from inside the cluster"
kubectl run curl-probe -n hospital --image=curlimages/curl:8.10.1 --restart=Never --rm -i --quiet -- \
  curl -s http://backend-service:5000/api/health

banner "Appointment microservice health, from inside the cluster"
kubectl run curl-probe2 -n hospital --image=curlimages/curl:8.10.1 --restart=Never --rm -i --quiet -- \
  curl -s http://appointment-service:5001/health

banner "HTTPS through the ingress (self-signed cert, so -k)"
if ! curl -sk --max-time 10 https://hospital.local/api/health; then
  cat <<EOF
Could not reach https://hospital.local from this host.

  Linux (any driver) / macOS: add "$(minikube ip)  hospital.local" to your hosts file.

  Windows with the docker driver: $(minikube ip) is inside Docker's network and is
  NOT routable from the host, so a hosts entry pointing at it will never work.
  Forward the ingress to loopback instead, and point hospital.local at 127.0.0.1:

    kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 443:443
    # then, in an elevated shell, add to C:\\Windows\\System32\\drivers\\etc\\hosts:
    #   127.0.0.1  hospital.local

The ingress itself can be verified independently of host routing:

  kubectl run ingress-probe -n hospital --image=curlimages/curl:8.10.1 \\
    --restart=Never --rm -i --quiet -- \\
    curl -sk --resolve hospital.local:443:\$(kubectl get svc -n ingress-nginx \\
      ingress-nginx-controller -o jsonpath='{.spec.clusterIP}') \\
      https://hospital.local/api/health
EOF
fi

banner "Recent backend logs"
kubectl logs -n hospital -l app=backend --tail=15

printf '\n\033[1;32m==> Verification complete.\033[0m\n'
