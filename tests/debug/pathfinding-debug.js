#!/usr/bin/env node

/**
 * Debug script to test pathfinding on a small 6x6 hex grid
 */

const { GameMap } = require('../../dist/core/game/Map.js');
const { GameEngine } = require('../../dist/core/game/GameEngine.js');
const { Unit } = require('../../dist/core/game/Unit.js');
const { Hex } = require('../../dist/core/hex/Hex.js');
const { createTestUnit } = require('../../dist/testing/UnitTestHelper.js');
const { UnitType, PlayerSide } = require('../../dist/core/game/types.js');

console.log('🔍 USS Wasp Pathfinding Debug Test');
console.log('===================================\n');

try {
  // Create a small 6x6 map
  const map = new GameMap(6, 6);
  console.log('✅ Created 6x6 map');
  
  // Create a test unit
  const testUnit = createTestUnit('test-1', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(0, 0));
  console.log(`✅ Created unit: ${testUnit.type} at (${testUnit.state.position.q}, ${testUnit.state.position.r})`);
  
  // Create game engine
  const gameEngine = new GameEngine({ map, getAllUnits: () => [testUnit] });
  console.log('✅ Created game engine mock');
  
  // Test various pathfinding scenarios
  const testCases = [
    { from: new Hex(0, 0), to: new Hex(1, 0), description: 'Adjacent hex (1 step)' },
    { from: new Hex(0, 0), to: new Hex(2, 0), description: 'Two hexes away (2 steps)' },
    { from: new Hex(0, 0), to: new Hex(1, 1), description: 'Diagonal (2 steps)' },
    { from: new Hex(0, 0), to: new Hex(3, 3), description: 'Far position (6 steps)' },
    { from: new Hex(0, 0), to: new Hex(5, 5), description: 'Max distance on 6x6 map' },
    { from: new Hex(2, 2), to: new Hex(4, 4), description: 'Mid-map movement' },
  ];
  
  console.log('\n🗺️  Testing pathfinding scenarios:\n');
  
  for (const testCase of testCases) {
    console.log(`📍 Test: ${testCase.description}`);
    console.log(`   From: (${testCase.from.q}, ${testCase.from.r}) to (${testCase.to.q}, ${testCase.to.r})`);
    
    try {
      // Update unit position for this test
      testUnit.state.position = testCase.from;
      testUnit.state.hasMoved = false;
      
      // Calculate movement path
      const path = gameEngine.calculateMovementPath(testUnit, testCase.to);
      
      if (path.valid) {
        console.log(`   ✅ Valid path found: ${path.hexes.length} hexes, cost: ${path.totalCost}`);
        console.log(`   📍 Path: ${path.hexes.map(h => `(${h.q},${h.r})`).join(' -> ')}`);
      } else {
        console.log(`   ❌ No valid path found (cost: ${path.totalCost})`);
      }
      
    } catch (error) {
      console.log(`   💥 Error: ${error.message}`);
    }
    
    console.log('');
  }
  
  // Test what map.getMovementCost returns for different positions
  console.log('\n🎯 Testing map movement costs:\n');
  
  const positions = [
    new Hex(0, 0), new Hex(1, 0), new Hex(2, 2), new Hex(5, 5)
  ];
  
  for (const pos of positions) {
    try {
      const cost = map.getMovementCost(pos);
      const hex = map.getHex(pos);
      console.log(`   Position (${pos.q}, ${pos.r}): cost=${cost}, terrain=${hex?.terrain || 'undefined'}`);
    } catch (error) {
      console.log(`   Position (${pos.q}, ${pos.r}): ERROR - ${error.message}`);
    }
  }
  
  // Test invalid positions
  console.log('\n⚠️  Testing invalid positions:\n');
  
  const invalidPositions = [
    new Hex(6, 6), new Hex(-1, 0), new Hex(0, 6), new Hex(10, 10)
  ];
  
  for (const pos of invalidPositions) {
    try {
      const cost = map.getMovementCost(pos);
      console.log(`   Position (${pos.q}, ${pos.r}): cost=${cost} (should be invalid!)`);
    } catch (error) {
      console.log(`   Position (${pos.q}, ${pos.r}): Correctly rejected - ${error.message}`);
    }
  }
  
} catch (error) {
  console.error('💥 Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}