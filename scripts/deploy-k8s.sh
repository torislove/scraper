#!/usr/bin/env bash
# ==============================================================================
# Scraper.co.in - 1-Click Kubernetes Deployment
# Applies Namespace, ConfigMap, Secrets, PVC, Server, Client, Master & Ingress
# ==============================================================================
set -euo pipefail

echo "🚀 Applying Scraper.co.in Kubernetes Manifests..."

# 1. Namespace
kubectl apply -f k8s/namespace.yaml

# 2. ConfigMap & Secrets
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secrets.yaml

# 3. Storage
kubectl apply -f k8s/pvc.yaml

# 4. Deployments and Services
kubectl apply -f k8s/server-deployment.yaml
kubectl apply -f k8s/client-deployment.yaml
kubectl apply -f k8s/master-deployment.yaml

# 5. Autoscalers (HPA) & Ingress
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/ingress.yaml

echo "⏳ Waiting for server pods to be ready..."
kubectl rollout status deployment/scraper-server -n scraper-prod --timeout=120s || true

echo "✅ All Kubernetes manifests applied successfully!"
echo "Check pods with: kubectl get pods -n scraper-prod"
echo "Check ingress with: kubectl get ingress -n scraper-prod"
