#!/usr/bin/env bash
# ==============================================================================
# Scraper.co.in - 1-Click Serverless Google Cloud Run Deployment
# Scale-to-Zero ($0 idle compute cost)
# ==============================================================================
set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-$(gcloud config get-value project)}"
REGION="${GCP_REGION:-asia-south1}" # Default to Mumbai (India) for fastest response
REPO_NAME="scraper-suite"
IMAGE_TAG="$(date +%Y%m%d-%H%M%S)"

echo "🚀 Deploying Scraper.co.in to Google Cloud Run (Serverless)"
echo "📍 Project: $PROJECT_ID | Region: $REGION"

# 1. Enable Required Google Cloud APIs
echo "🔧 Enabling Cloud Run and Artifact Registry..."
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com --project="$PROJECT_ID"

# 2. Ensure Artifact Registry repository exists
if ! gcloud artifacts repositories describe "$REPO_NAME" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
  echo "📦 Creating Artifact Registry repository..."
  gcloud artifacts repositories create "$REPO_NAME" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Scraper suite docker containers" \
    --project="$PROJECT_ID"
fi

REGISTRY_URL="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO_NAME"

# 3. Build & Push Server Container
echo "🔨 Building Scraper Engine Server..."
gcloud builds submit --tag "$REGISTRY_URL/server:$IMAGE_TAG" -f Dockerfile.server . --project="$PROJECT_ID"

# 4. Deploy Server to Cloud Run with Scale-to-Zero
echo "☁️ Deploying Scraper API Server (min-instances=0)..."
gcloud run deploy scraper-server \
  --image "$REGISTRY_URL/server:$IMAGE_TAG" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 5002 \
  --cpu 2 \
  --memory 4Gi \
  --min-instances 0 \
  --max-instances 20 \
  --timeout 3600 \
  --set-env-vars "NODE_ENV=production,SCRAPER_ALLOW_REMOTE=1,PLAYWRIGHT_CONCURRENCY=4,AUTH_REQUIRED=1" \
  --project="$PROJECT_ID"

SERVER_URL="$(gcloud run services describe scraper-server --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")"
echo "✅ Server deployed at: $SERVER_URL"

# 5. Build & Deploy Client Panel
echo "🔨 Building Scraper Client Panel..."
gcloud builds submit --tag "$REGISTRY_URL/client:$IMAGE_TAG" -f Dockerfile.client . --project="$PROJECT_ID"

echo "☁️ Deploying Client Panel..."
gcloud run deploy scraper-client \
  --image "$REGISTRY_URL/client:$IMAGE_TAG" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 80 \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 10 \
  --project="$PROJECT_ID"

CLIENT_URL="$(gcloud run services describe scraper-client --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")"

# 6. Build & Deploy Master Admin Panel
echo "🔨 Building Scraper Master Admin Panel..."
gcloud builds submit --tag "$REGISTRY_URL/master:$IMAGE_TAG" -f Dockerfile.master . --project="$PROJECT_ID"

echo "☁️ Deploying Master Admin Panel..."
gcloud run deploy scraper-master \
  --image "$REGISTRY_URL/master:$IMAGE_TAG" \
  --region "$REGION" \
  --platform managed \
  --allow-unauthenticated \
  --port 80 \
  --cpu 1 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 5 \
  --project="$PROJECT_ID"

MASTER_URL="$(gcloud run services describe scraper-master --region="$REGION" --project="$PROJECT_ID" --format="value(status.url)")"

echo ""
echo "🎉 DEPLOYMENT COMPLETE! All services running serverless (scale-to-zero):"
echo "👉 Client Console:       $CLIENT_URL"
echo "👉 Master Admin Console: $MASTER_URL"
echo "👉 API Backend:          $SERVER_URL"
