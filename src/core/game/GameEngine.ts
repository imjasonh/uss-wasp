/**
 * Game engine that handles actions and rule enforcement
 */

import { Hex, findPath } from '../hex';
import { Unit } from './Unit';
import { GameState, GameAction } from './GameState';
import { CombatSystem } from './Combat';
import { 
  ActionType, 
  UnitType,
  UnitCategory 
} from './types';

/**
 * Action result for UI feedback
 */
export interface ActionResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Movement path with costs
 */
export interface MovementPath {
  hexes: Hex[];
  totalCost: number;
  valid: boolean;
}

/**
 * Game engine that processes all player actions
 */
export class GameEngine {
  constructor(private gameState: GameState) {}

  /**
   * Execute a player action
   */
  executeAction(action: GameAction): ActionResult {
    // Validate action
    const validation = this.gameState.canPerformAction(action);
    if (!validation.valid) {
      return { success: false, message: validation.reason || 'Invalid action' };
    }

    // Execute based on action type
    switch (action.type) {
      case ActionType.MOVE:
        return this.executeMove(action);
      case ActionType.ATTACK:
        return this.executeAttack(action);
      case ActionType.LOAD:
        return this.executeLoad(action);
      case ActionType.UNLOAD:
        return this.executeUnload(action);
      case ActionType.SPECIAL_ABILITY:
        return this.executeSpecialAbility(action);
      case ActionType.SECURE_OBJECTIVE:
        return this.executeSecureObjective(action);
      case ActionType.REVEAL:
        return this.executeReveal(action);
      default:
        return { success: false, message: 'Unknown action type' };
    }
  }

  /**
   * Execute movement action
   */
  private executeMove(action: GameAction): ActionResult {
    const unit = this.gameState.getUnit(action.unitId);
    if (!unit || !action.targetPosition) {
      return { success: false, message: 'Invalid move parameters' };
    }

    // Check if unit can move
    if (!unit.canMove()) {
      return { success: false, message: 'Unit cannot move this turn' };
    }

    const targetHex = new Hex(action.targetPosition.q, action.targetPosition.r, action.targetPosition.s);

    // Calculate path
    const path = this.calculateMovementPath(unit, targetHex);
    if (!path.valid) {
      return { success: false, message: 'No valid path to target' };
    }

    // Check movement allowance
    if (path.totalCost > unit.getEffectiveMovement()) {
      return { success: false, message: `Insufficient movement (need ${path.totalCost}, have ${unit.getEffectiveMovement()})` };
    }

    // Check terrain restrictions
    const terrainCheck = this.validateTerrainMovement(unit, targetHex);
    if (!terrainCheck.valid) {
      return { success: false, message: terrainCheck.reason || 'Invalid terrain movement' };
    }

    // Execute move
    unit.moveTo(targetHex);
    
    // Force reveal if moving unit is hidden (moving reveals position)
    if (unit.isHidden()) {
      this.gameState.forceRevealUnit(unit.id);
    }
    
    this.gameState.addEvent('unit_moved', 
      `${unit.type} moved to (${targetHex.q}, ${targetHex.r})`,
      { unitId: unit.id, from: unit.state.position, to: targetHex, cost: path.totalCost }
    );

    return { 
      success: true, 
      message: `${unit.type} moved to (${targetHex.q}, ${targetHex.r})`,
      data: { path, unit }
    };
  }

