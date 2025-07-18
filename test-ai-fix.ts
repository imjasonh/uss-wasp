import { PersonalityMatchupTester } from './tests/ai/test-personality-matchups';
import { AIPersonalityType } from './src/core/ai/types';

async function testAIFix() {
  console.log('🔧 TESTING AI FIX: Running sample personality battles...\n');
  
  const tester = new PersonalityMatchupTester();
  
  // Test 3 different personality combinations (1 game each)
  const testCases = [
    [AIPersonalityType.BERSERKER, AIPersonalityType.CONSERVATIVE],
    [AIPersonalityType.STRATEGIST, AIPersonalityType.BERSERKER],
    [AIPersonalityType.BALANCED, AIPersonalityType.ADAPTIVE]
  ];
  
  for (const [attacker, defender] of testCases) {
    console.log(`🎯 Testing ${attacker.toUpperCase()} vs ${defender.toUpperCase()}`);
    
    try {
      const result = await (tester as any).runSingleBattle(attacker, defender);
      
      console.log(`  Winner: ${result.winner}`);
      console.log(`  Turns: ${result.turnCount}`);
      console.log(`  Combat Actions: ${result.combatActions}`);
      console.log(`  Special Actions: ${result.specialActions}`);
      console.log(`  Objective Actions: ${result.objectiveActions}`);
      console.log(`  Errors: ${result.errors.length}`);
      
      if (result.combatActions === 0 && result.specialActions === 0) {
        console.log('  ❌ STILL BROKEN - No actions generated!');
      } else {
        console.log('  ✅ FIXED - AI generating actions!');
      }
      
    } catch (error) {
      console.error(`  ❌ Test failed: ${error}`);
    }
    
    console.log('');
  }
  
  console.log('🔧 AI Fix Test Complete!');
}

testAIFix().catch(console.error);