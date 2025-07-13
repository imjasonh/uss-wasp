#!/usr/bin/env node

/**
 * DEBUG COMBAT DECISION GENERATION
 * Test exactly why combat decisions aren't being generated
 */

const { GameEngine } = require('./dist/core/game/GameEngine.js');
const { GameState } = require('./dist/core/game/GameState.js');
const { GameMap } = require('./dist/core/game/Map.js');
const { Player } = require('./dist/core/game/Player.js');
const { createTestUnits } = require('./dist/testing/UnitTestHelper.js');
const { PlayerSide, UnitType } = require('./dist/core/game/types.js');
const { AIDifficulty } = require('./dist/core/ai/types.js');
const { Hex } = require('./dist/core/hex/Hex.js');

function debugCombatDecisions() {
  console.log('🔍 DEBUGGING COMBAT DECISION GENERATION');
  console.log('==========================================\n');

  // Create simple setup
  const map = new GameMap(4, 4);
  const gameState = new GameState('debug-combat', map, 10);
  
  const assaultPlayer = new Player('assault', PlayerSide.Assault);
  const defenderPlayer = new Player('defender', PlayerSide.Defender);
  
  gameState.addPlayer(assaultPlayer);
  gameState.addPlayer(defenderPlayer);
  gameState.setActivePlayerBySide(PlayerSide.Assault);
  
  // Add units at same position (0 distance)
  const assaultUnits = createTestUnits([
    { id: 'marines', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 1) }
  ]);
  
  const defenderUnits = createTestUnits([
    { id: 'infantry', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(2, 1) }
  ]);
  
  assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
  defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
  
  const marines = assaultUnits[0];
  const infantry = defenderUnits[0];
  
  console.log('INITIAL SETUP:');
  console.log(`Marines: position (${marines.state.position.q}, ${marines.state.position.r}), HP ${marines.state.currentHP}/${marines.stats.hp}, ATK ${marines.stats.atk}, DEF ${marines.stats.def}`);
  console.log(`Infantry: position (${infantry.state.position.q}, ${infantry.state.position.r}), HP ${infantry.state.currentHP}/${infantry.stats.hp}, ATK ${infantry.stats.atk}, DEF ${infantry.stats.def}`);
  
  // Calculate distance manually
  const distance = Math.max(
    Math.abs(marines.state.position.q - infantry.state.position.q),
    Math.abs(marines.state.position.r - infantry.state.position.r),
    Math.abs(marines.state.position.s - infantry.state.position.s)
  ) / 2;
  
  console.log(`Distance: ${distance} hexes`);
  console.log(`Marines range: 2 (default infantry range)`);
  console.log(`In range? ${distance <= 2}\n`);
  
  // Test AI decision generation
  const gameEngine = new GameEngine(gameState);
  gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
  
  console.log('TESTING AI DECISION GENERATION:');
  console.log('================================');
  
  // Test manual target finding first
  console.log('MANUAL TARGET TESTING:');
  
  // Simulate findValidTargets logic
  const maxRange = 2; // Default infantry range
  const enemyUnits = [infantry];
  const validTargets = [];
  
  for (const enemy of enemyUnits) {
    const distance = Math.max(
      Math.abs(marines.state.position.q - enemy.state.position.q),
      Math.abs(marines.state.position.r - enemy.state.position.r),
      Math.abs(marines.state.position.s - enemy.state.position.s)
    ) / 2;
    
    console.log(`Target ${enemy.id}: distance ${distance}, range ${maxRange}, alive ${enemy.isAlive()}`);
    
    if (distance <= maxRange && enemy.isAlive()) {
      validTargets.push(enemy);
      console.log(`  ✅ Valid target!`);
    } else {
      console.log(`  ❌ Not valid target`);
    }
  }
  
  console.log(`Valid targets found: ${validTargets.length}\n`);
  
  // Set to action phase for combat
  gameState.phase = 'action';
  
  // Generate AI decisions manually to see what happens
  const aiActions = gameEngine.updateAI();
  
  console.log(`AI generated ${aiActions.length} actions:`);
  aiActions.forEach((action, i) => {
    console.log(`  ${i+1}. ${action.type} - Unit: ${action.unitId}, Target: ${action.targetId || 'none'}`);
  });
  
  // Test unit states
  console.log('\nUNIT STATES:');
  console.log(`Marines canAct(): ${marines.canAct()}`);
  console.log(`Marines hasActed: ${marines.state.hasActed}`);
  console.log(`Infantry isAlive(): ${infantry.isAlive()}`);
  console.log(`Infantry isHidden(): ${infantry.isHidden()}`);
  
  console.log('\nDone!');
}

try {
  debugCombatDecisions();
} catch (error) {
  console.error('❌ Debug failed:', error.message);
  console.error(error.stack);
}