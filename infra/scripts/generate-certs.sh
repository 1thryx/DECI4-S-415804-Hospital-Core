#!/usr/bin/env bash
# Generates a self-signed certificate for hospital.local and loads it into the
# cluster as the TLS secret the Ingress references. Mock certs — local use only.
set -euo pipefail

CERT_DIR="$(dirname "$0")/../certs"
mkdir -p "$CERT_DIR"

echo "==> Generating self-signed certificate for hospital.local"
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/hospital.key" \
  -out "$CERT_DIR/hospital.crt" \
  -subj "/CN=hospital.local/O=Hospital Core/C=EG" \
  -addext "subjectAltName=DNS:hospital.local,DNS:*.hospital.local"

echo "==> Creating the hospital-tls secret in the hospital namespace"
kubectl create secret tls hospital-tls \
  --namespace hospital \
  --cert="$CERT_DIR/hospital.crt" \
  --key="$CERT_DIR/hospital.key" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "==> Done. Verify with: kubectl describe secret hospital-tls -n hospital"
