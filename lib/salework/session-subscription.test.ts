import { describe, expect, it } from 'vitest';
import { isSaleWorkSessionSubscription } from './session-subscription';

describe('SaleWork report session subscription', () => {
  it('recognizes the SockJS session subscription used for statistic results', () => {
    expect(isSaleWorkSessionSubscription(JSON.stringify([
      'SUBSCRIBE\nid:sub-0\ndestination:/session/test-session\n\n\0',
    ]))).toBe(true);
  });
  it('recognizes direct STOMP with CRLF', () => {
    expect(isSaleWorkSessionSubscription(Buffer.from('SUBSCRIBE\r\ndestination:/session/test\r\n\r\n\0'))).toBe(true);
  });
  it('does not treat opening a socket or connecting as subscribing', () => {
    for (const frame of ['o', 'CONNECT\n\n\0', 'CONNECTED\n\n\0', 'invalid']) {
      expect(isSaleWorkSessionSubscription(frame)).toBe(false);
    }
  });
  it('does not accept chat subscriptions or incoming message bodies', () => {
    expect(isSaleWorkSessionSubscription('SUBSCRIBE\ndestination:/chat/test\n\n\0')).toBe(false);
    expect(isSaleWorkSessionSubscription('MESSAGE\n\nSUBSCRIBE\ndestination:/session/test\n')).toBe(false);
  });
});
