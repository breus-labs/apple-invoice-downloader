const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Konfiguration
const CONFIG = {
  sessionFile: 'apple-session.json',
  downloadDir: 'downloads',
  slowMo: 50,
  timeout: 30000
};

// Utility Funktionen
function sanitizeFilename(filename) {
  return filename
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/€/g, 'EUR')
    .substring(0, 150);
}

function parseGermanDate(dateStr) {
  const months = {
    'Jan.': '01', 'Feb.': '02', 'März': '03', 'Apr.': '04',
    'Mai': '05', 'Juni': '06', 'Juli': '07', 'Aug.': '08',
    'Sept.': '09', 'Okt.': '10', 'Nov.': '11', 'Dez.': '12'
  };
  
  const parts = dateStr.split(' ');
  if (parts.length >= 3) {
    const day = parts[0].replace('.', '').padStart(2, '0');
    const month = months[parts[1]] || '00';
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr.replace(/[.\s]/g, '-');
}

async function main(targetYear) {
  console.log('🍎 Apple Invoice Downloader v2\n');
  console.log('═══════════════════════════════════════\n');
  if (targetYear) {
    console.log(`🎯 Ziel-Jahr: ${targetYear}\n`);
  }
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: CONFIG.slowMo
  });
  
  const hasSession = fs.existsSync(CONFIG.sessionFile);
  const context = hasSession 
    ? await browser.newContext({ 
        storageState: CONFIG.sessionFile,
        viewport: { width: 1280, height: 1024 }
      })
    : await browser.newContext({
        viewport: { width: 1280, height: 1024 }
      });
  
  const page = await context.newPage();
  page.setDefaultTimeout(CONFIG.timeout);
  
  try {
    // Zu Apple navigieren
    console.log('🌐 Navigiere zu reportaproblem.apple.com...');
    await page.goto('https://reportaproblem.apple.com/', {
      waitUntil: 'networkidle'
    });
    
    // Warten auf Kaufhistorie
    console.log('⏳ Warte auf Kaufhistorie (Login falls nötig)...');
    
    try {
      await page.waitForSelector('button[data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Button.ToggleDisclosure"]', {
        timeout: 60000
      });
      
      if (!hasSession) {
        await context.storageState({ path: CONFIG.sessionFile });
        console.log('✅ Session gespeichert!\n');
      } else {
        console.log('✅ Kaufhistorie geladen\n');
      }
      
      // Auf "Alle" umschalten (falls Family Account vorhanden)
      console.log('🔄 Prüfe Account-Auswahl...');
      try {
        const familySelect = page.locator('select[data-auto-test-id="RAP2.FilterPurchases.Select.FamilyMember"]');
        const selectCount = await familySelect.count();
        
        if (selectCount > 0) {
          console.log('   Family Account gefunden - wechsle zu "Alle"');
          await familySelect.selectOption({ label: 'Alle' });
          await page.waitForTimeout(2000);
          await page.waitForSelector('button[data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Button.ToggleDisclosure"]');
          console.log('✅ Auf "Alle" umgeschaltet\n');
        } else {
          console.log('✅ Einzelner Account (kein Family Sharing)\n');
        }
      } catch (e) {
        console.log('✅ Einzelner Account (kein Family Sharing)\n');
      }
      
    } catch (error) {
      console.log('\n❌ Fehler beim Laden der Kaufhistorie!');
      throw error;
    }
    
    // SCHRITT 1: Alle Bestellungen sammeln (mit Infinite Scroll)
    console.log('📋 Sammle alle Bestellungen...\n');

    // Scrollen: wenn targetYear gesetzt, bis Einträge aus dem Jahr davor sichtbar sind
    // (damit wir sicher alle targetYear-Einträge erfasst haben).
    // Ohne targetYear: Verhalten wie zuvor (stoppt bei currentYear - 1).
    const stopYear = targetYear
      ? targetYear - 1
      : new Date().getFullYear() - 1;

    console.log(`⏬ Scrolle bis Einträge aus ${stopYear} sichtbar sind${targetYear ? ` (um alles aus ${targetYear} zu erfassen)` : ''}...`);
    let previousCount = 0;
    let currentCount = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 50;
    let hasStopYearEntries = false;

    while (scrollAttempts < maxScrollAttempts && !hasStopYearEntries) {
      // Aktuelle Anzahl zählen
      currentCount = await page.locator('button[data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Button.ToggleDisclosure"]').count();

      // Prüfe ob wir schon Einträge aus Stop-Jahr haben
      const allButtons = await page.locator('button[data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Button.ToggleDisclosure"]').all();
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text.includes(String(stopYear))) {
          hasStopYearEntries = true;
          break;
        }
      }

      if (hasStopYearEntries) {
        console.log(`✅ Einträge aus ${stopYear} gefunden (${currentCount} Käufe geladen)\n`);
        break;
      }
      
      // Ans Ende scrollen
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      // Warten bis neue Einträge geladen sind
      await page.waitForTimeout(1500);
      
      // Wenn keine neuen Einträge, sind wir am Ende
      if (currentCount === previousCount) {
        console.log(`✅ Ende der Liste erreicht (${currentCount} Käufe, kein ${stopYear} gefunden)\n`);
        break;
      }
      
      console.log(`   ${currentCount} Käufe geladen...`);
      previousCount = currentCount;
      scrollAttempts++;
    }
    
    if (scrollAttempts >= maxScrollAttempts) {
      console.log(`⚠️  Max Scroll-Versuche erreicht (${currentCount} Käufe)\n`);
    }
    
    // Zurück nach oben scrollen
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    
    const orders = [];
    const disclosureButtons = await page.locator('button[data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Button.ToggleDisclosure"]').all();
    
    for (let i = 0; i < disclosureButtons.length; i++) {
      try {
        // Wichtig: Buttons NEU laden da React re-rendert
        const buttons = await page.locator('button[data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Button.ToggleDisclosure"]').all();
        const button = buttons[i];
        
        const buttonText = await button.textContent();
        
        const dateMatch = buttonText.match(/(\d{1,2}\.\s+\w+\.?\s+\d{4})/);
        const amountMatch = buttonText.match(/([\d,]+)\s*€/);
        const orderIdMatch = buttonText.match(/([A-Z0-9]{10,})/);
        
        if (orderIdMatch) {
          const orderId = orderIdMatch[1];
          const date = dateMatch ? parseGermanDate(dateMatch[1]) : 'unknown';
          const amount = amountMatch ? amountMatch[1].replace(',', '.') : 'unknown';

          // Jahresfilter: nur wenn targetYear gesetzt ist
          if (targetYear && !date.startsWith(String(targetYear))) {
            console.log(`↷ ${date} - ${orderId} (übersprungen, nicht ${targetYear})`);
            continue;
          }

          // Prüfen ob dieser Button bereits expanded ist
          const ariaExpanded = await button.getAttribute('aria-expanded');
          
          // Falls expanded, erst schließen
          if (ariaExpanded === 'true') {
            await button.click();
            await page.waitForTimeout(300);
          }
          
          // Jetzt öffnen
          await button.click();
          await page.waitForTimeout(800); // Mehr Zeit zum Laden
          
          // Prüfen ob Beleg verfügbar ist
          const noInvoice = await page.locator('div[data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Label.NoInvoice"]').count();
          const hasInvoice = noInvoice === 0;
          
          // Produktname direkt hier extrahieren
          let productName = 'unknown';
          if (hasInvoice) {
            try {
              // Warte kurz damit die Produktliste geladen ist
              await page.waitForTimeout(500);
              
              // Die Produkte sind in .pli-list, nicht in .purchase-details!
              // Wir müssen den parent .purchase Container finden der gerade expanded ist
              
              // Finde alle purchase Container
              const allPurchases = await page.locator('.purchase').all();
              
              // Suche denjenigen mit aria-expanded="true" Button
              let activePurchase = null;
              for (const purchase of allPurchases) {
                const expandButton = await purchase.locator('button[data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Button.ToggleDisclosure"]').first();
                const isExpanded = await expandButton.getAttribute('aria-expanded');
                
                if (isExpanded === 'true') {
                  activePurchase = purchase;
                  break;
                }
              }
              
              if (activePurchase) {
                // Hole Produkttitel aus diesem Purchase Container
                const titleDivs = await activePurchase.locator('.pli-title div[aria-label]').all();
                
                if (titleDivs.length > 0) {
                  const names = [];
                  for (let idx = 0; idx < Math.min(titleDivs.length, 2); idx++) {
                    const ariaLabel = await titleDivs[idx].getAttribute('aria-label');
                    if (ariaLabel && ariaLabel.trim()) {
                      names.push(ariaLabel.trim());
                    }
                  }
                  if (names.length > 0) {
                    productName = names.join('_')
                      .substring(0, 40)
                      .replace(/[^a-zA-Z0-9äöüÄÖÜß\s]/g, '')
                      .replace(/\s+/g, '_');
                  }
                }
              } else {
                console.log(`   ⚠️  Kein expanded purchase gefunden`);
              }
            } catch (e) {
              console.log(`   ⚠️  Produktname-Fehler: ${e.message}`);
            }
          }
          
          // Wieder zuklappen
          await button.click();
          await page.waitForTimeout(300);
          
          if (hasInvoice) {
            orders.push({ orderId, date, amount, productName });
            console.log(`✓ ${date} - ${amount}€ - ${productName} - ${orderId}`);
          } else {
            console.log(`⊘ ${date} - ${amount}€ - ${orderId} (kein Beleg)`);
          }
        }
      } catch (e) {
        console.log(`⚠️  Fehler bei Bestellung ${i + 1}: ${e.message}`);
      }
    }
    
    console.log(`\n📦 ${orders.length} Bestellungen mit Belegen gefunden\n`);
    
    if (orders.length === 0) {
      console.log('⚠️  Keine Bestellungen zum Herunterladen gefunden!');
      await browser.close();
      return;
    }
    
    // Download-Ordner vorbereiten
    const downloadPath = path.join(process.cwd(), CONFIG.downloadDir);
    console.log(`📁 Download-Ordner: ${downloadPath}`);
    
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
      console.log('   ✓ Ordner erstellt');
    } else {
      console.log('   ✓ Ordner existiert');
    }
    console.log();
    
    // SCHRITT 2: Jede Bestellung einzeln laden
    console.log('═══════════════════════════════════════');
    console.log('📥 STARTE DOWNLOAD');
    console.log('═══════════════════════════════════════\n');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      console.log(`\n[${i + 1}/${orders.length}] ${order.orderId}`);
      console.log('─'.repeat(40));
      
      try {
        // Zurück zur Hauptseite
        await page.goto('https://reportaproblem.apple.com/', {
          waitUntil: 'networkidle'
        });
        
        // Auf "Alle" schalten (falls vorhanden)
        try {
          const familySelect = page.locator('select[data-auto-test-id="RAP2.FilterPurchases.Select.FamilyMember"]');
          if (await familySelect.count() > 0) {
            await familySelect.selectOption({ label: 'Alle' });
            await page.waitForTimeout(1500);
          }
        } catch (e) {
          // Kein Family Account - einfach weitermachen
        }
        
        // Finde den Button für diese Bestellung
        console.log(`🔍 Suche ${order.orderId}...`);
        
        // Scrolle durch die Liste bis wir die Bestellung finden
        let targetButton = null;
        let scrollAttempts = 0;
        const maxScrollAttempts = 20;
        
        while (!targetButton && scrollAttempts < maxScrollAttempts) {
          const allButtons = await page.locator('button[data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Button.ToggleDisclosure"]').all();
          
          // Suche in aktuell geladenen Buttons
          for (const btn of allButtons) {
            const text = await btn.textContent();
            if (text.includes(order.orderId)) {
              targetButton = btn;
              break;
            }
          }
          
          // Wenn gefunden, fertig
          if (targetButton) break;
          
          // Sonst weiter scrollen
          const currentCount = allButtons.length;
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
          await page.waitForTimeout(1000);
          
          // Prüfe ob neue Einträge geladen wurden
          const newCount = await page.locator('button[data-auto-test-id="RAP2.PurchaseList.PurchaseHeader.Button.ToggleDisclosure"]').count();
          
          if (newCount === currentCount) {
            // Keine neuen Einträge mehr
            console.log(`   ⚠️  Ende der Liste erreicht, Bestellung nicht gefunden`);
            break;
          }
          
          scrollAttempts++;
        }
        
        if (!targetButton) {
          console.log('❌ Bestellung nicht gefunden in Liste');
          errorCount++;
          continue;
        }
        
        // Details öffnen
        console.log('📂 Öffne Details...');
        await targetButton.click();
        await page.waitForTimeout(800);
        
        // Produktname aus bereits gesammelten Daten verwenden
        const productName = order.productName || 'unknown';
        console.log(`📦 Produkt: ${productName}`);
        
        // Beleg-Button finden und klicken
        console.log('📄 Öffne Beleg...');
        const invoiceButton = page.locator('button[data-auto-test-id="RAP2.PurchaseList.PurchaseDetails.Button.ViewReceipt"]');
        
        if (await invoiceButton.count() === 0) {
          console.log('❌ Beleg-Button nicht gefunden');
          errorCount++;
          continue;
        }
        
        await invoiceButton.click();
        
        // Warten bis die Rechnung geladen ist
        // (könnte Modal sein oder neue Seite)
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.waitForTimeout(3000); // Extra Zeit zum Rendern
        
        const currentUrl = page.url();
        console.log(`   URL: ...${currentUrl.substring(Math.max(0, currentUrl.length - 50))}`);
        
        // Als PDF speichern
        const filename = sanitizeFilename(`${order.date}_Apple_${order.amount}EUR_${productName}_${order.orderId}.pdf`);
        const filepath = path.join(downloadPath, filename);
        
        console.log('💾 Speichere PDF...');
        console.log(`   Pfad: ${filepath}`);
        
        try {
          await page.pdf({
            path: filepath,
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
          });
          
          console.log('   ✓ PDF-Funktion ausgeführt');
          
          // Prüfe ob Datei existiert
          if (!fs.existsSync(filepath)) {
            console.log('❌ FEHLER: PDF-Datei wurde nicht erstellt!');
            errorCount++;
            continue;
          }
          
          // Prüfe ob PDF nicht leer ist
          const stats = fs.statSync(filepath);
          console.log(`   ✓ Dateigröße: ${stats.size} bytes`);
          
          if (stats.size < 5000) {
            console.log(`⚠️  PDF scheint leer zu sein (${stats.size} bytes)`);
            errorCount++;
          } else {
            console.log(`✅ Gespeichert: ${filename} (${Math.round(stats.size / 1024)}kb)`);
            successCount++;
          }
        } catch (pdfError) {
          console.log(`❌ PDF-Fehler: ${pdfError.message}`);
          errorCount++;
        }
        
      } catch (error) {
        console.log(`❌ Fehler: ${error.message}`);
        errorCount++;
      }
    }
    
    // Zusammenfassung
    console.log('\n\n═══════════════════════════════════════');
    console.log('📊 ZUSAMMENFASSUNG');
    console.log('═══════════════════════════════════════');
    console.log(`✅ Erfolgreich: ${successCount}`);
    console.log(`❌ Fehler: ${errorCount}`);
    console.log(`📁 Gespeichert in: ${downloadPath}`);
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ Kritischer Fehler:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

