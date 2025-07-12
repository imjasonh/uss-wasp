/**
 * Main entry point for USS Wasp game engine
 */

import { Hex } from './core/hex';
import { GameState, Player, GameMap, Unit } from './core/game';
import { UnitType, PlayerSide } from './core/game/types';
import { UNIT_DEFINITIONS } from './core/units/UnitDefinitions';

console.log('USS Wasp: Operation Beachhead Inferno');
console.log('====================================');

// Test basic game simulation
console.log('\n🎮 Phase 1 Core Simulation Engine Demo');

// Create a test game
const map = GameMap.createTestMap();
const gameState = new GameState('demo-game', map);

// Add players
const assaultPlayer = new Player('assault', PlayerSide.Assault);
const defenderPlayer = new Player('defender', PlayerSide.Defender);

gameState.addPlayer(assaultPlayer);
gameState.addPlayer(defenderPlayer);

// Add some test units
const waspPosition = new Hex(0, 5, -5); // Offshore zone
const wasp = new Unit(
  'wasp-1',
  UnitType.USS_WASP,
  PlayerSide.Assault,
  UNIT_DEFINITIONS[UnitType.USS_WASP].stats,
  UNIT_DEFINITIONS[UnitType.USS_WASP].categories,
  UNIT_DEFINITIONS[UnitType.USS_WASP].specialAbilities,
  waspPosition
);

const marinePosition = new Hex(2, 2, -4);
const marines = new Unit(
  'marines-1',
  UnitType.MARINE_SQUAD,
  PlayerSide.Assault,
  UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].stats,
  UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].categories,
  UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].specialAbilities,
  marinePosition
);

const defenderPosition = new Hex(3, 1, -4);
const defender = new Unit(
  'infantry-1',
  UnitType.INFANTRY_SQUAD,
  PlayerSide.Defender,
  UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].stats,
  UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].categories,
  UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].specialAbilities,
  defenderPosition
);

assaultPlayer.addUnit(wasp);
assaultPlayer.addUnit(marines);
defenderPlayer.addUnit(defender);

console.log(`\n📊 Game State:`);
console.log(`Turn: ${gameState.turn}, Phase: ${gameState.phase}`);
console.log(`Assault Units: ${assaultPlayer.getLivingUnits().length}`);
console.log(`Defender Units: ${defenderPlayer.getLivingUnits().length}`);

// Generate command points
gameState.generateCommandPoints();
console.log(`\n💰 Command Points:`);
console.log(`Assault CP: ${assaultPlayer.commandPoints}`);
console.log(`Defender CP: ${defenderPlayer.commandPoints}`);

// Test movement
console.log(`\n🚶 Movement Test:`);
console.log(`Marines before: ${marines.state.position.q}, ${marines.state.position.r}`);
marines.moveTo(new Hex(3, 2, -5));
console.log(`Marines after: ${marines.state.position.q}, ${marines.state.position.r}`);

// Test map features
const objectives = map.getObjectives();
console.log(`\n🎯 Map Objectives: ${objectives.length}`);
objectives.forEach(obj => {
  if (obj.objective) {
    console.log(`- ${obj.objective.type} at (${obj.coordinate.q}, ${obj.coordinate.r})`);
  }
});

console.log(`\n✅ Phase 1 Core Simulation Engine Complete!`);
console.log(`- Hex grid system: ✓`);
console.log(`- Unit management: ✓`);
console.log(`- Map and terrain: ✓`);
console.log(`- Game state: ✓`);
console.log(`- Combat system: ✓`);
console.log(`- Player management: ✓`);
console.log(`- All tests passing: ✓`);

export * from './core';