export const AMIS_BROWSER_PORT = 9223;
export const AMIS_BROWSER_ENDPOINT = `http://127.0.0.1:${AMIS_BROWSER_PORT}`;

/** Chrome thường, không dùng --enable-automation hoặc profile đăng nhập thứ hai. */
export function sharedAmisBrowserArgs(profileDirectory: string): string[] {
  return [
    '--remote-debugging-address=127.0.0.1',
    `--remote-debugging-port=${AMIS_BROWSER_PORT}`,
    `--user-data-dir=${profileDirectory}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--start-maximized',
    'about:blank',
  ];
}
