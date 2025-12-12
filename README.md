# Apple Invoice Downloader

Automatisierter Download aller Apple-Rechnungen von reportaproblem.apple.com

**Perfekt für die Steuererklärung!** 🎯

## ✨ Features

- ✅ Automatischer Durchlauf durch alle Käufe
- ✅ Session-Management (2FA nur einmal nötig)
- ✅ Family Sharing Support (optional)
- ✅ Intelligente Dateinamen: `2025-12-10_Apple_22.99EUR_ChatGPT_Plus_MM6310L345.pdf`
- ✅ Lädt automatisch das komplette aktuelle Jahr (Infinite Scroll)
- ✅ Überspringt Käufe ohne Beleg
- ✅ Detailliertes Logging
- ✅ Error Handling & Retry-Logic
- ✅ Kostenlos & Open Source

## 🚀 Quick Start

### Automatische Installation (empfohlen)

**macOS / Linux:**
```bash
chmod +x setup.sh
./setup.sh
node apple-invoice-downloader-v2.js
```

**Windows:**
```cmd
setup.bat
node apple-invoice-downloader-v2.js
```

Das war's! 🎉

## 📦 Manuelle Installation

### Voraussetzungen

- **Node.js** (Version 16 oder höher)
  - macOS: `brew install node`
  - Ubuntu/Debian: `sudo apt install nodejs npm`
  - Windows: [nodejs.org/download](https://nodejs.org/en/download/)

### Installation

```bash
npm install playwright
npx playwright install chromium
```

## 🎯 Verwendung

### Erster Start

```bash
node apple-invoice-downloader-v2.js
```

**Ablauf:**
1. 🌐 Browser öffnet sich automatisch
2. 🔐 **Du loggst dich manuell bei Apple ein** (inkl. 2FA)
3. ⏳ Script wartet automatisch bis Kaufhistorie sichtbar ist
4. 🔄 Wechselt zu "Alle" (falls Family Account)
5. ⏬ Scrollt durch Liste bis Einträge aus dem letzten Jahr erscheinen
6. 📋 Sammelt alle Bestellnummern mit Belegen
7. 📥 Lädt alle Rechnungen als PDF herunter

### Weitere Starts

```bash
node apple-invoice-downloader-v2.js
```

Die Session ist gespeichert - **kein Login mehr nötig!** 🎉

## 📁 Ergebnis

Alle PDFs landen in:
```
./downloads/
├── 2025-12-10_Apple_22.99EUR_ChatGPT_Plus_MM6310L345.pdf
├── 2025-11-24_Apple_16.99EUR_iCloud_200GB_MM62Z5WVDZ.pdf
├── 2025-11-17_Apple_16.99EUR_Apple_Music_MNJ0QWF71V.pdf
└── ...
```

## 🐛 Troubleshooting

### "Session expired"
```bash
rm apple-session.json
node apple-invoice-downloader-v2.js
```

### Script hängt beim Login
- Warte bis Kaufhistorie vollständig geladen ist (60 Sekunden Zeit)
- Falls Timeout: Session löschen und neu starten

### Node.js nicht gefunden
```bash
# macOS:
brew install node

# Ubuntu/Debian:
sudo apt install nodejs npm

# Test:
node -v
```

## 💡 Tipps

### Für Steuerberater
Perfekt um regelmäßig alle Belege zu sammeln:
```bash
# Einmal im Monat laufen lassen
node apple-invoice-downloader-v2.js

# PDFs zu Cloud uploaden
# Nach Datum sortiert archivieren
```

## 🔒 Sicherheit

- ✅ Session wird **lokal** gespeichert
- ✅ **Keine** Daten an Dritte
- ✅ Open Source
- ⚠️ `apple-session.json` niemals teilen!

## 📜 Lizenz

MIT License

## 🙏 Credits

- [Playwright](https://playwright.dev/)
- [Node.js](https://nodejs.org/)

---

**Happy Invoice Downloading! 🎉**
