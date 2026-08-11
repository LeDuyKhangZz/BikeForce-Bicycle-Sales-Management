import { RouteLoading } from '@/components/ui/route-loading';

/** Bắt buộc theo AGENTS.md §4: mỗi route group có loading / error / not-found. */
export default function SalesLoading() {
  return <RouteLoading label="Đang tải nội dung dành cho Sales…" />;
}
