#!/usr/bin/env node
/**
 * Test the exact multi-difficulty scenario from comprehensive test
 */

const { GameState } = require('./dist/core/game');
const { GameEngine } = require('./dist/core/game/GameEngine');
const { GameMap } = require('./dist/core/game/Map');
const { Player } = require('./dist/core/game/Player');
const { UnitType, PlayerSide, TurnPhase } = require('./dist/core/game/types');
const { AIDifficulty } = require('./dist/core/ai/types');
const { Hex } = require('./dist/core/hex');
const { createTestUnits } = require('./dist/testing/UnitTestHelper');

console.log('🎯 Testing Multi-difficulty from Comprehensive Test...');

// Test different AI difficulty levels against each other
const map = new GameMap(6, 6);
const gameState = new GameState('difficulty-test', map, 8);

const novicePlayer = new Player('novice-ai', PlayerSide.Assault);
const elitePlayer = new Player('elite-ai', PlayerSide.Defender);

gameState.addPlayer(novicePlayer);
gameState.addPlayer(elitePlayer);
gameState.setActivePlayerBySide(PlayerSide.Assault);

// Create simple combat scenario with closer units
const noviceUnits = createTestUnits([
  {
    id: 'novice-1',
    type: UnitType.MARINE_SQUAD,
    side: PlayerSide.Assault,
    position: new Hex(0, 0),
  },
  {
    id: 'novice-2',
    type: UnitType.MARINE_SQUAD,
    side: PlayerSide.Assault,
    position: new Hex(1, 0),
  },
]);

const eliteUnits = createTestUnits([
  {
    id: 'elite-1',
    type: UnitType.INFANTRY_SQUAD,
    side: PlayerSide.Defender,
    position: new Hex(2, 2), // Much closer to enable combat decisions
  },
  {
    id: 'elite-2',
    type: UnitType.ATGM_TEAM,
    side: PlayerSide.Defender,
    position: new Hex(3, 2), // Much closer to enable combat decisions
  },
]);

noviceUnits.forEach(unit => novicePlayer.addUnit(unit));
eliteUnits.forEach(unit => elitePlayer.addUnit(unit));

const gameEngine = new GameEngine(gameState);
gameEngine.addAIController(novicePlayer.id, AIDifficulty.NOVICE);
gameEngine.addAIController(elitePlayer.id, AIDifficulty.ELITE);

console.log('✅ Multi-difficulty test setup complete');
console.log('   Novice AI vs Elite AI');

// Test AI decision differences - test both AIs in equivalent scenarios
let noviceActionCount = 0;
let eliteActionCount = 0;

// Initialize command points
novicePlayer.commandPoints = 10;
elitePlayer.commandPoints = 10;

// Set game phase to ACTION (important for AI decision-making)
gameState.phase = TurnPhase.ACTION;

console.log('📊 Testing both AIs in similar scenarios...');

// Test Novice AI (assault side)
console.log('\n=== Testing Novice AI (Assault) ===');
gameState.setActivePlayerBySide(PlayerSide.Assault);
for (let turn = 1; turn <= 3; turn++) {
  console.log(`Turn ${turn}:`);
  try {
    const actions = gameEngine.updateAI();
    noviceActionCount += actions.length;
    console.log(`  Actions: ${actions.length}`);
    actions.forEach((action, i) => {
      console.log(`    ${i + 1}: ${action.type} (${action.unitId})`);
    });
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
}

// Test Elite AI (defender side)
console.log('\n=== Testing Elite AI (Defender) ===');
gameState.setActivePlayerBySide(PlayerSide.Defender);
for (let turn = 1; turn <= 3; turn++) {
  console.log(`Turn ${turn}:`);
  try {
    const actions = gameEngine.updateAI();
    eliteActionCount += actions.length;
    console.log(`  Actions: ${actions.length}`);
    actions.forEach((action, i) => {
      console.log(`    ${i + 1}: ${action.type} (${action.unitId})`);
    });
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
}

console.log('\n📊 Side-by-side comparison (different sides):');
console.log(`Novice AI (Assault): ${noviceActionCount} actions over 3 turns`);
console.log(`Elite AI (Defender): ${eliteActionCount} actions over 3 turns`);
console.log('Note: Different sides may have different tactical contexts');

// Analyze AI behavior differences
console.log('\n📊 Final Results:');
console.log(`Novice AI actions: ${noviceActionCount}, Elite AI actions: ${eliteActionCount}`);

if (noviceActionCount === eliteActionCount) {
  console.log('❌ No difference in action count between NOVICE and ELITE AI');
} else {
  console.log(`✅ Difference detected: ${Math.abs(eliteActionCount - noviceActionCount)} actions`);
}