  /**
   * Execute attack action
   */
  private executeAttack(action: GameAction): ActionResult {
    const attacker = this.gameState.getUnit(action.unitId);
    const defender = this.gameState.getUnit(action.targetId || '');

    if (!attacker || !defender) {
      return { success: false, message: 'Invalid attack parameters' };
    }

    // Validate attack
    const attackValidation = CombatSystem.canAttack(attacker, defender, this.gameState);
    if (!attackValidation.valid) {
      return { success: false, message: attackValidation.reason || 'Cannot attack target' };
    }

    // Check if defender is hidden and can be targeted
    if (defender.isHidden() && !this.canTargetHiddenUnit(attacker, defender)) {
      return { success: false, message: 'Cannot target hidden unit' };
    }

    // Force reveal attacking unit
    if (attacker.isHidden()) {
      this.gameState.forceRevealUnit(attacker.id);
    }

    // Force reveal defending unit when attacked
    if (defender.isHidden()) {
      this.gameState.forceRevealUnit(defender.id);
    }

    // Resolve combat
    const combatResult = CombatSystem.resolveCombat(attacker, defender, this.gameState);
    
    // Apply special combat effects
    CombatSystem.applySpecialCombatEffects(attacker, defender, combatResult);

    // Log combat
    this.gameState.addEvent('combat_resolved', combatResult.description, {
      attackerId: attacker.id,
      defenderId: defender.id,
      damage: combatResult.damage,
      destroyed: combatResult.defenderDestroyed
    });

    return {
      success: true,
      message: combatResult.description,
      data: combatResult
    };
  }

  /**
   * Execute load action (units into transports)
   */
  private executeLoad(action: GameAction): ActionResult {
    const transport = this.gameState.getUnit(action.unitId);
    const cargo = this.gameState.getUnit(action.targetId || '');

    if (!transport || !cargo) {
      return { success: false, message: 'Invalid load parameters' };
    }

    // Check if transport can carry cargo
    if (transport.getCargoCapacity() === 0) {
      return { success: false, message: 'Unit cannot carry cargo' };
    }

    // Check if transport has space
    if (transport.state.cargo.length >= transport.getCargoCapacity()) {
      return { success: false, message: 'Transport is at capacity' };
    }

    // Check if units are adjacent or on same hex
    const distance = new Hex(transport.state.position.q, transport.state.position.r, transport.state.position.s)
      .distanceTo(cargo.state.position);
    
    if (distance > 1) {
      return { success: false, message: 'Units must be adjacent to load' };
    }

    // Check cargo compatibility
    const compatibilityCheck = this.validateCargoCompatibility(transport, cargo);
    if (!compatibilityCheck.valid) {
      return { success: false, message: compatibilityCheck.reason || 'Cargo compatibility issue' };
    }

    // Execute load
    if (transport.loadCargo(cargo)) {
      this.gameState.addEvent('unit_loaded', 
        `${cargo.type} loaded into ${transport.type}`,
        { transportId: transport.id, cargoId: cargo.id }
      );

      return { 
        success: true, 
        message: `${cargo.type} loaded into ${transport.type}`,
        data: { transport, cargo }
      };
    }

    return { success: false, message: 'Failed to load unit' };
  }

  /**
   * Execute unload action
   */
  private executeUnload(action: GameAction): ActionResult {
    const transport = this.gameState.getUnit(action.unitId);
    if (!transport || !action.targetId) {
      return { success: false, message: 'Invalid unload parameters' };
    }

    const cargo = transport.unloadCargo(action.targetId);
    if (!cargo) {
      return { success: false, message: 'Unit not found in transport' };
    }

    // Place cargo on transport's hex or adjacent hex
    const targetHex = action.targetPosition 
      ? new Hex(action.targetPosition.q, action.targetPosition.r, action.targetPosition.s)
      : new Hex(transport.state.position.q, transport.state.position.r, transport.state.position.s);

    // Validate unload position
    const unloadCheck = this.validateUnloadPosition(transport, cargo, targetHex);
    if (!unloadCheck.valid) {
      return { success: false, message: unloadCheck.reason || 'Invalid unload position' };
    }

    cargo.moveTo(targetHex);

    this.gameState.addEvent('unit_unloaded',
      `${cargo.type} unloaded from ${transport.type}`,
      { transportId: transport.id, cargoId: cargo.id, position: targetHex }
    );

    return {
      success: true,
      message: `${cargo.type} unloaded at (${targetHex.q}, ${targetHex.r})`,
      data: { transport, cargo, position: targetHex }
    };
  }

