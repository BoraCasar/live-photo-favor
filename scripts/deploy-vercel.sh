#!/usr/bin/env bash
# Deploy to Vercel (run once: npx vercel login && npx vercel link)
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Deploying to Vercel production..."
echo "Ensure env vars from scripts/vercel-production.env.example are set in Vercel dashboard."
echo "Add domain: foto-lembranca.boracasar.net.br (no wildcard needed)"
echo ""

npx vercel deploy --prod
