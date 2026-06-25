const { chromium } = require('playwright');
const adminCredentials = require('./data/admin.json');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error(`BROWSER ERROR: ${msg.text()}`);
    } else {
      console.log(`BROWSER CONSOLE: ${msg.text()}`);
    }
  });

  try {
    console.log("Navigating to dashboard...");
    await page.goto('http://localhost:5175');
    
    // Login
    await page.fill('input[type="text"]', adminCredentials.username);
    await page.fill('input[type="password"]', adminCredentials.password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    // Wait for the total leads count to ensure data loaded
    await page.waitForSelector('text=TOTAL LEADS', { timeout: 10000 });
    
    const text = await page.innerText('body');
    console.log("PAGE RENDERED SUCCESSFULLY.");
    console.log("Total Leads Text Exists:", text.includes('TOTAL LEADS'));
    
    // Check if the Out of Bounds tab is rendered correctly in the Leads section
    // Navigate to Leads tab
    await page.click('text=Leads Pipeline');
    await page.waitForTimeout(2000);
    const leadsText = await page.innerText('body');
    console.log("Out of Bounds Tab Exists:", leadsText.includes('Out of Bounds'));
    
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await browser.close();
  }
})();
