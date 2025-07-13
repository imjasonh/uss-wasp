#!/usr/bin/env node

/**
 * Debug script to understand coordinate system issues
 */

const { Hex } = require('./dist/core/hex/Hex.js');
const { GameMap } = require('./dist/core/game/Map.js');

console.log('🔍 Coordinate System Debug Test');
console.log('===============================\n');

// Test what coordinates the 6x6 map actually creates
console.log('📍 Map creation for 6x6 grid:');
console.log('Offset coordinates -> Cube coordinates\n');

for (let col = 0; col < 6; col++) {
  for (let row = 0; row < 6; row++) {
    const hex = Hex.fromOffset(col, row);
    console.log(`Offset (${col}, ${row}) -> Cube (${hex.q}, ${hex.r}, ${hex.s})`);
  }
}

console.log('\n📍 Creating actual map to see what hexes exist:');
const map = new GameMap(6, 6);

console.log('\n🗺️  Testing specific coordinates:');
const testCoords = [
  new Hex(0, 0), new Hex(1, 0), new Hex(2, 0), new Hex(3, 0), new Hex(4, 0), new Hex(5, 0),
  new Hex(0, 1), new Hex(1, 1), new Hex(2, 1), new Hex(3, 1), new Hex(4, 1), new Hex(5, 1),
  new Hex(3, 3), new Hex(4, 4), new Hex(5, 5)
];

for (const coord of testCoords) {
  const hex = map.getHex(coord);
  const exists = hex !== undefined;
  console.log(`(${coord.q}, ${coord.r}, ${coord.s}) -> ${exists ? 'EXISTS' : 'MISSING'}`);
}

console.log('\n📊 All hexes that DO exist in the map:');
const allHexes = map.getAllHexes();
console.log(`Total hexes: ${allHexes.length}`);
for (const hex of allHexes.slice(0, 20)) { // Show first 20
  console.log(`  (${hex.coordinate.q}, ${hex.coordinate.r}, ${hex.coordinate.s})`);
}
if (allHexes.length > 20) {
  console.log(`  ... and ${allHexes.length - 20} more`);
}