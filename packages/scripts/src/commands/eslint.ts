import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import process from 'node:process';

const execAsync = promisify(exec);

// 配置参数
const BATCH_SIZE = 100; // 每批处理文件数
const ESLINT_ARGS = '--no-error-on-unmatched-pattern'; // 添加参数避免无文件时报错

interface Options {
  dryRun: boolean;
  showFileList: boolean;
}

// 分批处理函数
function chunkArray<T = string>(array: T[], size: number) {
  return Array.from({ length: Math.ceil(array.length / size) }, (_, i) => array.slice(i * size, i * size + size));
}

// 处理特殊字符路径
function escapePath(path: string) {
  return `"${path.replace(/"/g, '\\"')}"`; // 转义双引号并包裹路径
}

async function runESLint(files: string[], options: Options) {
  if (files.length === 0) {
    console.log('No files to lint');
    return true;
  }

  const batches = chunkArray<string>(files, BATCH_SIZE);

  let hasErrors = false;

  for (const [index, batch] of batches.entries()) {
    const fileArgs = batch.map(escapePath).join(' ');
    const command = ['pnpm', 'eslint', options.dryRun ? '--fix-dry-run' : '--fix', ESLINT_ARGS, fileArgs].join(' ');

    try {
      console.log(`Processing batch ${index + 1}/${batches.length} (${batch.length} files)`);
      execSync(command, {
        stdio: 'inherit',
        env: {
          ...process.env
        }
      });
    } catch {
      console.error(`Batch ${index + 1} failed`);
      // if (error.stdout) console.error('STDOUT:', error.stdout)
      // if (error.stderr) console.error('STDERR:', error.stderr)
      hasErrors = true;
    }
  }

  return !hasErrors;
}

export type FileType = 'all-files' | 'diff-files';
const GET_FILE_LIST_COMMANDS: Record<FileType, string> = {
  // 获取 git 跟踪文件
  'all-files': 'git ls-files',
  // 获取 git 跟踪文件的修改
  'diff-files': 'git diff --cached --name-only'
};

async function getFileList(type: FileType) {
  const command = GET_FILE_LIST_COMMANDS[type];
  const { stdout: gitFiles } = await execAsync(command);
  return gitFiles.split('\n').filter(file => file.trim() && /\.(js|mjs|cjs|jsx|ts|mts|tsx|vue|json)$/.test(file));
}

// 主执行流程
export async function runEslintFix(fileListType: FileType, options: Options) {
  try {
    const files = await getFileList(fileListType);

    console.log(`Found ${files.length} lintable files`);
    // 显示文件列表
    if (options.showFileList || fileListType === 'diff-files') {
      for (const file of files) {
        console.log(`- ${file}`);
      }
    }

    // 执行 ESLint
    const success = await runESLint(files, options);

    if (success) {
      console.log('ESLint fixes applied successfully');
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    console.error('Process failed:', error);
    process.exit(1);
  }
}
