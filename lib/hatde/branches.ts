export const HATDE_BRANCHES = {
  cn_15h: '15H',
  lotte_gold_coast: 'LOTTE GOLD COAST NT',
  lotte_2310: 'LOTTE 23/10',
  lotte_vung_tau: 'LOTTE VŨNG TÀU',
  passio_pho_quang: 'PASSIO PHỔ QUANG',
  passio_dong_den: 'PASSIO ĐỒNG ĐEN',
} as const;

export type HatdeBranchCode = keyof typeof HATDE_BRANCHES;

export const HATDE_BRANCH_CODES = Object.keys(HATDE_BRANCHES) as HatdeBranchCode[];

export function isHatdeBranchCode(value: string): value is HatdeBranchCode {
  return HATDE_BRANCH_CODES.some((code) => code === value);
}

export function getHatdeBranchName(code: HatdeBranchCode): string {
  return HATDE_BRANCHES[code];
}
