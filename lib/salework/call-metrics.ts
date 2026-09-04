export type CombinedCallMetrics = {
  conversations: number;
  outgoingCalls: number;
  incomingCalls: number;
  callDuration: string;
};

type SaleWorkCallMetrics = CombinedCallMetrics;

type CrmCallMetrics = {
  totalQuantity: number;
  calledQuantity: number;
  incomingSuccessful: number;
  outgoingDurationSeconds: number;
};

/** SaleWork dùng `25.17 phút` để biểu diễn 25 phút 17 giây. */
export function parseSaleWorkDurationSeconds(value: string): number {
  const normalized = value.trim().toLocaleLowerCase('vi-VN').replace(',', '.');
  if (!normalized) return 0;

  const colonParts = normalized.split(':');
  if (colonParts.length === 2 || colonParts.length === 3) {
    const parts = colonParts.map(Number);
    if (parts.every((part) => Number.isFinite(part) && part >= 0)) {
      if (parts.length === 3) {
        return Math.round((parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0));
      }
      return Math.round((parts[0] ?? 0) * 60 + (parts[1] ?? 0));
    }
  }

  const dottedMinuteMatch = normalized.match(/^(\d+)\.(\d{2})\s*phút$/);
  if (dottedMinuteMatch) {
    return Number(dottedMinuteMatch[1] ?? 0) * 60 + Number(dottedMinuteMatch[2] ?? 0);
  }

  const hourMatch = normalized.match(/(\d+(?:\.\d+)?)\s*giờ/);
  const explicitMinuteMatch = normalized.match(/(\d+)\s*phút(?:\s*(\d+)\s*giây)?/);
  if (hourMatch || explicitMinuteMatch) {
    return Math.round(
      Number(hourMatch?.[1] ?? 0) * 3600 +
        Number(explicitMinuteMatch?.[1] ?? 0) * 60 +
        Number(explicitMinuteMatch?.[2] ?? 0),
    );
  }

  const minuteMatch = normalized.match(/(\d+(?:\.\d+)?)\s*phút/);
  if (minuteMatch) return Math.round(Number(minuteMatch[1] ?? 0) * 60);

  const secondMatch = normalized.match(/(\d+(?:\.\d+)?)\s*giây/);
  if (secondMatch) return Math.round(Number(secondMatch[1] ?? 0));
  return 0;
}

export function formatCallDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safeSeconds / 3600);
  const remainder = safeSeconds % 3600;
  const minutes = Math.floor(remainder / 60);
  const seconds = remainder % 60;

  if (hours > 0) {
    return `${hours} giờ ${String(minutes).padStart(2, '0')} phút ${String(seconds).padStart(2, '0')} giây`;
  }
  if (minutes > 0) return `${minutes}.${String(seconds).padStart(2, '0')} phút`;
  return `${seconds}.00 giây`;
}

/** Cộng snapshot CRM vào số gốc SaleWork đúng một lần khi đọc báo cáo. */
export function combineCallMetrics(
  salework: SaleWorkCallMetrics,
  crm: CrmCallMetrics | null,
): CombinedCallMetrics {
  if (!crm) return salework;

  return {
    conversations: salework.conversations + crm.totalQuantity,
    outgoingCalls: salework.outgoingCalls + crm.calledQuantity,
    incomingCalls: salework.incomingCalls + crm.incomingSuccessful,
    callDuration: formatCallDuration(
      parseSaleWorkDurationSeconds(salework.callDuration) + crm.outgoingDurationSeconds,
    ),
  };
}
