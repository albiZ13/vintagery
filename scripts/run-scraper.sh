#!/bin/bash
# Vintagery — Scraper mercatini
# Uso:
#   npm run scrape           → 107 capoluoghi (~4 min)
#   npm run scrape:full      → tutti i comuni ISTAT (~4.6h)
#   npm run scrape -- --dry-run   → simula import senza scrivere

set -e
cd "$(dirname "$0")/.."

MODE=${1:-quick}
shift 2>/dev/null || true  # ignora errore se non ci sono altri arg

echo ""
echo "══════════════════════════════════════════════════"
echo "  Vintagery Scraper — $(date '+%d/%m/%Y %H:%M')"
echo "══════════════════════════════════════════════════"

# Controlla dipendenze Python
if ! python3 -c "import httpx" 2>/dev/null; then
  echo "▶ Installo httpx..."
  pip3 install httpx -q
fi

if [ "$MODE" = "full" ]; then
  echo "▶ Modalità: COMPLETA — tutti i comuni ISTAT (~7.900, ~4.6 ore)"
  python3 scripts/scrape-comuni.py --comuni --resume "$@"
else
  echo "▶ Modalità: VELOCE — 107 capoluoghi (~4 min)"
  python3 scripts/scrape-comuni.py --resume "$@"
fi

echo ""
echo "▶ Import in Supabase (con AI dedup)..."
node scripts/import-comuni-markets.mjs "$@"

echo ""
echo "✓ Completato — $(date '+%d/%m/%Y %H:%M')"
echo ""