  /**
   * Execute special ability
   */
  private executeSpecialAbility(action: GameAction): ActionResult {
    const unit = this.gameState.getUnit(action.unitId);
    if (!unit || !action.data?.abilityName) {
      return { success: false, message: 'Invalid special ability parameters' };
    }

    const abilityName = action.data.abilityName as string;
    const ability = unit.specialAbilities.find(a => a.name === abilityName);
    
    if (!ability) {
      return { success: false, message: 'Unit does not have this ability' };
    }

    // Check CP cost
    const player = this.gameState.getPlayer(action.playerId);
    if (ability.cpCost && player && !player.spendCommandPoints(ability.cpCost)) {
      return { success: false, message: `Insufficient command points (need ${ability.cpCost})` };
    }

    // Execute specific abilities
    return this.executeSpecificAbility(unit, abilityName, action.data);
  }

  /**
   * Execute specific unit abilities
   */
  private executeSpecificAbility(unit: Unit, abilityName: string, data: any): ActionResult {
    switch (abilityName) {
      case 'Artillery Barrage':
        return this.executeArtilleryBarrage(unit, data);
      case 'SAM Strike':
        return this.executeSAMStrike(unit, data);
      case 'Sea Sparrow':
        return this.executeSeaSparrow(unit, data);
      case 'Breaching Charge':
        return this.executeBreachingCharge(unit, data);
      default:
        return { success: false, message: 'Unknown special ability' };
    }
  }

  /**
   * Execute reveal action (for hidden units)
   */
  private executeReveal(action: GameAction): ActionResult {
    const unit = this.gameState.getUnit(action.unitId);
    if (!unit) {
      return { success: false, message: 'Unit not found' };
    }

    if (!unit.isHidden()) {
      return { success: false, message: 'Unit is not hidden' };
    }

    unit.reveal();

    this.gameState.addEvent('unit_revealed',
      `${unit.type} revealed at (${unit.state.position.q}, ${unit.state.position.r})`,
      { unitId: unit.id, position: unit.state.position }
    );

    return {
      success: true,
      message: `${unit.type} revealed`,
      data: { unit }
    };
  }

  /**
   * Execute objective securing
   */
  private executeSecureObjective(action: GameAction): ActionResult {
    const unit = this.gameState.getUnit(action.unitId);
    if (!unit) {
      return { success: false, message: 'Unit not found' };
    }

    const mapHex = this.gameState.map.getHex(unit.state.position);
    if (!mapHex?.objective) {
      return { success: false, message: 'No objective at unit position' };
    }

    // Check if unit can secure objectives (usually infantry)
    if (!unit.hasCategory(UnitCategory.INFANTRY)) {
      return { success: false, message: 'Only infantry units can secure objectives' };
    }

    // Mark objective as controlled
    const updatedObjective = {
      ...mapHex.objective,
      controlledBy: action.playerId
    };

    this.gameState.addEvent('objective_secured',
      `${unit.type} secured ${mapHex.objective.type}`,
      { unitId: unit.id, objectiveId: mapHex.objective.id, playerId: action.playerId }
    );

    return {
      success: true,
      message: `Objective ${mapHex.objective.type} secured`,
      data: { objective: updatedObjective, unit }
    };
  }

  /**
   * Calculate movement path for a unit
   */
  calculateMovementPath(unit: Unit, target: Hex): MovementPath {
    const start = unit.state.position;
    const targetCoord = { q: target.q, r: target.r, s: target.s };
    
    const path = findPath(start, targetCoord, {
      getCost: (from, to) => {
        const cost = this.gameState.map.getMovementCost(to);
        
        // Apply unit-specific movement rules
        const fromHex = new Hex(from.q, from.r, from.s);
        const toHex = new Hex(to.q, to.r, to.s);
        return this.getUnitMovementCost(unit, fromHex, toHex, cost);
      },
      maxDistance: unit.getEffectiveMovement() + 2
    });

    if (path.length === 0) {
      return { hexes: [], totalCost: Infinity, valid: false };
    }

    // Calculate total cost
    let totalCost = 0;
    for (let i = 1; i < path.length; i++) {
      const cost = this.gameState.map.getMovementCost({ q: path[i].q, r: path[i].r, s: path[i].s });
      totalCost += this.getUnitMovementCost(unit, path[i-1], path[i], cost);
    }

    return {
      hexes: path,
      totalCost,
      valid: totalCost <= unit.getEffectiveMovement()
    };
  }

