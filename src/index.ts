/**
 * Main entry point for USS Wasp game engine
 */

import { Hex } from './core/hex';

console.log('USS Wasp: Operation Beachhead Inferno');
console.log('====================================');

// Test hex grid functionality
const center = new Hex(0, 0, 0);
const neighbors = center.neighbors();

console.log(`Center hex: ${center.toString()}`);
console.log(`Neighbors: ${neighbors.map(h => h.toString()).join(', ')}`);

// Test distance calculation
const target = new Hex(3, -2, -1);
console.log(`Distance to ${target.toString()}: ${center.distanceTo(target)}`);

// Test range calculation
const range2 = center.range(2);
console.log(`Hexes within range 2: ${range2.length}`);

export * from './core/hex';