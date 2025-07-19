/**
 * Enhanced Game Visualization Logger
 * Extends the base GameLogger with rich visualization data for replay and analysis
 */

import { GameLogger, LogLevel, LogCategory, LogEntry, GameSnapshot } from './GameLogger';
import { GameState, GameAction } from '../game/GameState';
import { Unit } from '../game/Unit';
import { AIDecision } from '../ai/types';
import { CombatResult } from '../game/Combat';
import { ActionResult } from '../game/GameEngine';
import { Hex, HexCoordinate, hasLineOfSight } from '../hex';
import { findPath, PathfindingOptions } from '../hex/HexPath';
import { PlayerSide, ActionType, UnitType, TerrainType, TurnPhase } from '../game/types';
import { 
  VisualizationLogEntry,
  VisualizationGameLog,
  SpatialContext,
  VisualizationEffects,
  UnitStateSnapshot,
  VisualizationMovementPath,
  VisualizationCombatResult,
  AIDecisionVisualization,
  HexActivity,
  GameFlowAnalysis,
  MajorEvent,
  UnitSpatialData,
  HexTerrainData,
  LineOfSightData,
  ThreatData,
  ObjectiveData,
  CameraGuidance,
  EffectData,
  SoundCue,
  GameVisualizationSummary,
  MomentumShift,
  TerritoryControlData,
  CasualtyData
} from './VisualizationTypes';

/**
 * Enhanced game logger with comprehensive visualization data
 */
export class GameVisualizationLogger extends GameLogger {
  private visualizationLogs: VisualizationLogEntry[] = [];
  private hexActivityMap: Map<string, HexActivity[]> = new Map();
  private majorEvents: MajorEvent[] = [];
  private momentumShifts: MomentumShift[] = [];
  private territoryHistory: TerritoryControlData[] = [];
  private casualtyHistory: CasualtyData[] = [];
  private gameStartTime: number = Date.now();
  protected gameIdForVisualization: string;

  constructor(gameId: string, minLogLevel: LogLevel = LogLevel.DEBUG) {
    super(gameId, minLogLevel);
    this.gameIdForVisualization = gameId;
    this.gameStartTime = Date.now();
  }

  /**
   * Enhanced logging with full visualization data
   */
  public logVisualizationAction(
    action: GameAction,
    result: ActionResult,
    gameState: GameState,
    unit?: Unit
  ): void {
    // First do the regular logging
    this.logUnitAction(action, result, gameState, unit);

    // Then create enhanced visualization entry
    const beforeState = this.captureUnitsState(gameState, action.unitId);
    
    // Execute spatial analysis
    const spatialContext = this.analyzeSpatialContext(
      action.targetPosition || (unit ? new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s) : new Hex(0, 0, 0)),
      gameState,
      3 // 3-hex radius
    );

    // Generate visual effects data
    const visualEffects = this.generateVisualEffects(action, result, gameState, unit);

