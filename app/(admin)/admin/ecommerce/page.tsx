import type { Metadata } from 'next';

import { EcommerceReportShell } from '@/features/admin-ecommerce/ecommerce-report-shell';
import { getLatestEcommerceReportViewModel } from '@/features/admin-ecommerce/queries';
import { requireRole } from '@/features/auth/queries';

export const metadata: Metadata = {
  title: 'Sàn TMĐT · BikeForce',
};

export default async function EcommercePage() {
  await requireRole('ADMIN');
  const report = await getLatestEcommerceReportViewModel();

  return <EcommerceReportShell report={report} />;
}
