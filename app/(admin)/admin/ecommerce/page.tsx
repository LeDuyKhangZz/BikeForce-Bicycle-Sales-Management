import type { Metadata } from 'next';

import { EcommerceReportShell } from '@/features/admin-ecommerce/ecommerce-report-shell';
import {
  getLatestEcommerceReportViewModel,
  getAdFinanceViewModel,
  getEcommerceDashboardTrend,
} from '@/features/admin-ecommerce/queries';
import { requireRole } from '@/features/auth/queries';

export const metadata: Metadata = {
  title: 'Sàn TMĐT · BikeForce',
};

export default async function EcommercePage() {
  await requireRole('ADMIN');
  const [report, adFinance, trend] = await Promise.all([
    getLatestEcommerceReportViewModel(),
    getAdFinanceViewModel(),
    getEcommerceDashboardTrend(),
  ]);

  return <EcommerceReportShell report={report} adFinance={adFinance} trend={trend} />;
}
