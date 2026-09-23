import { isValidVietnamDate } from '@/lib/date';

export const MISA_CUSTOMER_FILTER_FIELDS = [
  { key: 'code', label: 'Mã khách hàng', field: 'AccountNumber', kind: 'text' },
  { key: 'name', label: 'Tên khách hàng', field: 'AccountName', kind: 'text' },
  { key: 'province', label: 'Tỉnh/Thành phố (Hóa đơn)', field: 'BillingProvinceIDText', kind: 'text' },
  { key: 'debt', label: 'Công nợ', field: 'Debt', kind: 'number' },
  { key: 'orderSales', label: 'Doanh số đơn hàng', field: 'OrderSales', kind: 'number' },
  { key: 'recentPurchase', label: 'Ngày mua hàng gần nhất', field: 'PurchaseDateRecent', kind: 'date' },
  { key: 'daysWithoutPurchase', label: 'Số ngày chưa mua hàng', field: 'NumberDaysWithoutPurchase', kind: 'number' },
  { key: 'lastVisit', label: 'Ngày ghé thăm gần nhất', field: 'LastVisitDate', kind: 'date' },
  { key: 'owner', label: 'Chủ sở hữu', field: 'OwnerIDText', kind: 'text' },
] as const;

export const MISA_FILTER_OPERATORS = {
  text: [
    { code: 1, label: 'Chứa', needsValue: true },
    { code: 8, label: 'Không chứa', needsValue: true },
    { code: 11, label: 'Là', needsValue: true },
    { code: 12, label: 'Không là', needsValue: true },
    { code: 13, label: 'Trống', needsValue: false },
    { code: 14, label: 'Không trống', needsValue: false },
  ],
  number: [
    { code: 0, label: 'Bằng (=)', needsValue: true },
    { code: 9, label: 'Khác (≠)', needsValue: true },
    { code: 3, label: 'Nhỏ hơn (<)', needsValue: true },
    { code: 5, label: 'Nhỏ hơn hoặc bằng (≤)', needsValue: true },
    { code: 2, label: 'Lớn hơn (>)', needsValue: true },
    { code: 4, label: 'Lớn hơn hoặc bằng (≥)', needsValue: true },
    { code: 13, label: 'Trống', needsValue: false },
    { code: 14, label: 'Không trống', needsValue: false },
  ],
  date: [
    { code: 11, label: 'Là', needsValue: true },
    { code: 17, label: 'Trước ngày', needsValue: true },
    { code: 18, label: 'Sau ngày', needsValue: true },
    { code: 20, label: 'Hôm nay', needsValue: false },
    { code: 21, label: 'Hôm qua', needsValue: false },
    { code: 22, label: 'Ngày mai', needsValue: false },
    { code: 23, label: 'Tuần này', needsValue: false },
    { code: 24, label: 'Tháng này', needsValue: false },
    { code: 25, label: 'Năm nay', needsValue: false },
    { code: 26, label: 'Tuần trước', needsValue: false },
    { code: 27, label: 'Tháng trước', needsValue: false },
    { code: 28, label: 'Năm trước', needsValue: false },
    { code: 32, label: 'Tuần tới', needsValue: false },
    { code: 33, label: 'Tháng tới', needsValue: false },
    { code: 34, label: 'Năm tới', needsValue: false },
    { code: 13, label: 'Trống', needsValue: false },
    { code: 14, label: 'Không trống', needsValue: false },
  ],
} as const;

export type MisaCustomerFilterKey = (typeof MISA_CUSTOMER_FILTER_FIELDS)[number]['key'];
export type MisaCustomerFilters = Partial<Record<MisaCustomerFilterKey, { operator: number; value: string }>>;

export function parseMisaCustomerFilters(search: Record<string, string | undefined>): MisaCustomerFilters {
  const filters: MisaCustomerFilters = {};
  for (const field of MISA_CUSTOMER_FILTER_FIELDS) {
    if (search[`use_${field.key}`] !== '1') continue;
    const options = MISA_FILTER_OPERATORS[field.kind];
    const operator = options.find((option) => String(option.code) === search[`op_${field.key}`]) ?? options[0];
    if (!operator) continue;
    if (!operator.needsValue) {
      filters[field.key] = { operator: operator.code, value: '' };
      continue;
    }
    const value = search[field.key]?.trim();
    if (!value) continue;
    if (field.kind === 'text' && value.length <= 120) filters[field.key] = { operator: operator.code, value };
    if (field.kind === 'number' && /^-?\d{1,15}$/.test(value) && Number.isSafeInteger(Number(value))) {
      filters[field.key] = { operator: operator.code, value };
    }
    if (field.kind === 'date' && isValidVietnamDate(value)) filters[field.key] = { operator: operator.code, value };
  }
  return filters;
}

export function misaCustomerQuery(month: string, filters: MisaCustomerFilters, page?: number, searchQuery?: string): string {
  const query = new URLSearchParams({ month });
  for (const field of MISA_CUSTOMER_FILTER_FIELDS) {
    const filter = filters[field.key];
    if (filter === undefined) continue;
    query.set(`use_${field.key}`, '1');
    query.set(`op_${field.key}`, String(filter.operator));
    if (filter.value) query.set(field.key, filter.value);
  }
  if (page !== undefined) query.set('page', String(page));
  if (searchQuery) query.set('q', searchQuery);
  return query.toString();
}

export function buildMisaCustomerApiFilters(filters: MisaCustomerFilters): Array<{
  Addition: number;
  Group: null;
  InputType: number;
  IsFromFormula: boolean;
  Operator: number;
  Property: string;
  FieldName: string;
  Value: string | number;
  IsDefaultFilter: boolean;
}> {
  return MISA_CUSTOMER_FILTER_FIELDS.flatMap((field) => {
    const filter = filters[field.key];
    if (filter === undefined) return [];
    const options = MISA_FILTER_OPERATORS[field.kind];
    const operator = options.find((option) => option.code === filter.operator);
    if (!operator) return [];
    const value = !operator.needsValue ? ''
      : field.kind === 'number' ? Number(filter.value)
      : field.kind === 'date' ? new Date(`${filter.value}T00:00:00+07:00`).toISOString()
      : filter.value;
    return [{
      Addition: 1, Group: null,
      InputType: field.kind === 'text' ? 10 : field.kind === 'number' ? 11 : 7,
      IsFromFormula: false,
      Operator: filter.operator,
      Property: field.field,
      FieldName: field.field,
      Value: value,
      IsDefaultFilter: false,
    }];
  });
}
