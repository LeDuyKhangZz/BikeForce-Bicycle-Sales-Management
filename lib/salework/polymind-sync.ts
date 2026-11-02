import { parseSaleWorkDurationSeconds } from './call-metrics';
import { retryAsync } from '../process/retry-async';

const ENDPOINT = 'https://www.polymind.vn/api/integrations/bikeforce/salework';
const PEOPLE = [
  { accountName: 'Cô Lê', person: 'co-le' },
  { accountName: 'Cô Thy', person: 'co-thy' },
] as const;

type Activity = {
  accountName: string;
  conversations: number;
  sentMessages: number;
  receivedMessages: number;
  incomingCalls: number;
  outgoingCalls: number;
  missedCalls: number;
  callDuration: string;
};

class DeliveryError extends Error {
  constructor(readonly retryable: boolean, message: string) {
    super(message);
  }
}

/** Gửi lại snapshot mỗi lượt; phía nhận UPSERT theo person + date. */
export async function syncSaleWorkToPolymind(
  reports: readonly Activity[],
  date: string,
  syncedAt: string,
  apiKey: string | undefined,
  fetcher: typeof fetch = fetch,
  log: (message: string) => void = console.log,
): Promise<void> {
  if (!apiKey?.trim()) {
    log('[Polymind] Chưa cấu hình BIKEFORCE_API_KEY; bỏ qua gửi snapshot.');
    return;
  }
  // Kiểm đủ cả hai trước khi gửi; không thay snapshot thiếu nguồn bằng số 0.
  const payloads = PEOPLE.map(({ accountName, person }) => {
    const report = reports.find((item) => item.accountName === accountName);
    if (!report) throw new Error(`[Polymind] Thiếu dữ liệu ${person}.`);
    const { conversations, sentMessages, receivedMessages, incomingCalls, outgoingCalls, missedCalls } = report;
    const counters = { conversations, sentMessages, receivedMessages, incomingCalls, outgoingCalls, missedCalls };
    if (!Object.values(counters).every((value) => Number.isSafeInteger(value) && value >= 0)) {
      throw new Error(`[Polymind] Số liệu không hợp lệ: ${person}.`);
    }
    return {
      person, date,
      snapshot: { ...counters, callDurationSeconds: parseSaleWorkDurationSeconds(report.callDuration), syncedAt },
    };
  });
  const failures: string[] = [];
  for (const payload of payloads) {
    try {
      await retryAsync(async () => {
        let response: Response;
        try {
          response = await fetcher(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey.trim() },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15_000),
            redirect: 'error',
          });
        } catch {
          throw new DeliveryError(true, `[Polymind] ${payload.person}: lỗi mạng/timeout.`);
        }
        log(`[Polymind] ${payload.person}: HTTP ${response.status}`);
        if (response.status !== 200) {
          await response.body?.cancel();
          throw new DeliveryError(response.status >= 500, `[Polymind] ${payload.person}: HTTP ${response.status}`);
        }
        const body: unknown = await response.json().catch(() => null);
        if (typeof body !== 'object' || body === null || !('ok' in body) || body.ok !== true) {
          throw new DeliveryError(false, `[Polymind] ${payload.person}: phản hồi thiếu ok=true.`);
        }
      }, {
        maxAttempts: 3,
        delayMs: 2_000,
        shouldRetry: (error) => error instanceof DeliveryError && error.retryable,
      });
    } catch {
      failures.push(payload.person);
    }
  }
  if (failures.length) throw new Error(`[Polymind] Gửi snapshot thất bại: ${failures.join(', ')}. Dữ liệu Supabase đã lưu; lượt sync ngày tiếp theo sẽ gửi lại.`);
}
