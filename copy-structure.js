import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const srcDir = path.resolve('src');
const distDir = path.resolve('dist');

// Compile all TypeScript files, then delete core files after
console.log('Compiling TypeScript files...');
try {
  execSync('tsc --outDir dist --rootDir src', { stdio: 'inherit' });
} catch (error) {
  console.error('TypeScript compilation failed');
  process.exit(1);
}

// Delete compiled core files (keep only the bundled version from tsup)
console.log('Removing compiled core files (keeping bundled version)...');
const coreDistPath = path.join(distDir, 'core');
if (fs.existsSync(coreDistPath)) {
  // Keep only the bundled main.js
  const mainJsPath = path.join(coreDistPath, 'main.js');
  const mainJsContent = fs.existsSync(mainJsPath) ? fs.readFileSync(mainJsPath) : null;
  
  // Delete entire core folder
  fs.rmSync(coreDistPath, { recursive: true, force: true });
  
  // Recreate core folder with only main.js
  fs.mkdirSync(coreDistPath, { recursive: true });
  if (mainJsContent) {
    fs.writeFileSync(mainJsPath, mainJsContent);
  }
}

// Delete compiled index.js (keep only the bundled version from tsup)
const indexJsPath = path.join(distDir, 'main.js');
const bundledIndexPath = path.join(distDir, 'main.js');
// tsup already created the bundled index.js, so we just need to make sure it's there

console.log('✓ Cleaned up compiled core files');

// Copy non-TS files
function copyNonTsFiles(src, dest) {
  if (!fs.existsSync(src)) return;
  
  const relativePath = path.relative(srcDir, src);
  
  // Skip index.ts and core folder
  if (relativePath === 'index.ts' || relativePath === 'core' || relativePath.startsWith('core\\') || relativePath.startsWith('core/')) {
    return;
  }
  
  const stats = fs.statSync(src);
  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyNonTsFiles(path.join(src, file), path.join(dest, file));
    }
  } else {
    // Skip .ts files (already compiled) but copy everything else
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

copyNonTsFiles(srcDir, distDir);
console.log('✓ Copied non-TS files from src to dist');
console.log('✅ Build completed successfully!');