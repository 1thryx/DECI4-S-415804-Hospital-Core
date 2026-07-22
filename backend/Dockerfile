# --- Stage 1: dependencies -------------------------------------------------
# Installed in their own layer so a source-only change never re-runs npm ci.
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# --- Stage 2: runtime ------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Alpine ships a non-root `node` user; running as root in a cluster is an
# unnecessary blast radius for a service holding patient data.
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .

USER node
EXPOSE 5000

# Lets Docker and Kubernetes converge on the same definition of "healthy".
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
