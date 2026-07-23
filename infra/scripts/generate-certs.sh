#!/usr/bin/env bash
# Generates a self-signed certificate for hospital.local and loads it into the
# cluster as the TLS secret the Ingress references. Mock certs — local use only.
set -euo pipefail

CERT_DIR="$(dirname "$0")/../certs"
mkdir -p "$CERT_DIR"

echo "==> Generating self-signed certificate for hospital.local"
# Under Git Bash on Windows, MSYS rewrites any argument that looks like a Unix
# path, so -subj silently becomes 'C:/Program Files/Git/CN=hospital.local/...'
# and openssl rejects it. Exclude only arguments starting with "/CN=" — a blanket
# MSYS_NO_PATHCONV=1 would also stop -keyout/-out from being translated, leaving
# native openssl unable to open its own output paths. Inert on Linux and macOS.
MSYS2_ARG_CONV_EXCL='/CN=' openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
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
