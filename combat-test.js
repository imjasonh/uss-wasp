#!/usr/bin/env node

/**
 * COMBAT-FOCUSED AI TEST
 * Focus on getting units close enough to actually fight
 */

const { GameEngine } = require('./dist/core/game/GameEngine.js');
const { GameState } = require('./dist/core/game/GameState.js');
const { GameMap } = require('./dist/core/game/Map.js');
const { Player } = require('./dist/core/game/Player.js');
const { createTestUnits } = require('./dist/testing/UnitTestHelper.js');
const { PlayerSide, UnitType } = require('./dist/core/game/types.js');
const { AIDifficulty } = require('./dist/core/ai/types.js');
const { Hex } = require('./dist/core/hex/Hex.js');

function createSimpleCombatTest() {
  console.log('🥊 COMBAT-FOCUSED AI TEST');
  console.log('===========================');
  console.log('Goal: Get units close enough to actually fight!\n');

  // Create a very simple 4x4 map to eliminate pathfinding issues
  const map = new GameMap(4, 4);
  const gameState = new GameState('combat-test', map, 10);
  
  // Create players
  const assaultPlayer = new Player('assault', PlayerSide.Assault);
  const defenderPlayer = new Player('defender', PlayerSide.Defender);
  
  gameState.addPlayer(assaultPlayer);
  gameState.addPlayer(defenderPlayer);
  gameState.setActivePlayerBySide(PlayerSide.Assault);
  
  // Add 1 unit per side, positioned close to each other
  const assaultUnits = createTestUnits([
    { id: 'marines', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) }
  ]);
  
  const defenderUnits = createTestUnits([
    { id: 'infantry', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(2, 1) }
  ]);
  
  assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
  defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
  
  const marines = assaultUnits[0];
  const infantry = defenderUnits[0];
  
  console.log(`Initial Setup:`);
  console.log(`  Marines at (1,1) - HP: ${marines.state.currentHP}/${marines.stats.hp}`);
  console.log(`  Infantry at (2,1) - HP: ${infantry.state.currentHP}/${infantry.stats.hp}`);
  console.log(`  Distance: ${calculateDistance(marines.state.position, infantry.state.position)} hexes\n`);
  
  // Create game engine and add AI
  const gameEngine = new GameEngine(gameState);
  gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
  gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);
  
  console.log('🎯 COMBAT TEST RUNNING...\n');
  
  // Run turns until combat happens or timeout
  for (let turn = 1; turn <= 5; turn++) {
    console.log(`--- Turn ${turn} ---`);
    
    // Check positions before turn
    const assaultUnits = Array.from(assaultPlayer.units.values());
    const defenderUnits = Array.from(defenderPlayer.units.values());
    
    if (assaultUnits.length === 0 || defenderUnits.length === 0) {
      console.log('🏆 COMBAT OCCURRED! One side was eliminated!');
      break;
    }
    
    const currentDistance = calculateDistance(
      assaultUnits[0].state.position, 
      defenderUnits[0].state.position
    );
    
    console.log(`Distance: ${currentDistance} hexes`);
    console.log(`Marines HP: ${assaultUnits[0].state.currentHP}/${assaultUnits[0].stats.hp}`);
    console.log(`Infantry HP: ${defenderUnits[0].state.currentHP}/${defenderUnits[0].stats.hp}`);
    
    // Check if units can attack each other
    if (currentDistance <= 2) {
      console.log('🔥 UNITS IN COMBAT RANGE!');
    }
    
    // Process turn phases properly with state reset
    // Assault phase
    gameState.setActivePlayerBySide(PlayerSide.Assault);
    
    // Movement phase
    gameState.nextPhase(); // Sets to movement phase and resets states
    const assaultMovement = gameEngine.updateAI();
    
    // Action phase  
    gameState.nextPhase(); // Sets to action phase
    const assaultActions = gameEngine.updateAI();
    
    // End assault turn
    gameState.nextPhase(); // Sets to end phase
    
    // Defender phase
    gameState.setActivePlayerBySide(PlayerSide.Defender);
    
    // Movement phase
    gameState.nextPhase(); // Sets to movement phase
    const defenderMovement = gameEngine.updateAI();
    
    // Action phase
    gameState.nextPhase(); // Sets to action phase  
    const defenderActions = gameEngine.updateAI();
    
    // End defender turn and advance to next turn
    gameState.nextPhase(); // Sets to end phase
    gameState.nextPhase(); // Advances to next turn and resets all unit states
    
    const turnAssaultActions = assaultMovement.length + assaultActions.length;
    const turnDefenderActions = defenderMovement.length + defenderActions.length;
    
    console.log(`  AI Actions: Assault ${turnAssaultActions}, Defender ${turnDefenderActions}`);
    console.log('Turn completed\n');
  }
  
  // Final results - count only living units
  const finalAssault = Array.from(assaultPlayer.units.values()).filter(u => u.isAlive());
  const finalDefender = Array.from(defenderPlayer.units.values()).filter(u => u.isAlive());
  
  console.log('🏁 FINAL RESULTS:');
  console.log(`  Assault survivors: ${finalAssault.length}`);
  console.log(`  Defender survivors: ${finalDefender.length}`);
  
  if (finalAssault.length === 0) {
    console.log('🏆 DEFENDER VICTORY!');
    return 'defender';
  } else if (finalDefender.length === 0) {
    console.log('🏆 ASSAULT VICTORY!');
    return 'assault';
  } else {
    console.log('⚖️ DRAW - No combat occurred');
    return 'draw';
  }
}

function calculateDistance(pos1, pos2) {
  return Math.max(
    Math.abs(pos1.q - pos2.q),
    Math.abs(pos1.r - pos2.r),
    Math.abs(pos1.s - pos2.s)
  ) / 2;
}

// Run the test
try {
  createSimpleCombatTest();
} catch (error) {
  console.error('❌ Test failed:', error.message);
}