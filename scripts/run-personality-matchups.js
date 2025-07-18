#!/usr/bin/env node

/**
 * Script to run AI personality matchup testing
 */

const { PersonalityMatchupTester } = require('../dist/tests/ai/test-personality-matchups');

async function runPersonalityMatchups() {
  console.log('Starting AI Personality Matchup Testing...\n');
  
  const tester = new PersonalityMatchupTester();
  
  try {
    const startTime = Date.now();
    const analysis = await tester.runPersonalityMatchups();
    const endTime = Date.now();
    
    console.log('\n🎉 PERSONALITY MATCHUP TESTING COMPLETE!');
    console.log('=========================================');
    console.log(`Total Time: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    console.log(`Total Battles: ${analysis.totalBattles}`);
    console.log(`Bugs Discovered: ${analysis.discoveredBugs.length}`);
    console.log('\nTop 3 Overall Personalities:');
    analysis.personalityRankings.overallRankings.slice(0, 3).forEach((rank, i) => {
      console.log(`${i + 1}. ${rank.personality.toUpperCase()}: ${rank.combinedWinRate.toFixed(1)}% win rate`);
    });
    
    console.log('\nResults saved to:');
    console.log('- tests/ai/results/personality-matchup-results.json');
    console.log('- tests/ai/results/personality-matchup-summary.txt');
    
    if (analysis.discoveredBugs.length > 0) {
      console.log('\n⚠️  BUGS DISCOVERED:');
      analysis.discoveredBugs.slice(0, 5).forEach((bug, i) => {
        console.log(`${i + 1}. ${bug}`);
      });
      if (analysis.discoveredBugs.length > 5) {
        console.log(`... and ${analysis.discoveredBugs.length - 5} more (see full report)`);
      }
    }
    
  } catch (error) {
    console.error('❌ Personality matchup testing failed:', error);
    process.exit(1);
  }
}

// Run the tests
runPersonalityMatchups().catch(console.error);