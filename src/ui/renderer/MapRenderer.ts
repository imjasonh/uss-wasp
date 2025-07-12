/**
 * Map rendering utilities
 */

import { Hex } from '../../core/hex';
import { GameMap } from '../../core/game/Map';
import { TerrainType, ObjectiveType } from '../../core/game/types';

/**
 * Terrain color mapping
 */
export const TERRAIN_COLORS: Record<TerrainType, number> = {
  [TerrainType.DEEP_WATER]: 0x003366,      // Dark blue
  [TerrainType.SHALLOW_WATER]: 0x0066cc,   // Medium blue  
  [TerrainType.BEACH]: 0xffffcc,           // Sandy yellow
  [TerrainType.CLEAR]: 0x90ee90,           // Light green
  [TerrainType.LIGHT_WOODS]: 0x228b22,     // Forest green
  [TerrainType.HEAVY_WOODS]: 0x006400,     // Dark green
  [TerrainType.URBAN]: 0x808080,           // Gray
  [TerrainType.HILLS]: 0x8b7355,           // Brown
  [TerrainType.MOUNTAINS]: 0x654321,       // Dark brown
};

/**
 * Map rendering helper class
 */
export class MapRenderer {
  private gameMap: GameMap;

  constructor(gameMap: GameMap) {
    this.gameMap = gameMap;
  }

  /**
   * Get all hexes for rendering
   */
  getAllHexes(): Hex[] {
    return this.gameMap.getAllHexes().map(mapHex => mapHex.coordinate);
  }

  /**
   * Get terrain color for a hex
   */
  getTerrainColor(hex: Hex): number {
    const mapHex = this.gameMap.getHex(hex);
    if (!mapHex) return TERRAIN_COLORS[TerrainType.CLEAR];
    
    return TERRAIN_COLORS[mapHex.terrain];
  }

  /**
   * Get terrain name for display
   */
  getTerrainName(hex: Hex): string {
    const mapHex = this.gameMap.getHex(hex);
    if (!mapHex) return 'Unknown';
    
    return mapHex.terrain.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Check if hex has an objective
   */
  hasObjective(hex: Hex): boolean {
    const mapHex = this.gameMap.getHex(hex);
    return mapHex?.objective !== undefined;
  }

  /**
   * Get objective info for a hex
   */
  getObjectiveInfo(hex: Hex): { type: string; id: string } | null {
    const mapHex = this.gameMap.getHex(hex);
    if (!mapHex?.objective) return null;
    
    return {
      type: mapHex.objective.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      id: mapHex.objective.id,
    };
  }

  /**
   * Check if hex is in offshore zone
   */
  isOffshoreZone(hex: Hex): boolean {
    return this.gameMap.isOffshoreZone(hex);
  }

  /**
   * Get movement cost for a hex
   */
  getMovementCost(hex: Hex): number {
    return this.gameMap.getMovementCost(hex);
  }

  /**
   * Get defense bonus for a hex
   */
  getDefenseBonus(hex: Hex): number {
    return this.gameMap.getDefenseBonus(hex);
  }

  /**
   * Check if hex blocks line of sight
   */
  blocksLOS(hex: Hex): boolean {
    return this.gameMap.blocksLOS(hex);
  }

  /**
   * Get hex info for UI display
   */
  getHexInfo(hex: Hex): {
    coordinate: string;
    terrain: string;
    movementCost: number;
    defenseBonus: number;
    blocksLOS: boolean;
    isOffshore: boolean;
    objective?: { type: string; id: string };
  } {
    const terrain = this.getTerrainName(hex);
    const objective = this.getObjectiveInfo(hex);
    
    return {
      coordinate: `(${hex.q}, ${hex.r})`,
      terrain,
      movementCost: this.getMovementCost(hex),
      defenseBonus: this.getDefenseBonus(hex),
      blocksLOS: this.blocksLOS(hex),
      isOffshore: this.isOffshoreZone(hex),
      ...(objective && { objective }),
    };
  }

  /**
   * Get all objectives on the map
   */
  getAllObjectives(): Array<{
    hex: Hex;
    type: string;
    id: string;
    coordinate: string;
  }> {
    return this.gameMap.getObjectives()
      .filter(mapHex => mapHex.objective)
      .map(mapHex => ({
        hex: mapHex.coordinate,
        type: mapHex.objective!.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        id: mapHex.objective!.id,
        coordinate: `(${mapHex.coordinate.q}, ${mapHex.coordinate.r})`,
      }));
  }

  /**
   * Create a larger test map for better gameplay
   */
  static createDemoMap(): GameMap {
    const map = new GameMap(12, 8);
    
    // Create shoreline (shallow water and beaches)
    for (let q = 0; q < 12; q++) {
      map.setTerrain(Hex.fromOffset(q, 6), TerrainType.SHALLOW_WATER);
      map.setTerrain(Hex.fromOffset(q, 5), TerrainType.BEACH);
    }
    
    // Add varied terrain inland
    map.setTerrain(Hex.fromOffset(2, 4), TerrainType.URBAN);
    map.setTerrain(Hex.fromOffset(3, 4), TerrainType.URBAN);
    map.setTerrain(Hex.fromOffset(4, 4), TerrainType.URBAN);
    
    map.setTerrain(Hex.fromOffset(7, 3), TerrainType.LIGHT_WOODS);
    map.setTerrain(Hex.fromOffset(8, 3), TerrainType.LIGHT_WOODS);
    map.setTerrain(Hex.fromOffset(8, 2), TerrainType.HEAVY_WOODS);
    map.setTerrain(Hex.fromOffset(9, 2), TerrainType.HEAVY_WOODS);
    
    map.setTerrain(Hex.fromOffset(5, 2), TerrainType.HILLS);
    map.setTerrain(Hex.fromOffset(6, 2), TerrainType.HILLS);
    map.setTerrain(Hex.fromOffset(6, 1), TerrainType.MOUNTAINS);
    
    map.setTerrain(Hex.fromOffset(10, 4), TerrainType.URBAN);
    map.setTerrain(Hex.fromOffset(11, 4), TerrainType.URBAN);
    
    // Add objectives
    map.addObjective(Hex.fromOffset(3, 4), ObjectiveType.PORT, 'main_port');
    map.addObjective(Hex.fromOffset(8, 2), ObjectiveType.AIRFIELD, 'forest_airfield');
    map.addObjective(Hex.fromOffset(10, 4), ObjectiveType.COMMS_HUB, 'eastern_comms');
    map.addObjective(Hex.fromOffset(6, 1), ObjectiveType.HIGH_VALUE_TARGET, 'mountain_base');
    map.addObjective(Hex.fromOffset(2, 4), ObjectiveType.CIVIC_CENTER, 'town_hall');
    
    return map;
  }
}