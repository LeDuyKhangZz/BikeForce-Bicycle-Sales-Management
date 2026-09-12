import { chromium, type Browser } from '@playwright/test';
import { spawn } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { AMIS_BROWSER_ENDPOINT, sharedAmisBrowserArgs } from '../../lib/amis/shared-browser-config';
import { getSingleBrowserPage } from '../../lib/amis/single-browser-page';

const PROFILE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../.playwright-amis-profile');
const LOCK_PATH = resolve(PROFILE_DIR, 'bikeforce-script.lock');
const wait = (milliseconds: number) => new Promise<void>((done) => setTimeout(done, milliseconds));

function acquireLock(): () => void {
  mkdirSync(PROFILE_DIR, { recursive: true });
  if (existsSync(LOCK_PATH)) {
    const owner = Number(readFileSync(LOCK_PATH, 'utf8'));
    let active = Number.isInteger(owner) && owner > 0;
    if (active) {
      try { process.kill(owner, 0); } catch (error) {
        // Không có quyền kiểm tra PID không đồng nghĩa PID đã chết.
        if (error instanceof Error && 'code' in error && error.code === 'ESRCH') active = false;
      }
    }
    if (active) throw new Error('Một script AMIS khác đang dùng trình duyệt chung. Hãy chờ script đó hoàn tất; không mở phiên đăng nhập mới.');
    unlinkSync(LOCK_PATH);
  }
  const handle = openSync(LOCK_PATH, 'wx');
  writeFileSync(handle, String(process.pid));
  closeSync(handle);
  return () => { if (existsSync(LOCK_PATH)) unlinkSync(LOCK_PATH); };
}

async function browserIsReady(): Promise<boolean> {
  try {
    const response = await fetch(`${AMIS_BROWSER_ENDPOINT}/json/version`, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch { return false; }
}

/** Mở Chrome thường một lần; các script sau chỉ gắn vào cùng browser/context/tab. */
export async function connectToSharedAmisBrowser() {
  const releaseLock = acquireLock();
  let connectedBrowser: Browser | undefined;
  try {
    if (!(await browserIsReady())) {
      const executable = [
        process.env.AMIS_CHROME_EXECUTABLE?.trim(),
        'C:/Program Files/Google/Chrome/Application/chrome.exe',
        'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
      ].find((candidate) => candidate && existsSync(candidate));
      if (!executable) throw new Error('Không tìm thấy Google Chrome. Cấu hình AMIS_CHROME_EXECUTABLE trỏ tới chrome.exe.');
      const child = spawn(executable, sharedAmisBrowserArgs(PROFILE_DIR), {
        detached: true,
        stdio: 'ignore',
        windowsHide: true,
      });
      let launchError: Error | undefined;
      child.on('error', (error) => { launchError = error; });
      child.unref();
      const deadline = Date.now() + 30_000;
      while (!(await browserIsReady()) && Date.now() < deadline) {
        if (launchError) throw launchError;
        await wait(500);
      }
      if (!(await browserIsReady())) throw new Error('Chrome AMIS chưa bật được CDP. Nếu còn cửa sổ AMIS tự động cũ, đóng đúng cửa sổ đó một lần rồi chạy lại; không đăng nhập ở profile khác.');
    }
    const browser = await chromium.connectOverCDP(AMIS_BROWSER_ENDPOINT);
    connectedBrowser = browser;
    const context = browser.contexts()[0];
    if (!context) {
      await browser.close();
      throw new Error('Chrome AMIS không có context mặc định; không tạo context đăng nhập thứ hai.');
    }
    const page = await getSingleBrowserPage(context);
    console.log('   -> Dung chung Google Chrome AMIS tai 127.0.0.1:9223 (mot profile, mot tab).');
    return {
      context,
      page,
      async disconnect() {
        try {
          // Browser được connectOverCDP: close chỉ ngắt transport, không tắt Chrome.
          await browser.close();
        } finally { releaseLock(); }
      },
    };
  } catch (error) {
    try { await connectedBrowser?.close(); } finally { releaseLock(); }
    throw error;
  }
}
