#!/usr/bin/env bash
set -e

echo "▶ Building and deploying to Vercel..."
OUTPUT=$(npx vercel --prod --yes 2>&1)
echo "$OUTPUT" | tail -5

# Extract deployment URL from output
DEPLOY_URL=$(echo "$OUTPUT" | grep -o '"url": *"[^"]*"' | head -1 | sed 's/"url": *"//;s/"//')
if [ -z "$DEPLOY_URL" ]; then
  DEPLOY_URL=$(npx vercel ls --prod 2>&1 | grep "Ready" | head -1 | grep -o 'vintagerie-[a-z0-9]*-albertozoppi99-5948s-projects\.vercel\.app')
fi

echo ""
echo "▶ Aliasing $DEPLOY_URL → vintagery.it"
npx vercel alias set "$DEPLOY_URL" vintagery.it
npx vercel alias set "$DEPLOY_URL" www.vintagery.it

echo ""
echo "✓ Done — https://vintagery.it"
