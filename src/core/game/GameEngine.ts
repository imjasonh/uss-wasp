/**
 * Game engine that handles actions and rule enforcement
 */

import { Hex, findPath } from '../hex';
import { Unit } from './Unit';
import { GameState, GameAction } from './GameState';
import { CombatSystem } from './Combat';
import { AIController } from '../ai/AIController';
import { Player } from './Player';
import { ActionType, UnitType, UnitCategory, PlayerSide, TerrainType } from './types';
import { AIDifficulty, AIState, AIPerformanceMetrics, AIPersonalityType } from '../ai/types';
import { GameLogger, LogCategory, LogLevel, getGameLogger } from '../logging/GameLogger';
import { GameStateManager } from '../logging/GameStateManager';
import { GameVisualizationLogger } from '../logging/GameVisualizationLogger';

/**
 * Action result for UI feedback
 */
export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
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
 * Special ability data for various abilities
 */
interface SpecialAbilityData {
  targetHex?: { q: number; r: number; s: number };
  targetHexes?: { q: number; r: number; s: number }[];
  targetId?: string;
  [key: string]: unknown;
}

/**
 * Game engine that processes all player actions
 */
export class GameEngine {
  private readonly aiControllers: Map<string, AIController> = new Map();
  private logger: GameLogger | null = null;
  private visualizationLogger: GameVisualizationLogger | null = null;
  private stateManager: GameStateManager | null = null;
  private visualizationEnabled: boolean = false;

  public constructor(private readonly gameState: GameState) {
    this.logger = getGameLogger();
    if (this.logger) {
      this.stateManager = new GameStateManager(this.logger);
    }
  }

  /**
   * Set a custom logger for this engine
   */
  public setLogger(logger: GameLogger): void {
    this.logger = logger;
    this.stateManager = new GameStateManager(logger);
  }

  /**
   * Enable visualization logging for detailed game replay data
   */
  public enableVisualizationLogging(gameId?: string): GameVisualizationLogger {
    const logGameId = gameId || this.gameState.gameId;
    this.visualizationLogger = new GameVisualizationLogger(logGameId);
    this.visualizationEnabled = true;
    this.logger = this.visualizationLogger; // Use visualization logger as primary logger
    this.stateManager = new GameStateManager(this.visualizationLogger);
    return this.visualizationLogger;
  }

  /**
   * Disable visualization logging and return to basic logging
   */
  public disableVisualizationLogging(): void {
    this.visualizationEnabled = false;
    this.visualizationLogger = null;
    this.logger = getGameLogger();
    if (this.logger) {
      this.stateManager = new GameStateManager(this.logger);
    }
  }

  /**
   * Get the visualization logger if enabled
   */
  public getVisualizationLogger(): GameVisualizationLogger | null {
    return this.visualizationLogger;
  }

  /**
   * Check if visualization logging is enabled
   */
  public isVisualizationEnabled(): boolean {
    return this.visualizationEnabled;
  }

