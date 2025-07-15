#!/usr/bin/env node
/**
 * Debug tactical priority logic
 */

const { GameState } = require('./dist/core/game');
const { GameEngine } = require('./dist/core/game/GameEngine');
const { GameMap } = require('./dist/core/game/Map');
const { Player } = require('./dist/core/game/Player');
const { UnitType, PlayerSide, TurnPhase } = require('./dist/core/game/types');
const { AIDifficulty } = require('./dist/core/ai/types');
const { AIDecisionMaker } = require('./dist/core/ai/AIDecisionMaker');
const { Hex } = require('./dist/core/hex');
const { createTestUnits } = require('./dist/testing/UnitTestHelper');

console.log('🔍 Testing AI Priority Logic...');

const map = new GameMap(10, 10);
const gameState = new GameState('priority-test', map, 10);

const defenderPlayer = new Player('defender', PlayerSide.Defender);
const assaultPlayer = new Player('assault', PlayerSide.Assault);

// Create test units
const defenderUnits = createTestUnits([
  { id: 'infantry1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 3) },
]);

const assaultUnits = createTestUnits([
  { id: 'threat1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
]);

gameState.addPlayer(defenderPlayer);
gameState.addPlayer(assaultPlayer);

defenderUnits.forEach(unit => {
  defenderPlayer.addUnit(unit);
  if (unit.canBeHidden()) {
    unit.hide();
    console.log('🫥 Unit', unit.id, 'is now hidden');
  }
});
assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));

// Create AI decision maker
const aiDecisionMaker = new AIDecisionMaker(AIDifficulty.VETERAN);

// Create context
const context = {
  availableUnits: Array.from(defenderPlayer.units.values()).filter(unit => unit.isAlive()),
  enemyUnits: Array.from(assaultPlayer.units.values()).filter(unit => unit.isAlive()),
  resourceStatus: {
    commandPoints: defenderPlayer.commandPoints,
    availableActions: 10,
  },
  currentPhase: TurnPhase.MOVEMENT,
  gameState: gameState,
  objectives: [],
  waspStatus: null,
};

// Test priority calculation
const hasHiddenUnits = context.availableUnits.some(unit => unit.isHidden());
const canHideUnits = context.availableUnits.some(unit => unit.canBeHidden() && !unit.isHidden());

console.log('🎯 Priority Logic Test:');
console.log('  Has hidden units:', hasHiddenUnits);
console.log('  Can hide units:', canHideUnits);
console.log('  Should enable HIDDEN_OPERATIONS:', hasHiddenUnits || canHideUnits);

// Test unit states
context.availableUnits.forEach(unit => {
  console.log(`  Unit ${unit.id}: isHidden=${unit.isHidden()}, canBeHidden=${unit.canBeHidden()}, canAct=${unit.canAct()}`);
});

// Test the AI decision making directly
try {
  const decisions = aiDecisionMaker.makeDecisions(context);
  console.log('🤖 AI Generated', decisions.length, 'decisions:');
  
  decisions.forEach((decision, i) => {
    console.log(`  ${i + 1}: ${decision.type} for ${decision.unitId} (priority: ${decision.priority})`);
    console.log(`     Reasoning: ${decision.reasoning}`);
  });
  
} catch (error) {
  console.log('❌ Error in AI decision making:', error.message);
  console.log('Stack:', error.stack);
}