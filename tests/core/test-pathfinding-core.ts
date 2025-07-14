#!/usr/bin/env npx tsx

/**
 * Core pathfinding test - examine pathfinding issues without AI dependencies
 */

// Use imports for the compiled modules
import { GameMap } from '../../dist/core/game/Map.js';
import { GameState } from '../../dist/core/game/GameState.js';
import { Player } from '../../dist/core/game/Player.js';
import { Hex, findPath } from '../../dist/core/hex/index.js';
import { UnitType, PlayerSide } from '../../dist/core/game/types.js';

interface PathfindingOptions {
    getCost: (from: Hex, to: Hex) => number;
    maxDistance: number;
}

console.log('🔍 Core Pathfinding Investigation');
console.log('=================================\n');

try {
    // Create minimal test setup
    const map = new GameMap(6, 6);
    console.log('✅ Map created (6x6)');

    // Test basic hex coordinate system
    console.log('\n📐 Testing hex coordinate system:');
    const hex1 = new Hex(0, 0);  // Start position
    const hex2 = new Hex(1, 0);  // Adjacent east
    const hex3 = new Hex(2, 0);  // Two hexes east
    const hex4 = new Hex(1, 1);  // Diagonal
    
    console.log(`Hex (0,0): q=${hex1.q}, r=${hex1.r}, s=${hex1.s}`);
    console.log(`Hex (1,0): q=${hex2.q}, r=${hex2.r}, s=${hex2.s}`);
    console.log(`Distance from (0,0) to (1,0): ${hex1.distanceTo(hex2)}`);
    console.log(`Distance from (0,0) to (2,0): ${hex1.distanceTo(hex3)}`);
    console.log(`Distance from (0,0) to (1,1): ${hex1.distanceTo(hex4)}`);

    // Test map hex access
    console.log('\n🗺️  Testing map hex access:');
    const mapHex1 = map.getHex(hex1);
    const mapHex2 = map.getHex(hex2);
    const mapHex3 = map.getHex(hex3);
    
    console.log(`Map hex at (0,0): ${mapHex1 ? 'EXISTS' : 'MISSING'}`);
    console.log(`Map hex at (1,0): ${mapHex2 ? 'EXISTS' : 'MISSING'}`);
    console.log(`Map hex at (2,0): ${mapHex3 ? 'EXISTS' : 'MISSING'}`);
    
    if (mapHex1) console.log(`  Terrain: ${mapHex1.terrain}`);
    if (mapHex2) console.log(`  Terrain: ${mapHex2.terrain}`);

    // Test movement costs
    console.log('\n💰 Testing movement costs:');
    const cost1 = map.getMovementCost(hex1);
    const cost2 = map.getMovementCost(hex2);
    const cost3 = map.getMovementCost(hex3);
    
    console.log(`Movement cost (0,0): ${cost1}`);
    console.log(`Movement cost (1,0): ${cost2}`);
    console.log(`Movement cost (2,0): ${cost3}`);

    // Test core pathfinding algorithm
    console.log('\n🛤️  Testing core pathfinding algorithm:');
    
    const testCases = [
        { name: 'Adjacent (1 hex)', start: hex1, end: hex2 },
        { name: 'Two hexes away', start: hex1, end: hex3 },
        { name: 'Diagonal', start: hex1, end: hex4 },
    ];

    for (const testCase of testCases) {
        console.log(`\n  Test: ${testCase.name}`);
        console.log(`    From: (${testCase.start.q}, ${testCase.start.r})`);
        console.log(`    To: (${testCase.end.q}, ${testCase.end.r})`);
        
        // Test with direct pathfinding algorithm
        const options: PathfindingOptions = {
            getCost: (from: Hex, to: Hex) => {
                const hexCost = map.getMovementCost(to);
                console.log(`      getCost(${from.q},${from.r} -> ${to.q},${to.r}) = ${hexCost}`);
                return hexCost;
            },
            maxDistance: 10
        };
        
        const path = findPath(testCase.start, testCase.end, options);
        
        console.log(`    Path found: ${path.length > 0 ? 'YES' : 'NO'}`);
        console.log(`    Path length: ${path.length} hexes`);
        
        if (path.length > 0) {
            console.log(`    Path: ${path.map(h => `(${h.q},${h.r})`).join(' -> ')}`);
            
            // Calculate total path cost
            let totalCost = 0;
            for (let i = 1; i < path.length; i++) {
                const cost = map.getMovementCost(path[i]);
                totalCost += cost;
            }
            console.log(`    Total cost: ${totalCost}`);
        } else {
            console.log(`    ❌ NO PATH FOUND - investigating why...`);
            
            // Debug: Check if target is valid
            const targetHex = map.getHex(testCase.end);
            console.log(`      Target hex exists: ${!!targetHex}`);
            
            if (targetHex) {
                console.log(`      Target terrain: ${targetHex.terrain}`);
                console.log(`      Target cost: ${map.getMovementCost(testCase.end)}`);
            }
            
            // Debug: Check neighbors of start position
            console.log(`      Start neighbors:`);
            const startHex = new Hex(testCase.start.q, testCase.start.r, testCase.start.s);
            const neighbors = startHex.neighbors();
            for (const neighbor of neighbors) {
                const neighborHex = map.getHex(neighbor);
                if (neighborHex) {
                    const neighborCost = map.getMovementCost(neighbor);
                    console.log(`        (${neighbor.q},${neighbor.r}): cost=${neighborCost}, terrain=${neighborHex.terrain}`);
                } else {
                    console.log(`        (${neighbor.q},${neighbor.r}): INVALID HEX`);
                }
            }
        }
    }

    // Test edge cases
    console.log('\n🔬 Testing edge cases:');
    
    // Test same position
    const sameOptions: PathfindingOptions = {
        getCost: (from: Hex, to: Hex) => map.getMovementCost(to),
        maxDistance: 10
    };
    
    const samePath = findPath(hex1, hex1, sameOptions);
    console.log(`  Same position path: ${samePath.length} hexes`);
    
    // Test invalid target
    const invalidHex = new Hex(10, 10); // Outside 6x6 map
    const invalidOptions: PathfindingOptions = {
        getCost: (from: Hex, to: Hex) => {
            const cost = map.getMovementCost(to);
            console.log(`    Invalid test getCost(${from.q},${from.r} -> ${to.q},${to.r}) = ${cost}`);
            return cost;
        },
        maxDistance: 20
    };
    
    const invalidPath = findPath(hex1, invalidHex, invalidOptions);
    console.log(`  Invalid target path: ${invalidPath.length} hexes`);

} catch (error) {
    console.error('💥 Error:', (error as Error).message);
    console.error((error as Error).stack);
}