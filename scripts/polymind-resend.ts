import { readFileSync, statSync } from 'node:fs';
import dotenv from 'dotenv';
import { z } from 'zod';
import { getVietnamToday } from '../lib/date';
import { syncSaleWorkToPolymind } from '../lib/salework/polymind-sync';

dotenv.config({ path: '.env.local', quiet: true });
const count = z.number().int().nonnegative();
const schema = z.array(z.object({
  accountName: z.string(), conversations: count, sentMessages: count,
  receivedMessages: count, incomingCalls: count, outgoingCalls: count,
  missedCalls: count, callDuration: z.string(),
}));

async function main() {
  if (!process.env.BIKEFORCE_API_KEY?.trim()) throw new Error('Thiếu BIKEFORCE_API_KEY.');
  const file = 'data/salework-report.json';
  const syncedAt = statSync(file).mtime;
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(syncedAt);
  if (date !== getVietnamToday()) throw new Error('Snapshot không thuộc hôm nay; cần chạy sync SaleWork.');
  const reports = schema.parse(JSON.parse(readFileSync(file, 'utf8')));
  await syncSaleWorkToPolymind(reports, date, syncedAt.toISOString(), process.env.BIKEFORCE_API_KEY);
  console.log(`[Polymind] Đã xác nhận cả hai snapshot ngày ${date}, nguồn cập nhật ${syncedAt.toISOString()}.`);
}

main().catch(() => {
  console.error('[Polymind] Gửi lại snapshot thất bại; kiểm tra status log và cấu hình.');
  process.exitCode = 1;
});
