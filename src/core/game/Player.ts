/**
 * Player representation and state management
 */

import { Unit } from './Unit';
import { PlayerSide, VictoryCondition, WaspSystemStatus } from './types';

/**
 * Player-specific objectives
 */
export interface Objective {
  readonly id: string;
  readonly description: string;
  readonly isPrimary: boolean;
  completed: boolean;
  progress?: number; // For objectives that require holding for X turns
}

/**
 * USS Wasp status (for Assault player only)
 */
export interface WaspStatus {
  structuralIntegrity: number;
  flightDeckStatus: WaspSystemStatus;
  wellDeckStatus: WaspSystemStatus;
  c2Status: WaspSystemStatus;
}

/**
 * Player state and resources
 */
export class Player {
  public readonly id: string;
  public readonly side: PlayerSide;
  public commandPoints: number;
  public units: Map<string, Unit>;
  public objectives: Map<string, Objective>;
  public waspStatus?: WaspStatus; // Only for Assault player

  constructor(id: string, side: PlayerSide) {
    this.id = id;
    this.side = side;
    this.commandPoints = 0;
    this.units = new Map();
    this.objectives = new Map();
    
    // Initialize USS Wasp status for Assault player
    if (side === PlayerSide.Assault) {
      this.waspStatus = {
        structuralIntegrity: 10, // Starting HP for USS Wasp
        flightDeckStatus: WaspSystemStatus.OPERATIONAL,
        wellDeckStatus: WaspSystemStatus.OPERATIONAL,
        c2Status: WaspSystemStatus.OPERATIONAL,
      };
    }
  }

  /**
   * Add unit to player's force
   */
  addUnit(unit: Unit): void {
    this.units.set(unit.id, unit);
  }

  /**
   * Remove unit from player's force
   */
  removeUnit(unitId: string): Unit | undefined {
    const unit = this.units.get(unitId);
    if (unit) {
      this.units.delete(unitId);
      return unit;
    }
    return undefined;
  }

  /**
   * Get unit by ID
   */
  getUnit(unitId: string): Unit | undefined {
    return this.units.get(unitId);
  }

  /**
   * Get all living units
   */
  getLivingUnits(): Unit[] {
    return Array.from(this.units.values()).filter(unit => unit.isAlive());
  }

  /**
   * Get all destroyed units
   */
  getDestroyedUnits(): Unit[] {
    return Array.from(this.units.values()).filter(unit => unit.isDestroyed());
  }

  /**
   * Add objective
   */
  addObjective(objective: Objective): void {
    this.objectives.set(objective.id, objective);
  }

  /**
   * Complete objective
   */
  completeObjective(objectiveId: string): void {
    const objective = this.objectives.get(objectiveId);
    if (objective) {
      objective.completed = true;
    }
  }

  /**
   * Check if all primary objectives are complete
   */
  hasPrimaryObjectivesComplete(): boolean {
    const primaryObjectives = Array.from(this.objectives.values())
      .filter(obj => obj.isPrimary);
    
    return primaryObjectives.length > 0 && 
           primaryObjectives.every(obj => obj.completed);
  }

  /**
   * Get completed objectives count
   */
  getCompletedObjectivesCount(): { primary: number; secondary: number } {
    const objectives = Array.from(this.objectives.values());
    return {
      primary: objectives.filter(obj => obj.isPrimary && obj.completed).length,
      secondary: objectives.filter(obj => !obj.isPrimary && obj.completed).length,
    };
  }

  /**
   * Generate command points for the turn
   */
  generateCommandPoints(): void {
    if (this.side === PlayerSide.Assault) {
      // Assault gets 3 CP normally, reduced if Wasp C2 is damaged
      if (!this.waspStatus) {
        this.commandPoints += 3;
        return;
      }
      
      switch (this.waspStatus.c2Status) {
        case WaspSystemStatus.OPERATIONAL:
          this.commandPoints += 3;
          break;
        case WaspSystemStatus.LIMITED:
        case WaspSystemStatus.DAMAGED:
          this.commandPoints += 2;
          break;
        case WaspSystemStatus.OFFLINE:
          this.commandPoints += 0;
          break;
      }
    } else {
      // Defender gets 2 CP
      this.commandPoints += 2;
    }
  }

  /**
   * Spend command points
   */
  spendCommandPoints(amount: number): boolean {
    if (this.commandPoints >= amount) {
      this.commandPoints -= amount;
      return true;
    }
    return false;
  }

  /**
   * Clear command points at end of turn
   */
  clearCommandPoints(): void {
    this.commandPoints = 0;
  }

