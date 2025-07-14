#!/usr/bin/env node

/**
 * MULTI-TURN COMBAT TEST
 * Test that units continue fighting across multiple turns
 */

const { GameEngine } = require('../../dist/core/game/GameEngine.js');
const { GameState } = require('../../dist/core/game/GameState.js');
const { GameMap } = require('../../dist/core/game/Map.js');
const { Player } = require('../../dist/core/game/Player.js');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper.js');
const { PlayerSide, UnitType } = require('../../dist/core/game/types.js');
const { AIDifficulty } = require('../../dist/core/ai/types.js');
const { Hex } = require('../../dist/core/hex/Hex.js');

function calculateDistance(pos1, pos2) {
  return Math.max(
    Math.abs(pos1.q - pos2.q),
    Math.abs(pos1.r - pos2.r),
    Math.abs(pos1.s - pos2.s)
  ) / 2;
}

function createHighHPUnits(unitConfigs) {
  const units = createTestUnits(unitConfigs);
  // Boost HP to ensure multi-turn combat
  units.forEach(unit => {
    unit.stats.hp = 10;
    unit.state.currentHP = 10;
  });
  return units;
}

function testMultiTurnCombat() {
  console.log('⚔️ MULTI-TURN COMBAT TEST');
  console.log('==========================');
  console.log('Goal: Test combat continuing across multiple turns\n');

  // Create game setup
  const map = new GameMap(4, 4);
  const gameState = new GameState('multi-turn-combat', map, 20);
  
  const assaultPlayer = new Player('assault', PlayerSide.Assault);
  const defenderPlayer = new Player('defender', PlayerSide.Defender);
  
  gameState.addPlayer(assaultPlayer);
  gameState.addPlayer(defenderPlayer);
  gameState.setActivePlayerBySide(PlayerSide.Assault);
  
  // Create high HP units for prolonged combat
  const assaultUnits = createHighHPUnits([
    { id: 'marines', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) }
  ]);
  
  const defenderUnits = createHighHPUnits([
    { id: 'infantry', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(2, 1) }
  ]);
  
  assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
  defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
  
  const marines = assaultUnits[0];
  const infantry = defenderUnits[0];
  
  console.log('Initial Setup:');
  console.log(`  Marines at (${marines.state.position.q},${marines.state.position.r}) - HP: ${marines.state.currentHP}/${marines.stats.hp}`);
  console.log(`  Infantry at (${infantry.state.position.q},${infantry.state.position.r}) - HP: ${infantry.state.currentHP}/${infantry.stats.hp}`);
  console.log(`  Distance: ${calculateDistance(marines.state.position, infantry.state.position)} hexes\n`);
  
  // Create game engine and add AI
  const gameEngine = new GameEngine(gameState);
  gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
  gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);
  
  console.log('🎯 MULTI-TURN COMBAT RUNNING...\n');
  
  let combatHappened = false;
  
  // Run turns until one side is eliminated or max turns
  for (let turn = 1; turn <= 10; turn++) {
    console.log(`--- Turn ${turn} ---`);
    
    // Check if units still alive
    const assaultUnits = Array.from(assaultPlayer.units.values()).filter(u => u.isAlive());
    const defenderUnits = Array.from(defenderPlayer.units.values()).filter(u => u.isAlive());
    
    if (assaultUnits.length === 0) {
      console.log('🏆 DEFENDER VICTORY! All assault units eliminated!');
      break;
    }
    if (defenderUnits.length === 0) {
      console.log('🏆 ASSAULT VICTORY! All defender units eliminated!');
      break;
    }
    
    const currentDistance = calculateDistance(
      assaultUnits[0].state.position, 
      defenderUnits[0].state.position
    );
    
    console.log(`Distance: ${currentDistance} hexes`);
    console.log(`Marines HP: ${assaultUnits[0].state.currentHP}/${assaultUnits[0].stats.hp} (hasActed: ${assaultUnits[0].state.hasActed})`);
    console.log(`Infantry HP: ${defenderUnits[0].state.currentHP}/${defenderUnits[0].stats.hp} (hasActed: ${defenderUnits[0].state.hasActed})`);
    
    // Check if units can attack each other
    if (currentDistance <= 2) {
      console.log('🔥 UNITS IN COMBAT RANGE!');
    }
    
    // Process turn phases properly with state reset
    // Assault phase
    gameState.setActivePlayerBySide(PlayerSide.Assault);
    
    // Movement phase
    gameState.nextPhase(); 
    const assaultMovement = gameEngine.updateAI();
    
    // Action phase  
    gameState.nextPhase(); 
    const assaultActions = gameEngine.updateAI();
    
    // End assault turn
    gameState.nextPhase(); 
    
    // Defender phase
    gameState.setActivePlayerBySide(PlayerSide.Defender);
    
    // Movement phase
    gameState.nextPhase(); 
    const defenderMovement = gameEngine.updateAI();
    
    // Action phase
    gameState.nextPhase(); 
    const defenderActions = gameEngine.updateAI();
    
    // End defender turn and advance to next turn
    gameState.nextPhase(); 
    gameState.nextPhase(); // This should reset unit states for next turn
    
    const turnAssaultActions = assaultMovement.length + assaultActions.length;
    const turnDefenderActions = defenderMovement.length + defenderActions.length;
    
    console.log(`  AI Actions: Assault ${turnAssaultActions}, Defender ${turnDefenderActions}`);
    
    // Check for damage to confirm combat
    if (assaultUnits[0].state.currentHP < assaultUnits[0].stats.hp || 
        defenderUnits[0].state.currentHP < defenderUnits[0].stats.hp) {
      combatHappened = true;
      console.log('💥 DAMAGE DETECTED - Combat occurred!');
    }
    
    console.log('Turn completed\n');
  }
  
  // Final results
  const finalAssault = Array.from(assaultPlayer.units.values()).filter(u => u.isAlive());
  const finalDefender = Array.from(defenderPlayer.units.values()).filter(u => u.isAlive());
  
  console.log('🏁 FINAL RESULTS:');
  console.log(`  Assault survivors: ${finalAssault.length}`);
  console.log(`  Defender survivors: ${finalDefender.length}`);
  console.log(`  Combat occurred: ${combatHappened ? '✅ YES' : '❌ NO'}`);
  
  if (combatHappened) {
    if (finalAssault.length > finalDefender.length) {
      console.log('🏆 ASSAULT VICTORY!');
      return 'assault';
    } else if (finalDefender.length > finalAssault.length) {
      console.log('🏆 DEFENDER VICTORY!');
      return 'defender';
    } else {
      console.log('⚖️ DRAW');
      return 'draw';
    }
  } else {
    console.log('⚖️ NO COMBAT - Test failed');
    return 'no_combat';
  }
}

try {
  testMultiTurnCombat();
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
}