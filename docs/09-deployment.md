# 09 — Deployment (Supabase + Vercel)
> Status: DRAFT | Phase: 0 | Last updated: 2026-08-07
> Nguồn sự thật cấp trên: BIKEFORCE_MASTER_SPEC.md → docs/11-decisions.md → tài liệu này

---

## 0. TRẠNG THÁI THỰC TẾ TẠI THỜI ĐIỂM VIẾT TÀI LIỆU

Phải đọc mục này trước khi làm bất cứ bước nào bên dưới.

- **Chưa có gì được deploy.** Không có deployment nào trên Vercel, không có URL production.
- **Chưa có Supabase project nào được tạo.** Không có `project-ref`, không có database, không có bảng `profiles` / `daily_reports`.
- **Chưa có migration nào.** Thư mục `supabase/` chưa tồn tại. Các tên file `0001_*.sql` … `0005_*.sql` bên dưới là **kế hoạch**, chưa phải file có thật.
- **Repository chưa phải git repo** và chỉ chứa `BIKEFORCE_MASTER_SPEC.md`, `PROMPT_FIRST_SESSION.md`, `PROMPT_NEXT_SESSION.md`, cùng thư mục `docs/`. Git được khởi tạo ở Phase 1 (DEC-027).
- **Chưa có `package.json`**, do đó mọi lệnh `npm run <script>` trong tài liệu này là **đề xuất, chưa triển khai**.
- **Không có bất kỳ kết quả build / typecheck / lint / test nào.** Tất cả trạng thái kiểm thử là `N/A`, không phải `PASS`.

Tài liệu này là **runbook để thực hiện ở Phase 2 (Database & Auth) và Phase 12 (Deployment Preparation)**, không phải mô tả một hệ thống đang chạy.

---

## 1. KIẾN TRÚC TRIỂN KHAI (mục tiêu)

Theo DEC-001: Next.js 16 App Router trên Vercel Free + Supabase (Postgres / Auth / RLS) Free. Không có server riêng, không container, không cron, không queue, không object storage (DEC-021).

```mermaid
flowchart TB
  subgraph DEV["May dev - Windows 11 + PowerShell"]
    A["Next.js dev server"]
    B["Supabase local qua Docker"]
    H["Supabase CLI"]
    A --> B
  end

  subgraph GIT["Git repository"]
    D["feature branch"]
    C["main branch"]
  end

  subgraph VC["Vercel - region sin1"]
    F["Preview deployment - Protection ON"]
    E["Production deployment"]
  end

  G["Supabase Cloud - region Singapore"]

  A -->|"git push"| D
  D -->|"merge"| C
  D -->|"auto build"| F
  C -->|"auto build"| E
  H -->|"supabase db push - thu cong"| G
  E -->|"HTTPS + anon key, chiu RLS"| G
  F -->|"HTTPS + anon key, chiu RLS"| G
```

Ba nguyên tắc chi phối toàn bộ tài liệu này:

1. **RLS là biên giới bảo mật thật** (DEC-004, NFR-004). Cấu hình sai RLS = lỗ hổng, không phải lỗi UI.
2. **Schema chỉ đổi qua migration file** (§4). Không sửa schema bằng tay trên dashboard.
3. **Service role key không bao giờ chạm tới `daily_reports`** (DEC-005, NFR-005).

---

## 2. PREREQUISITES

| Yêu cầu | Phiên bản | Trạng thái trên máy hiện tại | Ghi chú |
|---|---|---|---|
| Node.js | 22.20.0 | **Đã kiểm chứng có sẵn** | Trùng Node 22 mà Vercel sẽ dùng — giữ đồng bộ để tránh lệch runtime |
| npm | 10.9.3 | **Đã kiểm chứng có sẵn** | Dùng `npm ci` trên CI/Vercel, `npm install` chỉ khi đổi dependency |
| git | 2.48.1 | **Đã kiểm chứng có sẵn** | Repo **đã** `git init` ở Phase 0, nhánh `main`, remote GitHub đã cấu hình (DEC-028) |
| Supabase CLI | mới nhất | **Chưa cài / chưa kiểm chứng** | Cài ở Phase 2; ghi phiên bản thực tế vào `WORKLOG.md` |
| Docker Desktop | — | **Chưa cài / chưa kiểm chứng** | Bắt buộc cho `supabase start` (Supabase local, DEC-022) |
| Tài khoản Supabase | — | **Chưa có** | Free plan |
| Tài khoản Vercel | — | **Chưa có** | Free plan (NFR-013) |
| Tài khoản Git provider | — | **Chưa có remote** | Vercel import repo từ GitHub/GitLab/Bitbucket |
| Password manager | — | — | Bắt buộc: DB password Supabase chỉ hiện **một lần** |

Kiểm tra nhanh (PowerShell):

```powershell
node --version      # ky vong v22.20.0
npm --version       # ky vong 10.9.3
git --version       # ky vong 2.48.1
supabase --version  # se loi neu chua cai
docker --version    # se loi neu chua cai
```

> Ràng buộc phiên bản khác (next 16.3.0, react 19.2.8, typescript 7.0.2, tailwindcss 4.3.3, @supabase/supabase-js 2.112.2, @supabase/ssr 0.12.4, zod 4.4.3, @playwright/test 1.62.1, vitest 4.1.10, eslint 10.8.0, lucide-react 1.29.0) là **bản stable mới nhất kiểm chứng trên npm ngày 2026-08-07**. Pin chính xác được chốt ở Phase 1 sau smoke test (DEC-002); TypeScript 7 và ESLint 10 là bản major mới, rủi ro đã ghi ở ISSUE-004.

---

## 3. RUNBOOK — TẠO SUPABASE PROJECT

Thực hiện **một lần**, ở Phase 2. Mỗi bước có tiêu chí xác nhận rõ ràng.

### 3.1. Tạo project

1. Đăng nhập Supabase Dashboard → **New project**.
2. **Name**: `bikeforce-prod` (đề xuất; tên nội bộ, không ảnh hưởng code).
3. **Region**: **Southeast Asia (Singapore)** — vùng gần Việt Nam nhất. Đây là lựa chọn ảnh hưởng trực tiếp NFR-001 (LCP < 2.5s trên 4G): mọi truy vấn từ Vercel `sin1` sang Supabase Singapore đi trong cùng khu vực, độ trễ round-trip ở mức chục ms thay vì hàng trăm ms nếu chọn US/EU.
4. **Database password**: sinh mật khẩu mạnh ngẫu nhiên.
   - **Lưu ngay vào password manager.** Supabase chỉ hiển thị mật khẩu này lúc tạo; mất thì phải reset và mọi connection string cũ hỏng.
   - **Không** ghi mật khẩu này vào `.env.local`, `.env.example`, docs, commit message, hay bất kỳ file nào trong repo. Ứng dụng **không dùng** DB password — app chỉ dùng anon key / service role key. DB password chỉ phục vụ `supabase link`, `supabase db push` và truy cập psql trực tiếp.
