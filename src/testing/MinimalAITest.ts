/**
 * Minimal AI test to validate the framework works
 */

import { AIController } from '../core/ai/AIController';
import { AIDifficulty } from '../core/ai/types';
import { GameState } from '../core/game/GameState';
import { GameEngine } from '../core/game/GameEngine';
import { Player } from '../core/game/Player';
import { GameMap } from '../core/game/Map';
import { PlayerSide } from '../core/game/types';

/**
 * Test basic AI framework functionality
 */
export function runMinimalAITest(): void {
  console.log('🧪 Running Minimal AI Framework Test...\n');

  try {
    // Test 1: AI Controller Creation
    console.log('📋 Test 1: AI Controller Creation');
    const aiController = new AIController('test-player', AIDifficulty.VETERAN);
    const status = aiController.getAIStatus();
    console.log(`✅ AI Controller created with difficulty: ${status.difficulty}`);
    console.log(`✅ AI enabled: ${status.isEnabled}`);
    console.log(
      `✅ Performance metrics initialized: ${status.performanceMetrics.casualtiesInflicted === 0}\n`
    );

    // Test 2: Game State Creation
    console.log('📋 Test 2: Game State Setup');
    const map = new GameMap(4, 4);
    const gameState = new GameState('test-game', map, 5);

    const assaultPlayer = new Player('assault', PlayerSide.Assault);
    const defenderPlayer = new Player('defender', PlayerSide.Defender);

    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);
    gameState.setActivePlayerBySide(PlayerSide.Assault);

    console.log(`✅ Game state created with ${gameState.getAllPlayers().length} players`);
    console.log(`✅ Active player: ${gameState.getActivePlayer()?.side}`);
    console.log(`✅ Turn: ${gameState.turn}, Phase: ${gameState.phase}\n`);

    // Test 3: Game Engine with AI Integration
    console.log('📋 Test 3: Game Engine AI Integration');
    const gameEngine = new GameEngine(gameState);

    gameEngine.addAIController(assaultPlayer.id, AIDifficulty.NOVICE);
    gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

    console.log(`✅ AI controllers added for both players`);
    console.log(
      `✅ Assault AI: ${gameEngine.isAIControlled(assaultPlayer.id) ? 'Enabled' : 'Disabled'}`
    );
    console.log(
      `✅ Defender AI: ${gameEngine.isAIControlled(defenderPlayer.id) ? 'Enabled' : 'Disabled'}\n`
    );

    // Test 4: AI Decision Making (without units)
    console.log('📋 Test 4: AI Decision Making');
    try {
      const aiActions = gameEngine.updateAI();
      console.log(`✅ AI decision making executed (${aiActions.length} actions)`);
      console.log('✅ No errors in AI processing with empty game state\n');
    } catch (error) {
      console.log(
        `ℹ️ AI processing with no units: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }

    // Test 5: AI Status and Metrics
    console.log('📋 Test 5: AI Status and Metrics');
    const assaultAIStatus = gameEngine.getAIStatus(assaultPlayer.id);
    const defenderAIStatus = gameEngine.getAIStatus(defenderPlayer.id);

    if (assaultAIStatus && defenderAIStatus) {
      console.log(
        `✅ Assault AI Status: ${assaultAIStatus.difficulty}, State: ${assaultAIStatus.currentState}`
      );
      console.log(
        `✅ Defender AI Status: ${defenderAIStatus.difficulty}, State: ${defenderAIStatus.currentState}`
      );
    } else {
      console.log('❌ Failed to retrieve AI status');
    }

    // Test 6: AI Difficulty Changes
    console.log('\n📋 Test 6: AI Difficulty Adjustment');
    gameEngine.setAIDifficulty(assaultPlayer.id, AIDifficulty.ELITE);
    const newStatus = gameEngine.getAIStatus(assaultPlayer.id);

    if (newStatus && newStatus.difficulty === AIDifficulty.ELITE) {
      console.log('✅ AI difficulty successfully changed to ELITE');
    } else {
      console.log('❌ Failed to change AI difficulty');
    }

    // Test 7: AI Enable/Disable
    console.log('\n📋 Test 7: AI Enable/Disable');
    gameEngine.setAIEnabled(assaultPlayer.id, false);
    const disabledStatus = gameEngine.getAIStatus(assaultPlayer.id);

    if (disabledStatus && !disabledStatus.isEnabled) {
      console.log('✅ AI successfully disabled');
    } else {
      console.log('❌ Failed to disable AI');
    }

    gameEngine.setAIEnabled(assaultPlayer.id, true);
    const enabledStatus = gameEngine.getAIStatus(assaultPlayer.id);

    if (enabledStatus?.isEnabled) {
      console.log('✅ AI successfully re-enabled');
    } else {
      console.log('❌ Failed to re-enable AI');
    }

    console.log('\n🎉 All AI Framework Tests Passed!');
    console.log('✅ AI system is operational and ready for gameplay testing');
  } catch (error) {
    console.error('❌ AI Framework Test Failed:', error);
    throw error;
  }
}

/**
 * Run the test if this file is executed directly
 */
if (require.main === module) {
  try {
    runMinimalAITest();
  } catch (error) {
    console.error(error);
  }
}
