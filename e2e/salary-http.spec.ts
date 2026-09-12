import { createServerClient } from '@supabase/ssr';
import { expect, test } from '@playwright/test';

import type { Database } from '@/types/database.types';
import { E2E_ADMIN_EMAIL } from './accounts';
import { E2E_BASE_URL, E2E_PASSWORD, loadE2eEnv } from './env';

// APIRequest chỉ HTTP, không dùng page/context/browser và không khởi động Chrome.
test('HTTP-only: lưu form lương thật, mở lại và lấy ảnh cả ba người đúng tháng', async ({ request }) => {
  const env = loadE2eEnv();
  const cookies = new Map<string, string>();
  const auth = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: updates => { for (const cookie of updates) cookies.set(cookie.name, cookie.value); },
    },
  });
  const { data, error } = await auth.auth.signInWithPassword({ email: E2E_ADMIN_EMAIL, password: E2E_PASSWORD });
  expect(error).toBeNull();
  const token = data.session?.access_token;
  if (!token) throw new Error('Không có phiên Admin test local.');
  const cookieHeader = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  const path = '/admin/salaries?month=2042-06';
  const response = await request.get(path, { headers: { Cookie: cookieHeader } });
  expect(response.ok()).toBe(true);
  const html = await response.text();
  const form = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g)?.find(candidate => candidate.includes('name="month"'));
  if (!form) throw new Error('Không tìm thấy form Lương SSR.');
  const fields: Record<string, string> = {};
  for (const input of form.match(/<input\b[^>]*>/g) ?? []) {
    const name = input.match(/\bname="([^"]*)"/)?.[1];
    const value = input.match(/\bvalue="([^"]*)"/)?.[1] ?? '';
    if (name) fields[name] = value.replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
  }
  const amounts = { 'amis-dang-khoa': 17000000, 'salework-accounting-sales': 18000000, 'amis-kim-huong': 19000000 };
  for (const [id, amount] of Object.entries(amounts)) {
    expect(fields).toHaveProperty(`amount__${id}`);
    fields[`amount__${id}`] = String(amount);
  }
  const saved = await request.post(path, {
    headers: { Cookie: cookieHeader, Origin: E2E_BASE_URL, Referer: `${E2E_BASE_URL}${path}` }, multipart: fields,
  });
  expect(saved.ok()).toBe(true);
  expect(await saved.text()).toContain('Đã lưu lương tháng.');
  const reopened = await request.get(path, { headers: { Cookie: cookieHeader } });
  const reopenedHtml = await reopened.text();
  const payroll = await request.get(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/monthly_participant_salaries?select=participant_key,amount&period_month=eq.2042-06-01`, {
    headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
  });
  expect(payroll.ok()).toBe(true);
  const payrollRows: unknown = await payroll.json();
  for (const [id, amount] of Object.entries(amounts)) {
    expect(reopenedHtml).toContain(`name="amount__${id}"`);
    expect(payrollRows).toEqual(expect.arrayContaining([{ participant_key: id, amount }]));
    const image = await request.get(`/api/admin/monthly-summaries/${id}/image?month=2042-06`, { headers: { Cookie: cookieHeader } });
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
    expect(image.headers()['cache-control']).toBe('private, no-store');
    expect((await image.body()).subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  }
});
