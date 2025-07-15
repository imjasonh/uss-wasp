#!/usr/bin/env node
/**
 * Test AI difficulty differentiation
 */

const { GameState } = require('./dist/core/game');
const { GameEngine } = require('./dist/core/game/GameEngine');
const { GameMap } = require('./dist/core/game/Map');
const { Player } = require('./dist/core/game/Player');
const { UnitType, PlayerSide, TurnPhase } = require('./dist/core/game/types');
const { AIDifficulty } = require('./dist/core/ai/types');
const { Hex } = require('./dist/core/hex');
const { createTestUnits } = require('./dist/testing/UnitTestHelper');

console.log('🎯 Testing AI Difficulty Differentiation...');

function testDifficulty(difficulty) {
  console.log(`\n=== Testing ${difficulty} AI ===`);
  
  const map = new GameMap(6, 6);
  const gameState = new GameState(`${difficulty}-test`, map, 8);

  const player = new Player(`${difficulty}-player`, PlayerSide.Assault);
  const enemyPlayer = new Player('enemy-player', PlayerSide.Defender);

  gameState.addPlayer(player);
  gameState.addPlayer(enemyPlayer);
  gameState.setActivePlayerBySide(PlayerSide.Assault);

  // Create test units
  const playerUnits = createTestUnits([
    { id: 'unit1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(0, 0) },
    { id: 'unit2', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 0) },
    { id: 'unit3', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(0, 1) },
  ]);

  const enemyUnits = createTestUnits([
    { id: 'enemy1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(4, 4) },
    { id: 'enemy2', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(5, 4) },
  ]);

  playerUnits.forEach(unit => player.addUnit(unit));
  enemyUnits.forEach(unit => enemyPlayer.addUnit(unit));

  const gameEngine = new GameEngine(gameState);
  gameEngine.addAIController(player.id, difficulty);

  // Set up game state
  gameState.phase = TurnPhase.ACTION;
  player.commandPoints = 10;
  enemyPlayer.commandPoints = 10;

  // Test AI decisions over multiple turns
  let totalActions = 0;
  let actionTypes = {};
  
  console.log(`Setup: ${playerUnits.length} units, ${player.commandPoints} CP`);

  for (let turn = 1; turn <= 3; turn++) {
    console.log(`  Turn ${turn}:`);
    
    try {
      const actions = gameEngine.updateAI();
      totalActions += actions.length;
      
      console.log(`    Actions: ${actions.length}`);
      
      actions.forEach((action, i) => {
        console.log(`    ${i + 1}: ${action.type} (priority: ${action.priority})`);
        actionTypes[action.type] = (actionTypes[action.type] || 0) + 1;
      });
      
      if (actions.length === 0) {
        console.log('    No actions generated');
      }
    } catch (error) {
      console.log(`    Error: ${error.message}`);
    }
  }

  console.log(`Summary: ${totalActions} total actions over 3 turns`);
  console.log(`Action types:`, actionTypes);
  
  return {
    difficulty,
    totalActions,
    actionTypes,
    averageActionsPerTurn: totalActions / 3
  };
}

// Test all difficulties
const results = [
  testDifficulty(AIDifficulty.NOVICE),
  testDifficulty(AIDifficulty.VETERAN), 
  testDifficulty(AIDifficulty.ELITE)
];

console.log('\n📊 Difficulty Comparison:');
results.forEach(result => {
  console.log(`${result.difficulty}: ${result.totalActions} actions (${result.averageActionsPerTurn.toFixed(1)} per turn)`);
});

// Check for differences
const noviceActions = results[0].totalActions;
const eliteActions = results[2].totalActions;

if (noviceActions === eliteActions) {
  console.log('❌ No difference between NOVICE and ELITE AI action counts');
} else {
  console.log(`✅ NOVICE (${noviceActions}) vs ELITE (${eliteActions}) actions - ${Math.abs(eliteActions - noviceActions)} difference`);
}