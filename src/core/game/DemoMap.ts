/**
 * Demo map creation for testing and simulation
 */

import { GameMap } from './Map';
import { Hex } from '../hex';
import { TerrainType, ObjectiveType } from './types';

/**
 * Create a demo map for testing and simulation
 */
export function createDemoMap(): GameMap {
  const map = new GameMap(12, 8);
  
  // Create a 12x8 hex grid
  for (let q = 0; q < 12; q++) {
    for (let r = 0; r < 8; r++) {
      const hex = Hex.fromOffset(q, r);
      
      // Define terrain based on position
      let terrain: TerrainType;
      
      if (r === 7) {
        // Bottom row - deep water (offshore)
        terrain = TerrainType.DEEP_WATER;
      } else if (r === 6) {
        // Near shore - shallow water
        terrain = TerrainType.SHALLOW_WATER;
      } else if (r === 5) {
        // Beach
        terrain = TerrainType.BEACH;
      } else if (q >= 2 && q <= 5 && r >= 2 && r <= 4) {
        // Urban area
        terrain = TerrainType.URBAN;
      } else if (q >= 6 && q <= 9 && r >= 1 && r <= 3) {
        // Hills
        terrain = TerrainType.HILLS;
      } else if (q >= 7 && q <= 10 && r >= 2 && r <= 5) {
        // Woods
        terrain = TerrainType.HEAVY_WOODS;
      } else {
        // Default to clear terrain
        terrain = TerrainType.CLEAR;
      }
      
      map.setTerrain(hex, terrain);
    }
  }
  
  // Add objectives
  map.addObjective(Hex.fromOffset(3, 3), ObjectiveType.CIVIC_CENTER, 'Town Center');
  map.addObjective(Hex.fromOffset(1, 4), ObjectiveType.PORT, 'Main Port');
  map.addObjective(Hex.fromOffset(8, 2), ObjectiveType.AIRFIELD, 'Regional Airport');
  map.addObjective(Hex.fromOffset(6, 1), ObjectiveType.COMMS_HUB, 'Communication Station');
  
  return map;
}