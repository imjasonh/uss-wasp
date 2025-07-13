#!/usr/bin/env node

const { GameMap } = require('./dist/core/game/Map.js');
const { GameEngine } = require('./dist/core/game/GameEngine.js');
const { GameState } = require('./dist/core/game/GameState.js');
const { Player } = require('./dist/core/game/Player.js');
const { Hex, findPath } = require('./dist/core/hex');
const { UnitType, PlayerSide } = require('./dist/core/game/types.js');
const { createTestUnit } = require('./dist/testing/UnitTestHelper.js');

console.log('🔍 Testing AI Movement Pathfinding Issues');
console.log('=========================================\n');

try {
  const map = new GameMap(6, 6);
  const gameState = new GameState('pathfinding-test', map, 10);
  const player = new Player('test-player', PlayerSide.Assault);
  gameState.addPlayer(player);
  gameState.setActivePlayerBySide(PlayerSide.Assault);
  
  const unit = createTestUnit('test-unit', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(0, 0));
  player.addUnit(unit);
  
  const gameEngine = new GameEngine(gameState);
  
  console.log('📍 Unit Setup:');
  console.log(`   Position: (${unit.state.position.q}, ${unit.state.position.r}, ${unit.state.position.s})`);
  console.log(`   Can move: ${unit.canMove()}`);
  console.log(`   Movement points: ${unit.getEffectiveMovement()}`);
  console.log(`   Has moved: ${unit.state.hasMoved}`);
  
  // Test cases for different target positions
  const testCases = [
    { name: 'Adjacent East', target: new Hex(1, 0, -1) },
    { name: 'Adjacent Southeast', target: new Hex(0, 1, -1) },
    { name: 'Two hexes away', target: new Hex(2, 0, -2) },
    { name: 'Diagonal', target: new Hex(1, 1, -2) },
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🎯 Test Case: ${testCase.name}`);
    console.log(`   Target: (${testCase.target.q}, ${testCase.target.r}, ${testCase.target.s})`);
    
    // Test GameEngine pathfinding
    const path = gameEngine.calculateMovementPath(unit, testCase.target);
    console.log(`   GameEngine Path:`)
    console.log(`   - Valid: ${path.valid}`);
    console.log(`   - Total cost: ${path.totalCost}`);
    console.log(`   - Hexes: ${path.hexes.length}`);
    
    if (path.hexes.length > 0) {
      console.log(`   - Path: ${path.hexes.map(h => `(${h.q},${h.r})`).join(' -> ')}`);
    }
    
    // Test direct hex pathfinding
    console.log(`   Direct pathfinding test:`);
    const directPath = findPath(unit.state.position, testCase.target, {
      getCost: (from, to) => {
        const cost = map.getMovementCost(to);
        return cost;
      },
      maxDistance: 10
    });
    
    console.log(`   - Direct path length: ${directPath.length}`);
    if (directPath.length > 0) {
      console.log(`   - Direct path: ${directPath.map(h => `(${h.q},${h.r})`).join(' -> ')}`);
    }
    
    // Test movement cost calculation
    console.log(`   Movement costs:`);
    const targetCost = map.getMovementCost(testCase.target);
    console.log(`   - Target hex cost: ${targetCost}`);
    
    // Test if target hex exists on map
    const targetHex = map.getHex(testCase.target);
    console.log(`   - Target hex exists: ${!!targetHex}`);
    if (targetHex) {
      console.log(`   - Target terrain: ${targetHex.terrain}`);
    }
  }
  
  // Test AI decision making
  console.log(`\n🤖 Testing AI Movement Decisions:`);
  gameEngine.addAIController(player.id);
  
  gameState.phase = 'movement';
  const aiActions = gameEngine.updateAI();
  console.log(`   AI generated ${aiActions.length} actions in movement phase`);
  
  for (const action of aiActions) {
    console.log(`   Action: ${action.type} for unit ${action.unitId}`);
    if (action.targetPosition) {
      console.log(`     Target: (${action.targetPosition.q}, ${action.targetPosition.r})`);
      
      // Try to execute the action to see what happens
      const result = gameEngine.executeAction(action);
      console.log(`     Result: ${result.success ? '✅' : '❌'} ${result.message}`);
    }
  }
  
} catch (error) {
  console.error('💥 Error:', error.message);
  console.error(error.stack);
}