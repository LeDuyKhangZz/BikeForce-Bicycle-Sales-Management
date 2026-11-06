-- Hiệu chỉnh số dư gốc TikTok theo xác nhận nghiệp vụ: 84.700.000 VND.
-- Đây KHÔNG phải một lần nạp 68.200.000 VND: số 16.500.000 đã là kết quả
-- ghi đè nhầm của RPC cũ, nên không được ghi thành giao dịch thật trong lịch sử.
do $$
begin
  -- Không được âm thầm viết lại lịch sử nếu từ lúc bật lịch sử đã có nạp thật.
  if exists (
    select 1
    from public.marketplace_ad_top_up_history
    where marketplace_code = 'TIKTOK'
      and event_type = 'DEPOSIT'
  ) then
    raise exception 'Cannot correct TikTok opening balance after recorded deposits exist';
  end if;

  update public.marketplace_ad_top_ups
  set amount = 84700000,
      updated_at = now(),
      updated_by = null
  where marketplace_code = 'TIKTOK';

  update public.marketplace_ad_top_up_history
  set previous_amount = 84700000,
      deposit_amount = 0,
      new_amount = 84700000
  where marketplace_code = 'TIKTOK'
    and event_type = 'OPENING_BALANCE';

  if not found then
    insert into public.marketplace_ad_top_up_history (
      marketplace_code, event_type, previous_amount, deposit_amount, new_amount, created_by
    ) values ('TIKTOK', 'OPENING_BALANCE', 84700000, 0, 84700000, null);
  end if;
end;
$$;
