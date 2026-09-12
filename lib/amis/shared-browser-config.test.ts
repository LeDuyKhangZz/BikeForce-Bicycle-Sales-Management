import { describe, expect, it } from 'vitest';

import {
  AMIS_BROWSER_ENDPOINT,
  sharedAmisBrowserArgs,
} from '@/lib/amis/shared-browser-config';

describe('sharedAmisBrowserArgs', () => {
  it('khóa CDP vào loopback và profile AMIS chung', () => {
    const args = sharedAmisBrowserArgs('C:/repo/.playwright-amis-profile');
    expect(AMIS_BROWSER_ENDPOINT).toBe('http://127.0.0.1:9223');
    expect(args).toContain('--remote-debugging-address=127.0.0.1');
    expect(args).toContain('--user-data-dir=C:/repo/.playwright-amis-profile');
    expect(args).not.toContain('--enable-automation');
    expect(args).not.toContain('--incognito');
  });
});
