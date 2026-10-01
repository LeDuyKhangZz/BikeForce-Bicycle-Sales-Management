import { spawn } from 'node:child_process';

import { buildLocalTsxCommand } from '../lib/process/local-tsx-command';
import { runIndependentSyncGroups } from '../lib/process/independent-sync-groups';

const python = process.platform === 'win32' ? 'python.exe' : 'python3';

function run(command: string, args: readonly string[]): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, [...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.on('error', rejectRun);
    child.on('exit', (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${command} kết thúc với mã ${code ?? 'không xác định'}`));
    });
  });
}

async function runTsx(scriptPath: string): Promise<void> {
  const command = buildLocalTsxCommand(process.cwd(), process.execPath, scriptPath);
  await run(command.command, command.args);
}

async function main(): Promise<void> {
  const errors = await runIndependentSyncGroups([
    {
      name: 'AMIS',
      run: async () => {
        await runTsx('scripts/amis-sync/amis-harvest.ts');
        await run(python, ['scripts/amis-sync/push_amis.py']);
        await run(python, ['scripts/amis-sync/fetch_report119.py', '--snapshot-only']);
      },
    },
    {
      name: 'SaleWork',
      run: async () => runTsx('scripts/salework-sync.ts'),
    },
    {
      name: 'CRM cuộc gọi',
      run: async () => run(python, ['scripts/amis-sync/fetch_call_statistics.py']),
    },
  ]);

  if (errors.length > 0) {
    throw new Error(errors.join(' | '));
  }

  console.log('Dong bo tat ca bao cao thanh cong.');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Đồng bộ báo cáo thất bại.');
  process.exitCode = 1;
});
