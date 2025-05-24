const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

let lastScrapeTime = 0;
let cachedNFTs = [];

app.get('/nfts', async (req, res) => {
  const now = Date.now();
  const fifteenMinutes = 15 * 60 * 1000;

  if (now - lastScrapeTime < fifteenMinutes && cachedNFTs.length > 0) {
    console.log('⚡ Serving cached NFTs');
    return res.json(cachedNFTs);
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--no-zygote'
      ],
      timeout: 60000
    });

    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0);
    await page.goto('https://superrare.com/bojan_archnd', {
      waitUntil: 'networkidle2',
      timeout: 0
    });

    await page.waitForSelector('img.object-contain', { timeout: 45000 });

    const nfts = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img.object-contain'));
      return images.map(img => {
        const link = img.closest('a')?.href || 'https://superrare.com/bojan_archnd';
        const image = img.src;
        return { image, link };
      });
    });

    await browser.close();
    cachedNFTs = nfts;
    lastScrapeTime = Date.now();

    res.json(nfts);
  } catch (err) {
    console.error('❌ Scraper Error:', err.message);
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ NFT scraper running at http://localhost:${PORT}/nfts`);
});

