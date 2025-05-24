const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

let isScraping = false;
let lastScrapeTime = 0;
let cache = [];

app.get('/nfts', async (req, res) => {
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;

  // Return cache if scraper ran within 15 minutes
  if (now - lastScrapeTime < fifteenMinutes && cache.length > 0) {
    console.log('⚡ Serving cached NFTs');
    return res.json(cache);
  }

  if (isScraping) {
    console.log('⚠️ Scraper already running');
    return res.status(429).json({ error: 'Scraper in progress. Try again later.' });
  }

  let browser;
  isScraping = true;

  try {
    console.log('🚀 Launching Puppeteer...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://superrare.com/bojan_archnd', {
      waitUntil: 'networkidle2',
      timeout: 0
    });

    console.log('⏳ Waiting for NFT images...');
    await page.waitForSelector('img.object-contain', { timeout: 40000 });

    const nfts = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img.object-contain'));
      return images.map(img => {
        const link = img.closest('a')?.href || 'https://superrare.com/bojan_archnd';
        const image = img.src;
        return { image, link };
      });
    });

    console.log(`✅ Scraped ${nfts.length} NFTs`);
    cache = nfts;
    lastScrapeTime = Date.now();

    await browser.close();
    isScraping = false;
    return res.json(nfts);
  } catch (err) {
    console.error('❌ Scraper Error:', err.message);
    if (browser) await browser.close();
    isScraping = false;
    return res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ NFT scraper running at http://localhost:${PORT}/nfts`);
});
