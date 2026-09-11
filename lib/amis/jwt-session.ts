function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function isJwtSessionUsable(
  token: string,
  nowMilliseconds: number = Date.now(),
  minimumRemainingSeconds = 15 * 60,
): boolean {
  const payloadPart = token.split('.')[1];
  if (!payloadPart) return false;

  try {
    const payload: unknown = JSON.parse(
      Buffer.from(payloadPart, 'base64url').toString('utf8'),
    );
    if (!isRecord(payload) || typeof payload.exp !== 'number') return false;

    return payload.exp > Math.floor(nowMilliseconds / 1000) + minimumRemainingSeconds;
  } catch {
    return false;
  }
}
