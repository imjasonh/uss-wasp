#!/usr/bin/env node

/**
 * Test AI combat with units starting close together
 */

const { GameState } = require('../../dist/core/game/GameState');
const { GameEngine } = require('../../dist/core/game/GameEngine');
const { Player } = require('../../dist/core/game/Player');
const { GameMap } = require('../../dist/core/game/Map');
const { PlayerSide, UnitType } = require('../../dist/core/game/types');
const { AIDifficulty } = require('../../dist/core/ai/types');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper');
const { Hex } = require('../../dist/core/hex');

console.log('⚔️  Close Combat AI Test');
console.log('======================\n');

try {
  // Create close combat scenario
  const map = new GameMap(6, 6);
  const gameState = new GameState('close-combat-test', map, 10);
  
  const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
  const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);
  
  assaultPlayer.commandPoints = 10;
  defenderPlayer.commandPoints = 10;
  
  gameState.addPlayer(assaultPlayer);
  gameState.addPlayer(defenderPlayer);
  gameState.setActivePlayerBySide(PlayerSide.Assault);

  // Create units starting very close to each other
  const assaultUnits = createTestUnits([
    { id: 'assault-1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
    { id: 'assault-2', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(2, 1) }
  ]);

  const defenderUnits = createTestUnits([
    { id: 'defender-1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 3) },
    { id: 'defender-2', type: UnitType.TECHNICAL, side: PlayerSide.Defender, position: new Hex(4, 3) }
  ]);

  // Add units to players
  assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
  defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

  const gameEngine = new GameEngine(gameState);
  gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
  gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

  console.log('✅ Close combat scenario setup:');
  console.log(`   Assault: Marines at (1,1), Harrier at (2,1)`);
  console.log(`   Defender: Infantry at (3,3), Technical at (4,3)`);
  console.log(`   Distance: ~2-3 hexes (should be in combat range)\n`);

  // Test a few phases to see combat
  const phases = ['event', 'command', 'deployment', 'movement', 'action', 'end'];
  
  for (let turn = 1; turn <= 3; turn++) {
    console.log(`--- Turn ${turn} ---`);
    
    for (const phase of phases) {
      gameState.phase = phase;
      console.log(`Phase: ${phase}`);
      
      const aiActions = gameEngine.updateAI();
      
      if (aiActions.length > 0) {
        console.log(`  🤖 Generated ${aiActions.length} actions`);
      }
    }
    
    // Switch players for next turn
    const currentSide = gameState.getActivePlayer()?.side;
    if (currentSide === PlayerSide.Assault) {
      gameState.setActivePlayerBySide(PlayerSide.Defender);
    } else {
      gameState.setActivePlayerBySide(PlayerSide.Assault);
    }
    
    console.log('');
  }

} catch (error) {
  console.error('❌ Close combat test failed:', error);
}