type BalancePayload = {
  payment_portfolio_id: string;
  available_cash_balance: number;
  currency_code: 'VND';
  captured_at: string;
};

function requiredSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePayload(value: unknown): BalancePayload | null {
  if (!isRecord(value)) return null;
  const portfolioId = value['payment_portfolio_id'];
  const rawBalance = value['available_cash_balance'];
  const balance = typeof rawBalance === 'string' && /^\d+$/.test(rawBalance)
    ? Number(rawBalance)
    : rawBalance;
  const currencyCode = value['currency_code'];
  const capturedAt = value['captured_at'];
  if (
    typeof portfolioId !== 'string' || !/^[0-9]{8,32}$/.test(portfolioId) ||
    typeof balance !== 'number' || !Number.isSafeInteger(balance) || balance < 0 ||
    currencyCode !== 'VND'
  ) return null;
  const capturedAtValue = capturedAt === undefined
    ? new Date().toISOString()
    : typeof capturedAt === 'string' && Number.isFinite(Date.parse(capturedAt))
      ? capturedAt
      : null;
  if (capturedAtValue === null) return null;
  return {
    payment_portfolio_id: portfolioId,
    available_cash_balance: balance,
    currency_code: currencyCode,
    captured_at: capturedAtValue,
  };
}

async function tokenMatches(provided: string | null, expected: string): Promise<boolean> {
  if (provided === null) return false;
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
  ]);
  const left = new Uint8Array(providedHash);
  const right = new Uint8Array(expectedHash);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, message: 'Method not allowed' }, { status: 405 });
  }

  if (!await tokenMatches(
    request.headers.get('x-tiktok-balance-token'),
    requiredSecret('TIKTOK_BALANCE_SYNC_TOKEN'),
  )) {
    return Response.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  let input: unknown;
  const requestUrl = new URL(request.url);
  const queryPortfolioId = requestUrl.searchParams.get('payment_portfolio_id');
  const queryBalance = requestUrl.searchParams.get('available_cash_balance');
  if (queryPortfolioId !== null && queryBalance !== null) {
    input = {
      payment_portfolio_id: queryPortfolioId,
      available_cash_balance: queryBalance,
      currency_code: 'VND',
    };
  } else {
    const requestBody = await request.text();
    try {
      input = JSON.parse(requestBody);
    } catch {
      const plainTextMatch = requestBody.trim().match(/^([0-9]{8,32})\|([0-9]+)$/);
      if (plainTextMatch === null) {
        return Response.json({ ok: false, message: 'Invalid request body' }, { status: 400 });
      }
      input = {
        payment_portfolio_id: plainTextMatch[1],
        available_cash_balance: plainTextMatch[2],
        currency_code: 'VND',
      };
    }
  }
  const payload = parsePayload(input);
  if (payload === null) {
    return Response.json({ ok: false, message: 'Invalid balance payload' }, { status: 400 });
  }

  const serviceRoleKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(
    `${requiredSecret('SUPABASE_URL')}/rest/v1/rpc/insert_tiktok_ad_balance_snapshot`,
    {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_payment_portfolio_id: payload.payment_portfolio_id,
        p_available_cash_balance: payload.available_cash_balance,
        p_currency_code: payload.currency_code,
        p_captured_at: payload.captured_at,
      }),
    },
  );
  if (!response.ok) {
    console.error(JSON.stringify({ event: 'tiktok_balance_sync_failed', status: response.status }));
    return Response.json({ ok: false, message: 'Unable to store balance' }, { status: 500 });
  }

  const snapshotId: unknown = await response.json();
  return Response.json({ ok: true, snapshot_id: snapshotId }, { status: 200 });
}

Deno.serve(handler);
