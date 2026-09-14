/** SockJS đóng gói các frame STOMP trong mảng JSON. Không đọc nội dung tin nhắn. */
export function isSaleWorkSessionSubscription(payload: string | Buffer): boolean {
  const text = payload.toString();
  let frames: unknown = text;
  try { frames = JSON.parse(text); } catch { /* STOMP trực tiếp không phải JSON. */ }
  const candidates = Array.isArray(frames) ? frames : [frames];
  return candidates.some((frame: unknown) =>
    typeof frame === 'string' &&
    /^SUBSCRIBE\r?\n/u.test(frame) &&
    /(?:^|\n)destination:\/session\/[^\r\n]+\r?\n/u.test(frame),
  );
}
