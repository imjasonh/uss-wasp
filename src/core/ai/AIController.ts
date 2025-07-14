/**
 * Main AI Controller - coordinates all AI systems
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { AIDecisionMaker } from './AIDecisionMaker';
import { AIStateMachine } from './AIStateMachine';
import { PersonalityFactory } from './PersonalityFactory';
import {
  AIDifficulty,
  AIDecisionContext,
  AIDecision,
  AIConfiguration,
  AIPersonality,
  AIPersonalityType,
  AIState,
  PlayerPattern,
  AILearningData,
  AIPerformanceMetrics,
  AIDecisionType,
} from './types';
import { GameState, GameAction } from '../game/GameState';
import { Player } from '../game/Player';
import { HexCoordinate } from '../hex';
import { Unit } from '../game/Unit';
import { PlayerSide, ActionType, UnitType, TurnPhase } from '../game/types';
import { getGameLogger } from '../logging/GameLogger';

/**
 * Main AI Controller that manages all AI systems
 */
export class AIController {
  private decisionMaker: AIDecisionMaker;
  private stateMachine: AIStateMachine;
  private readonly aiPlayerId: string;
  private difficulty: AIDifficulty;
  private readonly personality: AIPersonality | null;
  private playerPattern!: PlayerPattern;
  private learningData!: AILearningData;
  private performanceMetrics!: AIPerformanceMetrics;
  private isEnabled: boolean = true;

  public constructor(
    aiPlayerId: string, 
    configOrPersonality: AIDifficulty | AIPersonality | AIPersonalityType = AIDifficulty.VETERAN
  ) {
    this.aiPlayerId = aiPlayerId;
    
    // Handle different constructor parameter types
    if (typeof configOrPersonality === 'string') {
      // It's either AIDifficulty or AIPersonalityType
      if (Object.values(AIDifficulty).includes(configOrPersonality as AIDifficulty)) {
        // Legacy difficulty-based initialization
        this.difficulty = configOrPersonality as AIDifficulty;
        this.personality = null;
        this.decisionMaker = new AIDecisionMaker(this.difficulty);
      } else {
        // Personality type - create personality from factory
        this.personality = PersonalityFactory.createPersonality(configOrPersonality as AIPersonalityType);
        this.difficulty = this.personality.difficulty;
        this.decisionMaker = new AIDecisionMaker(this.personality);
      }
    } else {
      // Direct personality object
      this.personality = configOrPersonality;
      this.difficulty = this.personality.difficulty;
      this.decisionMaker = new AIDecisionMaker(this.personality);
    }

    const config = this.personality ?? this.createAIConfiguration(this.difficulty);
    this.stateMachine = new AIStateMachine(config);

    this.initializeAIData();
  }

  /**
   * Get the current AI personality (if any)
   */
  public getPersonality(): AIPersonality | null {
    return this.personality;
  }

  /**
   * Get personality description for UI display
   */
  public getPersonalityDescription(): string {
    if (!this.personality) {
      return `Difficulty: ${this.difficulty}`;
    }
    return `${this.personality.name} (Aggression: ${this.personality.aggression}, Planning: ${this.personality.forwardLooking}, Precision: ${this.personality.mistakes})`;
  }

  /**
   * Main AI update - called each turn to generate AI actions
   */
  public update(gameState: GameState): GameAction[] {
    if (!this.isEnabled) {
      return [];
    }

    // Only generate actions for appropriate phases
    const currentPhase = gameState.phase;
    if (currentPhase === TurnPhase.EVENT || currentPhase === TurnPhase.END) {
      return []; // No actions during event or end phases
    }

    // Create decision context
    const context = this.createDecisionContext(gameState);

    // Update strategic state machine
    const strategicAssessment = this.stateMachine.update(context);

    // Generate tactical decisions appropriate for current phase
    const decisions = this.decisionMaker.makeDecisions(context);

    // Filter decisions based on current phase
    const phaseAppropriateDecisions = this.filterDecisionsForPhase(decisions, currentPhase);

    // Log AI decisions with comprehensive logging
    const logger = getGameLogger();
    if (logger) {
      for (const decision of phaseAppropriateDecisions) {
        logger.logAIDecision(decision, gameState, this.aiPlayerId);
      }
    }

    // Convert AI decisions to game actions
    const actions = this.convertDecisionsToActions(phaseAppropriateDecisions, gameState);

    // Update learning data
    this.updateLearningData(phaseAppropriateDecisions, context);

    // Log AI state for debugging
    this.logAIState(strategicAssessment, phaseAppropriateDecisions);

    return actions;
  }

