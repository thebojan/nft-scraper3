const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3001;

app.get('/nfts', async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://superrare.com/bojan_archnd', {
      waitUntil: 'networkidle2',
      timeout: 0
    });

    await page.waitForSelector('img.object-contain', { timeout: 40000 });

    const nfts = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img.object-contain'));
      return images.map(img => {
        const link = img.closest('a')?.href || 'https://superrare.com/bojan_archnd';
        const image = img.src;
        return { image, link };
      });
    });

    await browser.close();
    res.json(nfts);
  } catch (err) {
    console.error('❌ Scraper Error:', err.message);
    if (browser) await browser.close();
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`✅ NFT scraper running at http://localhost:${PORT}/nfts`);
});
