@echo off
REM Apple Invoice Downloader - Setup Script (Windows)
REM Automatische Installation aller Dependencies

echo.
echo ============================================
echo  Apple Invoice Downloader - Setup (Windows)
echo ============================================
echo.

REM Pruefe ob Node.js installiert ist
echo Pruefe Node.js Installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Node.js ist nicht installiert!
    echo.
    echo Bitte installiere Node.js von:
    echo https://nodejs.org/en/download/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo [OK] Node.js gefunden: %NODE_VERSION%
echo.

REM Pruefe npm
echo Pruefe npm Installation...
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] npm ist nicht installiert!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo [OK] npm gefunden: %NPM_VERSION%
echo.

REM Erstelle package.json falls nicht vorhanden
if not exist "package.json" (
    echo Erstelle package.json...
    (
        echo {
        echo   "name": "apple-invoice-downloader",
        echo   "version": "2.0.0",
        echo   "description": "Automatischer Download aller Apple-Rechnungen",
        echo   "main": "apple-invoice-downloader-v2.js",
        echo   "scripts": {
        echo     "start": "node apple-invoice-downloader-v2.js",
        echo     "setup": "npm install && npx playwright install chromium"
        echo   },
        echo   "keywords": ["apple", "invoice", "download", "automation"],
        echo   "author": "",
        echo   "license": "MIT",
        echo   "dependencies": {
        echo     "playwright": "^1.49.0"
        echo   }
        echo }
    ) > package.json
    echo [OK] package.json erstellt
    echo.
)

REM Installiere Playwright
echo Installiere Playwright...
call npm install playwright
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Playwright Installation fehlgeschlagen
    pause
    exit /b 1
)
echo [OK] Playwright installiert
echo.

REM Installiere Chromium
echo Installiere Chromium Browser...
call npx playwright install chromium
if %ERRORLEVEL% NEQ 0 (
    echo [FEHLER] Chromium Installation fehlgeschlagen
    pause
    exit /b 1
)
echo [OK] Chromium installiert
echo.

REM Erstelle downloads Ordner
if not exist "downloads" (
    mkdir downloads
    echo [OK] Downloads-Ordner erstellt
    echo.
)

REM Pruefe ob Script vorhanden
if not exist "apple-invoice-downloader-v2.js" (
    echo [WARNUNG] apple-invoice-downloader-v2.js nicht gefunden!
    echo Bitte stelle sicher dass das Script im gleichen Ordner liegt.
    echo.
)

REM Fertig
echo.
echo ============================================
echo  Setup abgeschlossen!
echo ============================================
echo.
echo Naechste Schritte:
echo.
echo 1. Script starten:
echo    node apple-invoice-downloader-v2.js
echo.
echo 2. Oder mit npm:
echo    npm start
echo.
echo 3. Beim ersten Mal:
echo    - Browser oeffnet sich automatisch
echo    - Bei Apple einloggen (inkl. 2FA)
echo    - Script laeuft automatisch los
echo.
echo 4. PDFs werden gespeichert in: .\downloads\
echo.
echo Viel Erfolg!
echo.
pause
