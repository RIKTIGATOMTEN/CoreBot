/**
 * PATH VALIDATION UTILITY
 * =======================
 * Fast startup check to ensure all critical directories exist before bot runs.
 *
 * WHY THIS EXISTS:
 * - Prevents cryptic errors like "ENOENT: no such file or directory"
 * - Catches missing folders immediately at startup
 * - Fails fast with clear error messages
 *
 * WHAT IT CHECKS:
 * - config/   (environment variables, bot config)
 * - addons/   (features and extensions)
 * - events/   (Discord event handlers)
 * - database/ (SQLite database files)
 *
 * WHEN IT RUNS:
 * - During bot initialization (before Discord client creation)
 * - Can also be run manually: node validate-paths.js
 *
 * ON FAILURE:
 * - Lists all missing directories
 * - Exits with code 1 (prevents bot from starting in broken state)
 *
 * PERFORMANCE:
 * - Only checks if directories exist (no file I/O)
 * - Typically completes in <1ms
 */

import {fileURLToPath} from 'url';
import {existsSync} from 'fs';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function findProjectRoot(): string {
  let currentDir = __dirname;
  while (currentDir !== path.parse(currentDir).root) {
    if (existsSync(path.join(currentDir, 'package.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  return process.cwd();
}

const PROJECT_ROOT = findProjectRoot();
const ROOT_DIR = __dirname;
const criticalPaths = [
  path.join(ROOT_DIR, 'config'),
  path.join(ROOT_DIR, 'addons'),
  path.join(ROOT_DIR, 'events'),
  path.join(ROOT_DIR, 'database'),
];

const missingPaths = criticalPaths.filter(p => !existsSync(p));

if (missingPaths.length > 0) {
  console.error('❌ Missing critical directories:');
  missingPaths.forEach(p => console.error(`   - ${p}`));
  process.exit(1);
}

console.log('✅ Path validation passed');
console.log(`   Root: ${ROOT_DIR}`);
