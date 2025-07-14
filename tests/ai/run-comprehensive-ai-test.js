#!/usr/bin/env node

/**
 * Direct runner for comprehensive AI test
 */

const { ComprehensiveAITest } = require('../../dist/testing/ComprehensiveAITest');

console.log('🤖 USS Wasp Comprehensive AI Test');
console.log('==================================\n');

const testSuite = new ComprehensiveAITest();

testSuite.runAllTests()
  .then((results) => {
    console.log('\n✅ All tests completed');
    
    const passedTests = results.filter(r => r.success).length;
    const totalTests = results.length;
    
    if (passedTests === totalTests) {
      console.log('🎉 All tests passed!');
      process.exit(0);
    } else {
      console.log(`⚠️ ${totalTests - passedTests} test(s) failed`);
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });