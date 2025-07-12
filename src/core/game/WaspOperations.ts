/**
 * USS Wasp operations and status tracking system
 */

import { Unit } from './Unit';
import { GameState } from './GameState';
import { Hex } from '../hex';
import { UnitType, UnitCategory } from './types';

/**
 * USS Wasp operational status levels
 */
export enum WaspOperationalLevel {
  OPERATIONAL = 'operational',
  DEGRADED = 'degraded',
  LIMITED = 'limited',
  DAMAGED = 'damaged',
  OFFLINE = 'offline'
}

/**
 * Extended USS Wasp system status with operational details
 */
export interface WaspOperationalStatus {
  flightDeck: WaspOperationalLevel;
  wellDeck: WaspOperationalLevel;
  c2System: WaspOperationalLevel;
  structuralIntegrity: number; // HP essentially
  maxStructuralIntegrity: number;
  defensiveAmmo: number; // For CIWS/RAM/Sea Sparrow
  maxDefensiveAmmo: number;
}

/**
 * Launch operation result
 */
export interface LaunchResult {
  success: boolean;
  message: string;
  launchedUnits: Unit[];
  remainingCapacity: number;
}

/**
 * USS Wasp operations manager
 */
export class WaspOperations {
  private wasp: Unit;
  private systemStatus: WaspOperationalStatus;
  private currentTurnLaunches: {
    flightDeckLaunches: number;
    wellDeckLaunches: number;
  };

  constructor(waspUnit: Unit) {
    this.wasp = waspUnit;
    this.systemStatus = {
      flightDeck: WaspOperationalLevel.OPERATIONAL,
      wellDeck: WaspOperationalLevel.OPERATIONAL,
      c2System: WaspOperationalLevel.OPERATIONAL,
      structuralIntegrity: waspUnit.stats.hp,
      maxStructuralIntegrity: waspUnit.stats.hp,
      defensiveAmmo: 6, // Limited defensive ammunition
      maxDefensiveAmmo: 6
    };
    this.currentTurnLaunches = {
      flightDeckLaunches: 0,
      wellDeckLaunches: 0
    };
  }

  /**
   * Reset turn-based launch counters
   */
  resetTurnLaunches(): void {
    this.currentTurnLaunches.flightDeckLaunches = 0;
    this.currentTurnLaunches.wellDeckLaunches = 0;
  }

