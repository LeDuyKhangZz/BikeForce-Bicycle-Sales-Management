import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildLocalTsxCommand } from './local-tsx-command';

describe('buildLocalTsxCommand', () => {
  it('calls the local tsx CLI through node instead of a Windows cmd shim', () => {
    const cwd = resolve('workspace');
    const command = buildLocalTsxCommand(cwd, 'C:\\Program Files\\nodejs\\node.exe', 'scripts/job.ts', [
      '2026-09',
    ]);

    expect(command).toEqual({
      command: 'C:\\Program Files\\nodejs\\node.exe',
      args: [
        resolve(cwd, 'node_modules/tsx/dist/cli.mjs'),
        resolve(cwd, 'scripts/job.ts'),
        '2026-09',
      ],
    });
    expect(command.command).not.toMatch(/\.cmd$/i);
  });
});
