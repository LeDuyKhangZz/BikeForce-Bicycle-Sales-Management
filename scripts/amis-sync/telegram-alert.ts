import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { setDefaultResultOrder } from 'node:dns';
import { hostname } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TELEGRAM_API_ROOT = 'https://api.telegram.org';
const HERE = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(HERE, '.telegram-alert-state.json');
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15_000;

// Một số mạng Windows phân giải được IPv6 của Telegram nhưng không định tuyến IPv6.
// Ưu tiên IPv4 giống đường kết nối curl đang hoạt động; IPv6 vẫn là phương án sau.
setDefaultResultOrder('ipv4first');

type TelegramApiResponse = {
  ok: boolean;
  result?: unknown;
  description?: string;
};

type TelegramUpdate = {
  update_id: number;
  message?: {
    chat: {
      id: number;
      type: string;
    };
  };
};

function isAlertState(value: unknown): value is Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((timestamp) => typeof timestamp === 'number');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTelegramUpdate(value: unknown): value is TelegramUpdate {
  if (!isRecord(value) || typeof value.update_id !== 'number') return false;
  if (value.message === undefined) return true;
  if (!isRecord(value.message) || !isRecord(value.message.chat)) return false;
  return typeof value.message.chat.id === 'number' && typeof value.message.chat.type === 'string';
}

function escapeCurlConfigValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n');
}

async function telegramRequestViaCurl(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const url = `${TELEGRAM_API_ROOT}/bot${token}/${method}`;
  const configText = [
    `url = "${escapeCurlConfigValue(url)}"`,
    'request = "POST"',
    'header = "Content-Type: application/json"',
    `data = "${escapeCurlConfigValue(JSON.stringify(body))}"`,
    'silent',
    'show-error',
    'max-time = 15',
  ].join('\n');

  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn('curl.exe', ['--config', '-'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let output = '';
    let errorOutput = '';

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => { output += chunk; });
    child.stderr.on('data', (chunk: string) => { errorOutput += chunk; });
    child.on('error', rejectPromise);
    child.on('close', (exitCode) => {
      if (exitCode !== 0) {
        rejectPromise(new Error(`curl Telegram that bai: ${errorOutput.trim() || `exit ${exitCode}`}`));
        return;
      }

      try {
        resolvePromise(JSON.parse(output));
      } catch {
        rejectPromise(new Error('curl Telegram tra ve du lieu khong hop le.'));
      }
    });
    child.stdin.end(configText);
  });
}

function parseTelegramResponse(payload: unknown, httpStatus?: number): TelegramApiResponse {
  if (!isRecord(payload) || typeof payload.ok !== 'boolean') {
    const suffix = httpStatus === undefined ? '' : ` (HTTP ${httpStatus})`;
    throw new Error(`Telegram tra ve du lieu khong hop le${suffix}.`);
  }

  return {
    ok: payload.ok,
    result: payload.result,
    description: typeof payload.description === 'string' ? payload.description : undefined,
  };
}

function readAlertState(): Record<string, number> {
  if (!existsSync(STATE_PATH)) return {};

  try {
    const parsed: unknown = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
    return isAlertState(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function telegramRequest(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<TelegramApiResponse> {
  try {
    const response = await fetch(`${TELEGRAM_API_ROOT}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const payload: unknown = await response.json();
    return parseTelegramResponse(payload, response.status);
  } catch {
    // Trên một số máy Windows, firewall chặn node.exe nhưng vẫn cho curl.exe đi HTTPS.
    // Config (có token) được truyền qua stdin để secret không xuất hiện trong process arguments.
    const payload = await telegramRequestViaCurl(token, method, body);
    return parseTelegramResponse(payload);
  }
}

export async function findLatestTelegramChatId(token: string): Promise<string | null> {
  const response = await telegramRequest(token, 'getUpdates', {
    allowed_updates: ['message'],
    limit: 100,
    timeout: 0,
  });

  if (!response.ok) {
    throw new Error(response.description ?? 'Telegram khong cho phep doc tin nhan cua bot.');
  }

  const updates = Array.isArray(response.result)
    ? response.result.filter(isTelegramUpdate)
    : [];
  const privateMessages = updates
    .filter((update) => update.message?.chat.type === 'private')
    .sort((left, right) => right.update_id - left.update_id);

  const chatId = privateMessages[0]?.message?.chat.id;
  return chatId === undefined ? null : String(chatId);
}

export async function sendTelegramMessage(
  token: string,
  chatId: string,
  message: string,
): Promise<void> {
  const response = await telegramRequest(token, 'sendMessage', {
    chat_id: chatId,
    text: message,
  });

  if (!response.ok) {
    throw new Error(response.description ?? 'Telegram khong gui duoc tin nhan.');
  }
}

export async function sendTelegramAlert(message: string, alertKey: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return;

  const state = readAlertState();
  const lastSentAt = state[alertKey] ?? 0;
  if (Date.now() - lastSentAt < ALERT_COOLDOWN_MS) return;

  try {
    await sendTelegramMessage(
      token,
      chatId,
      `BIKEFORCE CANH BAO\nMay: ${hostname()}\n${message}`,
    );
    state[alertKey] = Date.now();
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
    console.error('   -> Da gui canh bao Telegram.');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`   -> Khong gui duoc Telegram: ${detail}`);
  }
}
