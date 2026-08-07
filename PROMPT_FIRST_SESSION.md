# PROMPT CLAUDE CODE — LẦN ĐẦU

Bạn đang bắt đầu triển khai dự án **BikeForce — Bicycle Sales Management System**.

Trong root project có file:

`BIKEFORCE_MASTER_SPEC.md`

## Nhiệm vụ bắt buộc trước tiên

1. Đọc **toàn bộ** `BIKEFORCE_MASTER_SPEC.md`.
2. Khảo sát repository hiện tại:
   - cấu trúc thư mục;
   - package.json;
   - framework;
   - config;
   - source code hiện có;
   - database/migrations nếu có.
3. Tải và nghiên cứu UI/UX skill:
   `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git`
4. Không code production feature ngay.
5. Bắt đầu **PHASE 0 — Discovery & Business Analysis** đúng theo Master Spec.

## Trong Phase 0, hãy làm đầy đủ

- Tóm tắt mục tiêu hệ thống.
- Actors/roles.
- Use cases.
- Functional requirements.
- Non-functional requirements.
- Business rules.
- Edge cases.
- Đề xuất Admin features.
- Đề xuất database schema.
- Đề xuất Supabase RLS.
- Đề xuất system architecture.
- Đề xuất page map.
- Đề xuất Sales navigation.
- Đề xuất Admin navigation.
- Đề xuất mobile-first UI direction.
- Đề xuất cách export ảnh 9:16.
- Đề xuất testing.
- Đề xuất deployment Vercel + Supabase.

## Tạo ngay bộ file kiểm soát dự án

Nếu chưa tồn tại, hãy tạo:

```text
CLAUDE.md
AGENTS.md

docs/
├── 01-business-analysis.md
├── 02-database-design.md
├── 03-workflow.md
├── 04-system-architecture.md
├── 05-ui-ux-design.md
├── 06-auth-permissions.md
├── 07-api-data-flow.md
├── 08-testing-strategy.md
├── 09-deployment.md
├── 10-future-roadmap.md
├── 11-decisions.md
└── 12-known-issues.md

WORKLOG.md
SESSION_CHECKPOINT.md
PROJECT_CHECKLIST.md
```

Các file chưa đủ thông tin vẫn phải tạo với trạng thái:

`Status: DRAFT`

và ghi rõ các `OPEN QUESTION`.

## Rất quan trọng

Những điểm nghiệp vụ ảnh hưởng database/permission/workflow mà chưa rõ thì **không được tự đoán rồi code**.

Hãy gom tất cả câu hỏi cần người dùng quyết định thành **một danh sách duy nhất**, ưu tiên các câu hỏi trong phần "CÂU HỎI BUSINESS CẦN XÁC NHẬN" của Master Spec.

Không hỏi những thứ có thể tự quyết bằng best practice kỹ thuật.

## Trước khi dừng Phase 0

Phải cập nhật:

- `docs/01-business-analysis.md`
- `docs/02-database-design.md`
- `docs/03-workflow.md`
- `docs/04-system-architecture.md`
- `docs/05-ui-ux-design.md`
- `docs/06-auth-permissions.md`
- `docs/11-decisions.md`
- `WORKLOG.md`
- `PROJECT_CHECKLIST.md`
- `SESSION_CHECKPOINT.md`

Trong `SESSION_CHECKPOINT.md` phải ghi rõ:

- Current Phase.
- Completed.
- Open Questions.
- Important decisions.
- Next Exact Steps.
- DO NOT REDO.

Sau đó trình bày cho tôi:

1. Tóm tắt phân tích.
2. Các đề xuất đáng chú ý.
3. Danh sách câu hỏi business cần tôi trả lời.

**Không bắt đầu Phase 1 cho tới khi các business question quan trọng đã được tôi trả lời.**