5. **Plan**: Free.
6. Chờ project provisioning xong (vài phút).

**Xác nhận:** project ở trạng thái `Active Healthy`, ghi lại `project-ref` (chuỗi trong URL dashboard, dạng `https://supabase.com/dashboard/project/<project-ref>`).

### 3.2. Nơi lấy key — anon key vs service role key

| Key | Vị trí trên Dashboard | Tính chất | Dùng ở đâu trong BikeForce |
|---|---|---|---|
| Project URL | Project Settings → API | Public | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` / public key | Project Settings → API | **Public-safe**, được bảo vệ bởi RLS | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dùng trong `lib/supabase/client.ts` và `lib/supabase/server.ts` |
| `service_role` key | Project Settings → API, mục secret keys — phải bấm **Reveal** | **BÍ MẬT**, **bypass toàn bộ RLS** | `SUPABASE_SERVICE_ROLE_KEY`, chỉ trong `lib/supabase/admin.ts` |

> Nếu nhãn/đường dẫn trên Dashboard khác với bảng trên tại thời điểm thực hiện, **ghi lại đường dẫn thực tế vào `WORKLOG.md`** và cập nhật tài liệu này — không đoán.

**Quy tắc tuyệt đối:** `service_role` key bypass RLS. Nếu key này lọt ra client, mọi báo cáo của mọi Sales đọc/ghi được từ trình duyệt bất kỳ → vỡ BR-003 và NFR-005. Đây là secret nguy hiểm nhất của hệ thống.

### 3.3. Cấu hình Auth

Authentication → Providers / Sign In and Up:

1. **Email provider: BẬT**, chế độ email + password (FR-001, UC-01).
2. **Tắt "Allow new users to sign up" (enable signups)** — thực thi BR-012 và FR-006: không có self-registration, chỉ Admin tạo tài khoản qua UC-17. Đây là chốt chặn ở tầng hạ tầng, độc lập với việc UI không có màn hình đăng ký. Liên quan OQ-06 (NON-BLOCKING, đề xuất mặc định: đúng, tắt signup).
3. **Tắt "Confirm email"** cho luồng tài khoản do Admin tạo. Lý do: Admin tạo tài khoản kèm mật khẩu tạm (FR-030); nếu bắt buộc xác nhận email thì Sales không đăng nhập được cho tới khi mở mail, mà v1 **không cấu hình SMTP riêng**.
   - Bổ sung ở tầng code: khi gọi `auth.admin.createUser` trong `lib/supabase/admin.ts`, truyền `email_confirm: true` để user được đánh dấu đã xác nhận ngay lúc tạo. Hai lớp này cùng bảo đảm Sales đăng nhập được ngay.
   - Hệ quả phải chấp nhận: email **không** được hệ thống mail xác minh. Tính duy nhất và tính đúng của email do DB bảo đảm (BR-025: `profiles.email` là `citext UNIQUE`, mirror `auth.users.email`, có trigger đồng bộ).
4. **JWT expiry**: giữ mặc định. Refresh token rotation giữ mặc định. Session được refresh trong `middleware.ts` (FR-002).
5. **Site URL / Redirect URLs**: đặt bằng giá trị `NEXT_PUBLIC_SITE_URL` của môi trường tương ứng (§8).
6. **Không cấu hình SMTP, không dùng magic link, không dùng "forgot password" ở v1.** UC-11 là *đổi mật khẩu khi đã đăng nhập*, không phải quên mật khẩu. Khi Sales quên mật khẩu, Admin đặt lại bằng `auth.admin.updateUserById` (UC-18/UC-19, DEC-005). Quyết định này cũng là một lý do hệ thống nằm gọn trong hạn mức Free (§13).

**Xác nhận:** thử tự đăng ký từ một trình duyệt ẩn danh bằng REST endpoint signup → phải bị từ chối.

### 3.4. Những thứ **không** bật

- **Storage**: không dùng (DEC-021 — ảnh 9:16 được stream trực tiếp từ Route Handler, không lưu file).
- **Realtime**: không dùng ở v1.
- **Edge Functions**: không dùng — toàn bộ logic server nằm trong Next.js Server Actions / Route Handler (DEC-003).
- **Cron / pg_cron**: không dùng (NFR-013; nhắc nhở tự động là AF-13, LATER).

---

## 4. MIGRATION WORKFLOW

### 4.1. Luật bất di bất dịch

1. **Mọi thay đổi schema chỉ đi qua file migration trong `supabase/migrations/`.** Không dùng Table Editor, không dùng SQL Editor trên Dashboard để tạo/sửa bảng, cột, index, policy, function, trigger.
   - **Ngoại lệ duy nhất:** một câu SQL nâng quyền admin đầu tiên ở §10 — đó là **dữ liệu**, không phải schema, và chỉ chạy đúng một lần.
2. **Migration chỉ tiến tới.** Không có `down` migration. Muốn hoàn tác thì viết migration mới (§12).
3. **Không sửa file migration đã được `db push` lên remote.** File đã apply là bất biến; sửa nó khiến local và remote lệch nhau vĩnh viễn.
4. **`supabase db reset` chỉ chạy trên local.** Lệnh này xoá sạch database. Không bao giờ chạy khi đang trỏ vào project remote.
5. **Vercel build không chạy migration.** Build command chỉ là `next build`. `db push` là hành động thủ công có chủ đích từ máy dev.

### 4.2. Danh sách file migration dự kiến

```text
supabase/
├── config.toml                              # sinh boi `supabase init`
├── migrations/
│   ├── 0001_init_enums_profiles.sql         # user_role, report_status, bang profiles
│   ├── 0002_daily_reports.sql               # bang daily_reports + CHECK constraints
│   ├── 0003_functions_triggers.sql          # set_updated_at, handle_new_user,
│   │                                        # guard_profile_self_update, guard_report_transition,
│   │                                        # vn_today, is_admin, is_active_sales
│   ├── 0004_rls_policies.sql                # enable + force RLS, toan bo policy
│   └── 0005_indexes.sql                     # index theo docs/02-database-design.md
└── seed.sql                                 # CHI local: 1 admin + 3 sales + ~20 report mau
```

Nội dung chi tiết của từng file (cột, CHECK, policy, index) nằm ở `docs/02-database-design.md` và `docs/06-auth-permissions.md`. Tài liệu này chỉ quy định **quy trình**.

**Lưu ý về tên file:** `supabase migration new <name>` sinh tên có tiền tố timestamp, không phải `0001_…`. Vì brief chốt bộ tên `0001..0005`, các file này **tạo bằng tay** với đúng tên trên. Supabase CLI sắp thứ tự migration theo phần version ở đầu tên file, nên `0001 < 0002 < …` là hợp lệ — **phải kiểm chứng lại bằng `supabase db reset` local ở Phase 2 trước khi push lên remote**.

**`seed.sql` không bao giờ chạy trên production.** Nó chỉ được `supabase db reset` áp dụng ở local.

### 4.3. Lệnh — thiết lập lần đầu

```bash
# 1. Khoi tao thu muc supabase/ trong repo (chay o project root)
supabase init

