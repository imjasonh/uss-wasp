#!/usr/bin/env node

/**
 * Debug the coordinate system issue
 */

const { Hex } = require('./dist/core/hex/index.js');

console.log('🔍 Investigating Coordinate System Issue');
console.log('======================================\n');

console.log('📐 Understanding the coordinate conversion:');

// Test how fromOffset creates hex coordinates for a 6x6 map
console.log('\nMap initialization (6x6 using fromOffset):');
const mapHexes = [];
for (let q = 0; q < 6; q++) {
  for (let r = 0; r < 6; r++) {
    const hex = Hex.fromOffset(q, r);
    mapHexes.push(hex);
    console.log(`  Offset (${q}, ${r}) -> Hex (${hex.q}, ${hex.r}, ${hex.s}) -> Key: "${hex.toKey()}"`);
  }
}

console.log('\n🎯 Testing pathfinding scenarios:');

// Start at (0,0) - this should exist
const startHex = new Hex(0, 0);
console.log(`Start position: (${startHex.q}, ${startHex.r}, ${startHex.s}) -> Key: "${startHex.toKey()}"`);

// Check if start position exists in map
const startExists = mapHexes.some(hex => hex.toKey() === startHex.toKey());
console.log(`Start position exists in map: ${startExists}`);

// Test the neighbors of (0,0)
console.log('\nNeighbors of (0,0):');
const neighbors = startHex.neighbors();
for (const neighbor of neighbors) {
  const exists = mapHexes.some(hex => hex.toKey() === neighbor.toKey());
  console.log(`  (${neighbor.q}, ${neighbor.r}, ${neighbor.s}) -> Key: "${neighbor.toKey()}" -> Exists: ${exists}`);
}

// Test target positions
console.log('\nTesting target positions:');
const targets = [
  new Hex(1, 0, -1),   // East
  new Hex(0, 1, -1),   // Southeast  
  new Hex(2, 0, -2),   // Two hexes east
  new Hex(1, 1, -2),   // Diagonal
];

for (const target of targets) {
  const exists = mapHexes.some(hex => hex.toKey() === target.toKey());
  console.log(`  (${target.q}, ${target.r}, ${target.s}) -> Key: "${target.toKey()}" -> Exists: ${exists}`);
}

console.log('\n🔍 Reverse lookup - which offset coordinates create our target hexes:');
for (const target of targets) {
  console.log(`\nTarget hex (${target.q}, ${target.r}, ${target.s}):`);
  const offset = target.toOffset();
  console.log(`  Converts to offset: (${offset.col}, ${offset.row})`);
  
  // Check if this offset is within our 6x6 map bounds
  const inBounds = offset.col >= 0 && offset.col < 6 && offset.row >= 0 && offset.row < 6;
  console.log(`  Offset in bounds (0-5): ${inBounds}`);
  
  if (inBounds) {
    // Recreate hex from offset
    const recreated = Hex.fromOffset(offset.col, offset.row);
    console.log(`  Recreated from offset: (${recreated.q}, ${recreated.r}, ${recreated.s})`);
    console.log(`  Matches target: ${recreated.toKey() === target.toKey()}`);
  }
}

console.log('\n🎯 Solution Analysis:');
console.log('The issue is that the map is initialized using offset coordinates (0-5, 0-5),');
console.log('but the pathfinding uses cube coordinates, and not all cube coordinate neighbors');
console.log('map back to valid offset coordinates within the 6x6 grid.');
console.log('');
console.log('For example:');
console.log('- Hex (0,0) has neighbor (-1,0) which converts to offset (-1, 0) = OUT OF BOUNDS');
console.log('- Hex (0,0) has neighbor (0,-1) which converts to offset (0, -0.5) = OUT OF BOUNDS');
console.log('');
console.log('This causes pathfinding to see many neighbors as invalid (returning Infinity cost).');