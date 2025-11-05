import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');

console.log('Clearing dist folder...');
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
  console.log('✓ Dist folder cleared');
} else {
  console.log('✓ Dist folder does not exist');
}