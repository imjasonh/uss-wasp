/**
 * Game map representation and terrain system
 */

import { Hex, HexCoordinate } from '../hex';
import { TerrainType, TerrainProperties, ObjectiveType } from './types';

/**
 * Map hex with terrain and features
 */
export interface MapHex {
  readonly coordinate: Hex;
  readonly terrain: TerrainType;
  readonly elevation: number;
  readonly features: Set<string>; // Special features like "fortified", "landing_zone", etc.
  objective?: {
    type: ObjectiveType;
    id: string;
    controlledBy?: string; // Player ID who controls it
  };
}

/**
 * Fortification on the map
 */
export interface Fortification {
  readonly id: string;
  readonly type: 'bunker' | 'minefield' | 'trench' | 'barricade';
  readonly position: Hex;
  readonly defenseBonus: number;
  readonly movementPenalty: number;
  readonly blocksLOS: boolean;
}

/**
 * Game map with terrain and objectives
 */
export class GameMap {
  private readonly hexes: Map<string, MapHex>;
  private readonly fortifications: Map<string, Fortification>;
  private readonly width: number;
  private readonly height: number;
  private readonly offshoreZone: Set<string>; // Hex keys for offshore zone

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.hexes = new Map();
    this.fortifications = new Map();
    this.offshoreZone = new Set();

    this.initializeMap();
  }

  /**
   * Initialize map with default terrain
   */
  private initializeMap(): void {
    for (let q = 0; q < this.width; q++) {
      for (let r = 0; r < this.height; r++) {
        const hex = Hex.fromOffset(q, r);
        const mapHex: MapHex = {
          coordinate: hex,
          terrain: TerrainType.CLEAR,
          elevation: 0,
          features: new Set(),
        };
        this.hexes.set(hex.toKey(), mapHex);
      }
    }

    // Mark bottom row as offshore zone (where USS Wasp starts)
    for (let q = 0; q < this.width; q++) {
      const hex = Hex.fromOffset(q, this.height - 1);
      this.offshoreZone.add(hex.toKey());
      this.setTerrain(hex, TerrainType.DEEP_WATER);
    }
  }

  /**
   * Get hex at coordinate
   */
  getHex(coordinate: HexCoordinate): MapHex | undefined {
    const key = new Hex(coordinate.q, coordinate.r, coordinate.s).toKey();
    return this.hexes.get(key);
  }

  /**
   * Check if coordinate is valid on this map
   */
  isValidHex(coordinate: HexCoordinate): boolean {
    return this.hexes.has(new Hex(coordinate.q, coordinate.r, coordinate.s).toKey());
  }

  /**
   * Set terrain type for a hex
   */
  setTerrain(coordinate: HexCoordinate, terrain: TerrainType): void {
    const key = new Hex(coordinate.q, coordinate.r, coordinate.s).toKey();
    const hex = this.hexes.get(key);
    if (hex) {
      const updatedHex: MapHex = {
        ...hex,
        terrain,
      };
      this.hexes.set(key, updatedHex);
    }
  }

  /**
   * Set elevation for a hex
   */
  setElevation(coordinate: HexCoordinate, elevation: number): void {
    const key = new Hex(coordinate.q, coordinate.r, coordinate.s).toKey();
    const hex = this.hexes.get(key);
    if (hex) {
      const updatedHex: MapHex = {
        ...hex,
        elevation,
      };
      this.hexes.set(key, updatedHex);
    }
  }

  /**
   * Add objective to hex
   */
  addObjective(coordinate: HexCoordinate, type: ObjectiveType, id: string): void {
    const key = new Hex(coordinate.q, coordinate.r, coordinate.s).toKey();
    const hex = this.hexes.get(key);
    if (hex) {
      const updatedHex: MapHex = {
        ...hex,
        objective: { type, id },
      };
      this.hexes.set(key, updatedHex);
    }
  }

  /**
   * Add fortification to map
   */
  addFortification(fortification: Fortification): void {
    this.fortifications.set(fortification.id, fortification);
  }

  /**
   * Remove fortification from map
   */
  removeFortification(id: string): void {
    this.fortifications.delete(id);
  }

  /**
   * Get fortification at position
   */
  getFortificationAt(coordinate: HexCoordinate): Fortification | undefined {
    const hex = new Hex(coordinate.q, coordinate.r, coordinate.s);
    for (const fort of this.fortifications.values()) {
      if (fort.position.equals(hex)) {
        return fort;
      }
    }
    return undefined;
  }

  /**
   * Get all fortifications on the map
   */
  getAllFortifications(): Fortification[] {
    return Array.from(this.fortifications.values());
  }

  /**
   * Check if hex is in offshore zone
   */
  isOffshoreZone(coordinate: HexCoordinate): boolean {
    const key = new Hex(coordinate.q, coordinate.r, coordinate.s).toKey();
    return this.offshoreZone.has(key);
  }

  /**
   * Get terrain properties
   */
  getTerrainProperties(terrain: TerrainType): TerrainProperties {
    return TERRAIN_PROPERTIES[terrain];
  }

  /**
   * Get movement cost for a hex (including fortifications)
   */
  getMovementCost(coordinate: HexCoordinate): number {
    const hex = this.getHex(coordinate);
    if (!hex) {
      return Infinity;
    }

    let cost = this.getTerrainProperties(hex.terrain).movementCost;

    // Add fortification penalties
    const fortification = this.getFortificationAt(coordinate);
    if (fortification) {
      cost += fortification.movementPenalty;
    }

    return cost;
  }

  /**
   * Get defense bonus for a hex
   */
  getDefenseBonus(coordinate: HexCoordinate): number {
    const hex = this.getHex(coordinate);
    if (!hex) {
      return 0;
    }

    let bonus = this.getTerrainProperties(hex.terrain).coverBonus;

    // Add fortification bonuses
    const fortification = this.getFortificationAt(coordinate);
    if (fortification) {
      bonus += fortification.defenseBonus;
    }

    return bonus;
  }

  /**
   * Check if hex blocks line of sight
   */
  blocksLOS(coordinate: HexCoordinate): boolean {
    const hex = this.getHex(coordinate);
    if (!hex) {
      return true;
    }

    if (this.getTerrainProperties(hex.terrain).blocksLOS) {
      return true;
    }

    // Check fortifications
    const fortification = this.getFortificationAt(coordinate);
    return fortification?.blocksLOS || false;
  }

  /**
   * Get all hexes of a specific terrain type
   */
  getHexesByTerrain(terrain: TerrainType): MapHex[] {
    return Array.from(this.hexes.values()).filter(hex => hex.terrain === terrain);
  }

  /**
   * Get all objectives on the map
   */
  getObjectives(): MapHex[] {
    return Array.from(this.hexes.values()).filter(hex => hex.objective);
  }

  /**
   * Get all hexes within range of a position
   */
  getHexesInRange(center: HexCoordinate, range: number): MapHex[] {
    const centerHex = new Hex(center.q, center.r, center.s);
    const hexesInRange = centerHex.range(range);

    return hexesInRange
      .map(hex => this.getHex(hex))
      .filter((hex): hex is MapHex => hex !== undefined);
  }

  /**
   * Get neighbors of a hex
   */
  getNeighbors(coordinate: HexCoordinate): MapHex[] {
    const hex = new Hex(coordinate.q, coordinate.r, coordinate.s);
    return hex
      .neighbors()
      .map(neighbor => this.getHex(neighbor))
      .filter((hex): hex is MapHex => hex !== undefined);
  }

  /**
   * Get all map hexes
   */
  getAllHexes(): MapHex[] {
    return Array.from(this.hexes.values());
  }

  /**
   * Get map dimensions
   */
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Create a simple test map for development
   */
  static createTestMap(): GameMap {
    const map = new GameMap(8, 6);

    // Add some varied terrain
    map.setTerrain(Hex.fromOffset(2, 2), TerrainType.URBAN);
    map.setTerrain(Hex.fromOffset(3, 2), TerrainType.URBAN);
    map.setTerrain(Hex.fromOffset(5, 1), TerrainType.LIGHT_WOODS);
    map.setTerrain(Hex.fromOffset(6, 1), TerrainType.HEAVY_WOODS);
    map.setTerrain(Hex.fromOffset(1, 4), TerrainType.SHALLOW_WATER);
    map.setTerrain(Hex.fromOffset(2, 4), TerrainType.BEACH);

    // Add objectives
    map.addObjective(Hex.fromOffset(2, 2), ObjectiveType.PORT, 'port_1');
    map.addObjective(Hex.fromOffset(5, 1), ObjectiveType.AIRFIELD, 'airfield_1');
    map.addObjective(Hex.fromOffset(3, 2), ObjectiveType.COMMS_HUB, 'comms_1');

    return map;
  }
}

