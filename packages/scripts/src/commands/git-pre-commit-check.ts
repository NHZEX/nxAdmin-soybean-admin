import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import process from 'node:process';

let gitDirCache: string | null = null;

function getGitPath(file: string) {
  if (!gitDirCache) {
    gitDirCache = execSync('git rev-parse --git-dir').toString().trim();
  }
  return `${gitDirCache}/${file}`;
}

const dangerStates = new Map([
  ['MERGE_HEAD', '合并操作'],
  ['CHERRY_PICK_HEAD', '拣选操作'],
  ['REBASE_HEAD', '变基操作'],
  ['BISECT_START', '二分查找'],
  ['shallow', '浅克隆仓库']
]);

function checkDangerStates() {
  // 文件类危险状态检测
  for (const [file, desc] of dangerStates) {
    if (existsSync(getGitPath(file))) {
      console.log(`⚠️  检测到 Git 状态: ${desc}`);
      return true;
    }
  }

  // 目录类检测
  const rebaseDirs = ['rebase-merge', 'rebase-apply'];
  if (rebaseDirs.some(dir => existsSync(getGitPath(dir)))) {
    console.log('⚠️  检测到进行中的变基操作');
    return true;
  }

  return false;
}

function checkSpecialStates() {
  try {
    // 合并冲突检测
    if (execSync('git ls-files --unmerged').toString().trim()) {
      console.log('⚠️  检测到未解决的合并冲突');
      return true;
    }

    // 分离头指针检测
    execSync('git symbolic-ref -q HEAD', { stdio: 'ignore' });
  } catch {
    console.log('⚠️  检测到分离头指针状态');
    return true;
  }

  // CI 环境检测
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.log('⏩  CI 环境下跳过钩子');
    return true;
  }

  return false;
}

export function gitPreCommitCheckWarp(command: string[]) {
  try {
    if (checkDangerStates() || checkSpecialStates()) {
      console.log('⏭  已跳过 pre-commit 钩子执行');
      process.exit(0);
    }

    // 获取要执行的命令
    const commandStr = command.join(' ');
    console.log(`🚀 执行命令: ${commandStr}`);

    execSync(commandStr, {
      stdio: 'inherit',
      env: {
        ...process.env,
        // 添加自定义环境变量
        HOOK_MODE: 'pre-commit'
      }
    });
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error('❗ 钩子执行失败:', error.message);
      // @ts-ignore 忽略这个警告，无意义
      process.exit(Object.hasOwn(error, 'status') ? error.status : 1);
    } else {
      console.error('❗ 钩子执行失败:', '未知错误');
      process.exit(1);
    }
  }
}
