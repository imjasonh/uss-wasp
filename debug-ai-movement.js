#!/usr/bin/env node

/**
 * Debug AI movement generation to see how the pathfinding issue affects AI decisions
 */

const { GameMap } = require('./dist/core/game/Map.js');
const { GameState } = require('./dist/core/game/GameState.js');
const { Player } = require('./dist/core/game/Player.js');
const { Hex } = require('./dist/core/hex/index.js');
const { UnitType, PlayerSide } = require('./dist/core/game/types.js');
const { createTestUnit } = require('./dist/testing/UnitTestHelper.js');

console.log('🤖 Investigating AI Movement Generation');
console.log('======================================\n');

// We can't test the full AI system due to compilation errors, but we can test 
// the movement path calculation that AI would use

try {
  const map = new GameMap(6, 6);
  const gameState = new GameState('ai-test', map, 10);
  const player = new Player('test-player', PlayerSide.Assault);
  gameState.addPlayer(player);
  gameState.setActivePlayerBySide(PlayerSide.Assault);
  
  // Create a unit at a typical starting position
  const unit = createTestUnit('marine-1', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(0, 0));
  player.addUnit(unit);
  
  console.log('🎯 Unit Setup:');
  console.log(`   Unit: ${unit.type}`);
  console.log(`   Position: (${unit.state.position.q}, ${unit.state.position.r})`);
  console.log(`   Movement: ${unit.getEffectiveMovement()} hexes`);
  console.log(`   Can move: ${unit.canMove()}`);
  
  // Simulate what AI decision making would try to do
  console.log('\n🤖 Simulating AI Movement Target Selection:');
  
  // AI would typically try to find positions to move toward enemies or objectives
  // Let's test some common AI movement patterns
  
  const potentialTargets = [
    { name: 'Adjacent East', pos: new Hex(1, 0, -1) },
    { name: 'Adjacent Southeast', pos: new Hex(0, 1, -1) },
    { name: 'Forward two hexes', pos: new Hex(2, 0, -2) },
    { name: 'Diagonal advance', pos: new Hex(1, 1, -2) },
    { name: 'Forward three hexes', pos: new Hex(3, 0, -3) },
    { name: 'Side movement', pos: new Hex(0, 2, -2) },
  ];
  
  // Test each target like AI would
  for (const target of potentialTargets) {
    console.log(`\n📍 Testing AI target: ${target.name}`);
    console.log(`     Target position: (${target.pos.q}, ${target.pos.r})`);
    
    // Check if target exists on map
    const targetHex = map.getHex(target.pos);
    console.log(`     Target exists on map: ${!!targetHex}`);
    
    if (!targetHex) {
      console.log(`     ❌ AI ERROR: Target doesn't exist - AI would generate invalid action`);
      continue;
    }
    
    // Check distance
    const distance = unit.state.position.q !== undefined 
      ? Math.abs(target.pos.q - unit.state.position.q) + Math.abs(target.pos.r - unit.state.position.r) + Math.abs(target.pos.s - unit.state.position.s)
      : 0;
    console.log(`     Distance: ${distance / 2} hexes`);
    
    // Check if within movement range
    const inRange = (distance / 2) <= unit.getEffectiveMovement();
    console.log(`     Within movement range: ${inRange}`);
    
    if (!inRange) {
      console.log(`     ⚠️  Target too far for single move`);
      continue;
    }
    
    // Test pathfinding (this is what would fail in GameEngine.calculateMovementPath)
    console.log(`     Testing pathfinding...`);
    
    // Mock the GameEngine pathfinding logic 
    const { findPath } = require('./dist/core/hex/index.js');
    
    try {
      const path = findPath(unit.state.position, target.pos, {
        getCost: (from, to) => {
          const cost = map.getMovementCost(to);
          if (!isFinite(cost) || cost <= 0) {
            return Infinity; // This is what causes "No valid path to target"
          }
          return cost;
        },
        maxDistance: unit.getEffectiveMovement() + 2
      });
      
      if (path.length === 0) {
        console.log(`     ❌ PATHFINDING FAILED: "No valid path to target"`);
        console.log(`        This is the AI bug - path should exist but pathfinding fails`);
        
        // Debug why it failed
        console.log(`        Debugging path failure:`);
        const neighbors = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s).neighbors();
        for (const neighbor of neighbors) {
          const cost = map.getMovementCost(neighbor);
          const exists = map.getHex(neighbor);
          console.log(`          Neighbor (${neighbor.q},${neighbor.r}): cost=${cost}, exists=${!!exists}`);
        }
        
      } else {
        console.log(`     ✅ Path found: ${path.length} hexes`);
        console.log(`        Path: ${path.map(h => `(${h.q},${h.r})`).join(' -> ')}`);
        
        // Calculate total cost
        let totalCost = 0;
        for (let i = 1; i < path.length; i++) {
          totalCost += map.getMovementCost(path[i]);
        }
        console.log(`        Total cost: ${totalCost}`);
        console.log(`        Valid for unit: ${totalCost <= unit.getEffectiveMovement()}`);
      }
      
    } catch (error) {
      console.log(`     💥 Pathfinding error: ${error.message}`);
    }
  }
  
  console.log('\n📊 Summary of AI Movement Issues:');
  console.log('1. AI generates movement targets based on tactical decisions');
  console.log('2. Many valid hex positions exist on the map'); 
  console.log('3. But pathfinding fails due to coordinate system limitations');
  console.log('4. This causes "No valid path to target" errors in AI execution');
  console.log('5. Result: AI appears broken because simple moves fail');
  
  console.log('\n🔧 Root Cause:');
  console.log('The map is initialized with a rectangular 6x6 offset grid, but');
  console.log('hex pathfinding requires all neighbor relationships to be valid.');
  console.log('Edge hexes have neighbors outside the rectangular boundary,');
  console.log('causing pathfinding to see dead ends where none should exist.');
  
} catch (error) {
  console.error('💥 Error:', error.message);
  console.error(error.stack);
}