    // Capture movement path if applicable
    let movementPath: VisualizationMovementPath | undefined;
    if (action.type === ActionType.MOVE && action.targetPosition && unit) {
      movementPath = this.generateMovementPath(
        new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s),
        action.targetPosition,
        gameState,
        unit
      );
    }

    // Simulate the action result and capture after state
    const afterState = this.captureUnitsState(gameState, action.unitId);

    // Create enhanced log entry
    const visualizationEntry: VisualizationLogEntry = {
      id: `vis_log_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      gameId: this.gameIdForVisualization,
      turn: gameState.turn,
      phase: gameState.phase,
      level: result.success ? LogLevel.INFO : LogLevel.WARN,
      category: this.getVisualizationCategory(action.type),
      message: this.generateEnhancedMessage(action, result, unit),
      data: { action, result, unit: unit?.stats },
      playerId: action.playerId,
      unitId: action.unitId,
      spatialContext,
      visualEffects,
      beforeState,
      afterState,
      movementPath: movementPath || undefined,
      combatVisualization: undefined,
      aiDecisionVisualization: undefined
    };

    this.visualizationLogs.push(visualizationEntry);

    // Track hex activity
    this.trackHexActivity(action, gameState, result.success);

    // Detect major events
    this.detectMajorEvent(action, result, gameState, unit);

    // Update game flow metrics
    this.updateGameFlowMetrics(gameState);
  }

  /**
   * Enhanced combat logging with visualization data
   */
  public logVisualizationCombat(
    attacker: Unit,
    defender: Unit,
    combatResult: CombatResult,
    gameState: GameState
  ): void {
    // Regular combat logging
    this.logCombat(attacker, defender, combatResult, gameState);

    // Enhanced visualization combat data
    const visualCombat: VisualizationCombatResult = {
      ...combatResult,
      attackVector: this.generateLineOfSightData(
        new Hex(attacker.state.position.q, attacker.state.position.r, attacker.state.position.s),
        new Hex(defender.state.position.q, defender.state.position.r, defender.state.position.s),
        gameState
      ),
      terrainEffects: this.analyzeCombatTerrain(attacker, defender, gameState),
      tacticalSituation: this.analyzeTacticalSituation(attacker, defender, gameState),
      visualEffects: this.generateCombatVisualEffects(combatResult, gameState),
      damageVisualization: this.generateDamageVisualization(combatResult)
    };

    // Find existing log entry and enhance it
    const lastEntry = this.visualizationLogs[this.visualizationLogs.length - 1];
    if (lastEntry && lastEntry.unitId === attacker.id) {
      lastEntry.combatVisualization = visualCombat;
    }

    // Check for major combat events
    if (combatResult.defenderDestroyed) {
      this.addMajorEvent(
        gameState.turn,
        gameState.phase,
        'unit_destroyed',
        `${defender.type} destroyed by ${attacker.type}`,
        [attacker.id, defender.id],
        new Hex(defender.state.position.q, defender.state.position.r, defender.state.position.s),
        8,
        true
      );
    }

    if (combatResult.damage >= 2) {
      this.addMajorEvent(
        gameState.turn,
        gameState.phase,
        'first_blood',
        `Heavy damage: ${attacker.type} vs ${defender.type}`,
        [attacker.id, defender.id],
        new Hex(defender.state.position.q, defender.state.position.r, defender.state.position.s),
        5,
        false
      );
    }
  }

  /**
   * Enhanced AI decision logging with visualization
   */
  public logVisualizationAIDecision(
    decision: AIDecision,
    gameState: GameState,
    playerId: string,
    alternatives?: AIDecision[]
  ): void {
    // Regular AI decision logging
    this.logAIDecision(decision, gameState, playerId);

    // Enhanced AI visualization data
    const aiVisualization: AIDecisionVisualization = {
      decision,
      alternativesConsidered: alternatives || [],
      decisionFactors: this.extractDecisionFactors(decision),
      threatAssessment: this.generateThreatAssessment(decision, gameState),
      strategicImportance: this.calculateStrategicImportance(decision, gameState),
      riskAssessment: this.calculateRiskAssessment(decision, gameState),
      expectedOutcome: decision.reasoning || 'No reasoning provided'
    };

    // Find and enhance the latest log entry
    const lastEntry = this.visualizationLogs[this.visualizationLogs.length - 1];
    if (lastEntry && lastEntry.unitId === decision.unitId) {
      lastEntry.aiDecisionVisualization = aiVisualization;
    }
  }

  /**
   * Generate spatial context around a position
   */
  private analyzeSpatialContext(
    centerHex: Hex,
    gameState: GameState,
    radius: number
  ): SpatialContext {
    const nearbyUnits: UnitSpatialData[] = [];
    const terrainData: HexTerrainData[] = [];
    const lineOfSightData: LineOfSightData[] = [];
    const threatsInRange: ThreatData[] = [];
    const objectivesInRange: ObjectiveData[] = [];

    // Analyze hexes within radius
    for (let q = centerHex.q - radius; q <= centerHex.q + radius; q++) {
      for (let r = centerHex.r - radius; r <= centerHex.r + radius; r++) {
        const hex = new Hex(q, r, -q - r);
        const distance = centerHex.distanceTo(hex);
        
        if (distance <= radius && gameState.map.isValidHex(hex)) {
          // Add terrain data
          const mapHex = gameState.map.getHex(hex);
          if (mapHex) {
            terrainData.push({
              position: hex,
              terrain: mapHex.terrain,
              elevation: mapHex.elevation,
              coverValue: gameState.map.getTerrainProperties(mapHex.terrain).coverBonus,
              movementCost: gameState.map.getTerrainProperties(mapHex.terrain).movementCost,
              features: Array.from(mapHex.features),
              hasObjective: !!mapHex.objective,
              objectiveType: mapHex.objective?.type,
              controlledBy: this.getHexController(hex, gameState),
              fortified: mapHex.features.has('fortified')
            });

            // Add objective data if present
            if (mapHex.objective) {
              objectivesInRange.push({
                id: mapHex.objective.id,
                type: mapHex.objective.type,
                position: hex,
                value: this.getObjectiveValue(mapHex.objective.type),
                controlledBy: this.getHexController(hex, gameState),
                distanceFromAction: distance,
                contestedThisTurn: this.isObjectiveContested(mapHex.objective.id, gameState)
              });
            }
          }

          // Find units at this hex
          const unitsAtHex = gameState.getUnitsAt(hex);
          for (const unit of unitsAtHex) {
            const unitData: UnitSpatialData = {
              id: unit.id,
              type: unit.type,
              side: unit.side,
              position: hex,
              currentHP: unit.state.currentHP,
              maxHP: unit.stats.hp,
              canAct: unit.canAct(),
              hasMoved: unit.state.hasMoved,
              isHidden: unit.isHidden(),
              statusEffects: Array.from(unit.state.statusEffects),
              distanceFromAction: distance,
              hasLineOfSight: hasLineOfSight(centerHex, hex, (h) => gameState.map.isValidHex(h)),
              threatsTo: this.getThreatsTo(unit, gameState),
              threatenedBy: this.getThreatenedBy(unit, gameState)
            };
            nearbyUnits.push(unitData);

            // Generate line of sight data to center
            if (distance > 0) {
              lineOfSightData.push(this.generateLineOfSightData(centerHex, hex, gameState));
            }
          }
        }
      }
    }

    return {
      centerHex,
      radius,
      nearbyUnits,
      terrainData,
      lineOfSightData,
      threatsInRange,
      objectivesInRange
    };
  }

  /**
   * Generate visual effects for an action
   */
  private generateVisualEffects(
    action: GameAction,
    result: ActionResult,
    gameState: GameState,
    unit?: Unit
  ): VisualizationEffects {
    const effectPosition = action.targetPosition || 
      (unit ? new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s) : new Hex(0, 0, 0));

    const primaryEffect: EffectData = {
      type: this.getEffectType(action.type),
      position: effectPosition,
      intensity: result.success ? 'medium' : 'low',
      duration: this.getEffectDuration(action.type),
      particles: this.generateParticles(action.type, result.success),
      animations: this.generateAnimations(action.type, unit)
    };

    const cameraGuidance: CameraGuidance = {
      suggestedPosition: effectPosition,
      suggestedZoom: this.getSuggestedZoom(action.type),
      suggestedAngle: 45,
      followUnit: action.type === ActionType.MOVE ? action.unitId : undefined,
      focusArea: [effectPosition],
      transitionTime: 1000
    };

    const soundCues: SoundCue[] = this.generateSoundCues(action.type, result.success);

    return {
      primaryEffect,
      secondaryEffects: [],
      cameraGuidance,
      attentionPriority: this.getAttentionPriority(action.type, result.success),
      duration: this.getEffectDuration(action.type),
      soundCues
    };
  }

  /**
   * Capture current state of relevant units
   */
  private captureUnitsState(gameState: GameState, focusUnitId: string): UnitStateSnapshot[] {
    const snapshots: UnitStateSnapshot[] = [];
    const focusUnit = gameState.getUnit(focusUnitId);
    
    if (focusUnit) {
      // Always capture the focus unit
      snapshots.push(this.createUnitSnapshot(focusUnit));

      // Capture nearby units within 2 hexes
      const focusHex = new Hex(focusUnit.state.position.q, focusUnit.state.position.r, focusUnit.state.position.s);
      const allUnits = gameState.getAllUnits();
      
      for (const unit of allUnits) {
        if (unit.id !== focusUnitId) {
          const unitHex = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s);
          if (focusHex.distanceTo(unitHex) <= 2) {
            snapshots.push(this.createUnitSnapshot(unit));
          }
        }
      }
    }

    return snapshots;
  }

  /**
   * Create a unit state snapshot
   */
  private createUnitSnapshot(unit: Unit): UnitStateSnapshot {
    return {
      unitId: unit.id,
      position: new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s),
      currentHP: unit.state.currentHP,
      statusEffects: Array.from(unit.state.statusEffects),
      hasActed: unit.state.hasActed,
      hasMoved: unit.state.hasMoved,
      isHidden: unit.isHidden(),
      cargo: unit.state.cargo.map(cargoUnit => cargoUnit.id),
      timestamp: Date.now()
    };
  }

  /**
   * Generate movement path visualization data
   */
  private generateMovementPath(
    start: Hex,
    end: Hex,
    gameState: GameState,
    unit: Unit
  ): VisualizationMovementPath {
    // Use the existing pathfinding system
    const pathOptions: PathfindingOptions = {
      getCost: (from: HexCoordinate, to: HexCoordinate) => {
        const toHex = new Hex(to.q, to.r, to.s);
        const mapHex = gameState.map.getHex(toHex);
        return mapHex ? gameState.map.getTerrainProperties(mapHex.terrain).movementCost : Infinity;
      },
      maxDistance: 20
    };
    const hexPath = findPath(start, end, pathOptions);
    const totalCost = this.calculatePathCost(hexPath, gameState);

    const terrainEncountered: TerrainType[] = [];
    const movementCosts: number[] = [];
    let difficultTerrain = false;

    for (const hex of hexPath) {
      const mapHex = gameState.map.getHex(hex);
      if (mapHex) {
        terrainEncountered.push(mapHex.terrain);
        const cost = gameState.map.getTerrainProperties(mapHex.terrain).movementCost;
        movementCosts.push(cost);
        if (cost > 2) difficultTerrain = true;
      }
    }

    return {
      startPosition: start,
      endPosition: end,
      hexPath,
      movementCosts,
      totalCost,
      terrainEncountered,
      difficultTerrain,
      pathBlocked: hexPath.length === 0 || (hexPath.length === 1 && !hexPath[0].equals(start)),
      alternativeRoutes: 0 // Could implement alternative path counting
    };
  }

  /**
   * Generate line of sight data between two hexes
   */
  private generateLineOfSightData(
    fromHex: Hex,
    toHex: Hex,
    gameState: GameState
  ): LineOfSightData {
    const blocked = !hasLineOfSight(fromHex, toHex, (h) => gameState.map.isValidHex(h));
    const distance = fromHex.distanceTo(toHex);
    
    return {
      fromHex,
      toHex,
      blocked,
      blockingHexes: [], // Would need to implement LOS calculation details
      partialCover: false, // Could implement partial cover detection
      distance
    };
  }

  /**
   * Track activity in hexes for heatmap visualization
   */
  private trackHexActivity(action: GameAction, gameState: GameState, success: boolean): void {
    const position = action.targetPosition || 
      (gameState.getUnit(action.unitId)?.state.position ? 
        new Hex(
          gameState.getUnit(action.unitId)!.state.position.q,
          gameState.getUnit(action.unitId)!.state.position.r,
          gameState.getUnit(action.unitId)!.state.position.s
        ) : new Hex(0, 0, 0));

    const hexKey = position.toKey();
    
    if (!this.hexActivityMap.has(hexKey)) {
      this.hexActivityMap.set(hexKey, []);
    }

    const activities = this.hexActivityMap.get(hexKey)!;
    const currentTurn = gameState.turn;
    
    // Find or create activity for current turn
    let hexActivity = activities.find(a => a.turn === currentTurn && a.phase === gameState.phase);
    if (!hexActivity) {
      hexActivity = {
        position,
        turn: currentTurn,
        phase: gameState.phase,
        activities: [],
        unitsPresent: [],
        combatEvents: 0,
        movementEvents: 0,
        strategicImportance: this.calculateHexStrategicImportance(position, gameState)
      };
      activities.push(hexActivity);
    }

    // Add activity event
    hexActivity.activities.push({
      type: this.getActivityType(action.type),
      timestamp: Date.now(),
      unitId: action.unitId,
      intensity: this.getActivityIntensity(action.type, success),
      success
    });

    // Update counters
    if (action.type === ActionType.ATTACK) {
      hexActivity.combatEvents++;
    } else if (action.type === ActionType.MOVE) {
      hexActivity.movementEvents++;
    }

    // Update units present
    const unitsAtHex = gameState.getUnitsAt(position);
    hexActivity.unitsPresent = unitsAtHex.map(u => u.id);
  }

  /**
   * Export comprehensive visualization log
   */
  public exportVisualizationLog(): VisualizationGameLog {
    const gameFlow = this.generateGameFlowAnalysis();
    const summary = this.generateVisualizationSummary();

    return {
      gameId: this.gameIdForVisualization,
      metadata: {
        startTime: this.gameStartTime,
        endTime: Date.now(),
        totalTurns: Math.max(...this.visualizationLogs.map(l => l.turn), 0),
        winner: undefined, // Would need to determine from game state
        victoryCondition: undefined,
        logVersion: '1.0'
      },
      logs: this.visualizationLogs,
      snapshots: this.getSnapshots(),
      hexActivity: Array.from(this.hexActivityMap.values()).flat(),
      gameFlow,
      summary
    };
  }

  /**
   * Generate game flow analysis
   */
  private generateGameFlowAnalysis(): GameFlowAnalysis {
    return {
      gameId: this.gameIdForVisualization,
      duration: Date.now() - this.gameStartTime,
      totalTurns: Math.max(...this.visualizationLogs.map(l => l.turn), 0),
      majorEvents: this.majorEvents,
      momentumShifts: this.momentumShifts,
      territoryControl: this.territoryHistory,
      casualtyProgression: this.casualtyHistory,
      objectiveContests: [] // Would implement objective contest tracking
    };
  }

  /**
   * Generate visualization summary statistics
   */
  private generateVisualizationSummary(): GameVisualizationSummary {
    const logs = this.visualizationLogs;
    
    return {
      totalActions: logs.length,
      combatEngagements: logs.filter(l => l.combatVisualization).length,
      movementActions: logs.filter(l => l.movementPath).length,
      objectiveCaptures: logs.filter(l => l.category === LogCategory.GAME_STATE && 
        l.message.includes('objective')).length,
      unitsDestroyed: this.majorEvents.filter(e => e.type === 'unit_destroyed').length,
      majorEvents: this.majorEvents.length,
      aiDecisions: logs.filter(l => l.aiDecisionVisualization).length,
      averageActionTime: this.calculateAverageActionTime(),
      hottestHex: this.findHottestHex(),
      longestMovement: this.findLongestMovement(),
      biggestBattle: this.findBiggestBattle()
    };
  }

  // Helper methods for analysis and data generation
  private getVisualizationCategory(actionType: ActionType): LogCategory {
    switch (actionType) {
      case ActionType.MOVE: return LogCategory.MOVEMENT;
      case ActionType.ATTACK: return LogCategory.COMBAT;
      default: return LogCategory.UNIT_ACTION;
    }
  }

  private generateEnhancedMessage(action: GameAction, result: ActionResult, unit?: Unit): string {
    const success = result.success ? '✅' : '❌';
    const unitType = unit?.type || 'Unknown';
    return `${success} ${action.type}: ${unitType} (${action.unitId}) - ${result.message}`;
  }

  private getEffectType(actionType: ActionType): 'movement' | 'combat' | 'explosion' | 'status' | 'environment' {
    switch (actionType) {
      case ActionType.MOVE: return 'movement';
      case ActionType.ATTACK: return 'combat';
      case ActionType.SPECIAL_ABILITY: return 'explosion';
      default: return 'status';
    }
  }

  private getEffectDuration(actionType: ActionType): number {
    switch (actionType) {
      case ActionType.MOVE: return 2000;
      case ActionType.ATTACK: return 1500;
      case ActionType.SPECIAL_ABILITY: return 3000;
      default: return 1000;
    }
  }

  private getSuggestedZoom(actionType: ActionType): number {
    switch (actionType) {
      case ActionType.MOVE: return 1.0;
      case ActionType.ATTACK: return 1.5;
      case ActionType.SPECIAL_ABILITY: return 0.8;
      default: return 1.0;
    }
  }

  private getAttentionPriority(actionType: ActionType, success: boolean): number {
    let basePriority = 5;
    switch (actionType) {
      case ActionType.ATTACK: basePriority = 8; break;
      case ActionType.SPECIAL_ABILITY: basePriority = 7; break;
      case ActionType.MOVE: basePriority = 4; break;
      default: basePriority = 5;
    }
    return success ? basePriority : Math.max(3, basePriority - 2);
  }

  // Additional helper methods would be implemented here...
  private generateParticles(actionType: ActionType, success: boolean): any[] { return []; }
  private generateAnimations(actionType: ActionType, unit?: Unit): any[] { return []; }
  private generateSoundCues(actionType: ActionType, success: boolean): SoundCue[] { return []; }
  private getThreatsTo(unit: Unit, gameState: GameState): string[] { return []; }
  private getThreatenedBy(unit: Unit, gameState: GameState): string[] { return []; }
  private getHexController(hex: Hex, gameState: GameState): PlayerSide | undefined { return undefined; }
  private getObjectiveValue(type: string): number { return 1; }
  private isObjectiveContested(id: string, gameState: GameState): boolean { return false; }
  private analyzeCombatTerrain(attacker: Unit, defender: Unit, gameState: GameState): any { return {}; }
  private analyzeTacticalSituation(attacker: Unit, defender: Unit, gameState: GameState): any { return {}; }
  private generateCombatVisualEffects(result: CombatResult, gameState: GameState): VisualizationEffects { return {} as any; }
  private generateDamageVisualization(result: CombatResult): any { return {}; }
  private extractDecisionFactors(decision: AIDecision): any[] { return []; }
  private generateThreatAssessment(decision: AIDecision, gameState: GameState): ThreatData[] { return []; }
  private calculateStrategicImportance(decision: AIDecision, gameState: GameState): number { return 5; }
  private calculateRiskAssessment(decision: AIDecision, gameState: GameState): number { return 5; }
  private detectMajorEvent(action: GameAction, result: ActionResult, gameState: GameState, unit?: Unit): void {}
  private addMajorEvent(turn: number, phase: string, type: string, desc: string, participants: string[], location: Hex, impact: number, gameChanging: boolean): void {}
  private updateGameFlowMetrics(gameState: GameState): void {}
  private getActivityType(actionType: ActionType): 'movement' | 'combat' | 'ability' | 'objective' {
    switch (actionType) {
      case ActionType.MOVE: return 'movement';
      case ActionType.ATTACK: return 'combat';
      case ActionType.SPECIAL_ABILITY: return 'ability';
      case ActionType.SECURE_OBJECTIVE: return 'objective';
      default: return 'ability';
    }
  }
  private getActivityIntensity(actionType: ActionType, success: boolean): number { return success ? 8 : 3; }
  private calculateHexStrategicImportance(position: Hex, gameState: GameState): number { return 5; }
  private calculateAverageActionTime(): number { return 2500; }
  private findHottestHex(): Hex { return new Hex(0, 0, 0); }
  private findLongestMovement(): number { return 0; }
  private findBiggestBattle(): string { return 'Battle at (0,0)'; }
  
  /**
   * Calculate total cost of a path through hexes
   */
  private calculatePathCost(hexPath: Hex[], gameState: GameState): number {
    let totalCost = 0;
    for (const hex of hexPath) {
      const mapHex = gameState.map.getHex(hex);
      if (mapHex) {
        totalCost += gameState.map.getTerrainProperties(mapHex.terrain).movementCost;
      } else {
        totalCost += 1; // Default cost for invalid hexes
      }
    }
    return totalCost;
  }
}