// CLI Parameter
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
🍎 Apple Invoice Downloader v2
═══════════════════════════════════════

VERWENDUNG:
  node apple-invoice-downloader-v2.js [--year YYYY]

OPTIONEN:
  --year YYYY    Nur Rechnungen aus dem angegebenen Jahr laden
                 (Standard: ohne Filter – alle geladenen Einträge)

BEISPIEL:
  node apple-invoice-downloader-v2.js --year 2024

UNTERSCHIED ZU V1:
  - Sammelt ERST alle Bestellnummern
  - Lädt DANN jede einzeln direkt
  - Robuster, keine Race Conditions
  - Bessere Fehlerbehandlung

═══════════════════════════════════════
  `);
  process.exit(0);
}

// --year parsen (optional – ohne Flag kein Filter)
let targetYear = null;
const yearIdx = args.indexOf('--year');
if (yearIdx !== -1 && args[yearIdx + 1]) {
  const parsed = parseInt(args[yearIdx + 1], 10);
  if (!Number.isNaN(parsed) && parsed >= 2000 && parsed <= 2100) {
    targetYear = parsed;
  } else {
    console.error(`❌ Ungültiges Jahr: ${args[yearIdx + 1]}`);
    process.exit(1);
  }
}

// Start
console.log('Starte in 2 Sekunden...\n');
setTimeout(() => {
  main(targetYear).catch(console.error);
}, 2000);
