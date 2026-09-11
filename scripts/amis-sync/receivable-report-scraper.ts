import type { Page } from '@playwright/test';

import {
  mergeReceivableEmployeeSummaries,
  parseReceivableEmployeeTotal,
  type ReceivableEmployeeSummary,
} from '../../lib/amis/receivable-employee-summary';

const MAX_REPORT_PAGES = 50;
const REPORT_REQUEST_PATH = '/report/dynamic/v2/paging_filter';

function isRequestedReportPage(
  url: string,
  postData: string | null,
  pageIndex: number,
): boolean {
  return (
    url.includes(REPORT_REQUEST_PATH) &&
    postData !== null &&
    postData.includes(`"pageIndex":${pageIndex}`) &&
    postData.includes('"pageSize":100')
  );
}

async function waitForRenderedEmployeeRow(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('tr.tr-level-1')].some((row) =>
        row.textContent?.trim().startsWith('Tên nhân viên:'),
      ),
    undefined,
    { timeout: 120_000 },
  );
}

async function setMaximumPageSize(page: Page): Promise<void> {
  // Tiêu đề kỳ xuất hiện trước khi MISA dựng xong bảng. Dòng tổng đầu tiên là
  // mốc ổn định quan sát được từ chính thao tác thật trên giao diện.
  await waitForRenderedEmployeeRow(page);
  const pagination = page.locator('.ms-paging__right:visible').last();
  const currentPageSize = await pagination
    .locator('.ms-paging__page-size input')
    .inputValue();
  if (currentPageSize === '100') return;

  const pageSize = pagination.locator('.ms-paging__page-size .ms-combo');
  await pageSize.click({ timeout: 120_000 });
  const pageResponse = page.waitForResponse((response) =>
    isRequestedReportPage(
      response.url(),
      response.request().postData(),
      1,
    ),
  );
  await page
    .locator('.combo-dropdown-panel:visible .combobox-item--text')
    .getByText('100', { exact: true })
    .click({ timeout: 30_000 });
  await pageResponse;

  await page.waitForFunction(() => {
    const input = document.querySelector<HTMLInputElement>(
      '.ms-paging__right .ms-paging__page-size input',
    );
    return input?.value === '100';
  });
  await waitForRenderedEmployeeRow(page);
}

async function readCurrentPage(page: Page): Promise<ReceivableEmployeeSummary[]> {
  const rowTexts = await page
    .locator('tr.tr-level-1:visible')
    .evaluateAll((rows) => rows.map((row) => row.textContent ?? ''));

  return rowTexts.flatMap((rowText) => {
    const parsed = parseReceivableEmployeeTotal(rowText);
    return parsed === null ? [] : [parsed];
  });
}

export async function scrapeReceivableEmployeeSummaries(
  page: Page,
): Promise<ReceivableEmployeeSummary[]> {
  await page.locator('.ms-paging__right:visible').last().waitFor({
    state: 'visible',
    timeout: 120_000,
  });
  await setMaximumPageSize(page);

  const pages: ReceivableEmployeeSummary[][] = [];
  const visitedPageNumbers = new Set<string>();
  let reachedLastPage = false;

  for (let pageCount = 0; pageCount < MAX_REPORT_PAGES; pageCount += 1) {
    const pagination = page.locator('.ms-paging__right:visible').last();
    const selectedPage = pagination.locator('.pageSelected');
    const pageNumber = (await selectedPage.textContent())?.trim() ?? '';
    if (!pageNumber || visitedPageNumbers.has(pageNumber)) {
      throw new Error('Khong xac dinh duoc trang MISA hien tai hoac bi lap trang.');
    }
    visitedPageNumbers.add(pageNumber);

    const currentRows = await readCurrentPage(page);
    pages.push(currentRows);
    console.log(`   -> Cong no MISA trang ${pageNumber}: ${currentRows.length} nhan vien.`);

    const next = pagination.locator(
      '.ms-paging__nav-btn[alt-shortkey-target="ARROWRIGHT"]',
    );
    const nextClass = (await next.getAttribute('class')) ?? '';
    if (nextClass.includes('ms-paging__nav-btn--disabled')) {
      reachedLastPage = true;
      break;
    }

    const nextPageNumber = Number(pageNumber) + 1;
    const pageResponse = page.waitForResponse((response) =>
      isRequestedReportPage(
        response.url(),
        response.request().postData(),
        nextPageNumber,
      ),
    );
    await next.click();
    await pageResponse;
    await page.waitForFunction(
      (previousPage) => {
        const selected = document.querySelector(
          '.ms-paging__right .pageSelected',
        );
        return selected?.textContent?.trim() !== previousPage;
      },
      pageNumber,
      { timeout: 60_000 },
    );
    await waitForRenderedEmployeeRow(page);
  }

  if (!reachedLastPage) {
    throw new Error(`Bao cao MISA vuot qua gioi han ${MAX_REPORT_PAGES} trang.`);
  }

  const result = mergeReceivableEmployeeSummaries(pages);
  if (result.length === 0) {
    throw new Error('Khong tim thay dong tong nhan vien trong bao cao cong no MISA.');
  }
  return result;
}
