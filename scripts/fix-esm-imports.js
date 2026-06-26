import fs from 'fs';
import path from 'path';

function walk(dir) {
  let files = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      files = files.concat(walk(filePath));
    } else if (file.endsWith('.js')) {
      files.push(filePath);
    }
  }
  return files;
}

const distDir = path.resolve('dist');
if (!fs.existsSync(distDir)) {
  console.log('No dist/ directory found.');
  process.exit(0);
}

const files = walk(distDir);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf-8');
  const dir = path.dirname(file);

  content = content.replace(/(import|export)([\s\S]*?from\s+|[\s]+)['"](\.\.?\/[^'"]*)['"]/g, (match, type, prefix, importPath) => {
    const resolvedPath = path.resolve(dir, importPath);
    let newPath = importPath;

    // Prioritize file matches first (to avoid shadowed directories like routes/intelligence.js vs routes/intelligence/)
    if (fs.existsSync(`${resolvedPath}.js`) && !fs.statSync(`${resolvedPath}.js`).isDirectory()) {
      newPath = `${importPath}.js`;
    } else if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
      newPath = importPath.endsWith('/') ? `${importPath}index.js` : `${importPath}/index.js`;
    } else if (!importPath.endsWith('.js') && !importPath.endsWith('.json') && !importPath.endsWith('.node')) {
      if (fs.existsSync(`${resolvedPath}.js`)) {
        newPath = `${importPath}.js`;
      } else if (fs.existsSync(`${resolvedPath}/index.js`)) {
        newPath = `${importPath}/index.js`;
      } else {
        newPath = `${importPath}.js`;
      }
    }
    return `${type}${prefix}"${newPath}"`;
  });

  fs.writeFileSync(file, content, 'utf-8');
}
console.log('ESM imports fixed in dist/backend/');