/**
 * Terrain properties lookup table
 */
const TERRAIN_PROPERTIES: Record<TerrainType, TerrainProperties> = {
  [TerrainType.DEEP_WATER]: {
    movementCost: 2,
    coverBonus: 0,
    blocksLOS: false,
    canLandAircraft: false,
    canDeployLCAC: true,
  },
  [TerrainType.SHALLOW_WATER]: {
    movementCost: 1,
    coverBonus: 0,
    blocksLOS: false,
    canLandAircraft: false,
    canDeployLCAC: true,
  },
  [TerrainType.BEACH]: {
    movementCost: 1,
    coverBonus: 0,
    blocksLOS: false,
    canLandAircraft: true,
    canDeployLCAC: true,
  },
  [TerrainType.CLEAR]: {
    movementCost: 1,
    coverBonus: 0,
    blocksLOS: false,
    canLandAircraft: true,
    canDeployLCAC: false,
  },
  [TerrainType.LIGHT_WOODS]: {
    movementCost: 2,
    coverBonus: 1,
    blocksLOS: false,
    canLandAircraft: true,
    canDeployLCAC: false,
  },
  [TerrainType.HEAVY_WOODS]: {
    movementCost: 3,
    coverBonus: 2,
    blocksLOS: true,
    canLandAircraft: false,
    canDeployLCAC: false,
  },
  [TerrainType.URBAN]: {
    movementCost: 2,
    coverBonus: 2,
    blocksLOS: false,
    canLandAircraft: false,
    canDeployLCAC: false,
  },
  [TerrainType.HILLS]: {
    movementCost: 2,
    coverBonus: 1,
    blocksLOS: false,
    canLandAircraft: false,
    canDeployLCAC: false,
  },
  [TerrainType.MOUNTAINS]: {
    movementCost: 3,
    coverBonus: 2,
    blocksLOS: true,
    canLandAircraft: false,
    canDeployLCAC: false,
  },
};
