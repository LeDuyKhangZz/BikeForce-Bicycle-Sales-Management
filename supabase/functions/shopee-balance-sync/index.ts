import { parseShopeeBalancePayload } from '../_shared/shopee-balance-payload.ts';

function requiredSecret(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing ${name}`);
  return value;
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
    request.headers.get('x-shopee-balance-token'),
    requiredSecret('SHOPEE_BALANCE_SYNC_TOKEN'),
  )) {
    return Response.json({ ok: false, message: 'Unauthorized' }, { status: 401 });
  }

  let input: unknown;
  const requestUrl = new URL(request.url);
  const queryBalance = requestUrl.searchParams.get('available_cash_balance');
  if (queryBalance !== null) {
    input = { available_cash_balance: queryBalance, currency_code: 'VND' };
  } else {
    const requestBody = await request.text();
    try {
      input = JSON.parse(requestBody);
    } catch {
      const plainBalance = requestBody.trim();
      if (!/^\d+$/.test(plainBalance)) {
        return Response.json({ ok: false, message: 'Invalid request body' }, { status: 400 });
      }
      input = { available_cash_balance: plainBalance, currency_code: 'VND' };
    }
  }

  const payload = parseShopeeBalancePayload(input, new Date().toISOString());
  if (payload === null) {
    return Response.json({ ok: false, message: 'Invalid balance payload' }, { status: 400 });
  }

  const serviceRoleKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(
    `${requiredSecret('SUPABASE_URL')}/rest/v1/rpc/insert_shopee_ad_balance_snapshot`,
    {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_available_cash_balance: payload.available_cash_balance,
        p_currency_code: payload.currency_code,
        p_captured_at: payload.captured_at,
      }),
    },
  );
  if (!response.ok) {
    console.error(JSON.stringify({ event: 'shopee_balance_sync_failed', status: response.status }));
    return Response.json({ ok: false, message: 'Unable to store balance' }, { status: 500 });
  }

  const snapshotId: unknown = await response.json();
  return Response.json({ ok: true, snapshot_id: snapshotId }, { status: 200 });
}

Deno.serve(handler);
