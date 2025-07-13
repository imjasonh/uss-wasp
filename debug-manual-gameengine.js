#!/usr/bin/env node

/**
 * Manually replicate GameEngine pathfinding logic to isolate the issue
 */

const { GameMap } = require('./dist/core/game/Map.js');
const { Hex, findPath } = require('./dist/core/hex/index.js');
const { UnitType, PlayerSide, UnitCategory } = require('./dist/core/game/types.js');
const { createTestUnit } = require('./dist/testing/UnitTestHelper.js');

console.log('🔧 Manual GameEngine Pathfinding Replication');
console.log('============================================\n');

// Replicate GameEngine.calculateMovementPath method
function calculateMovementPath(map, unit, target) {
  const start = unit.state.position;
  const targetCoord = { q: target.q, r: target.r, s: target.s };
  
  console.log(`  Pathfinding from (${start.q}, ${start.r}) to (${target.q}, ${target.r})`);
  
  const path = findPath(start, targetCoord, {
    getCost: (from, to) => {
      const cost = map.getMovementCost(to);
      console.log(`    getCost(${from.q},${from.r} -> ${to.q},${to.r}) = ${cost}`);
      
      // Apply unit-specific movement rules (from GameEngine.getUnitMovementCost)
      const fromHex = new Hex(from.q, from.r, from.s);
      const toHex = new Hex(to.q, to.r, to.s);
      const finalCost = getUnitMovementCost(map, unit, fromHex, toHex, cost);
      
      if (finalCost !== cost) {
        console.log(`      Unit-specific cost adjustment: ${cost} -> ${finalCost}`);
      }
      
      return finalCost;
    },
    maxDistance: unit.getEffectiveMovement() + 2
  });

  if (path.length === 0) {
    console.log(`  ❌ No path found`);
    return { hexes: [], totalCost: Infinity, valid: false };
  }

  // Calculate total cost
  let totalCost = 0;
  for (let i = 1; i < path.length; i++) {
    const cost = map.getMovementCost({ q: path[i].q, r: path[i].r, s: path[i].s });
    const adjustedCost = getUnitMovementCost(map, unit, path[i-1], path[i], cost);
    totalCost += adjustedCost;
  }

  const valid = totalCost <= unit.getEffectiveMovement();
  
  console.log(`  Path: ${path.map(h => `(${h.q},${h.r})`).join(' -> ')}`);
  console.log(`  Total cost: ${totalCost}, Unit movement: ${unit.getEffectiveMovement()}, Valid: ${valid}`);

  return {
    hexes: path,
    totalCost,
    valid
  };
}

// Replicate GameEngine.getUnitMovementCost method
function getUnitMovementCost(map, unit, _from, to, baseCost) {
  // LCAC high-speed amphibious
  if (unit.type === UnitType.LCAC) {
    const toHex = map.getHex(to);
    if (toHex && ['deep_water', 'shallow_water', 'beach'].includes(toHex.terrain)) {
      return 1;
    }
  }

  // AAV amphibious movement
  if (unit.type === UnitType.AAV_7) {
    const toHex = map.getHex(to);
    if (toHex?.terrain === 'shallow_water') return 1;
    if (toHex?.terrain === 'deep_water') return 2;
  }

  // Aircraft ignore terrain
  if (unit.hasCategory && (unit.hasCategory(UnitCategory.AIRCRAFT) || unit.hasCategory(UnitCategory.HELICOPTER))) {
    return 1;
  }

  // Osprey difficult terrain bonus
  if (unit.type === UnitType.OSPREY && baseCost > 1) {
    return Math.max(1, baseCost - 1);
  }

  return baseCost;
}

