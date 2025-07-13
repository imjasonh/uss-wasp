#!/usr/bin/env node

/**
 * Test AI combat with units starting adjacent (direct combat range)
 */

const { GameState } = require('./dist/core/game/GameState');
const { GameEngine } = require('./dist/core/game/GameEngine');
const { Player } = require('./dist/core/game/Player');
const { GameMap } = require('./dist/core/game/Map');
const { PlayerSide, UnitType } = require('./dist/core/game/types');
const { AIDifficulty } = require('./dist/core/ai/types');
const { createTestUnits } = require('./dist/testing/UnitTestHelper');
const { Hex } = require('./dist/core/hex');

console.log('🔥 Direct Combat AI Test');
console.log('========================\n');

try {
  // Create direct combat scenario - units very close
  const map = new GameMap(4, 4);
  const gameState = new GameState('direct-combat-test', map, 10);
  
  const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
  const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);
  
  assaultPlayer.commandPoints = 10;
  defenderPlayer.commandPoints = 10;
  
  gameState.addPlayer(assaultPlayer);
  gameState.addPlayer(defenderPlayer);
  gameState.setActivePlayerBySide(PlayerSide.Assault);

  // Create units starting adjacent (within combat range)
  const assaultUnits = createTestUnits([
    { id: 'assault-1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
    { id: 'assault-2', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(0, 1) }
  ]);

  const defenderUnits = createTestUnits([
    { id: 'defender-1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(2, 1) },
    { id: 'defender-2', type: UnitType.TECHNICAL, side: PlayerSide.Defender, position: new Hex(2, 2) }
  ]);

  // Add units to players
  assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
  defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

  const gameEngine = new GameEngine(gameState);
  gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
  gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

  console.log('✅ Direct combat scenario setup:');
  console.log(`   Assault: Marines at (1,1), Humvee at (0,1)`);
  console.log(`   Defender: Infantry at (2,1), Technical at (2,2)`);
  console.log(`   Distance: 1-2 hexes (optimal combat range)\n`);

  // Test action phase combat specifically
  for (let turn = 1; turn <= 5; turn++) {
    console.log(`--- Turn ${turn} ---`);
    
    // Skip to action phase for immediate combat testing
    gameState.phase = 'action';
    console.log(`Phase: action`);
    
    const currentPlayer = gameState.getActivePlayer();
    console.log(`   Active player: ${currentPlayer?.side}`);
    
    // Show unit positions and health
    console.log('   Unit status:');
    assaultUnits.forEach(unit => {
      if (unit.isAlive()) {
        console.log(`     ${unit.type} (Assault) at (${unit.state.position.q},${unit.state.position.r}) - HP: ${unit.state.currentHP}/${unit.stats.hp}`);
      }
    });
    defenderUnits.forEach(unit => {
      if (unit.isAlive()) {
        console.log(`     ${unit.type} (Defender) at (${unit.state.position.q},${unit.state.position.r}) - HP: ${unit.state.currentHP}/${unit.stats.hp}`);
      }
    });
    
    const aiActions = gameEngine.updateAI();
    
    if (aiActions.length > 0) {
      console.log(`  🤖 Generated ${aiActions.length} actions`);
    } else {
      console.log(`  🤖 No actions generated`);
    }
    
    // Check for victory conditions
    const assaultAlive = assaultUnits.filter(unit => unit.isAlive()).length;
    const defenderAlive = defenderUnits.filter(unit => unit.isAlive()).length;
    
    if (assaultAlive === 0) {
      console.log('\n🏆 DEFENDER WINS - All assault units destroyed!');
      break;
    }
    
    if (defenderAlive === 0) {
      console.log('\n🏆 ASSAULT WINS - All defender units destroyed!');
      break;
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
  console.error('❌ Direct combat test failed:', error);
}