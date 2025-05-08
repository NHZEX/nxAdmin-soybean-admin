import cac from 'cac';
import { blue, lightGreen } from 'kolorist';
import { version } from '../package.json';
import {
  type FileType as EslintFileType,
  cleanup,
  genChangelog,
  generateRoute,
  gitCommit,
  gitCommitVerify,
  gitPreCommitCheckWarp,
  release,
  runEslintFix,
  updatePkg
} from './commands';
import { loadCliOptions } from './config';
import type { Lang } from './locales';

type Command =
  | 'cleanup'
  | 'update-pkg'
  | 'git-commit'
  | 'git-commit-verify'
  | 'changelog'
  | 'release'
  | 'gen-route'
  | 'eslint'
  | 'git-pre-commit-check-warp';

type CommandAction<A extends object> = (args?: A) => Promise<void> | void;

type CommandWithAction<A extends object = object> = Record<Command, { desc: string; action: CommandAction<A> }>;

interface CommandArg {
  '--'?: string[];
  /** Execute additional command after bumping and before git commit. Defaults to 'pnpm sa changelog' */
  execute?: string;
  /** Indicates whether to push the git commit and tag. Defaults to true */
  push?: boolean;
  /** Generate changelog by total tags */
  total?: boolean;
  /**
   * The glob pattern of dirs to clean up
   *
   * If not set, it will use the default value
   *
   * Multiple values use "," to separate them
   */
  cleanupDir?: string;
  /**
   * display lang of cli
   *
   * @default 'en-us'
   */
  lang?: Lang;
  dryRun: boolean;
  fileList: boolean;
}

export async function setupCli() {
  const cliOptions = await loadCliOptions();

  const cli = cac(blue('soybean-admin'));

  cli
    .version(lightGreen(version))
    .option(
      '-e, --execute [command]',
      "Execute additional command after bumping and before git commit. Defaults to 'npx soy changelog'"
    )
    .option('-p, --push', 'Indicates whether to push the git commit and tag')
    .option('-t, --total', 'Generate changelog by total tags')
    .option(
      '-c, --cleanupDir <dir>',
      'The glob pattern of dirs to cleanup, If not set, it will use the default value, Multiple values use "," to separate them'
    )
    .option('-l, --lang <lang>', 'display lang of cli', { default: 'en-us', type: [String] })
    .option('-d, --dry-run', 'dry run')
    .option('--file-list', 'show file list')
    .help();

  const commands: CommandWithAction<CommandArg> = {
    cleanup: {
      desc: 'delete dirs: node_modules, dist, etc.',
      action: async () => {
        await cleanup(cliOptions.cleanupDirs);
      }
    },
    'update-pkg': {
      desc: 'update package.json dependencies versions',
      action: async () => {
        await updatePkg(cliOptions.ncuCommandArgs);
      }
    },
    'git-commit': {
      desc: 'git commit, generate commit message which match Conventional Commits standard',
      action: async args => {
        await gitCommit(args?.lang);
      }
    },
    'git-commit-verify': {
      desc: 'verify git commit message, make sure it match Conventional Commits standard',
      action: async args => {
        await gitCommitVerify(args?.lang, cliOptions.gitCommitVerifyIgnores);
      }
    },
    changelog: {
      desc: 'generate changelog',
      action: async args => {
        await genChangelog(cliOptions.changelogOptions, args?.total);
      }
    },
    release: {
      desc: 'release: update version, generate changelog, commit code',
      action: async args => {
        await release(args?.execute, args?.push);
      }
    },
    'gen-route': {
      desc: 'generate route',
      action: async () => {
        await generateRoute();
      }
    },
    eslint: {
      desc: 'safe eslint fix, file list type: all、diff',
      action: async args => {
        if (!args?.execute) {
          cli.outputHelp();
          return;
        }
        const typeMap: Record<string, EslintFileType> = {
          all: 'all-files',
          diff: 'diff-files'
        };
        await runEslintFix(typeMap[args!.execute as keyof typeof typeMap], {
          dryRun: args.dryRun ?? false,
          showFileList: args.fileList ?? false
        });
      }
    },
    'git-pre-commit-check-warp': {
      desc: 'git pre commit check warp',
      action: async args => {
        if (!args?.execute) {
          cli.outputHelp();
          return;
        }
        gitPreCommitCheckWarp([args!.execute, ...(args['--'] ?? [])]);
      }
    }
  };

  for (const [command, { desc, action }] of Object.entries(commands)) {
    cli.command(command, lightGreen(desc)).action(action);
  }

  cli.parse();
}

setupCli();
