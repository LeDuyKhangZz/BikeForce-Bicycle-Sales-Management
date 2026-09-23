export type CustomerDormancyLevel = 'NORMAL' | 'WARNING' | 'DANGER' | 'UNKNOWN';

export function getCustomerDormancyLevel(daysWithoutPurchase: number | null): CustomerDormancyLevel {
  if (daysWithoutPurchase === null) return 'UNKNOWN';
  if (daysWithoutPurchase > 30) return 'DANGER';
  if (daysWithoutPurchase >= 16) return 'WARNING';
  return 'NORMAL';
}