  /**
   * Execute a player action
   */
  public executeAction(action: GameAction): ActionResult {
    // Log action attempt
    this.logger?.log(
      LogLevel.DEBUG,
      LogCategory.UNIT_ACTION,
      `Attempting ${action.type} for unit ${action.unitId}`,
      this.gameState,
      { action },
      action.playerId,
      action.unitId
    );

    // Validate action
    const validation = this.gameState.canPerformAction(action);
    if (!validation.valid) {
      const result = { success: false, message: validation.reason ?? 'Invalid action' };
      this.logger?.logUnitAction(action, result, this.gameState);
      return result;
    }

    // Execute based on action type
    let result: ActionResult;
    const unit = this.gameState.getUnit(action.unitId);

    // Get the player to consume command points
    const player = this.gameState.getPlayer(action.playerId);
    if (!player) {
      return { success: false, message: 'Player not found' };
    }

    switch (action.type) {
      case ActionType.MOVE:
        result = this.executeMove(action);
        break;
      case ActionType.ATTACK:
        result = this.executeAttack(action);
        break;
      case ActionType.LOAD:
        result = this.executeLoad(action);
        break;
      case ActionType.UNLOAD:
        result = this.executeUnload(action);
        break;
      case ActionType.SPECIAL_ABILITY:
        result = this.executeSpecialAbility(action);
        break;
      case ActionType.SECURE_OBJECTIVE:
        result = this.executeSecureObjective(action);
        break;
      case ActionType.REVEAL:
        result = this.executeReveal(action);
        break;
      case ActionType.LAUNCH_FROM_WASP:
        result = this.executeLaunchFromWasp(action);
        break;
      case ActionType.RECOVER_TO_WASP:
        result = this.executeRecoverToWasp(action);
        break;
      case ActionType.PLAY_EVENT_CARD:
        result = this.executePlayEventCard(action);
        break;
      default:
        result = { success: false, message: 'Unknown action type' };
    }

    // Consume command points if action was successful
    if (result.success) {
      player.spendCommandPoints(1); // Each action costs 1 CP
    }

    // Enhanced logging for visualization if enabled
    if (this.visualizationEnabled && this.visualizationLogger) {
      this.visualizationLogger.logVisualizationAction(action, result, this.gameState, unit);
    } else {
      // Standard logging
      this.logger?.logUnitAction(action, result, this.gameState, unit);
    }

    // Auto-snapshot if enabled
    this.stateManager?.checkAutoSnapshot(this.gameState);

    return result;
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

    const targetHex = new Hex(
      action.targetPosition.q,
      action.targetPosition.r,
      action.targetPosition.s
    );

    // Calculate path
    const path = this.calculateMovementPath(unit, targetHex);
    if (!path.valid) {
      return { success: false, message: 'No valid path to target' };
    }

    // Check movement allowance
    if (path.totalCost > unit.getEffectiveMovement()) {
      return {
        success: false,
        message: `Insufficient movement (need ${path.totalCost}, have ${unit.getEffectiveMovement()})`,
      };
    }

    // Check terrain restrictions
    const terrainCheck = this.validateTerrainMovement(unit, targetHex);
    if (!terrainCheck.valid) {
      return { success: false, message: terrainCheck.reason ?? 'Invalid terrain movement' };
    }

    // Execute move
    unit.moveTo(targetHex);

    // Force reveal if moving unit is hidden (moving reveals position)
    if (unit.isHidden()) {
      this.gameState.forceRevealUnit(unit.id);
    }

    this.gameState.addEvent(
      'unit_moved',
      `${unit.type} moved to (${targetHex.q}, ${targetHex.r})`,
      { unitId: unit.id, from: unit.state.position, to: targetHex, cost: path.totalCost }
    );

    return {
      success: true,
      message: `${unit.type} moved to (${targetHex.q}, ${targetHex.r})`,
      data: { path, unit },
    };
  }