# 2. Dang nhap CLI (mo trinh duyet lay access token)
supabase login

# 3. Lien ket repo voi project remote; se hoi DB password da luu o buoc 3.1
supabase link --project-ref <YOUR-PROJECT-REF>
```

Sau `supabase init`, bổ sung vào `.gitignore`: `supabase/.temp/`, `supabase/.branches/`. **Commit** `supabase/config.toml`, `supabase/migrations/**`, `supabase/seed.sql`.

### 4.4. Lệnh — vòng lặp phát triển hằng ngày (local)

```bash
# Khoi dong stack Supabase local: Postgres + GoTrue + PostgREST + Studio (can Docker)
supabase start

# In ra API URL + anon key + service role key CUA LOCAL (khac hoan toan remote)
supabase status

# Xoa sach DB local, apply lai 0001..0005 theo thu tu, roi chay seed.sql
supabase db reset

# Dung stack khi xong viec
supabase stop
```

`supabase db reset` là **lệnh kiểm chứng chính**: nếu bộ migration chạy sạch từ database trống thì thứ tự và tính toàn vẹn của chúng là đúng. Chạy lệnh này sau **mọi** lần thêm/sửa migration, trước khi commit.

### 4.5. Lệnh — đẩy schema lên remote

```bash
# Xem truoc nhung migration nao chua co tren remote
supabase migration list

# Apply cac migration con thieu len project da link
supabase db push
```

`supabase db push` chỉ apply những migration **chưa** có trong sổ cái `supabase_migrations.schema_migrations` của remote. Nó không xoá, không rollback.

### 4.6. Quy trình chuẩn cho một lần đổi schema

```mermaid
flowchart LR
  S1["1 - Tra loi OQ lien quan"] --> S2["2 - Viet file migration 000N"]
  S2 --> S3["3 - supabase db reset - local"]
  S3 --> S4["4 - Chay test DB va RLS o local"]
  S4 -->|"loi"| S2
  S4 -->|"dat"| S5["5 - supabase gen types --linked"]
  S5 --> S6["6 - Commit migration va types cung mot commit"]
  S6 --> S7["7 - supabase db push len remote"]
  S7 --> S8["8 - Push code, Vercel build"]
  S8 --> S9["9 - Chay smoke checklist"]
```

**Thứ tự bắt buộc: schema trước, code sau.** Đẩy code mới lên trước khi schema có cột mới sẽ làm production lỗi ngay lập tức. Ngược lại, đẩy schema tương thích ngược trước thì code cũ vẫn chạy bình thường trong khoảng thời gian giữa hai bước — đây cũng chính là điều kiện để rollback code an toàn (§12).

---

## 5. TYPE GENERATION

TypeScript types của database được **sinh ra**, không viết tay (NFR-012).

```bash
# Sinh tu project remote da link (dung cho commit chinh thuc)
supabase gen types typescript --linked > types/database.types.ts

# Sinh tu Supabase local (dung khi dang phat trien migration, chua push)
supabase gen types typescript --local > types/database.types.ts
```

Quy tắc:

- **`types/database.types.ts` được commit vào repo.** Lý do: Vercel build không có Supabase CLI và không có quyền truy cập database; build phải chạy được chỉ với source code.
- **Regenerate sau mọi lần đổi schema**, và commit chung commit với file migration tương ứng. Migration và types lệch nhau là nguồn lỗi typecheck khó truy vết nhất trong dự án này.
- File này **chỉ được sửa bằng lệnh generate**. Domain types viết tay đặt ở file khác trong `types/` (DEC-023).
- Đề xuất script trong `package.json` (chưa triển khai): `"db:types": "supabase gen types typescript --linked > types/database.types.ts"`.

---

## 6. AUTH & RLS — KIỂM CHỨNG SAU KHI PUSH

RLS không được coi là "đã xong" chỉ vì migration `0004_rls_policies.sql` chạy thành công. Bắt buộc kiểm chứng ba lớp (NFR-004, DEC-004).

### 6.1. Kiểm tra RLS đã bật trên mọi bảng public

Chạy trong SQL Editor ở chế độ **chỉ đọc** (đây là truy vấn kiểm tra, không phải thay đổi schema):

```sql
select relname,
       relrowsecurity      as rls_enabled,
       relforcerowsecurity as rls_forced
from pg_class
where relnamespace = 'public'::regnamespace
  and relkind = 'r'
order by relname;
```

Kỳ vọng: `profiles` và `daily_reports` đều có `rls_enabled = true` **và** `rls_forced = true`. Bảng nào trong `public` mà `rls_enabled = false` là lỗ hổng, phải sửa bằng migration mới.

### 6.2. Kiểm tra danh sách policy

```sql
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
```

Kỳ vọng đúng bộ policy trong `docs/06-auth-permissions.md`: `profiles_select_self_or_admin`, `profiles_update_self`, `profiles_update_admin`, `reports_select_own_or_admin`, `reports_insert_own_today`, `reports_update_own_open`. **Không có policy DELETE nào** (BR-013) và **không có policy INSERT cho `profiles`** — row profile do trigger `handle_new_user()` tạo.

### 6.3. Kiểm tra hành vi thật bằng JWT thật

Kiểm tra bằng suite RLS mô tả ở `docs/08-testing-strategy.md`, chạy trên **Supabase local** (DEC-022 — không test trên production). Kiểm tra tối thiểu: salesA đọc report của salesB → 0 rows; salesA update report salesB → 0 rows affected; salesA insert với `sales_id = salesB` → bị từ chối; delete → bị từ chối; admin đọc tất cả → có dữ liệu; user `is_active = false` → bị chặn (BR-009).

Ngoài ra §11 có một bước kiểm chứng RLS **trên production sau deploy**, thực hiện từ console trình duyệt.

---

## 7. NHỮNG THỨ TUYỆT ĐỐI KHÔNG COMMIT

`.gitignore` (thiết lập ở Phase 1, DEC-027) phải chứa tối thiểu:

```text
node_modules/
.next/
.vercel/
.env
.env.*
!.env.example
supabase/.temp/
supabase/.branches/
playwright-report/
test-results/
coverage/
```

Kiểm tra rò rỉ service role key ra client bundle (NFR-005), chạy sau `next build` trong CI:

```bash
# Chi chay o noi co bien moi truong that (CI secret). So khop GIA TRI cua key,
# khong phai ten bien - ten bien khong bao gio xuat hien trong bundle.
if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ] && grep -RIlq -- "$SUPABASE_SERVICE_ROLE_KEY" .next/static; then
  echo "LEAK: service role key found in client bundle"
  exit 1
fi
```

Lớp bảo vệ tĩnh song song: `lib/supabase/admin.ts` bắt đầu bằng `import 'server-only'`. Nếu bất kỳ Client Component nào import nhầm file này, **build sẽ fail** thay vì âm thầm đóng gói secret vào bundle. Hai lớp này bổ sung cho nhau: `server-only` chặn lỗi lập trình, grep chặn mọi con đường còn lại.

---

## 8. ENVIRONMENT VARIABLES

### 8.1. Bảng biến môi trường

| Biến | Nơi lấy | Public? | Dùng ở đâu | Hậu quả nếu rò rỉ |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | **Có** — nhúng vào client bundle | `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts` | Không đáng kể. Đây là endpoint công khai; mọi truy cập vẫn phải qua Auth + RLS. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Dashboard → Project Settings → API → anon/public key | **Có** — nhúng vào client bundle theo thiết kế | `lib/supabase/client.ts` (auth UI), `lib/supabase/server.ts` (RSC + Server Actions — đường dữ liệu chính, chịu RLS) | Thấp **với điều kiện RLS đúng**. Key này chỉ cho phép làm những gì policy cho phép với JWT tương ứng. Nếu RLS sai hoặc thiếu, key này trở thành cửa đọc toàn bộ dữ liệu → đây chính là lý do NFR-004 là deny-by-default. |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard → Project Settings → API → service_role key (bấm Reveal) | **KHÔNG** — không bao giờ có tiền tố `NEXT_PUBLIC_` | **Chỉ** `lib/supabase/admin.ts`, và **chỉ** cho `auth.admin.createUser` / `auth.admin.updateUserById` trong UC-17/UC-18/UC-19 (DEC-005). Không bao giờ đụng `daily_reports`. | **Nghiêm trọng nhất.** Bypass toàn bộ RLS: đọc/sửa/xoá mọi báo cáo của mọi Sales, tạo tài khoản ADMIN tuỳ ý. Vỡ BR-003, BR-012, NFR-004, NFR-005. Nếu nghi rò rỉ → rotate key ngay trên Dashboard, cập nhật lại trên Vercel, redeploy. |
| `NEXT_PUBLIC_SITE_URL` | Tự đặt: URL chuẩn của từng môi trường (`http://localhost:3000` khi dev, domain Vercel khi production) | **Có** | Auth redirect, URL tuyệt đối, khớp với Site URL cấu hình ở §3.3 | Không đáng kể. Nhưng **đặt sai** thì luồng đăng nhập/redirect hỏng — đây là lỗi cấu hình thường gặp nhất khi lên production. |

Không có biến môi trường nào khác ở v1. Không có API key bên thứ ba, không có Zalo API (Zalo chỉ nhận file PNG, không tích hợp API).

### 8.2. Nội dung `.env.example` (commit vào repo, chỉ placeholder)

```dotenv
# BikeForce - environment variables
# Copy file nay thanh .env.local va dien gia tri that.
# .env.local KHONG BAO GIO duoc commit.

# --- Supabase: public, an toan khi lo ra client bundle ---
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# --- Supabase: BI MAT, SERVER-SIDE ONLY ---
# Bypass toan bo RLS. Khong them tien to NEXT_PUBLIC_.
# Chi dung trong lib/supabase/admin.ts cho auth.admin.* (UC-17/18/19).
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# --- URL chuan cua moi truong hien tai ---
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 8.3. Lấy giá trị cho môi trường local

Khi chạy `supabase start`, lệnh `supabase status` in ra **API URL / anon key / service_role key của instance local**. Dùng bộ giá trị đó cho `.env.local` khi phát triển. Chúng **hoàn toàn khác** bộ key của project remote — không trộn lẫn. Bộ key local là key mặc định của Supabase CLI, giống nhau trên mọi máy, nên không phải secret; nhưng vẫn giữ trong `.env.local` để `.gitignore` áp dụng thống nhất.

---

## 9. VERCEL SETUP

### 9.1. Import project

1. Repo đã nằm trên GitHub tại `LeDuyKhangZz/BikeForce-Bicycle-Sales-Management` (DEC-028) — chỉ cần cấp quyền cho Vercel truy cập.
2. Vercel Dashboard → **Add New → Project → Import Git Repository** → chọn repo BikeForce.
3. **Framework Preset**: **Next.js** (Vercel tự nhận diện; nếu không, chọn thủ công).
4. **Root Directory**: `./`.
5. **Build Command**: mặc định `next build` — **giữ mặc định**. Không thêm `supabase db push` vào build (§4.1 luật 5).
6. **Install Command**: `npm ci`.
7. **Output Directory**: mặc định.
8. **Node.js Version**: **22.x** — Project Settings → General. Khớp Node 22.20.0 trên máy dev để tránh lệch runtime.
9. **Function Region**: **`sin1` (Singapore)** — Project Settings → Functions. Đặt cùng vùng với Supabase Singapore để Server Components / Server Actions / Route Handler `share-image` không phải đi vòng qua châu lục khác. Đây là yếu tố ảnh hưởng NFR-001 lớn hơn mọi tối ưu bundle.

### 9.2. Environment variables trên Vercel

Project Settings → Environment Variables. Đặt **cả 4 biến cho cả 3 môi trường**:

| Biến | Production | Preview | Development |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project remote | theo §9.3 | URL Supabase local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key remote | theo §9.3 | anon key local |
| `SUPABASE_SERVICE_ROLE_KEY` | service key remote — đánh dấu **Sensitive** | theo §9.3 | service key local |
| `NEXT_PUBLIC_SITE_URL` | domain production | URL preview | `http://localhost:3000` |

Quy tắc: `SUPABASE_SERVICE_ROLE_KEY` **không bao giờ** được đặt tên có tiền tố `NEXT_PUBLIC_`, và nên bật cờ *Sensitive* của Vercel để giá trị không đọc lại được từ UI sau khi lưu.

### 9.3. Preview trỏ vào database nào — ĐỀ XUẤT, CHƯA CHỐT

Brief và Master Spec không quy định môi trường staging. Đây là **quyết định kỹ thuật**, không phải câu hỏi nghiệp vụ, nên **không** tạo `OQ` mới (Master Spec §40 chỉ ghi nhận câu hỏi ảnh hưởng business rule / database / permission / workflow). Ghi nhận ở đây và chốt bằng một mục trong `docs/11-decisions.md` ở Phase 12:

- **Phương án A (đề xuất mặc định):** Preview và Production dùng **cùng** một Supabase project. Đơn giản, chắc chắn nằm trong hạn mức Free. **Rủi ro phải chấp nhận và phải ghi rõ:** preview deployment ghi thẳng vào dữ liệu thật. Bắt buộc đi kèm §9.4 (Protection) và kỷ luật không thử nghiệm phá hoại trên preview.
- **Phương án B:** tạo project Supabase thứ hai làm staging, Preview trỏ vào đó. An toàn hơn, nhưng phải kiểm chứng hạn mức số project active của Supabase Free trước khi cam kết, và phải chạy `supabase db push` hai lần cho mỗi lần đổi schema.

Quyết định này **không chặn** Phase 0.

### 9.4. Bật Preview Deployment Protection

Project Settings → **Deployment Protection** → bật bảo vệ cho **Preview Deployments** (yêu cầu đăng nhập Vercel mới xem được).

Lý do bắt buộc: BikeForce là **app nội bộ**, chứa dữ liệu kinh doanh thật (doanh số, doanh thu, tên nhân viên). URL preview do Vercel sinh ra là công khai và đoán được nếu bị lộ. Không bật bảo vệ ⇒ mỗi lần push branch là một bản sao ứng dụng nội bộ nằm trên Internet mở. Kết hợp với phương án A ở §9.3 (preview dùng DB thật), đây là biện pháp **không được bỏ qua**.

Nếu gói Free không cho bật tính năng này tại thời điểm thực hiện: ghi nhận vào `docs/12-known-issues.md` theo đúng format Spec §56, và bù bằng cách không chia sẻ URL preview ra ngoài đội phát triển, đồng thời cân nhắc phương án B ở §9.3.

### 9.5. Domain

v1 dùng domain `*.vercel.app` do Vercel cấp — đủ cho app nội bộ. Nếu sau này gắn custom domain: cập nhật `NEXT_PUBLIC_SITE_URL` và **Site URL / Redirect URLs** trong Supabase Auth (§3.3) **trước** khi chuyển, nếu không luồng đăng nhập sẽ hỏng ngay khi domain đổi.

---

## 10. RUNBOOK — ADMIN ĐẦU TIÊN (bootstrap)

Vấn đề con-gà-quả-trứng: chỉ Admin mới tạo được tài khoản (BR-012, FR-006), nhưng ban đầu chưa có Admin nào.

**Cách làm — thực hiện đúng một lần, thủ công:**

1. Supabase Dashboard → **Authentication → Users → Add user → Create new user**.
   - Email: email thật của quản lý kinh doanh.
   - Password: mật khẩu tạm mạnh, giao trực tiếp cho người dùng, yêu cầu đổi ngay qua UC-11.
   - Bật **Auto Confirm User** (khớp §3.3 — không có SMTP nên không thể xác nhận qua email).
2. Trigger `handle_new_user()` tự tạo row tương ứng trong `public.profiles` với `role` mặc định là `'SALES'` (theo default cột, xem `docs/02-database-design.md`).
3. Mở **SQL Editor** và chạy **đúng một câu**:

```sql
update public.profiles
set role = 'ADMIN'
where email = 'admin@example.com';   -- thay bang email that vua tao o buoc 1
```

4. Kiểm chứng ngay sau đó:

```sql
select id, email, full_name, role, is_active
from public.profiles
where role = 'ADMIN';
```

Kỳ vọng: đúng **một** dòng, `is_active = true`.

5. Đăng nhập ứng dụng bằng tài khoản đó → phải vào được `/admin`. Từ đây mọi tài khoản Sales tiếp theo tạo qua UI (UC-17), không bao giờ tạo bằng SQL nữa.

**Vì sao đây cố ý KHÔNG phải một tính năng UI:**

- Bất kỳ màn hình/endpoint nào có khả năng tự phong ADMIN đều là một **đường leo thang đặc quyền** tồn tại vĩnh viễn trong sản phẩm, chỉ để phục vụ một thao tác chạy đúng một lần trong đời dự án. Đánh đổi hoàn toàn không đáng.
- Trigger `guard_profile_self_update()` **cố tình chặn** người dùng thường tự đổi `role`, `is_active`, `email`, `id`. Một UI "tự phong admin" sẽ mâu thuẫn trực tiếp với chính lớp bảo vệ đó.
- Thao tác này chạy **một lần**. Chi phí viết + test + bảo trì UI lớn hơn nhiều so với 30 giây chạy tay có runbook.
- Đây là **thay đổi dữ liệu**, không phải thay đổi schema — nên nó là ngoại lệ hợp lệ duy nhất của luật "không dùng SQL Editor" ở §4.1.

**Ghi lại vào `WORKLOG.md`:** ngày giờ thực hiện, email tài khoản admin đầu tiên (không ghi mật khẩu).

---

## 11. BUILD & DEPLOY

### 11.1. Cổng chất lượng tại local (chạy TRƯỚC khi push)

Các script sau là **đề xuất, chưa triển khai** (chưa có `package.json`):

```bash
npm run typecheck   # tsc --noEmit, TypeScript strict (NFR-012)
npm run lint        # eslint, cam `any` (NFR-012)
npm run build       # next build
npm run test        # vitest: unit + integration/DB + RLS
npm run test:e2e    # playwright: mobile-375, desktop-1440, zalo-like
```

Theo Master Spec §42, cả bốn cổng đầu phải xanh trước khi sang phase tiếp. **Tại thời điểm viết tài liệu này chưa có lệnh nào từng được chạy — mọi trạng thái là `N/A`, không phải `PASS`.**

### 11.2. Trình tự deploy

**A. Deploy chỉ có thay đổi code (không đổi schema):**

1. Chạy đủ cổng chất lượng ở §11.1 tại local.
2. `git push` lên feature branch → Vercel tự build **Preview**.
3. Mở URL preview (đã bảo vệ theo §9.4), kiểm tra tính năng vừa sửa.
4. Merge vào `main` → Vercel tự build **Production**.
5. Chạy smoke checklist §11.3 trên URL production.

**B. Deploy có thay đổi schema:**

1. Thực hiện đủ 9 bước ở sơ đồ §4.6.
2. Điểm mấu chốt: `supabase db push` (bước 7) chạy **trước** khi code mới lên Production (bước 8).
3. Migration phải **tương thích ngược** với code đang chạy: thêm cột thì để `nullable` hoặc có `default`; **không** drop/rename cột trong cùng lần deploy với code dùng cột đó. Tách thành hai lần deploy: *expand* (thêm, tương thích ngược) → deploy code → *contract* (dọn dẹp) ở lần sau. Đây là điều kiện để rollback code ở §12 an toàn.

### 11.3. Kiểm tra ngay sau mỗi lần deploy

Sau **mỗi** deploy production, tối thiểu:

- [ ] Vercel Deployment ở trạng thái `Ready`, không có lỗi trong Build Logs.
- [ ] Mở URL production, đăng nhập được.
- [ ] Mở Vercel → Logs, không có exception mới trong 5 phút đầu.
- [ ] Nếu deploy có đổi schema: `supabase migration list` cho thấy local và remote khớp nhau.

Sau deploy **lớn** (đổi schema, đổi auth, đổi RLS, hoặc release đầu tiên): chạy đủ smoke checklist §11.4.

### 11.4. Post-deploy smoke checklist

Chạy trên **thiết bị thật** với ít nhất một tài khoản SALES và một tài khoản ADMIN. Tất cả ô dưới đây **chưa được kiểm tra lần nào**.

- [ ] **Đăng nhập hoạt động** — SALES và ADMIN đều đăng nhập được, redirect đúng role về `/sales/today` và `/admin` (FR-001, FR-004, UC-01).
- [ ] **RLS chặn đọc chéo từ console trình duyệt** — đăng nhập salesA, mở DevTools Console, gọi thẳng REST API của Supabase để đọc report của salesB:

  ```js
  // Chay trong Console khi da dang nhap salesA. Chi dung placeholder, khong dan key that vao doc.
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/daily_reports?select=id,sales_id&sales_id=eq.<UUID_CUA_SALES_B>`,
    { headers: { apikey: '<ANON_KEY>', Authorization: `Bearer ${ACCESS_TOKEN_CUA_SALES_A}` } }
  );
  console.log(await res.json());   // KY VONG: []  (mang rong)
  ```

  Kỳ vọng là mảng rỗng `[]`, **không** phải lỗi 403 — RLS lọc row chứ không chặn request. Bất kỳ dòng dữ liệu nào trả về đều là vi phạm BR-003 / NFR-004 và phải rollback ngay.
- [ ] **Báo cáo đầu ngày lưu được** — tạo báo cáo sáng, reload trang, dữ liệu còn nguyên, status = `MORNING_SUBMITTED` (FR-008, FR-011, UC-04).
- [ ] **Báo cáo cuối ngày lưu được** — nhập thực đạt, lưu, status chuyển `COMPLETED`, có `evening_submitted_at` (FR-014, FR-015, UC-06).
- [ ] **Achievement hiển thị đúng** — bảng đối chiếu hiện đủ 4 chỉ tiêu, % tính đúng, cho phép > 100%, **không có `NaN` / `Infinity` / `∞`** ở bất kỳ ô nào (FR-016, BR-004, BR-014, BR-015, UC-07).
- [ ] **Export ảnh trả về PNG đúng 1080×1920 với dấu tiếng Việt đúng** — tải file về, mở lên, kiểm tra kích thước đúng 1080×1920 px, và các ký tự `ừ ẫ ợ ỹ đ Đ` hiển thị đủ dấu, không bị ô vuông hay mất dấu. Tên file đúng dạng `BikeForce_Report_<Ho-Ten>_<YYYY-MM-DD>.png` (FR-018, FR-019, UC-08, ISSUE-002).
- [ ] **Số liệu Admin dashboard khớp** — đối chiếu 12 chỉ số ở `/admin` với dữ liệu đếm tay trong ngày; số Sales đã/chưa báo cáo phải khớp thực tế (FR-024, AF-01, AF-02, UC-12).
- [ ] **Zalo in-app browser mở được app** — gửi URL production qua Zalo, mở bằng trình duyệt trong Zalo, đăng nhập và vào được `/sales/today` (NFR-009, ISSUE-003).

Kiểm tra bổ sung nên làm cùng lúc:

- [ ] Tài khoản `is_active = false` bị chặn đăng nhập và có thông báo rõ ràng (FR-005, BR-009).
- [ ] Truy cập trực tiếp `/sales/reports/<id-cua-sales-khac>` → 404/redirect, không lộ dữ liệu (BR-003).
- [ ] `GET /api/reports/<id-cua-sales-khac>/share-image` → 403/404 (BR-002, BR-022).
- [ ] Nút "Xuất ảnh" bị disable khi báo cáo chưa `COMPLETED` (FR-017, BR-002).
- [ ] Ngày nghiệp vụ đúng múi giờ VN khi thao tác lúc 23:00–01:00 (BR-005, NFR-011).

---

## 12. ROLLBACK & XỬ LÝ SỰ CỐ

```mermaid
flowchart TD
  R0["Su co sau deploy"] --> R1{"Nguyen nhan o code hay schema?"}
  R1 -->|"code"| R2["Vercel Instant Rollback ve deployment truoc"]
  R1 -->|"schema"| R3{"Migration da apply xong chua?"}
  R3 -->|"da apply xong"| R4["Viet migration moi tien toi de sua"]
  R3 -->|"apply do dang"| R5["Kiem tra so cai schema_migrations, repair, viet migration bu"]
  R2 --> R6["Chay lai smoke checklist"]
  R4 --> R6
  R5 --> R6
```

### 12.1. Rollback code — nhanh và an toàn

Vercel Dashboard → **Deployments** → chọn deployment tốt gần nhất → **Instant Rollback / Promote to Production**. Không cần rebuild, không cần revert git ngay lập tức (nhưng **phải** revert git sau đó để repo khớp với thứ đang chạy).

**Điều kiện để rollback code an toàn:** schema hiện tại phải tương thích ngược với code cũ. Đây chính là lý do §11.2.B bắt buộc migration kiểu *expand* trước, *contract* sau. Nếu vừa drop một cột mà code cũ còn dùng thì rollback code sẽ **không** cứu được hệ thống.

### 12.2. Rollback schema — không tồn tại, chỉ có tiến tới

Không có `down` migration. Muốn hoàn tác một thay đổi schema, viết migration mới với số thứ tự kế tiếp, ví dụ `0006_revert_<mo_ta>.sql`, rồi đi lại đúng quy trình §4.6.

Lý do: `down` migration hầu như không bao giờ được test thật, và với dữ liệu production thì "lùi" thường có nghĩa là mất dữ liệu không thể phục hồi. Một migration tiến tới có kiểm chứng ở local an toàn hơn nhiều.

### 12.3. Khi `supabase db push` lỗi giữa chừng

Không hoảng, không sửa file migration cũ, không chạy lại `db push` một cách mù quáng. Trình tự:

1. **Đọc kỹ thông báo lỗi**: xác định file nào, câu lệnh nào lỗi.
2. **Xác định trạng thái sổ cái**:

   ```sql
   select version, name
   from supabase_migrations.schema_migrations
   order by version;
   ```

   So với `supabase migration list` để biết migration lỗi đã được ghi nhận là "đã apply" hay chưa.
3. **Xác định trạng thái schema thật**: dùng truy vấn ở §6.1 / §6.2 và `\d+ <table>` để xem những gì đã kịp tạo. DDL trong Postgres có tính giao dịch, nhưng **không được giả định** cả file migration nằm trong một transaction; luôn kiểm tra bằng mắt.
4. **Ba tình huống:**
   - *Không có gì được apply, sổ cái không ghi nhận* → sửa file migration ở local, `supabase db reset` để kiểm chứng lại, rồi push lại. An toàn nhất.
   - *Apply dở dang, sổ cái ghi nhận là đã apply* → sổ cái sai. Sửa sổ cái bằng `supabase migration repair --status reverted <version>` (**kiểm chứng cú pháp CLI thực tế trước khi chạy trên production**), rồi xử lý như tình huống trên.
   - *Apply dở dang, sổ cái không ghi nhận, nhưng một phần đối tượng đã tồn tại* → **không** sửa file cũ. Viết migration mới dọn dẹp phần đã tạo (`drop ... if exists`) rồi tạo lại đầy đủ, hoặc viết migration bù chỉ tạo phần còn thiếu bằng `create ... if not exists`.
5. **Phòng ngừa cho lần sau:** viết DDL có `if not exists` / `if exists` ở những chỗ hợp lý, và **luôn** chạy `supabase db reset` từ database trống ở local trước khi push. Migration nào chưa chạy sạch từ trạng thái trống thì chưa được push.

### 12.4. Nghi ngờ rò rỉ `SUPABASE_SERVICE_ROLE_KEY`

1. Supabase Dashboard → Project Settings → API → **rotate service_role key**.
2. Cập nhật giá trị mới trên Vercel cho cả Production/Preview/Development.
3. Redeploy (biến môi trường chỉ có hiệu lực ở deployment mới).
4. Cập nhật `.env.local` trên các máy dev.
5. Rà lại lịch sử git xem key có từng bị commit không; nếu có, coi như key đã lộ vĩnh viễn trong lịch sử và phải rotate kể cả khi đã xoá file.
6. Ghi sự cố vào `docs/12-known-issues.md`.

---

## 13. CHI PHÍ & HẠN MỨC

### 13.1. Vì sao hệ thống nằm gọn trong Vercel Free + Supabase Free (NFR-013)

Các quyết định kiến trúc dưới đây **không phải ngẫu nhiên** — chúng chính là thứ giữ chi phí bằng 0:

| Không dùng | Quyết định liên quan | Nếu dùng thì sao |
|---|---|---|
| **Cron / scheduled job** | AF-13 (nhắc tự động) hoãn sang LATER | Cron là tính năng trả phí trên Vercel Free; nhắc nhở tự động sẽ đẩy dự án ra khỏi hạn mức |
| **Queue / background worker** | DEC-003 — chỉ Server Actions + Route Handler | Cần hạ tầng riêng |
| **Object storage** | DEC-021 — ảnh 9:16 stream trực tiếp, không lưu | Supabase Storage sẽ tiêu tốn dung lượng + băng thông; ảnh báo cáo không cần lưu lại vì tái sinh được từ dữ liệu |
| **Realtime** | Không dùng ở v1 | Tiêu tốn kết nối đồng thời |
| **Custom SMTP / email** | §3.3 — không magic link, không forgot-password | Cần dịch vụ mail bên ngoài |
| **Thư viện chart nặng** | AF-08 hoãn (SHOULD) | Tăng bundle, ảnh hưởng NFR-001, không ảnh hưởng chi phí hạ tầng nhưng ảnh hưởng hiệu năng |
| **Database ngoài Supabase** | DEC-001 | Chi phí trực tiếp |

Về khối lượng dữ liệu: NFR-015 thiết kế cho 50 Sales × 365 ngày ≈ **18.000 row/năm** trên `daily_reports`, cộng ≤ 51 row `profiles`. Đây là khối lượng rất nhỏ so với dung lượng database của gói Free — **dung lượng DB sẽ không phải là giới hạn chạm phải đầu tiên**.

### 13.2. Những giới hạn sẽ chạm phải ĐẦU TIÊN khi đội lớn lên

Xếp theo thứ tự khả năng xảy ra, kèm dấu hiệu nhận biết:

1. **Điều khoản sử dụng của Vercel gói Hobby/Free.** Gói Free của Vercel được quy định cho mục đích **phi thương mại**. BikeForce là ứng dụng nội bộ của một doanh nghiệp. **Phải đọc lại Vercel Terms trước khi go-live chính thức.** Nếu buộc phải lên gói trả phí thì đây gần như chắc chắn là **khoản chi phí đầu tiên** của dự án — trước cả khi chạm bất kỳ giới hạn kỹ thuật nào. Không giả định là được phép.
2. **Supabase Free tự động pause project khi không có hoạt động trong một khoảng thời gian.** Với app chỉ dùng ngày làm việc, một kỳ nghỉ dài có thể khiến project bị pause và sáng đầu tuần cả đội không đăng nhập được. Dấu hiệu: đăng nhập lỗi kết nối đồng loạt. Xử lý: vào Dashboard restore project; phòng ngừa: theo dõi trạng thái project trước các kỳ nghỉ dài.
3. **Thời gian thực thi function khi sinh ảnh 9:16.** Route Handler `GET /api/reports/[id]/share-image` render `ImageResponse` 1080×1920 bằng Satori — đây là tác vụ nặng CPU nhất của hệ thống. Nếu 50 Sales cùng bấm "Xuất ảnh" vào 17h30, đây là điểm nghẽn đầu tiên về hiệu năng. Cần **đo thời gian thực thi thật ở Phase 6** (chưa đo, không có số liệu). Liên quan ISSUE-002.
4. **Băng thông đầu ra.** Ước tính thô, **chưa đo**: 50 Sales × ~22 ngày làm việc × một ảnh PNG mỗi ngày. Kích thước ảnh thực tế phải đo ở Phase 6 mới biết. Với quy mô này, băng thông nhiều khả năng vẫn còn xa hạn mức, nhưng phải đo thay vì phỏng đoán.
5. **Số người dùng hoạt động hằng tháng của Supabase Auth.** Với ≤ 50 tài khoản thì còn rất xa hạn mức — chỉ trở thành vấn đề nếu quy mô nhảy lên hàng nghìn người dùng, lúc đó `is_admin()` gọi trong RLS mỗi câu lệnh cũng cần xem lại (ISSUE-005: chuyển `role` vào custom JWT claim).
6. **Số project Supabase active** — chỉ liên quan nếu chọn phương án B ở §9.3 (tạo project staging riêng).

> Không có số liệu hạn mức cụ thể nào được ghi trong tài liệu này vì hạn mức của nhà cung cấp thay đổi theo thời gian. **Đọc bảng giá chính thức của Vercel và Supabase tại thời điểm go-live** và ghi con số thực tế vào `docs/11-decisions.md`.

---

## 14. CHECKLIST TRIỂN KHAI (đồng bộ với PROJECT_CHECKLIST.md, nhóm "Deployment")

Tất cả đều **chưa thực hiện**.

**Phase 2 — Database & Auth**

- [ ] Cài Supabase CLI + Docker Desktop, ghi phiên bản vào `WORKLOG.md`
- [ ] Tạo Supabase project region Singapore, lưu DB password vào password manager
- [ ] Tắt public signup (BR-012, FR-006, OQ-06)
- [ ] Tắt email confirmation + dùng `email_confirm: true` khi Admin tạo user
- [ ] `supabase init` + `supabase link --project-ref <ref>`
- [ ] Viết `0001` … `0005` và `seed.sql`
- [ ] `supabase db reset` chạy sạch từ database trống ở local
- [ ] Chạy test DB + RLS ở local (DEC-022)
- [ ] `supabase db push` lên remote
- [ ] Kiểm chứng RLS bằng truy vấn §6.1 và §6.2
- [ ] `supabase gen types typescript --linked > types/database.types.ts` và commit
- [ ] Runbook admin đầu tiên (§10), ghi vào `WORKLOG.md`

**Phase 12 — Deployment Preparation**

- [ ] `.env.example` đúng nội dung §8.2, không có giá trị thật
- [ ] `.gitignore` chứa đủ mục §7
- [ ] Import repo vào Vercel, preset Next.js, Node 22, region `sin1`
- [ ] Đặt 4 biến môi trường cho cả Production/Preview/Development
- [ ] Bật Preview Deployment Protection (§9.4)
- [ ] Chốt phương án §9.3 và ghi vào `docs/11-decisions.md`
- [ ] Chạy cổng chất lượng local (§11.1) — build/typecheck/lint/test
- [ ] Kiểm tra bundle không chứa service role key (§7)
- [ ] Deploy production đầu tiên
- [ ] Hoàn thành smoke checklist §11.4 trên thiết bị thật, có cả Zalo in-app browser
- [ ] Đọc lại điều khoản gói Free của Vercel và Supabase, ghi kết luận vào `docs/11-decisions.md`

---

## OPEN QUESTIONS

**Không có OPEN QUESTION nào chặn việc triển khai.** Toàn bộ nội dung tài liệu này — tạo Supabase project, cấu hình Auth, quy trình migration, biến môi trường, thiết lập Vercel, runbook admin đầu tiên, rollback, hạn mức — thực hiện được ngay mà không cần chờ câu trả lời nào.

**Nhưng có một ràng buộc thứ tự bắt buộc:**

> ✅ **Đã hết blocker (2026-08-07):** người dùng đã trả lời đủ 17/17 OPEN QUESTION, nên nội dung migration đã chốt được. Vì migration chỉ tiến tới (§4.1, §12.2), vẫn phải rà lại `docs/02-database-design.md` một lần trước khi viết `0001` … `0005`. Đoạn cũ (giữ lại làm ngữ cảnh): các OQ mức BLOCKING được trả lời.** Viết sớm rồi phải sửa nghĩa là phải đẻ thêm migration vá lên production — chính xác là thứ mà kỷ luật forward-only sinh ra để tránh. Đây là nội dung của ISSUE-001 (P1).

Các OQ ảnh hưởng trực tiếp tới nội dung migration mà tài liệu này sẽ đẩy lên:

| ID | Câu hỏi rút gọn | Đề xuất mặc định | Ảnh hưởng tới deployment |
|---|---|---|---|
| OQ-01 | "Mục tiêu viếng thăm" là số điểm hay mục đích chuyến đi? | Cả hai: `target_visit_points` + `visit_purpose` | Cột trong `0002_daily_reports.sql` |
| OQ-02 | "Đã viếng thăm" là con số hay tuyến thực tế? | Cả hai: `actual_visit_points` + `actual_route` | Cột trong `0002_daily_reports.sql` |
| OQ-04 | Sửa được báo cáo sau khi `COMPLETED` không? | (a) Khoá ngay khi `COMPLETED` | Policy `reports_update_own_open` trong `0004_rls_policies.sql` |
| OQ-05 | Admin có sửa được báo cáo của Sales không? | Không trong v1 | Có/không policy UPDATE cho admin trong `0004` |
| OQ-11 | Khi `target = 0` thì % hiển thị thế nào? | `actual=0` → 100%; `actual>0` → `—` | Không đổi schema, nhưng đổi `lib/kpi` và ô "achievement hiển thị đúng" ở smoke checklist §11.4 |
| OQ-12 | Có được nhập bù ngày cũ không? | Chỉ đúng ngày hôm nay theo giờ VN | Policy `reports_insert_own_today` và CHECK `ck_report_not_future` |
| OQ-13 | Có xoá báo cáo không? Soft hay hard delete? | v1 không xoá | Có/không cột `deleted_at`, có/không policy DELETE |
| OQ-06 | Xác nhận Admin tạo tài khoản, Sales không tự đăng ký? | Đúng — tắt signup ở Supabase | Trực tiếp là bước §3.3.2 |
| OQ-08 | Có khái niệm ngày nghỉ / không đi thị trường không? | v1 không có | Ảnh hưởng chỉ số "chưa báo cáo" ở smoke checklist §11.4 (ISSUE-006) |

Danh sách OPEN QUESTION đầy đủ (OQ-01 … OQ-17) nằm ở **`docs/01-business-analysis.md` §OPEN QUESTIONS**.
