import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
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

// Check if src/ folder exists (dev mode) or not (prod mode)
const srcFolderExists = existsSync(path.join(PROJECT_ROOT, 'src'));
const ROOT_DIR = srcFolderExists ? path.join(PROJECT_ROOT, 'src') : PROJECT_ROOT;
// Export commonly used paths
export { ROOT_DIR };
export const CONFIG_DIR = path.join(ROOT_DIR, 'config');
export const ADDONS_DIR = path.join(ROOT_DIR, 'addons');
export const EVENTS_DIR = path.join(ROOT_DIR, 'events');
export const DATABASE_DIR = path.join(ROOT_DIR, 'database');
export const DATABASE_CONFIG = path.join(CONFIG_DIR, 'database.yaml');
export const ENV_PATH = path.join(CONFIG_DIR, '.env');
export const PACKAGE_JSON = path.join(PROJECT_ROOT, 'package.json');