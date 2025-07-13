#!/usr/bin/env node

/**
 * Test edge cases that might be causing AI pathfinding failures
 */

const { GameMap } = require('./dist/core/game/Map.js');
const { GameState } = require('./dist/core/game/GameState.js');
const { Player } = require('./dist/core/game/Player.js');
const { Hex, findPath } = require('./dist/core/hex/index.js');
const { UnitType, PlayerSide } = require('./dist/core/game/types.js');
const { createTestUnit } = require('./dist/testing/UnitTestHelper.js');

console.log('🔬 Testing Edge Cases for AI Pathfinding Failures');
console.log('=================================================\n');

try {
  const map = new GameMap(6, 6);
  const gameState = new GameState('edge-test', map, 10);
  const player = new Player('test-player', PlayerSide.Assault);
  gameState.addPlayer(player);
  gameState.setActivePlayerBySide(PlayerSide.Assault);
  
  // Test from different starting positions, especially edge positions
  const testPositions = [
    { name: 'Corner (0,0)', pos: new Hex(0, 0) },
    { name: 'Edge (5,0)', pos: new Hex(5, 0) },  
    { name: 'Edge (0,5)', pos: new Hex(0, 5) },
    { name: 'Edge (2,-1)', pos: new Hex(2, -1) }, // This might be problematic
    { name: 'Center (2,1)', pos: new Hex(2, 1) },
    { name: 'Edge (5,-2)', pos: new Hex(5, -2) }, // This might be problematic
  ];
  
  for (const startPos of testPositions) {
    console.log(`\n🎯 Testing from ${startPos.name}: (${startPos.pos.q}, ${startPos.pos.r})`);
    
    // Check if starting position exists
    const startHex = map.getHex(startPos.pos);
    if (!startHex) {
      console.log(`   ❌ Starting position doesn't exist on map`);
      continue;
    }
    
    console.log(`   ✅ Starting position exists`);
    
    // Create unit at this position
    const unit = createTestUnit('test-unit', UnitType.MARINE_SQUAD, PlayerSide.Assault, startPos.pos);
    
    // Test movement to nearby positions
    const neighbors = startPos.pos.neighbors();
    console.log(`   Testing movement to ${neighbors.length} neighbors:`);
    
    for (const neighbor of neighbors) {
      const neighborHex = map.getHex(neighbor);
      const exists = !!neighborHex;
      
      console.log(`     -> (${neighbor.q}, ${neighbor.r}): ${exists ? 'EXISTS' : 'MISSING'}`);
      
      if (exists) {
        // Test pathfinding to this neighbor
        const path = findPath(startPos.pos, neighbor, {
          getCost: (from, to) => {
            const cost = map.getMovementCost(to);
            return cost;
          },
          maxDistance: 5
        });
        
        console.log(`       Path: ${path.length > 0 ? 'FOUND' : 'FAILED'}`);
        if (path.length === 0) {
          console.log(`       ❌ PATHFINDING FAILURE for simple adjacent move!`);
          
          // Debug the cost calculation
          const cost = map.getMovementCost(neighbor);
          console.log(`         Movement cost: ${cost}`);
          console.log(`         Cost is finite: ${isFinite(cost)}`);
          console.log(`         Cost > 0: ${cost > 0}`);
        }
      }
    }
    
    // Test some longer distance movements
    console.log(`   Testing longer movements:`);
    const longerTargets = [
      new Hex(startPos.pos.q + 2, startPos.pos.r),
      new Hex(startPos.pos.q, startPos.pos.r + 2),
      new Hex(startPos.pos.q + 1, startPos.pos.r + 1),
    ];
    
    for (const target of longerTargets) {
      const targetHex = map.getHex(target);
      if (targetHex) {
        const path = findPath(startPos.pos, target, {
          getCost: (from, to) => map.getMovementCost(to),
          maxDistance: 10
        });
        
        console.log(`     To (${target.q}, ${target.r}): ${path.length > 0 ? 'FOUND' : 'FAILED'}`);
        if (path.length === 0) {
          console.log(`       ❌ Long distance pathfinding failure!`);
        }
      }
    }
  }
  
  // Now let's test AI target generation specifically
  console.log('\n🤖 Testing AI-style Target Generation:');
  
  // Simulate how AI might generate movement targets
  const aiUnit = createTestUnit('ai-unit', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(1, 1));
  console.log(`AI unit at (${aiUnit.state.position.q}, ${aiUnit.state.position.r})`);
  
  // AI might try to move toward an "enemy" at some position
  const enemyPositions = [
    new Hex(4, 4),
    new Hex(3, 0),
    new Hex(0, 4),
    new Hex(5, -1), // This might be problematic
  ];
  
  for (const enemyPos of enemyPositions) {
    console.log(`\n  Enemy at (${enemyPos.q}, ${enemyPos.r}):`);
    
    const enemyExists = !!map.getHex(enemyPos);
    console.log(`    Enemy position exists: ${enemyExists}`);
    
    if (!enemyExists) {
      console.log(`    ❌ AI would target non-existent position!`);
      continue;
    }
    
    // AI calculates direction toward enemy
    const dq = enemyPos.q - aiUnit.state.position.q;
    const dr = enemyPos.r - aiUnit.state.position.r;
    
    // AI tries to move 1-2 hexes in that direction
    const stepQ = Math.sign(dq);
    const stepR = Math.sign(dr);
    
    const aiTarget = new Hex(
      aiUnit.state.position.q + stepQ,
      aiUnit.state.position.r + stepR
    );
    
    console.log(`    AI target: (${aiTarget.q}, ${aiTarget.r})`);
    
    const targetExists = !!map.getHex(aiTarget);
    console.log(`    AI target exists: ${targetExists}`);
    
    if (targetExists) {
      const path = findPath(aiUnit.state.position, aiTarget, {
        getCost: (from, to) => map.getMovementCost(to),
        maxDistance: 5
      });
      
      console.log(`    Path to AI target: ${path.length > 0 ? 'FOUND' : 'FAILED'}`);
      if (path.length === 0) {
        console.log(`    ❌ AI pathfinding would fail!`);
      }
    } else {
      console.log(`    ❌ AI would generate invalid target!`);
    }
  }
  
  console.log('\n🔍 Specific Investigation: AI Decision Logic Issues');
  
  // Let's check what happens with coordinates that might be generated by AI
  // AI logic often generates positions using simple math that might go outside valid ranges
  
  const problematicCoords = [
    new Hex(-1, 0), // AI trying to move west from edge
    new Hex(0, -1), // AI trying to move northwest from edge
    new Hex(6, 0),  // AI trying to move east from far edge
    new Hex(0, 6),  // AI trying to move south from far edge
    new Hex(1, -2), // Invalid coordinate that AI might generate
    new Hex(-1, 3), // Invalid coordinate that AI might generate
  ];
  
  console.log('\n  Testing AI-generated problematic coordinates:');
  for (const coord of problematicCoords) {
    const exists = !!map.getHex(coord);
    const cost = map.getMovementCost(coord);
    console.log(`    (${coord.q}, ${coord.r}): exists=${exists}, cost=${cost}`);
    
    if (!exists && isFinite(cost)) {
      console.log(`      ⚠️  WARNING: Position doesn't exist but returns finite cost!`);
    }
    if (exists && !isFinite(cost)) {
      console.log(`      ⚠️  WARNING: Position exists but returns infinite cost!`);
    }
  }
  
} catch (error) {
  console.error('💥 Error:', error.message);
  console.error(error.stack);
}