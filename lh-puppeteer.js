/* eslint-disable linebreak-style */
const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  // Inicia browser controlável via DevTools protocol
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--remote-debugging-port=9222', '--no-sandbox'],
    // Para usar o Edge em vez do Chromium, descomente e ajuste:
    // executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  });

  // Importa Lighthouse via ESM
  const { default: lighthouse } = await import('lighthouse');

  // Executa Lighthouse contra a homepage
  const { lhr } = await lighthouse('http://localhost:5000/', {
    port: 9222,
    output: 'json',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  });

  // Salva JSON em reports/
  fs.writeFileSync(
    'reports/lighthouse.puppeteer.json',
    JSON.stringify(lhr, null, 2)
  );
  console.log('Relatório salvo em reports/lighthouse.puppeteer.json');

  await browser.close();
})();
