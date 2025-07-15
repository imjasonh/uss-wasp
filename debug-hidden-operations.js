#!/usr/bin/env node
/**
 * Debug hidden operations decision generation
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

console.log('🔍 Testing Hidden Operations Decision Generation...');

const map = new GameMap(10, 10);
const gameState = new GameState('hidden-ops-test', map, 10);

const defenderPlayer = new Player('defender', PlayerSide.Defender);
const assaultPlayer = new Player('assault', PlayerSide.Assault);

// Create test units
const defenderUnits = createTestUnits([
  { id: 'infantry1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 3) },
]);

const assaultUnits = createTestUnits([
  { id: 'threat1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
  { id: 'threat2', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(2, 2) },
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

console.log('📊 Context Analysis:');
console.log('  Available units:', context.availableUnits.length);
console.log('  Enemy units:', context.enemyUnits.length);

context.availableUnits.forEach(unit => {
  console.log(`  Unit ${unit.id}: pos=${unit.state.position.q},${unit.state.position.r}, hidden=${unit.isHidden()}, canAct=${unit.canAct()}, hasMoved=${unit.state.hasMoved}`);
});

context.enemyUnits.forEach(enemy => {
  console.log(`  Enemy ${enemy.id}: pos=${enemy.state.position.q},${enemy.state.position.r}, type=${enemy.type}`);
});

// Calculate enemy distances
const unit = context.availableUnits[0];
if (unit) {
  console.log('🎯 Distance Analysis for', unit.id, '(position:', unit.state.position.q, unit.state.position.r, 's:', unit.state.position.s, '):');
  
  context.enemyUnits.forEach(enemy => {
    console.log(`  Enemy ${enemy.id}: pos=${enemy.state.position.q},${enemy.state.position.r}, s=${enemy.state.position.s}`);
    const distance = (Math.abs(unit.state.position.q - enemy.state.position.q) + 
                     Math.abs(unit.state.position.r - enemy.state.position.r) + 
                     Math.abs(unit.state.position.s - enemy.state.position.s)) / 2;
    console.log(`  Distance to ${enemy.id}: ${distance.toFixed(2)} hexes`);
  });
  
  // Check nearest enemy distance for fallback reveal logic
  const nearestEnemyDistance = Math.min(
    ...context.enemyUnits.map(e => (Math.abs(unit.state.position.q - e.state.position.q) + 
                                   Math.abs(unit.state.position.r - e.state.position.r) + 
                                   Math.abs(unit.state.position.s - e.state.position.s)) / 2)
  );
  console.log(`  Nearest enemy distance: ${nearestEnemyDistance.toFixed(2)} hexes`);
  console.log(`  Will trigger fallback reveal? ${nearestEnemyDistance <= 2}`);
}

// Test decision generation
try {
  console.log('🧠 Attempting to make AI decisions...');
  const decisions = aiDecisionMaker.makeDecisions(context);
  console.log('🤖 Final AI decisions:', decisions.length);
  
  decisions.forEach((decision, i) => {
    console.log(`  ${i + 1}: ${decision.type} for ${decision.unitId} (priority: ${decision.priority})`);
    console.log(`     Reasoning: ${decision.reasoning}`);
  });
  
} catch (error) {
  console.log('❌ Error in AI decision making:', error.message);
  console.log('❌ Error type:', error.constructor.name);
  console.log('❌ Stack trace:');
  console.log(error.stack);
}