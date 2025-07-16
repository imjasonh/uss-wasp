#!/usr/bin/env node
/**
 * Debug tactical positioning logic specifically
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

console.log('🔍 Testing AI Tactical Positioning Logic...');

const map = new GameMap(10, 10);
const gameState = new GameState('tactical-test', map, 10);

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

const unit = defenderUnits[0];
console.log('📊 Testing unit:', unit.id);
console.log('  Position:', unit.state.position.q, unit.state.position.r);
console.log('  Movement:', unit.stats.mv);
console.log('  Health:', unit.state.currentHP, '/', unit.stats.hp);
console.log('  Hidden:', unit.isHidden());
console.log('  Can act:', unit.canAct());

// Test the AI decision making
try {
  const decisions = aiDecisionMaker.makeDecisions(context);
  console.log('🤖 AI Generated', decisions.length, 'decisions:');
  
  const movementDecisions = decisions.filter(d => d.type === 'move_unit');
  console.log('🚶 Movement decisions:', movementDecisions.length);
  
  if (movementDecisions.length > 0) {
    movementDecisions.forEach(decision => {
      console.log('  Move', decision.unitId, 'to', decision.targetPosition.q, decision.targetPosition.r);
      console.log('    Reasoning:', decision.reasoning);
    });
  }
  
  // Test tactical positioning directly
  console.log('🎯 Testing tactical positioning method directly...');
  
  // Access the private method through reflection (for debugging)
  const findBestTacticalPosition = aiDecisionMaker.findBestTacticalPosition || function() { return null; };
  
  // Create a minimal test to check if the method exists
  console.log('  findBestTacticalPosition method:', typeof findBestTacticalPosition);
  
} catch (error) {
  console.log('❌ Error in AI decision making:', error.message);
  console.log('Stack:', error.stack);
}