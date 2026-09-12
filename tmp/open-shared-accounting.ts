import { connectToSharedAmisBrowser } from '../scripts/amis-sync/shared-browser';

async function main() {
  const shared = await connectToSharedAmisBrowser();
  try {
    await shared.page.goto('https://actapp.misa.vn/app/RP/ReportList/RPDynamicViewer/SummaryCustomerReceivableByEmployee', {
      waitUntil: 'domcontentloaded', timeout: 90_000,
    });
    await shared.page.bringToFront();
    console.log('Đã mở báo cáo Kế toán trong Chrome chung và để người dùng thao tác.');
  } finally {
    await shared.disconnect();
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : 'Không mở được Chrome chung.');
  process.exitCode = 1;
});
