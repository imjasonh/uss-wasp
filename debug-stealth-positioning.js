#!/usr/bin/env node
/**
 * Debug AI stealth positioning decisions
 */

const { GameState } = require('./dist/core/game');
const { GameEngine } = require('./dist/core/game/GameEngine');
const { GameMap } = require('./dist/core/game/Map');
const { Player } = require('./dist/core/game/Player');
const { UnitType, PlayerSide, TurnPhase, ActionType } = require('./dist/core/game/types');
const { AIDifficulty } = require('./dist/core/ai/types');
const { Hex } = require('./dist/core/hex');
const { createTestUnits } = require('./dist/testing/UnitTestHelper');

console.log('🔍 Testing AI Stealth Positioning Decisions...');

const map = new GameMap(10, 10);
const gameState = new GameState('stealth-test', map, 10);

const defenderPlayer = new Player('defender', PlayerSide.Defender);
const assaultPlayer = new Player('assault', PlayerSide.Assault);

const defenderUnits = createTestUnits([
  { id: 'infantry1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 3) },
  { id: 'infantry2', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(4, 3) },
]);

const assaultUnits = createTestUnits([
  { id: 'threat1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
  { id: 'threat2', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(2, 2) },
]);

gameState.addPlayer(defenderPlayer);
gameState.addPlayer(assaultPlayer);

defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));

// Set up initial hiding
defenderUnits.forEach(unit => {
  if (unit.canBeHidden()) {
    unit.hide();
    console.log('🫥 Unit', unit.id, 'is now hidden');
  }
});

const gameEngine = new GameEngine(gameState);
gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

defenderPlayer.commandPoints = 10;
assaultPlayer.commandPoints = 10;

gameState.phase = TurnPhase.MOVEMENT; // Set to movement phase for tactical positioning

console.log('📊 Before AI decision:');
console.log('  Defender units:', defenderUnits.length);
console.log('  Assault units:', assaultUnits.length);
console.log('  Hidden units:', defenderUnits.filter(u => u.isHidden()).length);

// Check unit states before AI decision making
const defenderUnitsAlive = Array.from(defenderPlayer.units.values()).filter(unit => unit.isAlive());
const assaultUnitsAlive = Array.from(assaultPlayer.units.values()).filter(unit => unit.isAlive());

console.log('📊 Unit Status Check:');
console.log('  Defender units alive:', defenderUnitsAlive.length);
console.log('  Assault units alive:', assaultUnitsAlive.length);

defenderUnitsAlive.forEach(unit => {
  console.log(`  Unit ${unit.id}: canAct=${unit.canAct()}, hasMoved=${unit.state.hasMoved}, isHidden=${unit.isHidden()}, mv=${unit.stats.mv}`);
});

assaultUnitsAlive.forEach(unit => {
  console.log(`  Enemy ${unit.id}: position=${unit.state.position.q},${unit.state.position.r}, type=${unit.type}`);
});

console.log('🔍 Current game state:');
console.log('  Phase:', gameState.phase);
console.log('  Defender CP:', defenderPlayer.commandPoints);
console.log('  AI controlled:', gameEngine.isAIControlled(defenderPlayer.id));

const aiActions = gameEngine.updateAI();

console.log('🤖 AI Generated', aiActions.length, 'actions:');
aiActions.forEach((action, i) => {
  console.log('  ', i + 1, ':', action.type, 'for unit', action.unitId);
});

const movementActions = aiActions.filter(action => action.type === ActionType.MOVE);
console.log('🚶 Movement actions:', movementActions.length);

const revealActions = aiActions.filter(action => action.type === ActionType.REVEAL);
console.log('👁️ Reveal actions:', revealActions.length);

const hideActions = aiActions.filter(action => action.type === ActionType.HIDE);
console.log('🫥 Hide actions:', hideActions.length);

if (movementActions.length > 0) {
  console.log('✅ AI demonstrates stealth positioning with movement');
} else {
  console.log('❌ AI shows no stealth positioning movement');
}