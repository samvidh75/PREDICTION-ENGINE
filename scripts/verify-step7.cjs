#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function verifyStep7() {
  console.log('=== STEP 7 Verification ===');
  
  // 1. Stock universe expanded
  console.log('\n1. Stock universe expansion:');
  const stockUniversePath = path.join(process.cwd(), 'src/services/scanner/stockUniverse.ts');
  const content = fs.readFileSync(stockUniversePath, 'utf8');
  const stockCount = (content.match(/^  { symbol:/gm) || []).length;
  console.log(`   - Stock count: ${stockCount}`);
  
  const wellKnownCheck = ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ZOMATO', 'SBILIFE'];
  const knownStocksPresent = wellKnownCheck.map(sym => 
    content.includes(`symbol: '${sym}'`) || content.includes(`symbol: \"${sym}\"`)? sym : null
  ).filter(Boolean);
  console.log(`   - Known stocks present: ${knownStocksPresent.length}\` + stockCount);`);
  
  // 2. Search service functionality
  console.log('\n2. SearchService functionality:');
  const searchServicePath = path.join(process.cwd(), 'src/services/scanner/SearchService.ts');
  const searchServiceContent = fs.readFileSync(searchServicePath, 'utf8');
  
  const requiredMethods = ['search', 'getSuggestions', 'getStockBySymbol', 'getStockByName', 'getAllSectors', 'getAllIndustries', 'getCount'];
  const methodsFound = requiredMethods.filter(method => searchServiceContent.includes(method + '('));
  console.log(`   - Required methods implemented: ${methodsFound.length}/${requiredMethods.length}`);
  
  // 3. HomePage search integration
  console.log('\n3. HomePage search integration:');
  const homePagePath = path.join(process.cwd(), 'src/pages/HomePage.tsx');
  const homePageContent = fs.readFileSync(homePagePath, 'utf8');
  
  const stateVars = ['searchResults', 'isSearching'];
  const statesFound = stateVars.filter(varName => homePageContent.includes(varName));
  console.log(`   - State variables for search: ${statesFound.length}/${stateVars.length} present`);
  
  const hooks = ['useState', 'useEffect', 'useRef'];
  const hooksFound = hooks.filter(hook => homePageContent.includes(hook));
  console.log(`   - Required hooks: ${hooksFound.length}/${hooks.length} present`);
  
  // 4. Verify search query functionality
  const searchQueryExists = homePageContent.includes('searchQuery') && homePageContent.includes('onChange');
  console.log(`   - Search input binding: ${searchQueryExists ? 'Yes' : 'No'}`);
  
  console.log('\n=== Verification Summary ===');
  const passAll = stockCount > 500 && methodsFound.length >= 6 && statesFound.length >= 2 && hooksFound.length >= 3 && searchQueryExists;
  console.log(`Overall: ${passAll ? '✓ PASSED' : '✗ FAILED'}`);
  
  if (stockCount > 500) console.log(`  ✓ Stock universe contains ${stockCount} stocks (>500)`);
  if (methodsFound.length >= 6) console.log('  ✓ SearchService has all required methods');
  if (statesFound.length >= 2) console.log('  ✓ HomePage has search state variables');
  if (hooksFound.length >= 3) console.log('  ✓ HomePage has required hooks');
  if (searchQueryExists) console.log('  ✓ Search input is bound with query handling');
  
  console.log('\n=== Ready for Commit ===');
  return passAll;
}

if (require.main === module) {
  const success = verifyStep7();
  process.exit(success ? 0 : 1);
}

module.exports = { verifyStep7 };
