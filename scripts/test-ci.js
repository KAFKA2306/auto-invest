// Minimal test script for CI debugging
console.log('=== CI Test Script Starting ===');
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Working directory:', process.cwd());
console.log('Environment:');
console.log('- CI:', process.env.CI);
console.log('- NODE_ENV:', process.env.NODE_ENV);

try {
  console.log('\n=== Testing Basic Imports ===');

  // Test basic Node modules
  const fs = await import('fs/promises');
  console.log('✅ fs/promises module');

  const path = await import('path');
  console.log('✅ path module');

  // Test external packages
  console.log('\n=== Testing External Packages ===');
  const { JSDOM } = await import('jsdom');
  console.log('✅ jsdom import');

  const dom = new JSDOM('<div>test</div>');
  const testElement = dom.window.document.querySelector('div');
  if (testElement?.textContent === 'test') {
    console.log('✅ jsdom functionality');
  } else {
    throw new Error('JSDOM test failed');
  }

  // Test fetch
  console.log('\n=== Testing Fetch ===');
  const response = await fetch('https://httpbin.org/json');
  if (response.ok) {
    console.log('✅ fetch functionality');
  } else {
    throw new Error(`Fetch failed with status: ${response.status}`);
  }

  // Test our modules
  console.log('\n=== Testing Our Modules ===');
  const { CONFIG } = await import('./scraper-config.js');
  console.log('✅ CONFIG loaded');

  const { ScraperUtils } = await import('./scraper-utils.js');
  console.log('✅ ScraperUtils loaded');

  // Test basic directory operations
  console.log('\n=== Testing File System ===');
  const outputDir = CONFIG.paths.output;
  console.log('Output directory path:', outputDir);

  await fs.mkdir(outputDir, { recursive: true });
  console.log('✅ Directory creation');

  const testData = { test: 'data', timestamp: new Date().toISOString() };
  await fs.writeFile(`${outputDir}/test.json`, JSON.stringify(testData, null, 2));
  console.log('✅ File write');

  const readData = JSON.parse(await fs.readFile(`${outputDir}/test.json`, 'utf8'));
  if (readData.test === 'data') {
    console.log('✅ File read');
  } else {
    throw new Error('File read test failed');
  }

  console.log('\n=== All Tests Passed ===');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Test failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}