import { PersonalityMatchupTester } from './tests/ai/test-personality-matchups';
import { AIPersonalityType } from './src/core/ai/types';

async function quickDebugTest() {
  console.log('🔍 DEBUG: Testing single personality battle to diagnose AI issues...\n');
  
  const tester = new PersonalityMatchupTester();
  
  // Run just one battle between two personalities to see what happens
  try {
    // Call the private method through any type to access it for debugging
    const result = await (tester as any).runSingleBattle(AIPersonalityType.BERSERKER, AIPersonalityType.BERSERKER);
    
    console.log('\n🔍 DEBUG: Battle result:', {
      winner: result.winner,
      turnCount: result.turnCount,
      combatActions: result.combatActions,
      specialActions: result.specialActions,
      objectiveActions: result.objectiveActions,
      errors: result.errors
    });
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

quickDebugTest().catch(console.error);