# PROMPT CLAUDE CODE — CÁC LẦN SAU

Tiếp tục dự án **BikeForce — Bicycle Sales Management System** từ trạng thái hiện tại.

Không phân tích lại toàn bộ dự án từ đầu nếu không cần thiết.

## Bước 1 — Đọc context bắt buộc

Đọc theo thứ tự:

1. `CLAUDE.md`
2. `BIKEFORCE_MASTER_SPEC.md`
3. `SESSION_CHECKPOINT.md`
4. `WORKLOG.md`
5. `PROJECT_CHECKLIST.md`
6. `docs/11-decisions.md`
7. Các file `docs/` liên quan trực tiếp tới Current Task
8. Source code liên quan

Nếu `SESSION_CHECKPOINT.md` và source code mâu thuẫn:

- kiểm tra trạng thái thực tế;
- không đoán;
- đồng bộ lại documentation trước hoặc trong quá trình sửa.

## Bước 2 — Xác định đúng điểm tiếp tục

Từ `SESSION_CHECKPOINT.md`, hãy xác định:

- Current Phase.
- Current Task.
- Last Working Feature.
- Known Issues.
- Next Exact Steps.
- DO NOT REDO.

Sau đó tiếp tục **đúng task đang dang dở**.

Không tự chuyển sang phase khác khi phase hiện tại chưa đạt Definition of Done.

## Bước 3 — Triển khai

Trong quá trình làm:

- Tuân thủ approved business rules.
- Không tự thay đổi `docs/11-decisions.md` đã APPROVED.
- Giữ mobile-first.
- Bảo vệ permission bằng server/RLS.
- Không expose secrets.
- Không duplicate business logic.
- Không rewrite architecture nếu không có lý do rõ ràng.

Nếu phát hiện bug hoặc technical debt:

- ghi vào `docs/12-known-issues.md`;
- phân severity;
- xử lý nếu nằm trong scope hiện tại.

Nếu phát hiện business ambiguity mới có thể thay đổi database/permission/workflow:

- không tự đoán;
- ghi OPEN QUESTION;
- hỏi tôi.
- Nếu phần khác vẫn làm độc lập được thì tiếp tục phần đó.

## Bước 4 — Quality Gate

Sau khi hoàn thành task/milestone hiện tại:

1. Run typecheck.
2. Run build.
3. Run lint.
4. Run relevant tests.
5. Run E2E nếu flow bị ảnh hưởng và môi trường cho phép.
6. Kiểm tra mobile viewport nếu có UI.
7. Kiểm tra RLS/security nếu có data/permission.

Không đánh task DONE nếu relevant checks chưa pass.

## Bước 5 — Update tài liệu

Cập nhật file đúng theo thay đổi:

- Business rule → `docs/01-business-analysis.md` + `docs/11-decisions.md`
- Database → `docs/02-database-design.md`
- Workflow → `docs/03-workflow.md`
- Architecture → `docs/04-system-architecture.md`
- UI → `docs/05-ui-ux-design.md`
- Permission → `docs/06-auth-permissions.md`
- API/data flow → `docs/07-api-data-flow.md`
- Test → `docs/08-testing-strategy.md`
- Deployment → `docs/09-deployment.md`
- Bug → `docs/12-known-issues.md`

Và luôn cập nhật:

- `PROJECT_CHECKLIST.md`
- `WORKLOG.md`
- `SESSION_CHECKPOINT.md`

## Bước 6 — Checkpoint cuối phiên

Trong `SESSION_CHECKPOINT.md`, ghi chính xác:

```text
Current Phase:
Current Task:

Completed:
Currently Working On:
Not Started:
Known Issues:
Important Business Decisions:
Important Files:
Database State:

Testing State:
- Build:
- Typecheck:
- Lint:
- Unit:
- Integration:
- E2E:

Last Working Feature:

Next Exact Steps:
1.
2.
3.

DO NOT REDO:
- ...
```

## Cách báo cáo lại cho tôi

Cuối lần làm việc, trả lời ngắn gọn:

### Đã hoàn thành
- ...

### Đã kiểm tra
- Build:
- Typecheck:
- Lint:
- Tests:

### File quan trọng đã thay đổi
- ...

### Vấn đề còn lại
- ...

### Bước tiếp theo
1. ...
2. ...

Nếu không còn blocker, hãy **tiếp tục thực hiện Current Phase theo checklist**, không cần hỏi tôi xác nhận những bước kỹ thuật thông thường.
