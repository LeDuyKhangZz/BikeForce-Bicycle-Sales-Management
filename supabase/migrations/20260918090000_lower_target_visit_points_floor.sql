-- BR-026 / DEC-091: hạ sàn cam kết điểm viếng thăm đầu ngày từ 10 xuống 5.
-- Chỉ mục tiêu bị giới hạn; actual_visit_points tiếp tục cho phép từ 0.

alter table public.daily_reports
  drop constraint ck_target_visit_points;

alter table public.daily_reports
  add constraint ck_target_visit_points
    check (target_visit_points between 5 and 1000) not valid;
