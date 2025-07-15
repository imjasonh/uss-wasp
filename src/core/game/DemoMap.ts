/**
 * Demo map creation for testing and simulation
 */

import { GameMap } from './Map';
import { Hex } from '../hex';
import { TerrainType, ObjectiveType } from './types';

// Map dimensions
const MAP_WIDTH = 12;
const MAP_HEIGHT = 8;

// Terrain positioning constants
const DEEP_WATER_ROW = 7;
const SHALLOW_WATER_ROW = 6;
const BEACH_ROW = 5;
const URBAN_AREA = { minQ: 2, maxQ: 5, minR: 2, maxR: 4 };
const HILLS_AREA = { minQ: 6, maxQ: 9, minR: 1, maxR: 3 };
const WOODS_AREA = { minQ: 7, maxQ: 10, minR: 2, maxR: 5 };

// Objective positions
const CIVIC_CENTER_POS = { q: 3, r: 3 };
const PORT_POS = { q: 1, r: 4 };
const AIRFIELD_POS = { q: 8, r: 2 };
const COMMS_HUB_POS = { q: 6, r: 1 };

/**
 * Determine terrain type based on position
 */
function getTerrainForPosition(q: number, r: number): TerrainType {
  if (r === DEEP_WATER_ROW) {
    return TerrainType.DEEP_WATER;
  }
  if (r === SHALLOW_WATER_ROW) {
    return TerrainType.SHALLOW_WATER;
  }
  if (r === BEACH_ROW) {
    return TerrainType.BEACH;
  }
  if (
    q >= URBAN_AREA.minQ &&
    q <= URBAN_AREA.maxQ &&
    r >= URBAN_AREA.minR &&
    r <= URBAN_AREA.maxR
  ) {
    return TerrainType.URBAN;
  }
  if (
    q >= HILLS_AREA.minQ &&
    q <= HILLS_AREA.maxQ &&
    r >= HILLS_AREA.minR &&
    r <= HILLS_AREA.maxR
  ) {
    return TerrainType.HILLS;
  }
  if (
    q >= WOODS_AREA.minQ &&
    q <= WOODS_AREA.maxQ &&
    r >= WOODS_AREA.minR &&
    r <= WOODS_AREA.maxR
  ) {
    return TerrainType.HEAVY_WOODS;
  }
  return TerrainType.CLEAR;
}

/**
 * Create a demo map for testing and simulation
 */
export function createDemoMap(): GameMap {
  const map = new GameMap(MAP_WIDTH, MAP_HEIGHT);

  // Create terrain
  for (let q = 0; q < MAP_WIDTH; q++) {
    for (let r = 0; r < MAP_HEIGHT; r++) {
      const hex = Hex.fromOffset(q, r);
      const terrain = getTerrainForPosition(q, r);
      map.setTerrain(hex, terrain);
    }
  }

  // Add objectives
  map.addObjective(
    Hex.fromOffset(CIVIC_CENTER_POS.q, CIVIC_CENTER_POS.r),
    ObjectiveType.CIVIC_CENTER,
    'Town Center'
  );
  map.addObjective(Hex.fromOffset(PORT_POS.q, PORT_POS.r), ObjectiveType.PORT, 'Main Port');
  map.addObjective(
    Hex.fromOffset(AIRFIELD_POS.q, AIRFIELD_POS.r),
    ObjectiveType.AIRFIELD,
    'Regional Airport'
  );
  map.addObjective(
    Hex.fromOffset(COMMS_HUB_POS.q, COMMS_HUB_POS.r),
    ObjectiveType.COMMS_HUB,
    'Communication Station'
  );

  return map;
}
