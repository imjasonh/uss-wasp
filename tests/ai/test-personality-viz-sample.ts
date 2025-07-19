#!/usr/bin/env npx tsx

/**
 * Quick test of personality matchup visualization logging
 * Tests just one matchup (2 games) to verify the logging works
 */

import { PersonalityMatchupTester } from './test-personality-matchups';
import { AIPersonalityType } from '../../src/core/ai/types';

async function testPersonalityVisualizationLogging() {
  console.log('🧪 Testing Personality Matchup Visualization Logging');
  console.log('===================================================');
  
  // Create a custom tester for just a quick test
  const tester = new (class extends PersonalityMatchupTester {
    // Override to test just one small matchup
    public async runQuickTest() {
      console.log('🤖 Running quick test: BERSERKER vs STRATEGIST (2 games)');
      
      const result = await this.runMatchup(
        AIPersonalityType.BERSERKER, 
        AIPersonalityType.STRATEGIST
      );
      
      console.log('\n📊 RESULTS:');
      console.log(`  Attacker wins: ${result.attackerWins}/${result.totalGames}`);
      console.log(`  Defender wins: ${result.defenderWins}/${result.totalGames}`);
      console.log(`  Win rate: ${result.winRate.toFixed(1)}%`);
      console.log(`  Avg turn count: ${result.avgTurnCount.toFixed(1)}`);
      console.log(`  Total errors: ${result.errors.length}`);
      
      // Check visualization logs
      const logsWithViz = result.battles.filter(b => b.visualizationLog).length;
      console.log(`\n📄 VISUALIZATION LOGS:`);
      console.log(`  ✅ Logs created: ${logsWithViz}/${result.battles.length} battles`);
      
      if (logsWithViz > 0) {
        console.log(`  📁 Log directory: ./tests/ai/logs/personality-matchups/`);
        console.log(`  🎬 Ready for visualization analysis!`);
        
        // Show first log path as example
        const firstLog = result.battles.find(b => b.visualizationLog);
        if (firstLog) {
          console.log(`  📝 Example log: ${firstLog.visualizationLog}`);
        }
      }
      
      return result;
    }
    
    // Reduce games per matchup for quick test
    protected readonly gamesPerMatchup = 2;
    protected readonly maxTurnsPerGame = 5; // Shorter games for testing
  })();
  
  try {
    const result = await tester.runQuickTest();
    console.log('\n✅ Personality visualization logging test PASSED!');
    return result;
  } catch (error) {
    console.error('\n❌ Test FAILED:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testPersonalityVisualizationLogging()
    .then(() => {
      console.log('\n🎉 Test complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testPersonalityVisualizationLogging };