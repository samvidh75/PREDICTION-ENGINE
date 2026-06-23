export {};
const PROD_URL = 'https://www.stockstory-india.com';

async function checkUrl(path: string, expectSvg = false): Promise<boolean> {
  try {
    const url = `${PROD_URL}${path}`;
    const response = await fetch(url, { method: 'HEAD' });
    const passed = response.status === 200;
    console.log(`  ${response.status} ${path}${passed ? ' ✓' : ' ✗'}`);
    return passed;
  } catch {
    console.log(`  FAIL ${path} (unreachable)`);
    return false;
  }
}

async function checkSvgContent(): Promise<boolean> {
  try {
    const response = await fetch(`${PROD_URL}/stockstory-mark.svg`);
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const isSvg = text.trim().startsWith('<svg');
    const notHtml = !text.includes('<html');
    const correctType = contentType.includes('image/svg+xml');
    console.log(`  Content-Type: ${contentType}${correctType ? ' ✓' : ' ✗'}`);
    console.log(`  Body starts with <svg: ${isSvg}${isSvg ? ' ✓' : ' ✗'}`);
    console.log(`  No HTML wrapper: ${notHtml}${notHtml ? ' ✓' : ' ✗'}`);
    return isSvg && notHtml;
  } catch {
    console.log('  FAIL (unreachable)');
    return false;
  }
}

async function main(): Promise<void> {
  const isProduction = process.argv.includes('--production');

  console.log('Static Asset Smoke Test');
  console.log('──────────────────────────────────────');

  if (isProduction) {
    console.log('Mode: production');
    console.log(`Base: ${PROD_URL}\n`);

    const results = await Promise.all([
      checkUrl('/stockstory-mark.svg'),
      checkUrl('/favicon.ico'),
      checkUrl('/'),
    ]);

    const allOk = results.every(Boolean);
    if (!allOk) {
      console.log('\nSome checks failed.');
      process.exit(1);
    }

    console.log('\nContent check for stockstory-mark.svg:');
    const contentOk = await checkSvgContent();
    if (!contentOk) {
      console.log('\nSVG content check failed.');
      process.exit(1);
    }

    console.log('\nAll static asset checks passed.');
  } else {
    console.log('Mode: local build check');
    console.log('Checking build output...\n');

    const fs = await import('node:fs');
    const path = await import('node:path');
    const distDir = path.resolve('dist');

    if (!fs.existsSync(distDir)) {
      console.log('  dist/ directory not found. Run npm run build:frontend first.');
      process.exit(0);
    }

    const svgPath = path.join(distDir, 'stockstory-mark.svg');
    if (fs.existsSync(svgPath)) {
      const content = fs.readFileSync(svgPath, 'utf-8');
      const isSvg = content.trim().startsWith('<svg');
      console.log(`  dist/stockstory-mark.svg: exists ${isSvg ? '✓' : '✗ (not SVG)'}`);
    } else {
      console.log('  dist/stockstory-mark.svg: NOT FOUND');
    }

    const indexHtml = path.join(distDir, 'index.html');
    if (fs.existsSync(indexHtml)) {
      const content = fs.readFileSync(indexHtml, 'utf-8');
      const hasFavicon = content.includes('stockstory-mark.svg') || content.includes('favicon.svg');
      console.log(`  dist/index.html favicon link: ${hasFavicon ? '✓' : '✗'}`);
    }

    console.log('\nLocal build check complete.');
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