  /**
   * Get unit-specific movement cost
   */
  private getUnitMovementCost(unit: Unit, _from: Hex, to: Hex, baseCost: number): number {
    // LCAC high-speed amphibious
    if (unit.type === UnitType.LCAC) {
      const toHex = this.gameState.map.getHex(to);
      if (toHex && ['deep_water', 'shallow_water', 'beach'].includes(toHex.terrain)) {
        return 1;
      }
    }

    // AAV amphibious movement
    if (unit.type === UnitType.AAV_7) {
      const toHex = this.gameState.map.getHex(to);
      if (toHex?.terrain === 'shallow_water') return 1;
      if (toHex?.terrain === 'deep_water') return 2;
    }

    // Aircraft ignore terrain
    if (unit.hasCategory(UnitCategory.AIRCRAFT) || unit.hasCategory(UnitCategory.HELICOPTER)) {
      return 1;
    }

    // Osprey difficult terrain bonus
    if (unit.type === UnitType.OSPREY && baseCost > 1) {
      return Math.max(1, baseCost - 1);
    }

    return baseCost;
  }

  /**
   * Validate terrain movement restrictions
   */
  private validateTerrainMovement(unit: Unit, target: Hex): { valid: boolean; reason?: string } {
    const targetHex = this.gameState.map.getHex(target);
    if (!targetHex) {
      return { valid: false, reason: 'Invalid target hex' };
    }

    // Ground units cannot move into deep water
    if (targetHex.terrain === 'deep_water' && 
        !unit.hasCategory(UnitCategory.AMPHIBIOUS) && 
        !unit.hasCategory(UnitCategory.AIRCRAFT) &&
        !unit.hasCategory(UnitCategory.SHIP)) {
      return { valid: false, reason: 'Ground units cannot enter deep water' };
    }

    // Super Stallion requires clear LZ
    if (unit.type === UnitType.SUPER_STALLION && 
        !['clear', 'beach'].includes(targetHex.terrain)) {
      return { valid: false, reason: 'Super Stallion requires clear landing zone' };
    }

    return { valid: true };
  }

  /**
   * Check if attacker can target hidden unit
   */
  private canTargetHiddenUnit(attacker: Unit, defender: Unit): boolean {
    // MARSOC recon specialists can detect hidden units
    if (attacker.type === UnitType.MARSOC) {
      const distance = new Hex(attacker.state.position.q, attacker.state.position.r, attacker.state.position.s)
        .distanceTo(defender.state.position);
      return distance <= 2;
    }

    // Generally cannot target hidden units
    return false;
  }

  /**
   * Validate cargo compatibility
   */
  private validateCargoCompatibility(transport: Unit, cargo: Unit): { valid: boolean; reason?: string } {
    // Same side only
    if (transport.side !== cargo.side) {
      return { valid: false, reason: 'Cannot load enemy units' };
    }

    // Check specific transport rules
    if (transport.type === UnitType.OSPREY) {
      if (cargo.type === UnitType.HUMVEE || cargo.hasCategory(UnitCategory.INFANTRY)) {
        return { valid: true };
      }
      return { valid: false, reason: 'Osprey can only carry infantry or Humvees' };
    }

    if (transport.type === UnitType.AAV_7) {
      if (cargo.hasCategory(UnitCategory.INFANTRY)) {
        return { valid: true };
      }
      return { valid: false, reason: 'AAV can only carry infantry' };
    }

    return { valid: true };
  }

