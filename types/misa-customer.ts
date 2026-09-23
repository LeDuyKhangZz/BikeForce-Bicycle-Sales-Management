export type MisaCustomer = {
  id: number;
  code: string;
  name: string;
  billingProvince: string;
  debt: number | null;
  orderSales: number | null;
  recentPurchaseDate: string | null;
  daysWithoutPurchase: number | null;
  lastVisitDate: string | null;
  owner: string;
};
