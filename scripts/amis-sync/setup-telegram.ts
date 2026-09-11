import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { findLatestTelegramChatId, sendTelegramMessage } from './telegram-alert';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(HERE, '.env');

function upsertEnv(values: Record<string, string>): void {
  const raw = existsSync(ENV_PATH)
    ? readFileSync(ENV_PATH, 'utf8').replace(/^\uFEFF/, '')
    : '';
  const lines = raw.split(/\r?\n/);

  for (const [key, value] of Object.entries(values)) {
    const index = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (index >= 0) lines[index] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }

  writeFileSync(ENV_PATH, lines.join('\r\n'), 'utf8');
}

async function main(): Promise<void> {
  config({ path: ENV_PATH, quiet: true });
  const prompt = createInterface({ input: stdin, output: stdout });
  const savedToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const token = savedToken || (await prompt.question('Dan Bot Token tu BotFather vao day: ')).trim();
  prompt.close();

  if (!token || /\s/.test(token)) {
    throw new Error('Bot Token khong hop le.');
  }

  console.log('Dang tim tin nhan ban vua gui cho bot...');
  const chatId = await findLatestTelegramChatId(token);
  if (!chatId) {
    throw new Error('Chua thay tin nhan. Hay mo bot, gui /start hoac test, roi chay lai lenh nay.');
  }

  upsertEnv({ TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId });
  await sendTelegramMessage(
    token,
    chatId,
    'BikeForce da ket noi Telegram thanh cong. Tu nay ban se nhan canh bao khi phien MISA het han.',
  );
  console.log('THANH CONG: da luu cau hinh va gui tin nhan thu nghiem.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
