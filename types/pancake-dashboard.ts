export type PancakeEcommerceTrendRows = {
  daily: readonly {
    report_date: string;
    revenue: number;
    order_count: number;
    cancelled_count: number;
  }[];
  financials: readonly {
    report_date: string;
    marketplace_code: string;
    gross_sales: number;
    delivered_count: number;
  }[];
};
