/**
 * PATH RESOLUTION SYSTEM
 * ======================
 * Provides consistent path exports that work in both development and production.
 *
 * WHY THIS EXISTS:
 * - In dev: files are in src/ (TypeScript source)
 * - In prod: files are in dist/ (compiled JavaScript)
 * - Hardcoded paths would break between environments
 *
 * HOW IT WORKS:
 * - Uses __dirname (location of THIS file) as the base
 * - In dev: __dirname = src/core/utils → ROOT_DIR points to src/
 * - In prod: __dirname = dist/core → ROOT_DIR points to dist/
 * - Always resolves correctly regardless of build output
 *
 * USAGE IN ADDONS:
 * import { ADDONS_DIR, CONFIG_DIR, DATABASE_DIR } from '#core';
 * const addonPath = path.join(ADDONS_DIR, 'MyAddon');
 *
 * CRITICAL: Never use relative paths (../../) in addons - they break after build!
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

const isInSrc = __dirname.includes(path.join(PROJECT_ROOT, 'src'));
const isInDist = __dirname.includes(path.join(PROJECT_ROOT, 'dist'));

let ROOT_DIR: string;
if (isInSrc) {
  ROOT_DIR = path.join(PROJECT_ROOT, 'src');
} else if (isInDist) {
  ROOT_DIR = path.join(PROJECT_ROOT, 'dist');
} else {
  const srcExists = existsSync(path.join(PROJECT_ROOT, 'src'));
  const distExists = existsSync(path.join(PROJECT_ROOT, 'dist'));

  if (srcExists) {
    ROOT_DIR = path.join(PROJECT_ROOT, 'src');
  } else if (distExists) {
    ROOT_DIR = path.join(PROJECT_ROOT, 'dist');
  } else {
    ROOT_DIR = PROJECT_ROOT;
  }
}

export {ROOT_DIR, PROJECT_ROOT};
export const CONFIG_DIR = path.join(ROOT_DIR, 'config');
export const ADDONS_DIR = path.join(ROOT_DIR, 'addons');
export const EVENTS_DIR = path.join(ROOT_DIR, 'events');
export const DATABASE_DIR = path.join(ROOT_DIR, 'database');
export const DATABASE_CONFIG = path.join(CONFIG_DIR, 'database.yaml');
export const CACHE_BASE_DIR = path.join(ROOT_DIR, 'cache');
export const ENV_PATH = path.join(CONFIG_DIR, '.env');
export const PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');
