-- DEC-116: route ảnh Hạt Dẻ được đọc snapshot bằng automation client.
-- API bên ngoài vẫn được bảo vệ bằng HATDE_BOARD_IMAGE_API_KEY riêng.

grant select on public.hatde_snapshots to service_role;
grant select on public.hatde_branch_snapshots to service_role;

comment on table public.hatde_snapshots is
  'Snapshot doanh thu Hạt Dẻ; Admin đọc qua RLS, automation ảnh đọc bằng service_role phía server.';

comment on table public.hatde_branch_snapshots is
  'Chi tiết chi nhánh Hạt Dẻ; Admin đọc qua RLS, automation ảnh đọc bằng service_role phía server.';
