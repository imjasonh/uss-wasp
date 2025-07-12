/**
 * Fog of War system for managing unit visibility and hidden mechanics
 */

import { Hex, hasLineOfSight } from '../hex';
import { Unit } from './Unit';
import { GameState } from './GameState';
import { PlayerSide, UnitCategory, UnitType } from './types';

/**
 * Information about what a player can see
 */
export interface VisibilityInfo {
  visibleUnits: Set<string>; // Unit IDs visible to this player
  exploredHexes: Set<string>; // Hex coordinates that have been seen
  lastKnownPositions: Map<string, { position: Hex; turn: number }>; // Last known enemy positions
}

/**
 * Fog of War manager
 */
export class FogOfWar {
  private visibilityCache = new Map<string, VisibilityInfo>();
  
  constructor(private gameState: GameState) {
    this.initializeVisibility();
  }

  /**
   * Initialize visibility for all players
   */
  private initializeVisibility(): void {
    for (const player of this.gameState.getAllPlayers()) {
      this.visibilityCache.set(player.id, {
        visibleUnits: new Set(),
        exploredHexes: new Set(),
        lastKnownPositions: new Map(),
      });
    }
  }

  /**
   * Update visibility for all players
   */
  updateVisibility(): void {
    for (const player of this.gameState.getAllPlayers()) {
      this.updatePlayerVisibility(player.id);
    }
  }

  /**
   * Update visibility for a specific player
   */
  private updatePlayerVisibility(playerId: string): void {
    const player = this.gameState.getPlayer(playerId);
    if (!player) return;

    const visibility = this.visibilityCache.get(playerId);
    if (!visibility) return;

    // Clear current visibility
    visibility.visibleUnits.clear();

    // Get all friendly units for this player
    const friendlyUnits = player.getLivingUnits();
    
    // Get all enemy units
    const allPlayers = this.gameState.getAllPlayers();
    const enemyUnits: Unit[] = [];
    
    for (const otherPlayer of allPlayers) {
      if (otherPlayer.id !== playerId) {
        enemyUnits.push(...otherPlayer.getLivingUnits());
      }
    }

    // Check visibility from each friendly unit
    for (const observer of friendlyUnits) {
      // Always see your own units
      visibility.visibleUnits.add(observer.id);
      
      // Mark observer's hex as explored
      const observerPos = observer.state.position;
      visibility.exploredHexes.add(`${observerPos.q},${observerPos.r}`);

      // Check what this unit can see
      this.updateUnitVisibility(observer, enemyUnits, visibility);
    }
  }

  /**
   * Update what a specific unit can see
   */
  private updateUnitVisibility(
    observer: Unit, 
    targets: Unit[], 
    visibility: VisibilityInfo
  ): void {
    const observerPos = observer.state.position;
    const observerHex = new Hex(observerPos.q, observerPos.r, observerPos.s);

    for (const target of targets) {
      if (this.canUnitSeeTarget(observer, target)) {
        visibility.visibleUnits.add(target.id);
        
        // Update last known position
        const targetPos = new Hex(
          target.state.position.q,
          target.state.position.r,
          target.state.position.s
        );
        
        visibility.lastKnownPositions.set(target.id, {
          position: targetPos,
          turn: this.gameState.turn
        });
      }
    }

    // Mark hexes in sight range as explored
    const sightRange = this.getUnitSightRange(observer);
    for (const hex of observerHex.range(sightRange)) {
      if (this.hasLineOfSightToHex(observer, hex)) {
        visibility.exploredHexes.add(`${hex.q},${hex.r}`);
      }
    }
  }

  /**
   * Check if an observer unit can see a target unit
   */
  canUnitSeeTarget(observer: Unit, target: Unit): boolean {
    // Cannot see hidden units (unless special detection)
    if (target.isHidden() && !this.canDetectHiddenUnit(observer, target)) {
      return false;
    }

    // Check line of sight
    if (!this.hasLineOfSightBetweenUnits(observer, target)) {
      return false;
    }

    // Check range
    const distance = this.getDistanceBetweenUnits(observer, target);
    const sightRange = this.getUnitSightRange(observer);
    
    if (distance > sightRange) {
      return false;
    }

    return true;
  }

  /**
   * Check if unit can detect hidden units
   */
  private canDetectHiddenUnit(observer: Unit, target: Unit): boolean {
    const distance = this.getDistanceBetweenUnits(observer, target);
    
    // MARSOC recon specialists can detect hidden units within 2 hexes
    if (observer.type === 'marsoc' && distance <= 2) {
      return true;
    }

    // Units can detect adjacent hidden units
    if (distance <= 1) {
      return true;
    }

    return false;
  }