  /**
   * Execute attack action
   */
  private executeAttack(action: GameAction): ActionResult {
    const attacker = this.gameState.getUnit(action.unitId);
    const defender = this.gameState.getUnit(action.targetId ?? '');

    if (!attacker || !defender) {
      return { success: false, message: 'Invalid attack parameters' };
    }

    // Validate attack
    const attackValidation = CombatSystem.canAttack(attacker, defender, this.gameState);
    if (!attackValidation.valid) {
      return { success: false, message: attackValidation.reason ?? 'Cannot attack target' };
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

    // Enhanced combat logging for visualization if enabled
    if (this.visualizationEnabled && this.visualizationLogger) {
      this.visualizationLogger.logVisualizationCombat(attacker, defender, combatResult, this.gameState);
    } else {
      // Standard combat logging
      this.logger?.logCombat(attacker, defender, combatResult, this.gameState);
    }

    // Apply special combat effects
    CombatSystem.applySpecialCombatEffects(attacker, defender, combatResult);

    // Log combat event to game state (for backward compatibility)
    this.gameState.addEvent('combat_resolved', combatResult.description, {
      attackerId: attacker.id,
      defenderId: defender.id,
      damage: combatResult.damage,
      destroyed: combatResult.defenderDestroyed,
    });

    return {
      success: true,
      message: combatResult.description,
      data: combatResult,
    };
  }

  /**
   * Execute load action (units into transports)
   */
  private executeLoad(action: GameAction): ActionResult {
    const transport = this.gameState.getUnit(action.unitId);
    const cargo = this.gameState.getUnit(action.targetId ?? '');

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
    const distance = new Hex(
      transport.state.position.q,
      transport.state.position.r,
      transport.state.position.s
    ).distanceTo(cargo.state.position);

    if (distance > 1) {
      return { success: false, message: 'Units must be adjacent to load' };
    }

    // Check cargo compatibility
    const compatibilityCheck = this.validateCargoCompatibility(transport, cargo);
    if (!compatibilityCheck.valid) {
      return { success: false, message: compatibilityCheck.reason ?? 'Cargo compatibility issue' };
    }

    // Execute load
    if (transport.loadCargo(cargo)) {
      this.gameState.addEvent('unit_loaded', `${cargo.type} loaded into ${transport.type}`, {
        transportId: transport.id,
        cargoId: cargo.id,
      });

      return {
        success: true,
        message: `${cargo.type} loaded into ${transport.type}`,
        data: { transport, cargo },
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
      return { success: false, message: unloadCheck.reason ?? 'Invalid unload position' };
    }

    cargo.moveTo(targetHex);

    this.gameState.addEvent('unit_unloaded', `${cargo.type} unloaded from ${transport.type}`, {
      transportId: transport.id,
      cargoId: cargo.id,
      position: targetHex,
    });

    return {
      success: true,
      message: `${cargo.type} unloaded at (${targetHex.q}, ${targetHex.r})`,
      data: { transport, cargo, position: targetHex },
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
    if (ability.cpCost) {
      const actionPlayer = this.gameState.getPlayer(action.playerId);
      if (actionPlayer && !actionPlayer.spendCommandPoints(ability.cpCost)) {
        return { success: false, message: `Insufficient command points (need ${ability.cpCost})` };
      }
    }

    // Execute specific abilities
    return this.executeSpecificAbility(unit, abilityName, action.data);
  }

  /**
   * Execute specific unit abilities
   */
  private executeSpecificAbility(
    unit: Unit,
    abilityName: string,
    data: SpecialAbilityData
  ): ActionResult {
    switch (abilityName) {
      case 'Artillery Barrage':
        return this.executeArtilleryBarrage(unit, data);
      case 'SAM Strike':
        return this.executeSAMStrike(unit, data);
      case 'Sea Sparrow':
        return this.executeSeaSparrow(unit, data);
      case 'Breaching Charge':
        return this.executeBreachingCharge(unit, data);

      // Vehicle abilities
      case 'Fast Reconnaissance':
        return this.executeFastReconnaissance(unit, data);
      case 'Fast Ambush':
        return this.executeFastAmbush(unit, data);
      case 'Mobility':
        return this.executeMobility(unit, data);
      case 'Improvised':
        return this.executeImprovised(unit, data);

      // Infantry abilities
      case 'Urban Specialists':
        return this.executeUrbanSpecialists(unit, data);
      case 'Defensive Position':
        return this.executeDefensivePosition(unit, data);
      case 'Entrench':
        return this.executeEntrench(unit, data);
      case 'Amphibious Training':
        return this.executeAmphibiousTraining(unit, data);
      case 'Special Operations':
        return this.executeSpecialOperations(unit, data);

      // Combat specialist abilities
      case 'Anti-Vehicle Specialist':
        return this.executeAntiVehicleSpecialist(unit, data);
      case 'Anti-Aircraft':
        return this.executeAntiAircraft(unit, data);
      case 'Anti-Air Focus':
        return this.executeAntiAirFocus(unit, data);
      case 'Anti-Tank':
        return this.executeAntiTank(unit, data);

      // Support abilities
      case 'Indirect Fire':
        return this.executeIndirectFire(unit, data);
      case 'Local Knowledge':
        return this.executeLocalKnowledge(unit, data);
      case 'Heavy Bombardment':
        return this.executeHeavyBombardment(unit, data);

      // Naval/Ship abilities
      case 'Amphibious Command':
        return this.executeAmphibiousCommand(unit, data);
      case 'Launch Operations':
        return this.executeLaunchOperations(unit, data);

      // Aircraft abilities
      case 'VTOL':
        return this.executeVTOL(unit, data);
      case 'Tilt-rotor':
        return this.executeTiltRotor(unit, data);
      case 'Close Air Support':
        return this.executeCloseAirSupport(unit, data);

      default:
        return { success: false, message: `Unknown special ability: ${abilityName}` };
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

    this.gameState.addEvent(
      'unit_revealed',
      `${unit.type} revealed at (${unit.state.position.q}, ${unit.state.position.r})`,
      { unitId: unit.id, position: unit.state.position }
    );

    return {
      success: true,
      message: `${unit.type} revealed`,
      data: { unit },
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
      controlledBy: action.playerId,
    };

    this.gameState.addEvent('objective_secured', `${unit.type} secured ${mapHex.objective.type}`, {
      unitId: unit.id,
      objectiveId: mapHex.objective.id,
      playerId: action.playerId,
    });

    return {
      success: true,
      message: `Objective ${mapHex.objective.type} secured`,
      data: { objective: updatedObjective, unit },
    };
  }

  /**
   * Calculate movement path for a unit
   */
  public calculateMovementPath(unit: Unit, target: Hex): MovementPath {
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
      maxDistance: unit.getEffectiveMovement() + 2,
    });

    if (path.length === 0) {
      return { hexes: [], totalCost: Infinity, valid: false };
    }

    // Calculate total cost
    let totalCost = 0;
    for (let i = 1; i < path.length; i++) {
      const cost = this.gameState.map.getMovementCost({ q: path[i].q, r: path[i].r, s: path[i].s });
      totalCost += this.getUnitMovementCost(unit, path[i - 1], path[i], cost);
    }

    return {
      hexes: path,
      totalCost,
      valid: totalCost <= unit.getEffectiveMovement(),
    };
  }

  /**
   * Get unit-specific movement cost
   */
  private getUnitMovementCost(unit: Unit, _from: Hex, to: Hex, baseCost: number): number {
    const toHex = this.gameState.map.getHex(to);
    if (!toHex) {
      return Infinity; // Invalid hex
    }

    // Check terrain restrictions first - return Infinity to block pathfinding
    if (
      toHex.terrain === TerrainType.DEEP_WATER &&
      !unit.hasCategory(UnitCategory.AMPHIBIOUS) &&
      !unit.hasCategory(UnitCategory.AIRCRAFT) &&
      !unit.hasCategory(UnitCategory.SHIP)
    ) {
      return Infinity; // Ground units cannot enter deep water
    }

    // Super Stallion requires clear LZ
    if (unit.type === UnitType.SUPER_STALLION && !['clear', 'beach'].includes(toHex.terrain)) {
      return Infinity; // Super Stallion requires clear landing zone
    }

    // LCAC high-speed amphibious
    if (unit.type === UnitType.LCAC) {
      if (
        [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER, TerrainType.BEACH].includes(
          toHex.terrain
        )
      ) {
        return 1;
      }
    }

    // AAV amphibious movement
    if (unit.type === UnitType.AAV_7) {
      if (toHex.terrain === TerrainType.SHALLOW_WATER) {
        return 1;
      }
      if (toHex.terrain === TerrainType.DEEP_WATER) {
        return 2;
      }
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
    if (
      targetHex.terrain === TerrainType.DEEP_WATER &&
      !unit.hasCategory(UnitCategory.AMPHIBIOUS) &&
      !unit.hasCategory(UnitCategory.AIRCRAFT) &&
      !unit.hasCategory(UnitCategory.SHIP)
    ) {
      return { valid: false, reason: 'Ground units cannot enter deep water' };
    }

    // Super Stallion requires clear LZ
    if (unit.type === UnitType.SUPER_STALLION && !['clear', 'beach'].includes(targetHex.terrain)) {
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
      const distance = new Hex(
        attacker.state.position.q,
        attacker.state.position.r,
        attacker.state.position.s
      ).distanceTo(defender.state.position);
      return distance <= 2;
    }

    // Generally cannot target hidden units
    return false;
  }

  /**
   * Validate cargo compatibility
   */
  private validateCargoCompatibility(
    transport: Unit,
    cargo: Unit
  ): { valid: boolean; reason?: string } {
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
  private validateUnloadPosition(
    transport: Unit,
    cargo: Unit,
    position: Hex
  ): { valid: boolean; reason?: string } {
    // Check distance from transport
    const distance = new Hex(
      transport.state.position.q,
      transport.state.position.r,
      transport.state.position.s
    ).distanceTo(position);

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
  private executeArtilleryBarrage(_unit: Unit, data: SpecialAbilityData): ActionResult {
    if (!data.targetHexes || data.targetHexes.length === 0) {
      return { success: false, message: 'Artillery barrage requires at least 1 target hex' };
    }
    
    // Limit to maximum 3 hexes for game balance
    const targetHexes = data.targetHexes.slice(0, 3);

    const results = [];
    for (const hexData of targetHexes) {
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
      message: `Artillery barrage on ${targetHexes.length} hex${targetHexes.length > 1 ? 'es' : ''}: ${results.join(', ') || 'No hits'}`,
      data: { results, hexesTargeted: targetHexes.length },
    };
  }

  /**
   * Execute SAM strike
   */
  private executeSAMStrike(_unit: Unit, data: SpecialAbilityData): ActionResult {
    const targetId = data.targetId;
    if (!targetId) {
      return { success: false, message: 'Target ID required for SAM strike' };
    }

    const target = this.gameState.getUnit(targetId);
    if (!target) {
      return { success: false, message: 'Target not found' };
    }

    if (
      !target.hasCategory(UnitCategory.AIRCRAFT) &&
      !target.hasCategory(UnitCategory.HELICOPTER) &&
      target.type !== UnitType.USS_WASP
    ) {
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
      data: { target, damage },
    };
  }

  /**
   * Execute Sea Sparrow defense
   */
  private executeSeaSparrow(unit: Unit, data: SpecialAbilityData): ActionResult {
    // Similar to SAM strike but defensive
    return this.executeSAMStrike(unit, data);
  }

  /**
   * Execute breaching charge
   */
  private executeBreachingCharge(unit: Unit, data: SpecialAbilityData): ActionResult {
    if (!data.targetHex) {
      return { success: false, message: 'Target hex required' };
    }

    const targetHex = new Hex(data.targetHex.q, data.targetHex.r, data.targetHex.s);
    const distance = new Hex(
      unit.state.position.q,
      unit.state.position.r,
      unit.state.position.s
    ).distanceTo(targetHex);

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
      data: { fortification },
    };
  }

  /**
   * Execute launch from USS Wasp
   */
  private executeLaunchFromWasp(action: GameAction): ActionResult {
    if (!action.data?.unitIds || !Array.isArray(action.data.unitIds)) {
      return { success: false, message: 'No units specified for launch' };
    }

    // Get units to launch
    const unitsToLaunch: Unit[] = [];
    for (const unitId of action.data.unitIds) {
      if (typeof unitId !== 'string') {
        return { success: false, message: 'Invalid unit ID format' };
      }
      const unit = this.gameState.getUnit(unitId);
      if (!unit) {
        return { success: false, message: `Unit ${unitId} not found` };
      }
      unitsToLaunch.push(unit);
    }

    // Execute launch through game state
    const result = this.gameState.launchUnitsFromWasp(unitsToLaunch);

    return {
      success: result.success,
      message: result.message,
      data: { launchedUnits: result.success ? unitsToLaunch : [] },
    };
  }

  /**
   * Execute recovery to USS Wasp
   */
  private executeRecoverToWasp(action: GameAction): ActionResult {
    if (!action.data?.unitIds || !Array.isArray(action.data.unitIds)) {
      return { success: false, message: 'No units specified for recovery' };
    }

    // Get units to recover
    const unitsToRecover: Unit[] = [];
    for (const unitId of action.data.unitIds) {
      if (typeof unitId !== 'string') {
        return { success: false, message: 'Invalid unit ID format' };
      }
      const unit = this.gameState.getUnit(unitId);
      if (!unit) {
        return { success: false, message: `Unit ${unitId} not found` };
      }
      unitsToRecover.push(unit);
    }

    // Execute recovery through game state
    const result = this.gameState.recoverUnitsToWasp(unitsToRecover);

    return {
      success: result.success,
      message: result.message,
      data: { recoveredUnits: result.success ? unitsToRecover : [] },
    };
  }

  /**
   * Execute play event card action
   */
  private executePlayEventCard(action: GameAction): ActionResult {
    if (!action.data?.cardId) {
      return { success: false, message: 'No card ID specified' };
    }

    const cardId = action.data.cardId as string;
    const targetData = action.data.targetData as Record<string, unknown> | undefined;

    // Check if player can play the card
    if (!this.gameState.canPlayEventCard(cardId, action.playerId)) {
      return { success: false, message: 'Cannot play this event card' };
    }

    // Play the event card
    const result = this.gameState.playEventCard(cardId, action.playerId, targetData);

    return {
      success: result.success,
      message: result.message,
      data: {
        cardId,
        effectsApplied: result.effectsApplied,
        ...result.data,
      },
    };
  }

  /**
   * Add AI controller for a player
   */
  public addAIController(
    playerId: string,
    configOrPersonality: AIDifficulty | AIPersonalityType = AIDifficulty.VETERAN
  ): void {
    const aiController = new AIController(playerId, configOrPersonality);
    this.aiControllers.set(playerId, aiController);
    console.log(
      `[AI] Added AI controller for player ${playerId} with configuration ${configOrPersonality}`
    );
  }

  /**
   * Remove AI controller for a player
   */
  public removeAIController(playerId: string): void {
    this.aiControllers.delete(playerId);
    console.log(`[AI] Removed AI controller for player ${playerId}`);
  }

  /**
   * Check if player is AI controlled
   */
  public isAIControlled(playerId: string): boolean {
    return this.aiControllers.has(playerId);
  }

  /**
   * Update AI for current active player
   */
  public updateAI(): GameAction[] {
    const activePlayerId = this.gameState.activePlayerId;
    const aiController = this.aiControllers.get(activePlayerId);

    if (!aiController) {
      return []; // No AI for this player
    }

    // Generate AI actions
    const aiActions = aiController.update(this.gameState);

    // Debug logging for AI actions
    if (aiActions.length > 0) {
      console.log(`[AI] Executing ${aiActions.length} actions for player ${activePlayerId}`);
    }

    // Execute AI actions and provide feedback
    const results: ActionResult[] = [];
    for (const action of aiActions) {
      console.log(`[AI] Attempting action: ${action.type} for unit ${action.unitId}`);
      const result = this.executeAction(action);
      results.push(result);

      if (result.success) {
        console.log(`[AI] ✅ Action succeeded: ${result.message}`);
      } else {
        console.log(`[AI] ❌ Action failed: ${result.message}`);
      }
    }

    // Let AI learn from action results
    aiController.processActionResults(aiActions, results);

    return aiActions;
  }

  /**
   * Get all players in the game
   */
  public getPlayers(): Player[] {
    return this.gameState.getAllPlayers();
  }

  /**
   * Get game state (for AI analysis)
   */
  public getGameState(): GameState {
    return this.gameState;
  }

  /**
   * Process player actions for AI learning
   */
  public processPlayerActionsForAI(playerId: string, actions: GameAction[]): void {
    // Find enemy AI controllers that should learn from these actions
    for (const [aiPlayerId, aiController] of this.aiControllers) {
      if (aiPlayerId !== playerId) {
        // This AI should learn from the enemy player's behavior
        aiController.analyzePlayerBehavior(this.gameState, actions);
      }
    }
  }

  /**
   * Get AI status for UI display
   */
  public getAIStatus(playerId: string): {
    difficulty: AIDifficulty;
    currentState: AIState;
    performanceMetrics: AIPerformanceMetrics;
    isEnabled: boolean;
  } | null {
    const aiController = this.aiControllers.get(playerId);
    return aiController ? aiController.getAIStatus() : null;
  }

  /**
   * Set AI difficulty for a player
   */
  public setAIDifficulty(playerId: string, difficulty: AIDifficulty): void {
    const aiController = this.aiControllers.get(playerId);
    if (aiController) {
      aiController.setDifficulty(difficulty);
    }
  }

  /**
   * Enable/disable AI for a player
   */
  public setAIEnabled(playerId: string, enabled: boolean): void {
    const aiController = this.aiControllers.get(playerId);
    if (aiController) {
      aiController.setEnabled(enabled);
    }
  }

  /**
   * Get all AI controllers
   */
  public getAllAIControllers(): Map<string, AIController> {
    return new Map(this.aiControllers);
  }

  /**
   * Auto-setup AI based on player sides
   */
  public autoSetupAI(defenderDifficulty: AIDifficulty = AIDifficulty.VETERAN): void {
    // Find defender player and make them AI controlled
    const defenderPlayer = this.gameState.getPlayerBySide(PlayerSide.Defender);
    if (defenderPlayer) {
      this.addAIController(defenderPlayer.id, defenderDifficulty);
      console.log(`[AI] Auto-setup: Defender AI enabled with ${defenderDifficulty} difficulty`);
    }
  }

  /**
   * Execute AI actions and return results for testing
   */
  public executeAIActions(actions: GameAction[]): ActionResult[] {
    const results: ActionResult[] = [];

    for (const action of actions) {
      const result = this.executeAction(action);
      results.push(result);
    }

    return results;
  }

  /**
   * Execute Fast Reconnaissance ability (HUMVEE)
   */
  private executeFastReconnaissance(unit: Unit, _data: SpecialAbilityData): ActionResult {
    // Provide movement bonus or scouting information
    return {
      success: true,
      message: `${unit.type} uses Fast Reconnaissance - enhanced mobility and scouting`,
      data: { movementBonus: 2, scoutingRange: 3 },
    };
  }

  /**
   * Execute Fast Ambush ability (TECHNICAL)
   */
  private executeFastAmbush(unit: Unit, _data: SpecialAbilityData): ActionResult {
    // Allow movement after attacking if unit was hidden
    if (unit.isHidden() || !unit.state.hasActed) {
      return {
        success: true,
        message: `${unit.type} uses Fast Ambush - can move after attacking`,
        data: { canMoveAfterAttack: true },
      };
    }
    return {
      success: false,
      message: 'Fast Ambush requires starting position to be hidden',
    };
  }

  /**
   * Execute Mobility ability (simplified HUMVEE)
   */
  private executeMobility(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Mobility - enhanced movement capability`,
      data: { movementBonus: 1 },
    };
  }

  /**
   * Execute Improvised ability (simplified TECHNICAL)
   */
  private executeImprovised(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Improvised tactics - low cost mobility`,
      data: { improvised: true },
    };
  }

  /**
   * Execute Urban Specialists ability (MARINE_SQUAD)
   */
  private executeUrbanSpecialists(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Urban Specialists - bonus in urban terrain`,
      data: { urbanBonus: true, attackBonus: 1 },
    };
  }

  /**
   * Execute Defensive Position ability (INFANTRY_SQUAD)
   */
  private executeDefensivePosition(unit: Unit, _data: SpecialAbilityData): ActionResult {
    // Apply defensive bonus
    unit.state.suppressionTokens = Math.max(0, unit.state.suppressionTokens - 1);
    return {
      success: true,
      message: `${unit.type} takes Defensive Position - improved defense`,
      data: { defenseBonus: 1, suppressionReduced: true },
    };
  }

  /**
   * Execute Entrench ability (simplified infantry)
   */
  private executeEntrench(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} entrenches - defensive bonus applied`,
      data: { defenseBonus: 1, entrenched: true },
    };
  }

  /**
   * Execute Amphibious Training ability (simplified marines)
   */
  private executeAmphibiousTraining(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Amphibious Training - water movement bonus`,
      data: { amphibiousBonus: true },
    };
  }

  /**
   * Execute Special Operations ability (MARSOC)
   */
  private executeSpecialOperations(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Special Operations - enhanced reconnaissance and stealth`,
      data: { 
        reconnaissanceBonus: 2,
        stealthBonus: 1,
        specialOperations: true
      },
    };
  }

  /**
   * Execute Anti-Vehicle Specialist ability (ATGM)
   */
  private executeAntiVehicleSpecialist(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Anti-Vehicle Specialist - bonus vs vehicles`,
      data: { antiVehicleBonus: 2 },
    };
  }

  /**
   * Execute Anti-Aircraft ability (AA teams)
   */
  private executeAntiAircraft(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Anti-Aircraft - bonus vs aircraft`,
      data: { antiAircraftBonus: 2 },
    };
  }

