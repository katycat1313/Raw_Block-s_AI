import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authPath = path.resolve(__dirname, 'storage', 'auth.json');

async function main() {
  console.log('======================================================');
  console.log('🤖 BROWSER BOT LOGIN ASSISTANT');
  console.log('======================================================');
  console.log('Opening Chrome window on your screen...');
  console.log('Please log into Krechet Academy in the window that appears.');
  console.log('Once you are logged in, this window will automatically save');
  console.log('your session cookies and close.');
  console.log('======================================================\n');

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();
  await page.goto('https://krechet.academy/login');

  console.log('Waiting for you to log in...');
  
  // Wait until user is logged in (URL leaves /login and lands on dashboard/app, or reaches 120s timeout)
  try {
    await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 120000 });
    await page.waitForTimeout(2000); // Allow auth tokens to settle into localStorage/cookies

    await context.storageState({ path: authPath });
    console.log('\n✅ SUCCESS! Bot authentication cookies saved to:');
    console.log(authPath);
    console.log('The bot can now autonomously record all protected tools and simulations!\n');
  } catch (err) {
    console.warn('\n⚠️ Login timed out or window was closed before completion:', err.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