  /**
   * Validate unload position
   */
  private validateUnloadPosition(transport: Unit, cargo: Unit, position: Hex): { valid: boolean; reason?: string } {
    // Check distance from transport
    const distance = new Hex(transport.state.position.q, transport.state.position.r, transport.state.position.s)
      .distanceTo(position);
    
    if (distance > 1) {
      return { valid: false, reason: 'Can only unload to adjacent hex' };
    }

    // Check if position is valid for cargo type
    const terrainCheck = this.validateTerrainMovement(cargo, position);
    if (!terrainCheck.valid) {
      return terrainCheck;
    }

    // Check if hex is occupied
    const unitsAtPosition = this.gameState.getUnitsAt(position);
    if (unitsAtPosition.length > 0) {
      return { valid: false, reason: 'Position is occupied' };
    }

    return { valid: true };
  }

  /**
   * Execute artillery barrage
   */
  private executeArtilleryBarrage(_unit: Unit, data: any): ActionResult {
    if (!data.targetHexes || data.targetHexes.length !== 3) {
      return { success: false, message: 'Artillery barrage requires 3 target hexes' };
    }

    const results = [];
    for (const hexData of data.targetHexes) {
      const hex = new Hex(hexData.q, hexData.r, hexData.s);
      const targets = this.gameState.getUnitsAt(hex);
      
      for (const target of targets) {
        // Simulate artillery attack (2 ATK dice vs DEF 5)
        const damage = Math.floor(Math.random() * 3); // 0-2 damage
        if (damage > 0) {
          target.takeDamage(damage);
          results.push(`${target.type} hit for ${damage} damage`);
        }
        
        // Always apply suppression
        target.state.suppressionTokens = Math.min(2, target.state.suppressionTokens + 1);
      }
    }

    return {
      success: true,
      message: `Artillery barrage completed: ${results.join(', ')}`,
      data: { results }
    };
  }

  /**
   * Execute SAM strike
   */
  private executeSAMStrike(_unit: Unit, data: any): ActionResult {
    const targetId = data.targetId;
    const target = this.gameState.getUnit(targetId);
    
    if (!target) {
      return { success: false, message: 'Target not found' };
    }

    if (!target.hasCategory(UnitCategory.AIRCRAFT) && 
        !target.hasCategory(UnitCategory.HELICOPTER) &&
        target.type !== UnitType.USS_WASP) {
      return { success: false, message: 'Can only target aircraft or USS Wasp' };
    }

    // Simulate SAM attack (3 ATK dice)
    const damage = Math.floor(Math.random() * 4); // 0-3 damage
    if (damage > 0) {
      target.takeDamage(damage);
    }

    return {
      success: true,
      message: `SAM strike on ${target.type}: ${damage} damage`,
      data: { target, damage }
    };
  }

  /**
   * Execute Sea Sparrow defense
   */
  private executeSeaSparrow(unit: Unit, data: any): ActionResult {
    // Similar to SAM strike but defensive
    return this.executeSAMStrike(unit, data);
  }

  /**
   * Execute breaching charge
   */
  private executeBreachingCharge(unit: Unit, data: any): ActionResult {
    if (!data.targetHex) {
      return { success: false, message: 'Target hex required' };
    }

    const targetHex = new Hex(data.targetHex.q, data.targetHex.r, data.targetHex.s);
    const distance = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s)
      .distanceTo(targetHex);

    if (distance > 1) {
      return { success: false, message: 'Target must be adjacent' };
    }

    const fortification = this.gameState.map.getFortificationAt(targetHex);
    if (!fortification || !['barricade', 'trench'].includes(fortification.type)) {
      return { success: false, message: 'No destroyable fortification at target' };
    }

    // Remove fortification
    this.gameState.map.removeFortification(fortification.id);

    return {
      success: true,
      message: `${fortification.type} destroyed`,
      data: { fortification }
    };
  }
}