  /**
   * Process the results of AI actions for learning
   */
  public processActionResults(actions: GameAction[], results: unknown[]): void {
    // Update performance metrics based on action outcomes
    this.updatePerformanceMetrics(actions, results);

    // Learn from successful/failed tactics
    this.updateTacticalLearning(actions, results);
  }

  /**
   * Analyze player behavior for pattern recognition
   */
  public analyzePlayerBehavior(gameState: GameState, playerActions: GameAction[]): void {
    // Update player pattern recognition
    this.updatePlayerPatterns(gameState, playerActions);
  }

  /**
   * Get current AI state for UI display
   */
  public getAIStatus(): {
    difficulty: AIDifficulty;
    currentState: AIState;
    performanceMetrics: AIPerformanceMetrics;
    isEnabled: boolean;
  } {
    return {
      difficulty: this.difficulty,
      currentState: this.stateMachine.getCurrentState(),
      performanceMetrics: this.performanceMetrics,
      isEnabled: this.isEnabled,
    };
  }

  /**
   * Enable/disable AI
   */
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Change AI difficulty level
   */
  public setDifficulty(newDifficulty: AIDifficulty): void {
    if (newDifficulty === this.difficulty) {
      return;
    }

    this.difficulty = newDifficulty;
    this.decisionMaker = new AIDecisionMaker(newDifficulty);

    const config = this.createAIConfiguration(newDifficulty);
    this.stateMachine = new AIStateMachine(config);

    // Log difficulty change if needed
  }

  /**
   * Force AI state transition (for testing)
   */
  public forceStateTransition(newState: AIState, reason: string): void {
    this.stateMachine.forceTransition(newState, reason, 0);
  }

  /**
   * Get AI learning data for analysis
   */
  public getLearningData(): AILearningData {
    return { ...this.learningData };
  }

  /**
   * Reset AI learning data
   */
  public resetLearningData(): void {
    this.initializeAIData();
  }

  /**
   * Create decision context for AI systems
   */
  private createDecisionContext(gameState: GameState): AIDecisionContext {
    const aiPlayer = gameState.getPlayer(this.aiPlayerId);
    if (!aiPlayer) {
      throw new Error(`AI player ${this.aiPlayerId} not found`);
    }

    const enemyPlayer = this.getEnemyPlayer(gameState);
    const availableUnits = aiPlayer.getLivingUnits();
    const enemyUnits = enemyPlayer ? enemyPlayer.getLivingUnits() : [];

    return {
      gameState,
      aiPlayer: this.aiPlayerId,
      turn: gameState.turn,
      phase: gameState.phase,
      availableUnits,
      enemyUnits,
      threatLevel: this.calculateOverallThreatLevel(availableUnits, enemyUnits),
      resourceStatus: {
        commandPoints: aiPlayer.commandPoints,
        ammunition: this.calculateAmmoStatus(availableUnits),
        supplyLines: this.assessSupplyLines(gameState),
        unitCondition: this.calculateUnitCondition(availableUnits),
        territoryControl: this.calculateTerritoryControl(gameState, aiPlayer),
      },
    };
  }

