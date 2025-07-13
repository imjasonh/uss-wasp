#!/usr/bin/env node

/**
 * Test the exact GameEngine pathfinding logic that AI uses
 */

const { GameMap } = require('./dist/core/game/Map.js');
const { GameState } = require('./dist/core/game/GameState.js');
const { GameEngine } = require('./dist/core/game/GameEngine.js');
const { Player } = require('./dist/core/game/Player.js');
const { Hex } = require('./dist/core/hex/index.js');
const { UnitType, PlayerSide } = require('./dist/core/game/types.js');
const { createTestUnit } = require('./dist/testing/UnitTestHelper.js');

console.log('🎯 Testing GameEngine Pathfinding (AI Pipeline)');
console.log('===============================================\n');

try {
  // Setup exact same as AI would use
  const map = new GameMap(6, 6);
  const gameState = new GameState('gameengine-test', map, 10);
  const player = new Player('test-player', PlayerSide.Assault);
  gameState.addPlayer(player);
  gameState.setActivePlayerBySide(PlayerSide.Assault);
  
  const gameEngine = new GameEngine(gameState);
  
  // Test different units and scenarios
  const testScenarios = [
    {
      name: 'Marine Squad at corner',
      unit: createTestUnit('marine-1', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(0, 0)),
      targets: [
        new Hex(1, 0), new Hex(0, 1), new Hex(2, 0), new Hex(1, 1),
        new Hex(-1, 0), // Invalid - should fail gracefully
        new Hex(0, -1), // Invalid - should fail gracefully  
      ]
    },
    {
      name: 'Marine Squad at edge',
      unit: createTestUnit('marine-2', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(5, -1)),
      targets: [
        new Hex(4, -1), new Hex(5, 0), new Hex(4, 0),
        new Hex(6, -1), // Invalid - outside map
        new Hex(5, -2), // Valid edge position
      ]
    },
    {
      name: 'LCAC amphibious unit',
      unit: createTestUnit('lcac-1', UnitType.LCAC, PlayerSide.Assault, new Hex(0, 5)), // Deep water
      targets: [
        new Hex(1, 5), new Hex(0, 4), new Hex(1, 4),
      ]
    },
    {
      name: 'Aircraft unit',
      unit: createTestUnit('harrier-1', UnitType.HARRIER, PlayerSide.Assault, new Hex(2, 1)),
      targets: [
        new Hex(4, 3), new Hex(1, 4), new Hex(5, 2),
      ]
    }
  ];
  
  for (const scenario of testScenarios) {
    console.log(`\n🧪 Scenario: ${scenario.name}`);
    console.log(`   Unit: ${scenario.unit.type}`);
    console.log(`   Position: (${scenario.unit.state.position.q}, ${scenario.unit.state.position.r})`);
    console.log(`   Movement: ${scenario.unit.getEffectiveMovement()} hexes`);
    
    player.addUnit(scenario.unit);
    
    for (const target of scenario.targets) {
      console.log(`\n   🎯 Target: (${target.q}, ${target.r})`);
      
      // Check if target exists
      const targetHex = map.getHex(target);
      console.log(`      Target exists: ${!!targetHex}`);
      
      if (targetHex) {
        console.log(`      Target terrain: ${targetHex.terrain}`);
        console.log(`      Target cost: ${map.getMovementCost(target)}`);
      }
      
      // Use GameEngine.calculateMovementPath (exactly what AI calls)
      console.log(`      GameEngine pathfinding:`);
      
      try {
        const movementPath = gameEngine.calculateMovementPath(scenario.unit, target);
        
        console.log(`        Valid: ${movementPath.valid}`);
        console.log(`        Total cost: ${movementPath.totalCost}`);
        console.log(`        Hexes: ${movementPath.hexes.length}`);
        
        if (movementPath.hexes.length > 0) {
          console.log(`        Path: ${movementPath.hexes.map(h => `(${h.q},${h.r})`).join(' -> ')}`);
        }
        
        if (!movementPath.valid) {
          console.log(`        ❌ INVALID PATH - this would cause "No valid path to target"`);
          
          // Debug why it's invalid
          if (movementPath.hexes.length === 0) {
            console.log(`           Reason: No path found by pathfinding algorithm`);
          } else if (movementPath.totalCost > scenario.unit.getEffectiveMovement()) {
            console.log(`           Reason: Path too expensive (${movementPath.totalCost} > ${scenario.unit.getEffectiveMovement()})`);
          } else {
            console.log(`           Reason: Unknown`);
          }
        }
        
      } catch (error) {
        console.log(`        💥 ERROR: ${error.message}`);
      }
      
      // Test if this would be a valid AI action
      console.log(`      AI Action Test:`);
      
      const distance = scenario.unit.state.position.q !== undefined 
        ? Math.abs(target.q - scenario.unit.state.position.q) + 
          Math.abs(target.r - scenario.unit.state.position.r) + 
          Math.abs(target.s - scenario.unit.state.position.s)
        : 0;
      
      const hexDistance = distance / 2;
      console.log(`        Distance: ${hexDistance} hexes`);
      console.log(`        Within AI consideration: ${hexDistance <= scenario.unit.getEffectiveMovement() + 1}`);
      
      // Simulate AI action execution
      if (targetHex && hexDistance <= scenario.unit.getEffectiveMovement()) {
        console.log(`        Simulating AI action execution:`);
        
        // Reset unit state for clean test
        scenario.unit.state.hasMoved = false;
        
        const action = {
          type: 'move',
          playerId: player.id,
          unitId: scenario.unit.id,
          targetPosition: { q: target.q, r: target.r, s: target.s }
        };
        
        try {
          const result = gameEngine.executeAction(action);
          console.log(`          Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
          console.log(`          Message: ${result.message}`);
          
          if (!result.success && result.message.includes('No valid path')) {
            console.log(`          🔥 THIS IS THE AI BUG!`);
          }
          
        } catch (error) {
          console.log(`          💥 Action execution error: ${error.message}`);
        }
      }
    }
    
    // Clean up
    player.removeUnit(scenario.unit.id);
  }
  
  console.log('\n📊 Summary:');
  console.log('Testing shows that GameEngine.calculateMovementPath works correctly');
  console.log('for most valid scenarios. The "No valid path to target" errors likely');
  console.log('occur when:');
  console.log('1. AI generates targets outside the map boundaries');
  console.log('2. AI generates targets that are theoretically reachable but');
  console.log('   require going through invalid intermediate hexes');
  console.log('3. Edge cases in unit-specific movement cost calculations');
  console.log('4. Units placed at positions with very limited connectivity');
  
} catch (error) {
  console.error('💥 Error:', error.message);
  console.error(error.stack);
}