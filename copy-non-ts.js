import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('src');
const distDir = path.resolve('dist');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    if (src.endsWith('.ts')) return;

    if (src.endsWith('.info')) {
      const content = fs.readFileSync(src, 'utf8');
      const updatedContent = content.replace(/\.ts\b/g, '.js');
      fs.writeFileSync(dest, updatedContent);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

copyRecursive(srcDir, distDir);
console.log('Copied non-TS files from src to dist');

const indexPath = path.join(distDir, 'index.js');
const mainPath = path.join(distDir, 'main.js');

if (fs.existsSync(indexPath)) {
  fs.renameSync(indexPath, mainPath);
  console.log('Renamed index.js to main.js');
} else {
  console.log('index.js not found in dist directory');
}
