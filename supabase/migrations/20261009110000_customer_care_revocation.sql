-- Tách enum thành migration riêng vì PostgreSQL chỉ cho dùng giá trị mới sau khi commit.
alter type public.customer_care_status add value if not exists 'REVOKED';
