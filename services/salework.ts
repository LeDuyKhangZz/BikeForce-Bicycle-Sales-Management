import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type SaleWorkReport = {
  accountName: string;
  conversations: number;
  sentMessages: number;
  receivedMessages: number;
  incomingCalls: number;
  outgoingCalls: number;
  missedCalls: number;
  callDuration: string;
};

const REPORT_PATH = resolve(process.cwd(), 'data/salework-report.json');

export function getSaleWorkReport(): SaleWorkReport[] {
  if (!existsSync(REPORT_PATH)) return [];

  try {
    const parsed: unknown = JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSaleWorkReport);
  } catch {
    return [];
  }
}

function isSaleWorkReport(value: unknown): value is SaleWorkReport {
  if (typeof value !== 'object' || value === null) return false;
  const report = value as Record<string, unknown>;
  return (
    typeof report.accountName === 'string' &&
    typeof report.conversations === 'number' &&
    typeof report.sentMessages === 'number' &&
    typeof report.receivedMessages === 'number' &&
    typeof report.incomingCalls === 'number' &&
    typeof report.outgoingCalls === 'number' &&
    typeof report.missedCalls === 'number' &&
    typeof report.callDuration === 'string'
  );
}
