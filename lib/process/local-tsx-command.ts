import { resolve } from 'node:path';

export type LocalTsxCommand = Readonly<{
  command: string;
  args: readonly string[];
}>;

export function buildLocalTsxCommand(
  cwd: string,
  nodeExecutable: string,
  scriptPath: string,
  scriptArgs: readonly string[] = [],
): LocalTsxCommand {
  return {
    command: nodeExecutable,
    args: [resolve(cwd, 'node_modules/tsx/dist/cli.mjs'), resolve(cwd, scriptPath), ...scriptArgs],
  };
}
