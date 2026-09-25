import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Listen for all console events and log them to our terminal
    page.on('console', msg => {
        if(msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        }
    });

    page.on('pageerror', err => {
        console.log('PAGE ERROR:', err.toString());
    });

    try {
        await page.goto('http://localhost:5173/pos', { waitUntil: 'networkidle2', timeout: 10000 });
        console.log('Page loaded completely. Checking for errors...');
    } catch (e) {
        console.error('Failed to load page:', e.message);
    }
    
    await browser.close();
})();
