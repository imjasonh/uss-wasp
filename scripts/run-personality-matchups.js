#!/usr/bin/env node

/**
 * USS Wasp AI Personality Matchup Test
 * 
 * Consolidated test that runs comprehensive personality vs personality battles,
 * analyzes AI performance, and updates personality documentation.
 */

const { spawn } = require('child_process');
const path = require('path');

async function runPersonalityMatchups() {
  console.log('🤖 USS Wasp AI Personality Matchup Analysis');
  console.log('==========================================');
  console.log('Running comprehensive personality battles...\n');

  // Run the comprehensive personality analysis
  const testProcess = spawn('node', ['./tests/ai/comprehensive-personality-analysis.js'], {
    stdio: 'inherit',
    shell: true,
    cwd: path.join(__dirname, '..')
  });

  return new Promise((resolve, reject) => {
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Personality matchup analysis complete!');
        console.log('📊 Results saved to tests/ai/results/');
        updatePersonalityDocumentation();
        resolve();
      } else {
        console.error(`❌ Personality matchup test failed with code ${code}`);
        reject(new Error(`Test failed with code ${code}`));
      }
    });

    testProcess.on('error', (error) => {
      console.error('❌ Failed to run personality matchup test:', error);
      reject(error);
    });
  });
}

function updatePersonalityDocumentation() {
  console.log('\n📝 Updating personality documentation...');
  
  try {
    // Run the enhanced personality documentation generator
    const docProcess = spawn('node', ['./scripts/generate-enhanced-personality-docs.js'], {
      stdio: 'inherit',
      shell: true,
      cwd: path.join(__dirname, '..')
    });

    docProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Enhanced personality documentation generated successfully!');
      } else {
        console.error('❌ Failed to generate enhanced personality documentation');
      }
    });

    docProcess.on('error', (error) => {
      console.error('❌ Error running documentation generator:', error.message);
    });

  } catch (error) {
    console.error('❌ Failed to update documentation:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  runPersonalityMatchups().catch(console.error);
}

module.exports = { runPersonalityMatchups };
