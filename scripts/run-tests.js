// workspace 테스트 실행 스크립트
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const workspaces = ['shared', 'web'];

let failed = false;

for (const workspace of workspaces) {
  console.log(`\n=== ${workspace} 테스트 실행 ===\n`);
  try {
    execSync('npm test', {
      cwd: join(rootDir, workspace),
      stdio: 'inherit',
      shell: true,
      env: process.env,
    });
  } catch (error) {
    failed = true;
    console.error(`\n${workspace} 테스트 실패\n`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('\n=== 모든 테스트 통과 ===\n');