  /**
   * Filter decisions based on current game phase
   */
  private filterDecisionsForPhase(decisions: AIDecision[], phase: TurnPhase): AIDecision[] {
    const filtered: AIDecision[] = [];

    for (const decision of decisions) {
      let isAppropriate = false;

      switch (phase) {
        case TurnPhase.COMMAND:
          // Command phase - no movement/combat actions
          isAppropriate = false;
          break;
        case TurnPhase.DEPLOYMENT:
        case TurnPhase.MOVEMENT:
          // Movement phases - movement and logistics actions
          isAppropriate = decision.type === AIDecisionType.MOVE_UNIT || 
                          decision.type === AIDecisionType.WITHDRAW ||
                          decision.type === AIDecisionType.LOAD_TRANSPORT ||
                          decision.type === AIDecisionType.UNLOAD_TRANSPORT;
          break;
        case TurnPhase.ACTION:
          // Action phase - combat, special abilities, and logistics
          isAppropriate =
            decision.type === AIDecisionType.ATTACK_TARGET ||
            decision.type === AIDecisionType.HIDE_UNIT ||
            decision.type === AIDecisionType.REVEAL_UNIT ||
            decision.type === AIDecisionType.SPECIAL_ABILITY ||
            decision.type === AIDecisionType.LAUNCH_FROM_WASP ||
            decision.type === AIDecisionType.RECOVER_TO_WASP ||
            decision.type === AIDecisionType.LOAD_TRANSPORT ||
            decision.type === AIDecisionType.UNLOAD_TRANSPORT ||
            decision.type === AIDecisionType.SECURE_OBJECTIVE;
          break;
        default:
          isAppropriate = false;
      }

      if (isAppropriate) {
        filtered.push(decision);
      }
    }

    return filtered;
  }

  /**
   * Convert AI decisions to game actions
   */
  private convertDecisionsToActions(decisions: AIDecision[], gameState: GameState): GameAction[] {
    const actions: GameAction[] = [];

    for (const decision of decisions.slice(0, 5)) {
      // Limit actions per turn
      const action = this.convertDecisionToAction(decision, gameState);
      if (action) {
        actions.push(action);
      }
    }

    return actions;
  }

  /**
   * Convert a single AI decision to a game action
   */
  private convertDecisionToAction(decision: AIDecision, _gameState: GameState): GameAction | null {
    switch (decision.type) {
      case AIDecisionType.MOVE_UNIT:
        if (decision.unitId && decision.targetPosition) {
          return {
            type: ActionType.MOVE,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            targetPosition: decision.targetPosition,
          };
        }
        break;

      case AIDecisionType.ATTACK_TARGET:
        if (decision.unitId && decision.targetUnitId) {
          return {
            type: ActionType.ATTACK,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            targetId: decision.targetUnitId,
          };
        }
        break;

      case AIDecisionType.HIDE_UNIT:
        if (decision.unitId) {
          return {
            type: ActionType.SPECIAL_ABILITY,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            data: { abilityName: 'hide' },
          };
        }
        break;

      case AIDecisionType.REVEAL_UNIT:
        if (decision.unitId) {
          return {
            type: ActionType.REVEAL,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
          };
        }
        break;

      case AIDecisionType.LAUNCH_FROM_WASP:
        if (decision.unitId && decision.metadata?.unitsToLaunch) {
          return {
            type: ActionType.LAUNCH_FROM_WASP,
            playerId: this.aiPlayerId,
            unitId: (decision.metadata.waspId as string) || decision.unitId,
            data: { unitIds: decision.metadata.unitsToLaunch as string[] },
          };
        }
        break;

      case AIDecisionType.RECOVER_TO_WASP:
        if (decision.unitId) {
          return {
            type: ActionType.RECOVER_TO_WASP,
            playerId: this.aiPlayerId,
            unitId: (decision.metadata?.waspId as string) || decision.unitId,
            data: { unitIds: [decision.unitId] },
          };
        }
        break;

      case AIDecisionType.LOAD_TRANSPORT:
        if (decision.unitId && decision.targetUnitId) {
          return {
            type: ActionType.LOAD,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            targetId: decision.targetUnitId,
          };
        }
        break;

      case AIDecisionType.UNLOAD_TRANSPORT:
        if (decision.unitId) {
          return {
            type: ActionType.UNLOAD,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            ...(decision.targetPosition && { targetPosition: decision.targetPosition }),
          };
        }
        break;

      case AIDecisionType.SECURE_OBJECTIVE:
        if (decision.unitId) {
          return {
            type: ActionType.SECURE_OBJECTIVE,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
          };
        }
        break;

      case AIDecisionType.SPECIAL_ABILITY:
        if (decision.unitId && decision.metadata?.abilityName) {
          return {
            type: ActionType.SPECIAL_ABILITY,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            data: {
              abilityName: decision.metadata.abilityName as string,
              ...decision.metadata,
            },
          };
        }
        break;

      default:
        // Unknown decision type
        return null;
    }

    return null;
  }