  /**
   * Get current launch capacity for flight deck
   */
  getFlightDeckCapacity(): number {
    switch (this.systemStatus.flightDeck) {
      case WaspOperationalLevel.OPERATIONAL:
        return Math.max(0, 2 - this.currentTurnLaunches.flightDeckLaunches);
      case WaspOperationalLevel.DEGRADED:
      case WaspOperationalLevel.LIMITED:
        return Math.max(0, 1 - this.currentTurnLaunches.flightDeckLaunches);
      case WaspOperationalLevel.DAMAGED:
      case WaspOperationalLevel.OFFLINE:
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get current launch capacity for well deck
   */
  getWellDeckCapacity(): { lcac: number; aav: number } {
    const baseCapacity = this.getWellDeckBaseCapacity();
    const usedCapacity = this.currentTurnLaunches.wellDeckLaunches;
    
    if (baseCapacity.lcac > 0 && usedCapacity === 0) {
      // Can launch 1 LCAC (takes full capacity)
      return { lcac: 1, aav: 0 };
    } else if (baseCapacity.aav > 0) {
      // Can launch AAVs
      return { lcac: 0, aav: Math.max(0, baseCapacity.aav - usedCapacity) };
    }
    
    return { lcac: 0, aav: 0 };
  }

  private getWellDeckBaseCapacity(): { lcac: number; aav: number } {
    switch (this.systemStatus.wellDeck) {
      case WaspOperationalLevel.OPERATIONAL:
        return { lcac: 1, aav: 2 }; // 1 LCAC OR 2 AAVs
      case WaspOperationalLevel.DEGRADED:
      case WaspOperationalLevel.LIMITED:
        return { lcac: 0, aav: 1 }; // 1 AAV only
      case WaspOperationalLevel.DAMAGED:
      case WaspOperationalLevel.OFFLINE:
        return { lcac: 0, aav: 0 };
      default:
        return { lcac: 0, aav: 0 };
    }
  }

  /**
   * Launch aircraft from flight deck
   */
  launchAircraft(aircraft: Unit[], gameState: GameState): LaunchResult {
    const capacity = this.getFlightDeckCapacity();
    
    if (aircraft.length === 0) {
      return {
        success: false,
        message: 'No aircraft specified for launch',
        launchedUnits: [],
        remainingCapacity: capacity
      };
    }

    if (aircraft.length > capacity) {
      return {
        success: false,
        message: `Flight deck can only launch ${capacity} aircraft this turn`,
        launchedUnits: [],
        remainingCapacity: capacity
      };
    }

    // Validate aircraft types
    for (const unit of aircraft) {
      if (!unit.hasCategory(UnitCategory.AIRCRAFT) && !unit.hasCategory(UnitCategory.HELICOPTER)) {
        return {
          success: false,
          message: `${unit.type} is not an aircraft`,
          launchedUnits: [],
          remainingCapacity: capacity
        };
      }
    }

    // Launch aircraft to offshore zone adjacent to Wasp
    const launchPosition = this.getAdjacentOffshorePosition(gameState);
    const launchedUnits: Unit[] = [];

    for (const aircraftUnit of aircraft) {
      // Move from Wasp cargo to launch position
      this.wasp.unloadCargo(aircraftUnit.id);
      aircraftUnit.state.position = launchPosition;
      aircraftUnit.state.hasMoved = false; // Can move immediately after launch
      launchedUnits.push(aircraftUnit);
    }

    this.currentTurnLaunches.flightDeckLaunches += aircraft.length;

    return {
      success: true,
      message: `Launched ${aircraft.length} aircraft from flight deck`,
      launchedUnits,
      remainingCapacity: this.getFlightDeckCapacity()
    };
  }

  /**
   * Launch amphibious craft from well deck
   */
  launchAmphibiousCraft(craft: Unit[], gameState: GameState): LaunchResult {
    const capacity = this.getWellDeckCapacity();
    
    if (craft.length === 0) {
      return {
        success: false,
        message: 'No craft specified for launch',
        launchedUnits: [],
        remainingCapacity: capacity.lcac + capacity.aav
      };
    }

    // Check if launching LCAC
    const lcacUnits = craft.filter(unit => unit.type === UnitType.LCAC);
    const aavUnits = craft.filter(unit => unit.type === UnitType.AAV_7);
    const otherUnits = craft.filter(unit => unit.type !== UnitType.LCAC && unit.type !== UnitType.AAV_7);

    if (otherUnits.length > 0) {
      return {
        success: false,
        message: 'Well deck can only launch LCACs and AAVs',
        launchedUnits: [],
        remainingCapacity: capacity.lcac + capacity.aav
      };
    }

    if (lcacUnits.length > capacity.lcac) {
      return {
        success: false,
        message: `Well deck can only launch ${capacity.lcac} LCAC this turn`,
        launchedUnits: [],
        remainingCapacity: capacity.lcac + capacity.aav
      };
    }

    if (aavUnits.length > capacity.aav) {
      return {
        success: false,
        message: `Well deck can only launch ${capacity.aav} AAVs this turn`,
        launchedUnits: [],
        remainingCapacity: capacity.lcac + capacity.aav
      };
    }

    if (lcacUnits.length > 0 && aavUnits.length > 0) {
      return {
        success: false,
        message: 'Cannot launch both LCAC and AAVs in same turn',
        launchedUnits: [],
        remainingCapacity: capacity.lcac + capacity.aav
      };
    }

    // Launch craft to offshore zone
    const launchPosition = this.getAdjacentOffshorePosition(gameState);
    const launchedUnits: Unit[] = [];

    for (const unit of craft) {
      this.wasp.unloadCargo(unit.id);
      unit.state.position = launchPosition;
      unit.state.hasMoved = false; // Can move immediately after launch
      launchedUnits.push(unit);
    }

    this.currentTurnLaunches.wellDeckLaunches += craft.length;

    return {
      success: true,
      message: `Launched ${craft.length} units from well deck`,
      launchedUnits,
      remainingCapacity: this.getWellDeckCapacity().lcac + this.getWellDeckCapacity().aav
    };
  }

  /**
   * Recover aircraft to flight deck
   */
  recoverAircraft(aircraft: Unit): boolean {
    if (!aircraft.hasCategory(UnitCategory.AIRCRAFT) && !aircraft.hasCategory(UnitCategory.HELICOPTER)) {
      return false;
    }

    // Check if aircraft is adjacent to Wasp
    const distance = new Hex(aircraft.state.position.q, aircraft.state.position.r, aircraft.state.position.s)
      .distanceTo(this.wasp.state.position);
    
    if (distance > 1) {
      return false;
    }

    // Check if Wasp has cargo capacity
    if (!this.wasp.loadCargo(aircraft)) {
      return false;
    }

    // Aircraft is now aboard Wasp
    return true;
  }

  /**
   * Recover amphibious craft to well deck
   */
  recoverAmphibiousCraft(craft: Unit): boolean {
    if (craft.type !== UnitType.LCAC && craft.type !== UnitType.AAV_7) {
      return false;
    }

    // Check if craft is adjacent to Wasp
    const distance = new Hex(craft.state.position.q, craft.state.position.r, craft.state.position.s)
      .distanceTo(this.wasp.state.position);
    
    if (distance > 1) {
      return false;
    }

    // Check if Wasp has cargo capacity
    if (!this.wasp.loadCargo(craft)) {
      return false;
    }

    return true;
  }

  /**
   * Get adjacent offshore position for launches
   */
  private getAdjacentOffshorePosition(gameState: GameState): { q: number; r: number; s: number } {
    const waspHex = new Hex(this.wasp.state.position.q, this.wasp.state.position.r, this.wasp.state.position.s);
    const neighbors = waspHex.neighbors();
    
    // Find first offshore neighbor
    for (const neighbor of neighbors) {
      const mapHex = gameState.map.getHex({ q: neighbor.q, r: neighbor.r, s: neighbor.s });
      if (mapHex && (mapHex.terrain === 'deep_water' || mapHex.terrain === 'shallow_water')) {
        // Check if position is unoccupied
        const unitsAtPosition = gameState.getUnitsAt(neighbor);
        if (unitsAtPosition.length === 0) {
          return { q: neighbor.q, r: neighbor.r, s: neighbor.s };
        }
      }
    }
    
    // Fallback to Wasp's position if no clear adjacent water
    return this.wasp.state.position;
  }

  /**
   * Calculate Command Points based on C2 status
   */
  calculateCommandPoints(): number {
    switch (this.systemStatus.c2System) {
      case WaspOperationalLevel.OPERATIONAL:
        return 3;
      case WaspOperationalLevel.DEGRADED:
      case WaspOperationalLevel.LIMITED:
        return 2;
      case WaspOperationalLevel.DAMAGED:
      case WaspOperationalLevel.OFFLINE:
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Apply damage to Wasp and update system status
   */
  applyDamage(damage: number): { systemDamage: string[]; destroyed: boolean } {
    this.systemStatus.structuralIntegrity = Math.max(0, this.systemStatus.structuralIntegrity - damage);
    this.wasp.state.currentHP = this.systemStatus.structuralIntegrity;
    
    const systemDamage: string[] = [];
    const integrityRatio = this.systemStatus.structuralIntegrity / this.systemStatus.maxStructuralIntegrity;
    
    // Update system status based on damage
    if (integrityRatio <= 0) {
      this.systemStatus.flightDeck = WaspOperationalLevel.OFFLINE;
      this.systemStatus.wellDeck = WaspOperationalLevel.OFFLINE;
      this.systemStatus.c2System = WaspOperationalLevel.OFFLINE;
      systemDamage.push('All systems offline - Wasp destroyed');
      return { systemDamage, destroyed: true };
    } else if (integrityRatio <= 0.25) {
      if (this.systemStatus.c2System !== WaspOperationalLevel.OFFLINE) {
        this.systemStatus.c2System = WaspOperationalLevel.OFFLINE;
        systemDamage.push('C2 system offline');
      }
      if (this.systemStatus.flightDeck !== WaspOperationalLevel.DAMAGED) {
        this.systemStatus.flightDeck = WaspOperationalLevel.DAMAGED;
        systemDamage.push('Flight deck damaged');
      }
      if (this.systemStatus.wellDeck !== WaspOperationalLevel.DAMAGED) {
        this.systemStatus.wellDeck = WaspOperationalLevel.DAMAGED;
        systemDamage.push('Well deck damaged');
      }
    } else if (integrityRatio <= 0.5) {
      if (this.systemStatus.c2System === WaspOperationalLevel.OPERATIONAL) {
        this.systemStatus.c2System = WaspOperationalLevel.DEGRADED;
        systemDamage.push('C2 system degraded');
      }
      if (this.systemStatus.flightDeck === WaspOperationalLevel.OPERATIONAL) {
        this.systemStatus.flightDeck = WaspOperationalLevel.LIMITED;
        systemDamage.push('Flight deck limited');
      }
      if (this.systemStatus.wellDeck === WaspOperationalLevel.OPERATIONAL) {
        this.systemStatus.wellDeck = WaspOperationalLevel.LIMITED;
        systemDamage.push('Well deck limited');
      }
    } else if (integrityRatio <= 0.75) {
      if (this.systemStatus.c2System === WaspOperationalLevel.OPERATIONAL) {
        this.systemStatus.c2System = WaspOperationalLevel.DEGRADED;
        systemDamage.push('Minor C2 system damage');
      }
    }
    
    return { systemDamage, destroyed: false };
  }

  /**
   * Execute CIWS/RAM defensive fire (reactive)
   */
  executeCIWSDefense(attackDice: number): { hitsNegated: number; ammoUsed: boolean } {
    if (this.systemStatus.defensiveAmmo <= 0) {
      return { hitsNegated: 0, ammoUsed: false };
    }

    // Roll 3 defense dice, each 5+ negates 1 hit
    let hitsNegated = 0;
    for (let i = 0; i < 3; i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      if (roll >= 5) {
        hitsNegated++;
      }
    }

    // Limit to actual attack hits
    hitsNegated = Math.min(hitsNegated, attackDice);
    
    // Consume ammo
    this.systemStatus.defensiveAmmo--;
    
    return { hitsNegated, ammoUsed: true };
  }

  /**
   * Execute Sea Sparrow active defense
   */
  executeSeaSparrow(target: Unit): { hit: boolean; damage: number; ammoUsed: boolean } {
    if (this.systemStatus.defensiveAmmo <= 0) {
      return { hit: false, damage: 0, ammoUsed: false };
    }

    // Check range (5 hexes)
    const distance = new Hex(this.wasp.state.position.q, this.wasp.state.position.r, this.wasp.state.position.s)
      .distanceTo(target.state.position);
    
    if (distance > 5) {
      return { hit: false, damage: 0, ammoUsed: false };
    }

    // Check if target is aircraft
    if (!target.hasCategory(UnitCategory.AIRCRAFT) && !target.hasCategory(UnitCategory.HELICOPTER)) {
      return { hit: false, damage: 0, ammoUsed: false };
    }

    // Roll 2 ATK dice at DEF 4
    let hits = 0;
    for (let i = 0; i < 2; i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      if (roll >= 4) {
        hits++;
      }
    }

    // Consume ammo
    this.systemStatus.defensiveAmmo--;

    return { hit: hits > 0, damage: hits, ammoUsed: true };
  }

  /**
   * Resupply Wasp systems during resupply phase
   */
  resupply(): void {
    // Restore some defensive ammo
    this.systemStatus.defensiveAmmo = Math.min(
      this.systemStatus.maxDefensiveAmmo,
      this.systemStatus.defensiveAmmo + 1
    );
  }

  /**
   * Get current Wasp status summary
   */
  getStatusSummary(): WaspOperationalStatus {
    return { ...this.systemStatus };
  }

  /**
   * Get units currently aboard Wasp
   */
  getAboardUnits(): Unit[] {
    return this.wasp.state.cargo;
  }

  /**
   * Check if unit can be launched
   */
  canLaunchUnit(unit: Unit): { canLaunch: boolean; reason?: string } {
    if (unit.hasCategory(UnitCategory.AIRCRAFT) || unit.hasCategory(UnitCategory.HELICOPTER)) {
      const capacity = this.getFlightDeckCapacity();
      if (capacity <= 0) {
        return { canLaunch: false, reason: 'Flight deck at capacity or damaged' };
      }
    } else if (unit.type === UnitType.LCAC || unit.type === UnitType.AAV_7) {
      const capacity = this.getWellDeckCapacity();
      if (unit.type === UnitType.LCAC && capacity.lcac <= 0) {
        return { canLaunch: false, reason: 'Well deck cannot launch LCAC' };
      }
      if (unit.type === UnitType.AAV_7 && capacity.aav <= 0) {
        return { canLaunch: false, reason: 'Well deck at AAV capacity or damaged' };
      }
    } else {
      return { canLaunch: false, reason: 'Unit type cannot be launched from Wasp' };
    }

    return { canLaunch: true };
  }
}