  /**
   * Execute Anti-Air Focus ability (official AA teams)
   */
  private executeAntiAirFocus(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Anti-Air Focus - enhanced air defense`,
      data: { antiAircraftBonus: 2, range: 3 },
    };
  }

  /**
   * Execute Anti-Tank ability (simplified ATGM)
   */
  private executeAntiTank(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Anti-Tank - bonus vs armored vehicles`,
      data: { antiTankBonus: 2 },
    };
  }

  /**
   * Execute Indirect Fire ability (MORTAR_TEAM)
   */
  private executeIndirectFire(unit: Unit, data: SpecialAbilityData): ActionResult {
    if (!data.targetHex) {
      return { success: false, message: 'Target hex required for indirect fire' };
    }

    const targetHex = new Hex(data.targetHex.q, data.targetHex.r, data.targetHex.s);
    const distance = new Hex(
      unit.state.position.q,
      unit.state.position.r,
      unit.state.position.s
    ).distanceTo(targetHex);

    if (distance > 5) {
      return { success: false, message: 'Target beyond maximum range (5 hexes)' };
    }

    // Hit units at target location
    const targets = this.gameState.getUnitsAt(targetHex);
    const results: string[] = [];

    for (const target of targets) {
      const damage = Math.floor(Math.random() * 3); // 0-2 damage
      if (damage > 0) {
        target.takeDamage(damage);
        results.push(`${target.type} hit for ${damage} damage`);
      }
    }

    return {
      success: true,
      message: `Indirect fire at (${targetHex.q},${targetHex.r}): ${results.join(', ') || 'No hits'}`,
      data: { results, range: distance },
    };
  }

  /**
   * Execute Local Knowledge ability (MILITIA_SQUAD)
   */
  private executeLocalKnowledge(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Local Knowledge - terrain movement bonus`,
      data: { terrainBonus: true, movementBonus: 1 },
    };
  }

  /**
   * Execute Heavy Bombardment ability (LONG_RANGE_ARTILLERY)
   */
  private executeHeavyBombardment(unit: Unit, data: SpecialAbilityData): ActionResult {
    if (!data.targetHexes || data.targetHexes.length === 0) {
      return { success: false, message: 'Target hexes required for heavy bombardment' };
    }

    const results: string[] = [];
    for (const hexData of data.targetHexes) {
      const hex = new Hex(hexData.q, hexData.r, hexData.s);
      const targets = this.gameState.getUnitsAt(hex);

      for (const target of targets) {
        const damage = Math.floor(Math.random() * 4); // 0-3 damage
        if (damage > 0) {
          target.takeDamage(damage);
          results.push(`${target.type} hit for ${damage} damage`);
        }
      }
    }

    return {
      success: true,
      message: `Heavy bombardment completed: ${results.join(', ') || 'No hits'}`,
      data: { results, hexesTargeted: data.targetHexes.length },
    };
  }

  /**
   * Execute Amphibious Command ability (USS_WASP)
   */
  private executeAmphibiousCommand(unit: Unit, _data: SpecialAbilityData): ActionResult {
    // Find the player that owns this unit
    const player = this.gameState.getAllPlayers().find(p => p.units.has(unit.id));
    if (player) {
      const cpBonus = 2;
      player.commandPoints += cpBonus;
      return {
        success: true,
        message: `${unit.type} uses Amphibious Command - generates ${cpBonus} additional CP`,
        data: { commandPointBonus: cpBonus },
      };
    }
    return { success: false, message: 'Player not found for command point bonus' };
  }

  /**
   * Execute Launch Operations ability (USS_WASP)
   */
  private executeLaunchOperations(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Launch Operations - enhanced aircraft deployment`,
      data: { launchBonus: true, deploymentRange: 3 },
    };
  }

  /**
   * Execute VTOL ability (HARRIER)
   */
  private executeVTOL(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses VTOL - vertical takeoff/landing capability`,
      data: { vtolMode: true, terrainIgnore: true },
    };
  }

  /**
   * Execute Tilt-rotor ability (OSPREY)
   */
  private executeTiltRotor(unit: Unit, _data: SpecialAbilityData): ActionResult {
    return {
      success: true,
      message: `${unit.type} uses Tilt-rotor - enhanced mobility and transport`,
      data: { tiltRotorMode: true, movementBonus: 2 },
    };
  }

  /**
   * Execute Close Air Support ability (Aircraft)
   */
  private executeCloseAirSupport(unit: Unit, data: SpecialAbilityData): ActionResult {
    if (!data.targetHex) {
      return { success: false, message: 'Target hex required for close air support' };
    }

    const targetHex = new Hex(data.targetHex.q, data.targetHex.r, data.targetHex.s);
    const targets = this.gameState.getUnitsAt(targetHex);
    const results: string[] = [];

    for (const target of targets) {
      const damage = Math.floor(Math.random() * 3) + 1; // 1-3 damage
      target.takeDamage(damage);
      results.push(`${target.type} hit for ${damage} damage`);
    }

    return {
      success: true,
      message: `${unit.type} provides close air support: ${results.join(', ') || 'No targets at location'}`,
      data: { results, targetHex: data.targetHex },
    };
  }
}
