#!/usr/bin/env node

/**
 * Simple test runner for AI vs AI games
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🤖 USS Wasp AI Testing Framework');
console.log('==================================\n');

// Build the project first
console.log('📦 Building project...');
const buildProcess = spawn('npm', ['run', 'build'], { 
  stdio: 'inherit',
  cwd: __dirname 
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed!');
    process.exit(1);
  }
  
  console.log('✅ Build complete!\n');
  
  // Run the comprehensive AI test
  console.log('🎮 Running Comprehensive AI vs AI Test...\n');
  
  const testPath = path.join(__dirname, 'dist', 'testing', 'ComprehensiveAITest.js');
  const testProcess = spawn('node', [testPath], { 
    stdio: 'inherit',
    cwd: __dirname 
  });
  
  testProcess.on('close', (testCode) => {
    if (testCode === 0) {
      console.log('\n🎉 AI Test completed successfully!');
    } else {
      console.log('\n⚠️ AI Test finished with issues.');
    }
    process.exit(testCode);
  });
  
  testProcess.on('error', (error) => {
    console.error('❌ Failed to run test:', error.message);
    process.exit(1);
  });
});

buildProcess.on('error', (error) => {
  console.error('❌ Failed to build:', error.message);
  process.exit(1);
});