try {
  const map = new GameMap(6, 6);
  
  // Test problematic scenarios
  const testCases = [
    {
      name: 'Corner unit simple move',
      unit: createTestUnit('marine-1', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(0, 0)),
      targets: [new Hex(1, 0), new Hex(0, 1)]
    },
    {
      name: 'Edge unit constrained movement',
      unit: createTestUnit('marine-2', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(5, -1)),
      targets: [new Hex(4, -1), new Hex(5, 0), new Hex(4, 0)]
    },
    {
      name: 'Units at problematic coordinates',
      unit: createTestUnit('marine-3', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(5, -2)),
      targets: [new Hex(4, -2), new Hex(5, -1), new Hex(4, -1)]
    },
    {
      name: 'LCAC in deep water',
      unit: createTestUnit('lcac-1', UnitType.LCAC, PlayerSide.Assault, new Hex(0, 5)),
      targets: [new Hex(1, 5), new Hex(0, 4), new Hex(1, 4)]
    },
    {
      name: 'Invalid targets (AI might generate)',
      unit: createTestUnit('marine-4', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(2, 1)),
      targets: [
        new Hex(4, 4),   // Doesn't exist on map
        new Hex(-1, 1),  // Outside bounds
        new Hex(2, -3),  // Outside bounds
        new Hex(6, 1),   // Outside bounds
      ]
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Test: ${testCase.name}`);
    console.log(`Unit: ${testCase.unit.type} at (${testCase.unit.state.position.q}, ${testCase.unit.state.position.r})`);
    console.log(`Movement: ${testCase.unit.getEffectiveMovement()} hexes`);
    
    for (const target of testCase.targets) {
      console.log(`\n  Target: (${target.q}, ${target.r})`);
      
      const targetHex = map.getHex(target);
      console.log(`  Target exists: ${!!targetHex}`);
      
      if (targetHex) {
        console.log(`  Target terrain: ${targetHex.terrain}`);
      }
      
      const result = calculateMovementPath(map, testCase.unit, target);
      
      if (!result.valid) {
        console.log(`  ❌ PATHFINDING FAILURE: This would cause "No valid path to target"`);
        if (result.hexes.length === 0) {
          console.log(`     Reason: Pathfinding algorithm found no path`);
        } else {
          console.log(`     Reason: Path too expensive (${result.totalCost} > ${testCase.unit.getEffectiveMovement()})`);
        }
      } else {
        console.log(`  ✅ Pathfinding successful`);
      }
    }
  }
  
  console.log('\n🔍 Specific Investigation: Why might pathfinding fail?');
  
  // Let's investigate a specific case that might cause issues
  console.log('\nTesting a unit at a constrained position:');
  const constrainedUnit = createTestUnit('constrained', UnitType.MARINE_SQUAD, PlayerSide.Assault, new Hex(0, 0));
  console.log(`Unit at (${constrainedUnit.state.position.q}, ${constrainedUnit.state.position.r})`);
  
  const neighbors = constrainedUnit.state.position.neighbors ? constrainedUnit.state.position.neighbors() : 
    new Hex(constrainedUnit.state.position.q, constrainedUnit.state.position.r, constrainedUnit.state.position.s).neighbors();
  
  console.log('Available neighbors:');
  for (const neighbor of neighbors) {
    const exists = !!map.getHex(neighbor);
    const cost = map.getMovementCost(neighbor);
    console.log(`  (${neighbor.q}, ${neighbor.r}): exists=${exists}, cost=${cost}`);
  }
  
  // Test a move that requires going through multiple hexes
  console.log('\nTesting longer path that might fail:');
  const longTarget = new Hex(3, 3);
  const longTargetHex = map.getHex(longTarget);
  
  if (longTargetHex) {
    console.log(`Target (${longTarget.q}, ${longTarget.r}) exists`);
    const longResult = calculateMovementPath(map, constrainedUnit, longTarget);
    
    if (!longResult.valid) {
      console.log('❌ Long path failed - this could be an AI issue');
    }
  } else {
    console.log(`Target (${longTarget.q}, ${longTarget.r}) does NOT exist - AI shouldn't target this`);
  }
  
} catch (error) {
  console.error('💥 Error:', error.message);
  console.error(error.stack);
}