  /**
   * Initialize AI learning data
   */
  private initializeAIData(): void {
    this.playerPattern = {
      landingPreferences: [],
      movementTendencies: [],
      targetPriorities: [],
      riskTolerance: 0.5,
      adaptationRate: 0.5,
      predictability: 0.5,
    };

    this.learningData = {
      playerPatterns: this.playerPattern,
      successfulTactics: [],
      failedTactics: [],
      performanceHistory: [],
      adaptationTriggers: [],
    };

    this.performanceMetrics = {
      casualtiesInflicted: 0,
      casualtiesTaken: 0,
      objectivesHeld: 0,
      successfulAmbushes: 0,
      unitsPreserved: 0,
      resourceEfficiency: 0,
      playerSurprises: 0,
    };
  }

  /**
   * Create AI configuration based on difficulty
   */
  private createAIConfiguration(difficulty: AIDifficulty): AIConfiguration {
    // This mirrors the configuration in AIDecisionMaker
    switch (difficulty) {
      case AIDifficulty.NOVICE:
        return {
          difficulty,
          reactionTime: 2,
          coordinationLevel: 0.3,
          patternRecognition: 0.1,
          resourceOptimization: 0.4,
          tacticalComplexity: 0.5,
          mistakeFrequency: 0.3,
          cheatingLevel: 0,
        };

      case AIDifficulty.VETERAN:
        return {
          difficulty,
          reactionTime: 1,
          coordinationLevel: 0.7,
          patternRecognition: 0.5,
          resourceOptimization: 0.7,
          tacticalComplexity: 0.8,
          mistakeFrequency: 0.1,
          cheatingLevel: 0,
        };

      case AIDifficulty.ELITE:
        return {
          difficulty,
          reactionTime: 0,
          coordinationLevel: 0.95,
          patternRecognition: 0.8,
          resourceOptimization: 0.9,
          tacticalComplexity: 1.0,
          mistakeFrequency: 0.02,
          cheatingLevel: 0,
        };

      case AIDifficulty.ADAPTIVE:
        return {
          difficulty,
          reactionTime: 1,
          coordinationLevel: 0.8,
          patternRecognition: 0.9,
          resourceOptimization: 0.8,
          tacticalComplexity: 0.9,
          mistakeFrequency: 0.05,
          cheatingLevel: 0,
        };

      default:
        return this.createAIConfiguration(AIDifficulty.VETERAN);
    }
  }

  /**
   * Get enemy player
   */
  private getEnemyPlayer(gameState: GameState): Player | undefined {
    const aiPlayer = gameState.getPlayer(this.aiPlayerId);
    if (!aiPlayer) {
      return undefined;
    }

    const enemySide =
      aiPlayer.side === PlayerSide.Assault ? PlayerSide.Defender : PlayerSide.Assault;

    return gameState.getPlayerBySide(enemySide);
  }

  /**
   * Calculate overall threat level
   */
  private calculateOverallThreatLevel(friendlyUnits: Unit[], enemyUnits: Unit[]): number {
    if (enemyUnits.length === 0) {
      return 0;
    }

    const enemyStrength = enemyUnits.reduce((sum, unit) => sum + unit.getEffectiveAttack(), 0);
    const friendlyStrength = friendlyUnits.reduce((sum, unit) => sum + unit.stats.def, 0);

    const threatRatio = enemyStrength / Math.max(1, friendlyStrength);
    return Math.min(1, threatRatio);
  }

  /**
   * Calculate ammunition status
   */
  private calculateAmmoStatus(units: Unit[]): number {
    // Simplified ammo calculation - in full implementation would track actual ammo
    const totalSupply = units.reduce((sum, unit) => sum + (unit.stats.sp ?? 10), 0);
    const currentSupply = units.reduce(
      (sum, unit) => sum + (unit.state.currentSP ?? unit.stats.sp ?? 10),
      0
    );

    return totalSupply > 0 ? currentSupply / totalSupply : 1;
  }

