import 'server-only';

import { buildMisaCustomerApiFilters, type MisaCustomerFilters } from '@/lib/amis/customer-filters';
import type { MisaCustomer } from '@/types/misa-customer';

type ReportRow = {
  ID?: unknown;
  Name?: unknown;
  NetSales?: unknown;
  QuantityAccountInCharge?: unknown;
  QuantityAccountInChargeIDs?: unknown;
};

export type MisaEmployee = { id: number; name: string; customerCount: number };
export type MisaCustomerPage = {
  employee: MisaEmployee;
  rows: MisaCustomer[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const API_URL = 'https://amisapp.misa.vn/crm/g2/api/report/Report/reportPaging';
const PAGE_SIZE = 200;
const CUSTOMER_PAGE_SIZE = 10;

function credentials(): { token: string; companyCode: string } {
  const token = process.env.AMIS_BEARER_TOKEN?.trim();
  const companyCode = process.env.AMIS_COMPANY_CODE?.trim();
  if (!token || !companyCode) throw new Error('Thiếu cấu hình MISA CRM phía server.');
  return { token, companyCode };
}

function headers(layout: 'report' | 'account'): HeadersInit {
  const { token, companyCode } = credentials();
  return {
    Accept: 'application/json, text/plain, */*',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    companycode: companyCode,
    layoutcode: layout,
    'X-MISA-Language': 'vi-VN',
    Origin: 'https://amisapp.misa.vn',
    Referer: 'https://amisapp.misa.vn/crm/report/view/119/0',
  };
}

function findRows(value: unknown): ReportRow[] | null {
  if (Array.isArray(value)) {
    if (value.length > 0 && value.every((item): item is ReportRow =>
      typeof item === 'object' && item !== null && 'Name' in item && 'NetSales' in item)) {
      return value;
    }
    for (const item of value) {
      const rows = findRows(item);
      if (rows) return rows;
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) {
      const rows = findRows(item);
      if (rows) return rows;
    }
  }
  return null;
}

async function reportRows(params: {
  fromDate: string;
  toDate: string;
  period: number;
}): Promise<ReportRow[]> {
  const body = {
    Columns: Buffer.from('ID,FormLayoutID,FormLayoutIDText,OwnerID,OwnerIDText').toString('base64'),
    CustomColumns: Buffer.from('Name,QuantityAccountInCharge,NetSales').toString('base64'),
    Sorts: [], Start: 0, Page: 1, PageSize: PAGE_SIZE, Filters: [],
    LayoutCode: 'Report', DefaultTotal: false, IsMappingData: false, IsApproved: false,
    CustomPagingData: {
      ID: 119, ReportDynamicID: 0,
      Data: {
        IsViewEmployee: true, ProductCategoryIDs: null,
        RevenueStatusIDs: '3', StatisticalsBy: '1,2,3',
        StatisticalsByText: 'Đơn hàng, Đơn hàng cha, Trả lại hàng bán',
        Period: params.period, FromDate: params.fromDate, ToDate: params.toDate,
        AnalysisType: 2, AnalysisTypeText: 'Cơ cấu tổ chức',
        OrganizationUnitID: 1, OrganizationUnitIDText: 'THỐNG ĐẠT GROUP',
        MISACode: null, ID: 119, ReportDynamicID: 0,
        Config: { GroupColumn: [], Filter: [], Formula: '', FormulaContent: '' },
        IsLastOrganization: 0, WeekText: '', HasPermission: true,
        RevenueStatusIDsText: 'Đã ghi', IsDisplay: true,
        ProductStatisticsID: '1', ProductStatisticsIDText: 'Hàng hóa',
      },
    },
    IsUsedELTS: true, ListGmailPage: [], ListFacebookPage: {},
    IsGetCache: false, IsCheckInactive: false, IsConverted: false,
    SessionID: '78fdd0e3-5a9d-001a-7eb0-f3a2c3e3db80',
    LayoutCodeCheckPermission: 'Report', AISearchKeyword: '', SkipNormalSearch: false,
  };
  const response = await fetch(API_URL, {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(30000),
    headers: headers('report'),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error('[MISA report 119] HTTP', response.status);
    throw new Error('Không tải được danh sách nhân viên MISA.');
  }
  const payload: unknown = await response.json();
  const rows = findRows(payload);
  if (rows === null) {
    console.error('[MISA report 119] Không nhận ra cấu trúc phản hồi.');
    throw new Error('Không đọc được danh sách nhân viên MISA.');
  }
  if (rows.length >= PAGE_SIZE) {
    throw new Error('Danh sách MISA vượt giới hạn trang; cần bổ sung phân trang.');
  }
  return rows;
}

function employeeFromRow(row: ReportRow): MisaEmployee | null {
  if (typeof row.ID !== 'number' || !Number.isSafeInteger(row.ID) ||
      typeof row.Name !== 'string' || !row.Name.trim() ||
      typeof row.QuantityAccountInCharge !== 'number') return null;
  return { id: row.ID, name: row.Name.trim(), customerCount: row.QuantityAccountInCharge };
}

export async function listMisaReport119Employees(params: {
  fromDate: string;
  toDate: string;
  period: number;
}): Promise<MisaEmployee[]> {
  return (await reportRows(params)).flatMap((row) => {
    const employee = employeeFromRow(row);
    return employee === null ? [] : [employee];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCustomer(value: unknown): MisaCustomer | null {
  if (!isRecord(value)) return null;
  const row = value;
  if (typeof row.ID !== 'number' || !Number.isSafeInteger(row.ID)) return null;
  return {
    id: row.ID,
    code: typeof row.AccountNumber === 'string' ? row.AccountNumber : '',
    name: typeof row.AccountName === 'string' ? row.AccountName : '',
    billingProvince: typeof row.BillingProvinceIDText === 'string' ? row.BillingProvinceIDText : '',
    debt: typeof row.Debt === 'number' && Number.isFinite(row.Debt) ? row.Debt : null,
    orderSales: typeof row.OrderSales === 'number' && Number.isFinite(row.OrderSales) ? row.OrderSales : null,
    recentPurchaseDate: typeof row.PurchaseDateRecent === 'string' ? row.PurchaseDateRecent : null,
    daysWithoutPurchase: typeof row.NumberDaysWithoutPurchase === 'number' && Number.isFinite(row.NumberDaysWithoutPurchase) ? row.NumberDaysWithoutPurchase : null,
    lastVisitDate: typeof row.LastVisitDate === 'string' ? row.LastVisitDate : null,
    owner: typeof row.OwnerIDText === 'string' ? row.OwnerIDText : '',
  };
}

export async function getMisaEmployeeCustomers(params: {
  fromDate: string;
  toDate: string;
  period: number;
  employeeId: number;
  page: number;
  filters: MisaCustomerFilters;
  searchQuery: string;
}): Promise<MisaCustomerPage | null> {
  const row = (await reportRows(params)).find((item) => item.ID === params.employeeId);
  if (!row) return null;
  const employee = employeeFromRow(row);
  if (!employee) return null;
  const ids = row.QuantityAccountInChargeIDs;
  if (employee.customerCount === 0) {
    if (params.page !== 1) return null;
    return { employee, rows: [], page: 1, pageSize: CUSTOMER_PAGE_SIZE, total: 0, totalPages: 1 };
  }
  if (typeof ids !== 'string' || !/^\d+(,\d+)*$/.test(ids)) {
    throw new Error('MISA không trả danh sách ID khách hàng phụ trách.');
  }
  const idCount = ids.split(',').length;
  if (idCount !== employee.customerCount) {
    throw new Error('Số lượng khách hàng và danh sách ID của MISA không khớp.');
  }
  const maxPage = Math.ceil(idCount / CUSTOMER_PAGE_SIZE);
  if (!Number.isSafeInteger(params.page) || params.page < 1 || params.page > maxPage) return null;

  const body = {
    Columns: Buffer.from('ID,AccountNumber,AccountName,BillingProvinceID,BillingProvinceIDText,Debt,OrderSales,PurchaseDateRecent,NumberDaysWithoutPurchase,LastVisitDate,OwnerID,OwnerIDText,FormLayoutID,FormLayoutIDText').toString('base64'),
    Sorts: [], Start: (params.page - 1) * CUSTOMER_PAGE_SIZE,
    Page: params.page, PageSize: CUSTOMER_PAGE_SIZE,
    Filters: [...buildMisaCustomerApiFilters(params.filters), {
      Addition: 1, Group: null, InputType: 5, IsFromFormula: false,
      Operator: 0, Property: 'ID', FieldName: 'ID', Value: ids,
      Text: 'ID', IsDefaultFilter: true,
    }],
    LayoutCode: 'Account', DefaultTotal: false, IsMappingData: false,
    IsApproved: false, CustomPagingData: null, IsUsedELTS: true,
    ListGmailPage: [], ListFacebookPage: {}, IsListPaging: true,
    IsGetCache: false, IsCheckInactive: false, IsConverted: false,
    SessionID: '94902524-7654-13c0-a7a9-43682c077251',
    LayoutCodeCheckPermission: 'Account', AISearchKeyword: params.searchQuery, SkipNormalSearch: false,
  };
  const response = await fetch('https://amisapp.misa.vn/crm/g2/api/business/Account/Grid', {
    method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(30000),
    headers: headers('account'), body: JSON.stringify(body),
  });
  if (!response.ok) {
    console.error('[MISA Account/Grid] HTTP', response.status);
    throw new Error('Không tải được khách hàng MISA.');
  }
  const payload: unknown = await response.json();
  if (typeof payload !== 'object' || payload === null || !('Data' in payload) || !Array.isArray(payload.Data) ||
      !('Total' in payload) || typeof payload.Total !== 'number' || !Number.isSafeInteger(payload.Total) || payload.Total < 0) {
    throw new Error('MISA trả cấu trúc danh sách khách hàng không hợp lệ.');
  }
  const totalPages = Math.max(1, Math.ceil(payload.Total / CUSTOMER_PAGE_SIZE));
  if (params.page > totalPages) return null;
  const rows = payload.Data.map(parseCustomer);
  if (rows.some((customer) => customer === null)) {
    throw new Error('Một dòng khách hàng MISA không hợp lệ.');
  }
  return { employee, rows: rows.filter((customer) => customer !== null), page: params.page, pageSize: CUSTOMER_PAGE_SIZE, total: payload.Total, totalPages };
}
