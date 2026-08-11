import { RouteLoading } from '@/components/ui/route-loading';

/** Bắt buộc theo AGENTS.md §4: mỗi route group có loading / error / not-found. */
export default function AdminLoading() {
  return <RouteLoading label="Đang tải dữ liệu quản trị…" titleWidth="medium" />;
}