  /**
   * Assess supply line status
   */
  private assessSupplyLines(gameState: GameState): number {
    // Assess supply line security and efficiency
    let supplyLineHealth = 1.0;
    
    try {
      // Check if supply units (USS Wasp, transports) are operational
      const allUnits = gameState.getAllUnits();
      const supplyUnits = allUnits.filter(unit => 
        unit.type === UnitType.USS_WASP ||
        unit.getCargoCapacity() > 0
      );
      
      if (supplyUnits.length === 0) {
        return 0.3; // Poor supply situation with no transport capacity
      }
      
      // Assess health of supply units
      let supplyUnitHealth = 0;
      for (const unit of supplyUnits) {
        const healthPercent = unit.state.currentHP / unit.stats.hp;
        supplyUnitHealth += healthPercent;
      }
      supplyUnitHealth = supplyUnitHealth / supplyUnits.length;
      
      // Factor in enemy threats to supply lines
      const enemyUnits = allUnits.filter(unit => unit.side !== supplyUnits[0]?.side);
      let threatToSupply = 0;
      
      for (const supplyUnit of supplyUnits) {
        for (const enemy of enemyUnits) {
          const distance = this.calculateDistance(supplyUnit.state.position, enemy.state.position);
          if (distance <= 3) { // Enemy threatens supply within 3 hexes
            threatToSupply += 0.1;
          }
        }
      }
      
      // Calculate final supply line assessment
      supplyLineHealth = supplyUnitHealth * (1 - Math.min(0.5, threatToSupply));
      
      // Ensure reasonable bounds
      supplyLineHealth = Math.max(0.2, Math.min(1.0, supplyLineHealth));
      
    } catch (error) {
      // Fallback assessment if access to game state fails
      supplyLineHealth = 0.7;
    }
    
    return supplyLineHealth;
  }

  /**
   * Calculate overall unit condition
   */
  private calculateUnitCondition(units: Unit[]): number {
    if (units.length === 0) {
      return 0;
    }

    const totalHealth = units.reduce((sum, unit) => sum + unit.state.currentHP / unit.stats.hp, 0);

    return totalHealth / units.length;
  }

  /**
   * Calculate territory control percentage
   */
  private calculateTerritoryControl(_gameState: GameState, player: Player): number {
    // Simplified territory calculation based on objectives held
    const totalObjectives = player.objectives.size;
    const heldObjectives = Array.from(player.objectives.values()).filter(_obj => true).length; // Simplified for now

    return totalObjectives > 0 ? heldObjectives / totalObjectives : 0.5;
  }

  /**
   * Calculate hex distance between two positions
   */
  private calculateDistance(pos1: HexCoordinate, pos2: HexCoordinate): number {
    return Math.max(
      Math.abs(pos1.q - pos2.q),
      Math.abs(pos1.r - pos2.r),
      Math.abs(pos1.s - pos2.s)
    );
  }

  /**
   * Update learning data based on decisions
   */
  private updateLearningData(decisions: AIDecision[], _context: AIDecisionContext): void {
    // Store decisions for later analysis
    this.learningData.successfulTactics.push(...decisions);

    // Keep learning data within reasonable bounds
    if (this.learningData.successfulTactics.length > 100) {
      this.learningData.successfulTactics = this.learningData.successfulTactics.slice(-50);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(actions: GameAction[], _results: unknown[]): void {
    // Update metrics based on action results
    for (let i = 0; i < actions.length && i < _results.length; i++) {
      const action = actions[i];
      const result = _results[i] as { success: boolean };

      if (result.success) {
        if (action.type === ActionType.ATTACK) {
          this.performanceMetrics.casualtiesInflicted++;
        }
      }
    }
  }

  /**
   * Update tactical learning
   */
  private updateTacticalLearning(_actions: GameAction[], _results: unknown[]): void {
    // Analyze which tactics worked and which didn't
    // This would be expanded with more sophisticated learning
  }

  /**
   * Update player pattern recognition
   */
  private updatePlayerPatterns(_gameState: GameState, _playerActions: GameAction[]): void {
    // Analyze player actions to update pattern recognition
    // This would be expanded with more detailed pattern analysis
  }

  /**
   * Log AI state for debugging
   */
  private logAIState(strategicAssessment: unknown, decisions: AIDecision[]): void {
    if (decisions.length > 0) {
      // Log AI state for debugging
      // Log decision details for debugging
    }
  }
}
