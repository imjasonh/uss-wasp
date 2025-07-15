#!/usr/bin/env node
/**
 * Test AI difficulty differentiation with both AIs on same side
 */

const { GameState } = require('./dist/core/game');
const { GameEngine } = require('./dist/core/game/GameEngine');
const { GameMap } = require('./dist/core/game/Map');
const { Player } = require('./dist/core/game/Player');
const { UnitType, PlayerSide, TurnPhase } = require('./dist/core/game/types');
const { AIDifficulty } = require('./dist/core/ai/types');
const { Hex } = require('./dist/core/hex');
const { createTestUnits } = require('./dist/testing/UnitTestHelper');

function testDifficultyOnSameSide(difficulty, playerSide) {
  console.log(`\n=== Testing ${difficulty} AI on ${playerSide} side ===`);
  
  const map = new GameMap(6, 6);
  const gameState = new GameState(`${difficulty}-${playerSide}-test`, map, 8);

  const player = new Player(`${difficulty}-player`, playerSide);
  const enemyPlayer = new Player('enemy-player', 
    playerSide === PlayerSide.Assault ? PlayerSide.Defender : PlayerSide.Assault);

  gameState.addPlayer(player);
  gameState.addPlayer(enemyPlayer);
  gameState.setActivePlayerBySide(playerSide);

  // Create test units
  const playerUnits = createTestUnits([
    { id: 'unit1', type: UnitType.MARINE_SQUAD, side: playerSide, position: new Hex(0, 0) },
    { id: 'unit2', type: UnitType.MARINE_SQUAD, side: playerSide, position: new Hex(1, 0) },
    { id: 'unit3', type: UnitType.HUMVEE, side: playerSide, position: new Hex(0, 1) },
  ]);

  const enemyUnits = createTestUnits([
    { id: 'enemy1', type: UnitType.INFANTRY_SQUAD, side: enemyPlayer.side, position: new Hex(2, 2) },
    { id: 'enemy2', type: UnitType.ATGM_TEAM, side: enemyPlayer.side, position: new Hex(3, 2) },
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
        console.log(`    ${i + 1}: ${action.type} (${action.unitId})`);
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
    playerSide,
    totalActions,
    actionTypes,
    averageActionsPerTurn: totalActions / 3
  };
}

console.log('🎯 Testing AI Difficulty Differentiation on Same Side...');

// Test both difficulties on assault side
const assaultResults = [
  testDifficultyOnSameSide(AIDifficulty.NOVICE, PlayerSide.Assault),
  testDifficultyOnSameSide(AIDifficulty.ELITE, PlayerSide.Assault)
];

// Test both difficulties on defender side
const defenderResults = [
  testDifficultyOnSameSide(AIDifficulty.NOVICE, PlayerSide.Defender),
  testDifficultyOnSameSide(AIDifficulty.ELITE, PlayerSide.Defender)
];

console.log('\n📊 Assault Side Comparison:');
assaultResults.forEach(result => {
  console.log(`${result.difficulty}: ${result.totalActions} actions (${result.averageActionsPerTurn.toFixed(1)} per turn)`);
});

console.log('\n📊 Defender Side Comparison:');
defenderResults.forEach(result => {
  console.log(`${result.difficulty}: ${result.totalActions} actions (${result.averageActionsPerTurn.toFixed(1)} per turn)`);
});

// Check for differences
console.log('\n🔍 Analysis:');
console.log(`Assault - Novice: ${assaultResults[0].totalActions}, Elite: ${assaultResults[1].totalActions}`);
console.log(`Defender - Novice: ${defenderResults[0].totalActions}, Elite: ${defenderResults[1].totalActions}`);

const assaultDiff = assaultResults[1].totalActions - assaultResults[0].totalActions;
const defenderDiff = defenderResults[1].totalActions - defenderResults[0].totalActions;

if (assaultDiff > 0) {
  console.log(`✅ Assault Elite AI generates ${assaultDiff} more actions than Novice`);
} else {
  console.log(`❌ Assault Elite AI generates ${Math.abs(assaultDiff)} fewer actions than Novice`);
}

if (defenderDiff > 0) {
  console.log(`✅ Defender Elite AI generates ${defenderDiff} more actions than Novice`);
} else {
  console.log(`❌ Defender Elite AI generates ${Math.abs(defenderDiff)} fewer actions than Novice`);
}