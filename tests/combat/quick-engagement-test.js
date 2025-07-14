#!/usr/bin/env node

/**
 * QUICK ENGAGEMENT TEST
 * Test the improved positioning for immediate combat
 */

const { GameEngine } = require('../../dist/core/game/GameEngine.js');
const { GameState } = require('../../dist/core/game/GameState.js');
const { GameMap } = require('../../dist/core/game/Map.js');
const { Player } = require('../../dist/core/game/Player.js');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper.js');
const { PlayerSide, UnitType } = require('../../dist/core/game/types.js');
const { AIDifficulty } = require('../../dist/core/ai/types.js');
const { Hex } = require('../../dist/core/hex/Hex.js');

function quickEngagementTest() {
  console.log('⚡ QUICK ENGAGEMENT TEST');
  console.log('========================');
  console.log('Testing new positioning for immediate ground combat\n');

  // Create game setup
  const map = new GameMap(6, 6);
  const gameState = new GameState('quick-engagement', map, 10);
  
  const assaultPlayer = new Player('assault', PlayerSide.Assault);
  const defenderPlayer = new Player('defender', PlayerSide.Defender);
  
  gameState.addPlayer(assaultPlayer);
  gameState.addPlayer(defenderPlayer);
  gameState.setActivePlayerBySide(PlayerSide.Assault);
  
  // Simple ground forces positioned for adjacent combat (distance 1)
  const assaultUnits = createTestUnits([
    { id: 'marines1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 2) },
    { id: 'marines2', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 2) },
    { id: 'marsoc', type: UnitType.MARSOC, side: PlayerSide.Assault, position: new Hex(2, 3) },
    { id: 'aav', type: UnitType.AAV_7, side: PlayerSide.Assault, position: new Hex(1, 3) }
  ]);
  
  const defenderUnits = createTestUnits([
    { id: 'infantry1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 2) }, // Adjacent to marines1
    { id: 'infantry2', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(2, 1) }, // Adjacent to marines1  
    { id: 'atgm1', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(3, 3) }, // Adjacent to marsoc
    { id: 'mortar', type: UnitType.MORTAR_TEAM, side: PlayerSide.Defender, position: new Hex(4, 4) } // For long-range support
  ]);
  
  assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
  defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
  
  // Calculate all distances
  console.log('UNIT POSITIONS AND DISTANCES:');
  for (const assaultUnit of assaultUnits) {
    for (const defenderUnit of defenderUnits) {
      const distance = Math.max(
        Math.abs(assaultUnit.state.position.q - defenderUnit.state.position.q),
        Math.abs(assaultUnit.state.position.r - defenderUnit.state.position.r),
        Math.abs(assaultUnit.state.position.s - defenderUnit.state.position.s)
      ) / 2;
      console.log(`  ${assaultUnit.id} to ${defenderUnit.id}: ${distance} hexes`);
    }
  }
  
  // Create game engine and add AI
  const gameEngine = new GameEngine(gameState);
  gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
  gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);
  
  console.log('\n🎯 QUICK ENGAGEMENT RUNNING...\n');
  
  // Run 3 turns to see immediate results
  for (let turn = 1; turn <= 3; turn++) {
    console.log(`--- Turn ${turn} ---`);
    
    // Check if units still alive
    const assaultUnits = Array.from(assaultPlayer.units.values()).filter(u => u.isAlive());
    const defenderUnits = Array.from(defenderPlayer.units.values()).filter(u => u.isAlive());
    
    if (assaultUnits.length === 0) {
      console.log('🏆 DEFENDER VICTORY!');
      break;
    }
    if (defenderUnits.length === 0) {
      console.log('🏆 ASSAULT VICTORY!');
      break;
    }
    
    console.log(`Forces: Assault ${assaultUnits.length}, Defender ${defenderUnits.length}`);
    
    // Process both phases
    gameState.setActivePlayerBySide(PlayerSide.Assault);
    gameState.phase = 'action'; // Skip movement for faster engagement
    const assaultActions = gameEngine.updateAI();
    
    gameState.setActivePlayerBySide(PlayerSide.Defender);
    gameState.phase = 'action';
    const defenderActions = gameEngine.updateAI();
    
    console.log(`Actions: Assault ${assaultActions.length}, Defender ${defenderActions.length}`);
    
    // Check for damage
    let damageFound = false;
    for (const unit of [...assaultUnits, ...defenderUnits]) {
      if (unit.state.currentHP < unit.stats.hp) {
        damageFound = true;
        break;
      }
    }
    
    if (damageFound) {
      console.log('💥 COMBAT OCCURRED!');
    }
    
    console.log('');
  }
  
  console.log('🏁 Quick test completed!');
}

try {
  quickEngagementTest();
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
}