  /**
   * Get unit sight range
   */
  private getUnitSightRange(unit: Unit): number {
    let baseRange = 4; // Default sight range

    // Aircraft have extended sight range
    if (unit.hasCategory(UnitCategory.AIRCRAFT) || 
        unit.hasCategory(UnitCategory.HELICOPTER)) {
      baseRange = 8;
    }

    // USS Wasp has long-range sensors
    if (unit.type === 'uss_wasp') {
      baseRange = 10;
    }

    // Reduce range if suppressed
    if (unit.isSuppressed()) {
      baseRange = Math.max(1, baseRange - 1);
    }

    return baseRange;
  }

  /**
   * Check line of sight between two units
   */
  private hasLineOfSightBetweenUnits(observer: Unit, target: Unit): boolean {
    return hasLineOfSight(observer.state.position, target.state.position, (hex) => {
      return this.isHexBlockedByCoordinate(hex);
    });
  }

  /**
   * Check line of sight to a hex
   */
  private hasLineOfSightToHex(observer: Unit, targetHex: Hex): boolean {
    const targetCoord = { q: targetHex.q, r: targetHex.r, s: targetHex.s };
    
    return hasLineOfSight(observer.state.position, targetCoord, (hex) => {
      return this.isHexBlockedByCoordinate(hex);
    });
  }

  /**
   * Check if a hex blocks line of sight (using HexCoordinate)
   */
  private isHexBlockedByCoordinate(hex: { q: number; r: number; s: number }): boolean {
    const mapHex = this.gameState.map.getHex(hex);
    if (!mapHex) return false;

    // Dense terrain blocks line of sight
    const blockingTerrain = ['woods', 'jungle', 'urban', 'hills'];
    if (blockingTerrain.includes(mapHex.terrain)) {
      return true;
    }

    // Check for large units that block LOS (vehicles, ships, etc.)
    const hexPosition = new Hex(hex.q, hex.r, hex.s);
    const unitsAtHex = this.gameState.getUnitsAt(hexPosition);
    for (const unit of unitsAtHex) {
      if (unit.hasCategory(UnitCategory.VEHICLE) || unit.hasCategory(UnitCategory.SHIP)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get distance between two units
   */
  private getDistanceBetweenUnits(unit1: Unit, unit2: Unit): number {
    const hex1 = new Hex(unit1.state.position.q, unit1.state.position.r, unit1.state.position.s);
    return hex1.distanceTo(unit2.state.position);
  }

  /**
   * Check if a player can see a specific unit
   */
  isUnitVisibleToPlayer(unitId: string, playerId: string): boolean {
    const visibility = this.visibilityCache.get(playerId);
    return visibility ? visibility.visibleUnits.has(unitId) : false;
  }

  /**
   * Get visible units for a player
   */
  getVisibleUnitsForPlayer(playerId: string): Set<string> {
    const visibility = this.visibilityCache.get(playerId);
    return visibility ? visibility.visibleUnits : new Set();
  }

  /**
   * Get explored hexes for a player
   */
  getExploredHexesForPlayer(playerId: string): Set<string> {
    const visibility = this.visibilityCache.get(playerId);
    return visibility ? visibility.exploredHexes : new Set();
  }

  /**
   * Get last known enemy positions for a player
   */
  getLastKnownPositions(playerId: string): Map<string, { position: Hex; turn: number }> {
    const visibility = this.visibilityCache.get(playerId);
    return visibility ? visibility.lastKnownPositions : new Map();
  }

  /**
   * Deploy unit in hidden state
   */
  deployHiddenUnit(unit: Unit): void {
    if (unit.canBeHidden()) {
      unit.hide();
    }
  }

  /**
   * Create dummy markers for deception
   */
  createDummyMarker(position: Hex, side: PlayerSide): Unit {
    // Create a dummy unit that appears as a potential threat
    const dummyId = `dummy-${Date.now()}`;
    const dummyUnit = new Unit(
      dummyId,
      UnitType.INFANTRY_SQUAD, // Appears as infantry
      side,
      { mv: 0, atk: 0, def: 10, hp: 1, pointCost: 0 }, // Weak stats
      [UnitCategory.INFANTRY],
      [],
      { q: position.q, r: position.r, s: position.s }
    );
    
    dummyUnit.makeDummy();
    return dummyUnit;
  }

  /**
   * Handle unit reveals (when attacked or moving)
   */
  forceReveal(unit: Unit): void {
    if (unit.isHidden()) {
      unit.reveal();
      this.updateVisibility(); // Recalculate visibility
    }
  }

  /**
   * Clear fog of war (for debugging/admin)
   */
  clearFogOfWar(): void {
    for (const [_playerId, visibility] of this.visibilityCache) {
      // Show all units
      for (const player of this.gameState.getAllPlayers()) {
        for (const unit of player.getLivingUnits()) {
          visibility.visibleUnits.add(unit.id);
        }
      }
    }
  }
}