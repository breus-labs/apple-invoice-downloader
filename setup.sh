#!/bin/bash

# Apple Invoice Downloader - Setup Script
# Automatische Installation aller Dependencies

set -e  # Bei Fehler abbrechen

echo "🍎 Apple Invoice Downloader - Setup"
echo "═══════════════════════════════════════"
echo ""

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Prüfe ob Node.js installiert ist
echo "📦 Prüfe Node.js Installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js ist nicht installiert!${NC}"
    echo ""
    echo "Bitte installiere Node.js:"
    echo "  • macOS: brew install node"
    echo "  • Ubuntu/Debian: sudo apt install nodejs npm"
    echo "  • Windows: https://nodejs.org/en/download/"
    echo ""
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js gefunden: ${NODE_VERSION}${NC}"
echo ""

# Prüfe npm
echo "📦 Prüfe npm Installation..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm ist nicht installiert!${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm gefunden: ${NPM_VERSION}${NC}"
echo ""

# Erstelle package.json falls nicht vorhanden
if [ ! -f "package.json" ]; then
    echo "📝 Erstelle package.json..."
    cat > package.json << 'EOF'
{
  "name": "apple-invoice-downloader",
  "version": "2.0.0",
  "description": "Automatischer Download aller Apple-Rechnungen von reportaproblem.apple.com",
  "main": "apple-invoice-downloader-v2.js",
  "scripts": {
    "start": "node apple-invoice-downloader-v2.js",
    "setup": "npm install && npx playwright install chromium"
  },
  "keywords": [
    "apple",
    "invoice",
    "receipt",
    "download",
    "automation"
  ],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "playwright": "^1.49.0"
  }
}
EOF
    echo -e "${GREEN}✅ package.json erstellt${NC}"
    echo ""
fi

# Installiere Playwright
echo "📦 Installiere Playwright..."
npm install playwright

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Playwright installiert${NC}"
    echo ""
else
    echo -e "${RED}❌ Fehler bei Playwright Installation${NC}"
    exit 1
fi

# Installiere Chromium Browser
echo "🌐 Installiere Chromium Browser..."
npx playwright install chromium

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Chromium installiert${NC}"
    echo ""
else
    echo -e "${RED}❌ Fehler bei Chromium Installation${NC}"
    exit 1
fi

# Erstelle downloads Ordner
if [ ! -d "downloads" ]; then
    mkdir downloads
    echo -e "${GREEN}✅ Downloads-Ordner erstellt${NC}"
    echo ""
fi

# Prüfe ob Script vorhanden ist
if [ ! -f "apple-invoice-downloader-v2.js" ]; then
    echo -e "${YELLOW}⚠️  apple-invoice-downloader-v2.js nicht gefunden!${NC}"
    echo "Bitte stelle sicher dass das Script im gleichen Ordner liegt."
    echo ""
fi

# Fertig!
echo "═══════════════════════════════════════"
echo -e "${GREEN}✅ Setup abgeschlossen!${NC}"
echo "═══════════════════════════════════════"
echo ""
echo "📋 Nächste Schritte:"
echo ""
echo "1. Script starten:"
echo "   node apple-invoice-downloader-v2.js"
echo ""
echo "2. Oder mit npm:"
echo "   npm start"
echo ""
echo "3. Beim ersten Mal:"
echo "   - Browser öffnet sich automatisch"
echo "   - Bei Apple einloggen (inkl. 2FA)"
echo "   - Script läuft automatisch los"
echo ""
echo "4. Ab dem zweiten Mal:"
echo "   - Session ist gespeichert"
echo "   - Kein Login mehr nötig"
echo ""
echo "📁 PDFs werden gespeichert in: ./downloads/"
echo ""
echo "💡 Tipps:"
echo "   - Session löschen: rm apple-session.json"
echo "   - Hilfe anzeigen: node apple-invoice-downloader-v2.js --help"
echo ""
echo "🎉 Viel Erfolg!"
echo ""
