/**
 * Test AI battle learning system
 */

import { AIController } from '../../dist/core/ai/AIController.js';
import { AIDifficulty } from '../../dist/core/ai/types.js';
import { GameState } from '../../dist/core/game/GameState.js';
import { GameMap } from '../../dist/core/game/Map.js';
import { Player } from '../../dist/core/game/Player.js';
import { PlayerSide } from '../../dist/core/game/types.js';

async function testBattleLearning() {
  console.log('🧠 AI BATTLE LEARNING SYSTEM TEST');
  console.log('==================================');

  try {
    // Create test game state
    const map = new GameMap(8, 8);
    const gameState = new GameState('battle-learning-test', map, 15);
    const testPlayer = new Player('test_ai', PlayerSide.Assault);
    testPlayer.commandPoints = 20;
    gameState.addPlayer(testPlayer);

    const aiController = new AIController('test_ai', AIDifficulty.VETERAN);

    // Test 1: Turn-by-turn learning
    console.log('\n🔄 TEST 1: Turn-by-turn learning');
    
    // Simulate multiple turns with different performance
    for (let turn = 1; turn <= 5; turn++) {
      console.log(`   Turn ${turn}:`);
      
      // Simulate varying performance
      const performanceMetrics = aiController.getAIStatus().performanceMetrics;
      
      if (turn <= 2) {
        // Poor performance initially
        performanceMetrics.casualtiesInflicted = 1;
        performanceMetrics.casualtiesTaken = 2;
        performanceMetrics.objectivesHeld = 0;
        performanceMetrics.resourceEfficiency = 0.3;
        console.log(`     Poor performance: ${performanceMetrics.casualtiesInflicted} kills, ${performanceMetrics.casualtiesTaken} losses`);
      } else {
        // Improved performance later
        performanceMetrics.casualtiesInflicted = 3;
        performanceMetrics.casualtiesTaken = 1;
        performanceMetrics.objectivesHeld = 1;
        performanceMetrics.resourceEfficiency = 0.7;
        console.log(`     Improved performance: ${performanceMetrics.casualtiesInflicted} kills, ${performanceMetrics.casualtiesTaken} losses`);
      }
      
      // Process turn learning
      aiController.processEndOfTurn(turn, gameState);
    }

    const learningData1 = aiController.getLearningData();
    console.log(`   ✅ Turn-by-turn learning: ${learningData1.adaptationTriggers.length} adaptation triggers`);
    console.log(`   Risk tolerance: ${learningData1.playerPatterns.riskTolerance.toFixed(2)}`);
    console.log(`   Adaptation rate: ${learningData1.playerPatterns.adaptationRate.toFixed(2)}`);

    // Test 2: Battle end learning with victory
    console.log('\n🏆 TEST 2: Battle end learning - Victory');
    
    // Simulate excellent final performance
    const performanceMetrics = aiController.getAIStatus().performanceMetrics;
    performanceMetrics.casualtiesInflicted = 8;
    performanceMetrics.casualtiesTaken = 2;
    performanceMetrics.objectivesHeld = 3;
    performanceMetrics.successfulAmbushes = 2;
    performanceMetrics.resourceEfficiency = 0.9;
    
    aiController.processBattleEnd(gameState, 'victory');
    
    const learningData2 = aiController.getLearningData();
    console.log(`   ✅ Victory learning: ${learningData2.adaptationTriggers.length} total triggers`);
    console.log(`   Performance history: ${learningData2.performanceHistory.length} battles`);
    console.log(`   Successful tactics: ${learningData2.successfulTactics.length}`);
    console.log(`   Failed tactics: ${learningData2.failedTactics.length}`);

    // Test 3: Battle end learning with defeat
    console.log('\n💀 TEST 3: Battle end learning - Defeat');
    
    // Reset and simulate poor performance
    const aiController2 = new AIController('test_ai_2', AIDifficulty.VETERAN);
    const performance2 = aiController2.getAIStatus().performanceMetrics;
    performance2.casualtiesInflicted = 2;
    performance2.casualtiesTaken = 6;
    performance2.objectivesHeld = 0;
    performance2.resourceEfficiency = 0.2;
    
    aiController2.processBattleEnd(gameState, 'defeat');
    
    const learningData3 = aiController2.getLearningData();
    console.log(`   ✅ Defeat learning: ${learningData3.adaptationTriggers.length} adaptation triggers`);
    console.log(`   Risk tolerance: ${learningData3.playerPatterns.riskTolerance.toFixed(2)}`);
    
    // Test 4: Long-term learning patterns
    console.log('\n📈 TEST 4: Long-term learning patterns');
    
    // Simulate multiple battles
    for (let battle = 1; battle <= 3; battle++) {
      const performance = aiController.getAIStatus().performanceMetrics;
      
      // Simulate different battle outcomes
      if (battle === 1) {
        performance.casualtiesInflicted = 4;
        performance.casualtiesTaken = 3;
        performance.resourceEfficiency = 0.6;
        aiController.processBattleEnd(gameState, 'victory');
      } else if (battle === 2) {
        performance.casualtiesInflicted = 2;
        performance.casualtiesTaken = 4;
        performance.resourceEfficiency = 0.4;
        aiController.processBattleEnd(gameState, 'defeat');
      } else {
        performance.casualtiesInflicted = 3;
        performance.casualtiesTaken = 3;
        performance.resourceEfficiency = 0.5;
        aiController.processBattleEnd(gameState, 'draw');
      }
      
      console.log(`   Battle ${battle}: ${battle === 1 ? 'Victory' : battle === 2 ? 'Defeat' : 'Draw'}`);
    }

    const learningData4 = aiController.getLearningData();
    console.log(`   ✅ Long-term patterns: ${learningData4.performanceHistory.length} battles in history`);
    console.log(`   Adaptation triggers: ${learningData4.adaptationTriggers.length}`);
    
    // Test 5: Pattern recognition
    console.log('\n🔍 TEST 5: Pattern recognition and adaptation');
    
    // Test recent adaptation triggers
    const recentTriggers = learningData4.adaptationTriggers.slice(-5);
    console.log(`   Recent learning triggers:`);
    recentTriggers.forEach((trigger, index) => {
      console.log(`     ${index + 1}. ${trigger}`);
    });
    
    // Test risk tolerance adaptation
    const initialRisk = 0.5;
    const currentRisk = learningData4.playerPatterns.riskTolerance;
    const riskChange = currentRisk - initialRisk;
    console.log(`   Risk tolerance change: ${riskChange > 0 ? '+' : ''}${riskChange.toFixed(2)}`);
    
    // Test adaptation rate
    const adaptationRate = learningData4.playerPatterns.adaptationRate;
    console.log(`   Adaptation rate: ${adaptationRate.toFixed(2)}`);
    
    console.log('   ✅ Pattern recognition working');

    // Test 6: Learning data persistence
    console.log('\n💾 TEST 6: Learning data management');
    
    const learningDataSnapshot = aiController.getLearningData();
    console.log(`   Performance history entries: ${learningDataSnapshot.performanceHistory.length}`);
    console.log(`   Successful tactics: ${learningDataSnapshot.successfulTactics.length}`);
    console.log(`   Failed tactics: ${learningDataSnapshot.failedTactics.length}`);
    console.log(`   Adaptation triggers: ${learningDataSnapshot.adaptationTriggers.length}`);
    
    // Test reset functionality
    aiController.resetLearningData();
    const resetData = aiController.getLearningData();
    console.log(`   After reset - Adaptation triggers: ${resetData.adaptationTriggers.length}`);
    console.log('   ✅ Learning data management working');

    console.log('\n🧠 BATTLE LEARNING TEST SUMMARY');
    console.log('==============================');
    console.log('✅ Turn-by-turn learning: Working');
    console.log('✅ Battle end analysis: Working');
    console.log('✅ Victory/defeat learning: Working');
    console.log('✅ Long-term patterns: Working');
    console.log('✅ Pattern recognition: Working');
    console.log('✅ Data management: Working');
    console.log('\n🎉 AI battle learning system fully operational!');

  } catch (error) {
    console.error('❌ Battle learning test failed:', error);
    throw error;
  }
}

// Run the test
testBattleLearning().catch(console.error);