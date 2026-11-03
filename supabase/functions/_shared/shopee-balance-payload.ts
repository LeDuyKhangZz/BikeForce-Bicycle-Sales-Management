export type ShopeeBalancePayload = {
  available_cash_balance: number;
  currency_code: 'VND';
  captured_at: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseShopeeBalancePayload(
  value: unknown,
  capturedAtFallback: string,
): ShopeeBalancePayload | null {
  if (!isRecord(value)) return null;

  const rawBalance = value['available_cash_balance'];
  const balance = typeof rawBalance === 'string' && /^\d+$/.test(rawBalance)
    ? Number(rawBalance)
    : rawBalance;
  const currencyCode = value['currency_code'];
  const capturedAt = value['captured_at'];

  if (
    typeof balance !== 'number' || !Number.isSafeInteger(balance) || balance < 0 ||
    currencyCode !== 'VND'
  ) return null;

  const capturedAtValue = capturedAt === undefined
    ? capturedAtFallback
    : typeof capturedAt === 'string' && Number.isFinite(Date.parse(capturedAt))
      ? capturedAt
      : null;
  if (capturedAtValue === null) return null;

  return {
    available_cash_balance: balance,
    currency_code: currencyCode,
    captured_at: capturedAtValue,
  };
}