  /**
   * Damage USS Wasp (Assault player only)
   */
  damageWasp(damage: number): void {
    if (!this.waspStatus) return;
    
    this.waspStatus.structuralIntegrity = Math.max(
      0, 
      this.waspStatus.structuralIntegrity - damage
    );
  }

  /**
   * Damage Wasp system
   */
  damageWaspSystem(system: keyof WaspStatus, newStatus: WaspSystemStatus): void {
    if (!this.waspStatus) return;
    
    if (system in this.waspStatus && system !== 'structuralIntegrity') {
      (this.waspStatus as any)[system] = newStatus;
    }
  }

  /**
   * Check if USS Wasp is operational
   */
  isWaspOperational(): boolean {
    return this.waspStatus ? this.waspStatus.structuralIntegrity > 0 : false;
  }

  /**
   * Get Wasp flight deck capacity
   */
  getWaspFlightDeckCapacity(): number {
    if (!this.waspStatus) return 0;
    
    switch (this.waspStatus.flightDeckStatus) {
      case WaspSystemStatus.OPERATIONAL:
        return 2;
      case WaspSystemStatus.LIMITED:
        return 1;
      case WaspSystemStatus.DAMAGED:
      case WaspSystemStatus.OFFLINE:
        return 0;
    }
  }

  /**
   * Get Wasp well deck capacity
   */
  getWaspWellDeckCapacity(): number {
    if (!this.waspStatus) return 0;
    
    switch (this.waspStatus.wellDeckStatus) {
      case WaspSystemStatus.OPERATIONAL:
        return 2; // 1 LCAC or 2 AAVs
      case WaspSystemStatus.LIMITED:
        return 1; // 1 AAV only
      case WaspSystemStatus.DAMAGED:
      case WaspSystemStatus.OFFLINE:
        return 0;
    }
  }

  /**
   * Reset turn state for all units
   */
  resetTurnState(): void {
    for (const unit of this.units.values()) {
      unit.resetTurnState();
    }
  }

  /**
   * Remove suppression from units that didn't attack
   */
  processSuppressionRemoval(): void {
    for (const unit of this.units.values()) {
      if (unit.isAlive() && !unit.state.hasActed && unit.isSuppressed()) {
        unit.removeSuppression();
      }
    }
  }

  /**
   * Count active units (not destroyed or pinned)
   */
  getActiveUnitCount(): number {
    return this.getLivingUnits().filter(unit => !unit.isPinned()).length;
  }

  /**
   * Check victory conditions for this player
   */
  checkVictoryConditions(turn: number, maxTurns: number, enemy: Player): VictoryCondition[] {
    const conditions: VictoryCondition[] = [];
    
    if (this.side === PlayerSide.Assault) {
      // Assault victory conditions
      if (this.hasPrimaryObjectivesComplete()) {
        conditions.push(VictoryCondition.PRIMARY_OBJECTIVES);
      }
      
      if (enemy.getActiveUnitCount() === 0) {
        conditions.push(VictoryCondition.DEFENDER_COLLAPSE);
      }
    } else {
      // Defender victory conditions
      if (turn >= maxTurns && !enemy.hasPrimaryObjectivesComplete()) {
        conditions.push(VictoryCondition.ASSAULT_STALLED);
      }
      
      if (!enemy.isWaspOperational()) {
        conditions.push(VictoryCondition.WASP_DISABLED);
      }
      
      if (enemy.getActiveUnitCount() < 3) {
        conditions.push(VictoryCondition.ASSAULT_ANNIHILATION);
      }
    }
    
    return conditions;
  }

  /**
   * Calculate victory points for scoring scenarios
   */
  calculateVictoryPoints(): number {
    let points = 0;
    
    const objectiveCounts = this.getCompletedObjectivesCount();
    points += objectiveCounts.primary * 10;
    points += objectiveCounts.secondary * 5;
    
    // Points for eliminating enemy units would be calculated elsewhere
    // Points for holding objectives would be calculated based on current map state
    
    if (this.side === PlayerSide.Assault && this.waspStatus) {
      points += this.waspStatus.structuralIntegrity; // 1 VP per remaining Wasp HP
    }
    
    return points;
  }

  /**
   * Get player status summary
   */
  getStatus(): {
    id: string;
    side: PlayerSide;
    commandPoints: number;
    livingUnits: number;
    destroyedUnits: number;
    objectives: { primary: number; secondary: number };
    waspStatus?: WaspStatus | undefined;
  } {
    return {
      id: this.id,
      side: this.side,
      commandPoints: this.commandPoints,
      livingUnits: this.getLivingUnits().length,
      destroyedUnits: this.getDestroyedUnits().length,
      objectives: this.getCompletedObjectivesCount(),
      ...(this.waspStatus && { waspStatus: this.waspStatus }),
    };
  }
}