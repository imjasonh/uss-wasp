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
import { HexCoordinate, Hex } from '../hex';
import { Unit } from '../game/Unit';
import { PlayerSide, ActionType, UnitType, TurnPhase } from '../game/types';
import { getGameLogger } from '../logging/GameLogger';

// Learning analysis types
interface TacticalSituationAnalysis {
  effectiveness: number;
  threatLevel: number;
  objectives: number;
  casualties: number;
  resources: number;
}

interface BattlePerformanceAnalysis {
  unitEffectiveness: number;
  tacticalSuccess: number;
  strategicSuccess: number;
  adaptationSuccess: number;
}

interface ClusterAnalysis {
  avgClusterSize: number;
  clusterCount: number;
  spreadPattern: 'concentrated' | 'dispersed' | 'mixed';
}

interface MovementAnalysis {
  avgMovementDistance: number;
  movementPattern: 'aggressive' | 'defensive' | 'neutral';
}

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
  
  // Action failure tracking and fallback system
  private actionFailureHistory: Map<string, Map<ActionType, number>> = new Map(); // unitId -> actionType -> failureCount
  private blacklistedActions: Map<string, Set<ActionType>> = new Map(); // unitId -> set of blacklisted actions
  private fallbackActions: Map<ActionType, ActionType[]> = new Map(); // primary action -> fallback actions

  // Dynamic difficulty adjustment system
  private dynamicDifficultyEnabled: boolean = false;
  private performanceWindow: AIPerformanceMetrics[] = []; // Rolling window of recent performance
  private lastDifficultyAdjustment: number = 0; // Turn when difficulty was last adjusted
  private performanceBaseline: AIPerformanceMetrics | null = null; // Baseline for comparison

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
        this.personality = PersonalityFactory.createPersonality(
          configOrPersonality as AIPersonalityType
        );
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
    this.initializeFallbackSystem();
  }

  /**
   * Initialize the fallback action system
   */
  private initializeFallbackSystem(): void {
    // Define fallback actions for each primary action type
    this.fallbackActions.set(ActionType.ATTACK, [ActionType.MOVE]);
    this.fallbackActions.set(ActionType.MOVE, [ActionType.ATTACK]);
    this.fallbackActions.set(ActionType.SPECIAL_ABILITY, [ActionType.ATTACK, ActionType.MOVE]);
    this.fallbackActions.set(ActionType.LOAD, [ActionType.MOVE]);
    this.fallbackActions.set(ActionType.UNLOAD, [ActionType.MOVE]);
    this.fallbackActions.set(ActionType.SECURE_OBJECTIVE, [ActionType.MOVE, ActionType.ATTACK]);
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
   * Process end of turn for dynamic difficulty adjustment
   */
  public processEndOfTurn(currentTurn: number, gameState: GameState): void {
    // Update comprehensive performance metrics
    this.updateComprehensivePerformanceMetrics(gameState);

    // Learn from battle outcomes
    this.analyzeBattleOutcomes(currentTurn, gameState);

    // Evaluate and potentially adjust difficulty
    this.updateDynamicDifficulty(currentTurn);
  }

  /**
   * Process end of battle for comprehensive learning
   */
  public processBattleEnd(gameState: GameState, battleResult: 'victory' | 'defeat' | 'draw'): void {
    // Analyze the entire battle for learning opportunities
    this.analyzeBattleEnd(gameState, battleResult);
    
    // Update long-term learning patterns
    this.updateLongTermLearning(gameState, battleResult);
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
   * Enable or disable dynamic difficulty adjustment
   */
  public setDynamicDifficultyEnabled(enabled: boolean): void {
    this.dynamicDifficultyEnabled = enabled;
    if (enabled) {
      this.initializeDynamicDifficulty();
    } else {
      this.resetDynamicDifficulty();
    }
  }

  /**
   * Get current dynamic difficulty status
   */
  public isDynamicDifficultyEnabled(): boolean {
    return this.dynamicDifficultyEnabled;
  }

  /**
   * Initialize dynamic difficulty adjustment system
   */
  private initializeDynamicDifficulty(): void {
    // Reset performance tracking
    this.performanceWindow = [];
    this.lastDifficultyAdjustment = 0;
    this.performanceBaseline = null;

    // Set initial baseline based on current difficulty
    this.performanceBaseline = this.createDifficultyBaseline(this.difficulty);
    
    console.log(`[AI] Dynamic difficulty adjustment enabled for ${this.aiPlayerId}`);
  }

  /**
   * Reset dynamic difficulty adjustment system
   */
  private resetDynamicDifficulty(): void {
    this.performanceWindow = [];
    this.lastDifficultyAdjustment = 0;
    this.performanceBaseline = null;
    
    console.log(`[AI] Dynamic difficulty adjustment disabled for ${this.aiPlayerId}`);
  }

  /**
   * Create performance baseline for a difficulty level
   */
  private createDifficultyBaseline(difficulty: AIDifficulty): AIPerformanceMetrics {
    // Define expected performance metrics for each difficulty level
    const baselines: Record<AIDifficulty, AIPerformanceMetrics> = {
      [AIDifficulty.NOVICE]: {
        casualtiesInflicted: 2,
        casualtiesTaken: 4,
        objectivesHeld: 1,
        successfulAmbushes: 1,
        unitsPreserved: 6,
        resourceEfficiency: 0.4,
        playerSurprises: 0
      },
      [AIDifficulty.VETERAN]: {
        casualtiesInflicted: 4,
        casualtiesTaken: 2,
        objectivesHeld: 2,
        successfulAmbushes: 2,
        unitsPreserved: 8,
        resourceEfficiency: 0.7,
        playerSurprises: 1
      },
      [AIDifficulty.ELITE]: {
        casualtiesInflicted: 6,
        casualtiesTaken: 1,
        objectivesHeld: 3,
        successfulAmbushes: 3,
        unitsPreserved: 10,
        resourceEfficiency: 0.9,
        playerSurprises: 2
      },
      [AIDifficulty.ADAPTIVE]: {
        casualtiesInflicted: 4,
        casualtiesTaken: 2,
        objectivesHeld: 2,
        successfulAmbushes: 2,
        unitsPreserved: 8,
        resourceEfficiency: 0.7,
        playerSurprises: 1
      }
    };

    return { ...baselines[difficulty] };
  }

  /**
   * Update performance metrics and potentially adjust difficulty
   */
  public updateDynamicDifficulty(currentTurn: number): void {
    if (!this.dynamicDifficultyEnabled) return;

    // Add current performance to rolling window
    this.performanceWindow.push({ ...this.performanceMetrics });

    // Keep only last 5 turns of performance data
    if (this.performanceWindow.length > 5) {
      this.performanceWindow.shift();
    }

    // Check if we should adjust difficulty (minimum 3 turns between adjustments)
    const turnsSinceLastAdjustment = currentTurn - this.lastDifficultyAdjustment;
    if (turnsSinceLastAdjustment >= 3 && this.performanceWindow.length >= 3) {
      this.evaluateDifficultyAdjustment(currentTurn);
    }
  }

  /**
   * Evaluate whether difficulty should be adjusted based on performance
   */
  private evaluateDifficultyAdjustment(currentTurn: number): void {
    if (!this.performanceBaseline) return;

    const avgPerformance = this.calculateAveragePerformance();
    const performanceScore = this.calculatePerformanceScore(avgPerformance);
    const difficultyAdjustment = this.determineDifficultyAdjustment(performanceScore);

    if (difficultyAdjustment !== null) {
      this.adjustDifficulty(difficultyAdjustment, currentTurn, performanceScore);
    }
  }

  /**
   * Calculate average performance over the performance window
   */
  private calculateAveragePerformance(): AIPerformanceMetrics {
    if (this.performanceWindow.length === 0) {
      return { ...this.performanceMetrics };
    }

    const sum: AIPerformanceMetrics = {
      casualtiesInflicted: 0,
      casualtiesTaken: 0,
      objectivesHeld: 0,
      successfulAmbushes: 0,
      unitsPreserved: 0,
      resourceEfficiency: 0,
      playerSurprises: 0
    };

    for (const metrics of this.performanceWindow) {
      sum.casualtiesInflicted += metrics.casualtiesInflicted;
      sum.casualtiesTaken += metrics.casualtiesTaken;
      sum.objectivesHeld += metrics.objectivesHeld;
      sum.successfulAmbushes += metrics.successfulAmbushes;
      sum.unitsPreserved += metrics.unitsPreserved;
      sum.resourceEfficiency += metrics.resourceEfficiency;
      sum.playerSurprises += metrics.playerSurprises;
    }

    const count = this.performanceWindow.length;
    return {
      casualtiesInflicted: sum.casualtiesInflicted / count,
      casualtiesTaken: sum.casualtiesTaken / count,
      objectivesHeld: sum.objectivesHeld / count,
      successfulAmbushes: sum.successfulAmbushes / count,
      unitsPreserved: sum.unitsPreserved / count,
      resourceEfficiency: sum.resourceEfficiency / count,
      playerSurprises: sum.playerSurprises / count
    };
  }

  /**
   * Calculate performance score relative to baseline (-1 to 1)
   */
  private calculatePerformanceScore(avgPerformance: AIPerformanceMetrics): number {
    if (!this.performanceBaseline) return 0;

    let score = 0;
    let factors = 0;

    // Combat effectiveness (positive = doing better than baseline)
    if (this.performanceBaseline.casualtiesInflicted > 0) {
      score += (avgPerformance.casualtiesInflicted - this.performanceBaseline.casualtiesInflicted) / this.performanceBaseline.casualtiesInflicted;
      factors++;
    }

    // Survival (negative casualties taken is good)
    if (this.performanceBaseline.casualtiesTaken > 0) {
      score -= (avgPerformance.casualtiesTaken - this.performanceBaseline.casualtiesTaken) / this.performanceBaseline.casualtiesTaken;
      factors++;
    }

    // Objective control
    if (this.performanceBaseline.objectivesHeld > 0) {
      score += (avgPerformance.objectivesHeld - this.performanceBaseline.objectivesHeld) / this.performanceBaseline.objectivesHeld;
      factors++;
    }

    // Tactical effectiveness
    if (this.performanceBaseline.successfulAmbushes > 0) {
      score += (avgPerformance.successfulAmbushes - this.performanceBaseline.successfulAmbushes) / this.performanceBaseline.successfulAmbushes;
      factors++;
    }

    // Resource efficiency
    if (this.performanceBaseline.resourceEfficiency > 0) {
      score += (avgPerformance.resourceEfficiency - this.performanceBaseline.resourceEfficiency) / this.performanceBaseline.resourceEfficiency;
      factors++;
    }

    // Player surprises (tactical innovation)
    if (this.performanceBaseline.playerSurprises > 0) {
      score += (avgPerformance.playerSurprises - this.performanceBaseline.playerSurprises) / this.performanceBaseline.playerSurprises;
      factors++;
    }

    return factors > 0 ? Math.max(-1, Math.min(1, score / factors)) : 0;
  }

  /**
   * Determine if difficulty should be adjusted based on performance score
   */
  private determineDifficultyAdjustment(performanceScore: number): 'increase' | 'decrease' | null {
    // Thresholds for difficulty adjustment
    const UNDERPERFORM_THRESHOLD = -0.3; // AI is underperforming significantly
    const OVERPERFORM_THRESHOLD = 0.4;   // AI is overperforming significantly

    if (performanceScore < UNDERPERFORM_THRESHOLD) {
      return 'decrease'; // Make AI easier (less challenging for player)
    } else if (performanceScore > OVERPERFORM_THRESHOLD) {
      return 'increase'; // Make AI harder (more challenging for player)
    }

    return null; // No adjustment needed
  }

  /**
   * Adjust AI difficulty based on performance analysis
   */
  private adjustDifficulty(adjustment: 'increase' | 'decrease', currentTurn: number, performanceScore: number): void {
    const currentDifficulty = this.difficulty;
    let newDifficulty: AIDifficulty | null = null;

    if (adjustment === 'increase') {
      // Increase difficulty: Novice -> Veteran -> Elite
      if (currentDifficulty === AIDifficulty.NOVICE) {
        newDifficulty = AIDifficulty.VETERAN;
      } else if (currentDifficulty === AIDifficulty.VETERAN) {
        newDifficulty = AIDifficulty.ELITE;
      }
      // Elite already at max difficulty
    } else if (adjustment === 'decrease') {
      // Decrease difficulty: Elite -> Veteran -> Novice
      if (currentDifficulty === AIDifficulty.ELITE) {
        newDifficulty = AIDifficulty.VETERAN;
      } else if (currentDifficulty === AIDifficulty.VETERAN) {
        newDifficulty = AIDifficulty.NOVICE;
      }
      // Novice already at min difficulty
    }

    if (newDifficulty && newDifficulty !== currentDifficulty) {
      const oldDifficulty = this.difficulty;
      this.setDifficulty(newDifficulty);
      this.lastDifficultyAdjustment = currentTurn;

      // Update baseline for new difficulty
      this.performanceBaseline = this.createDifficultyBaseline(newDifficulty);

      // Clear performance window to avoid adjustment bias
      this.performanceWindow = [];

      console.log(
        `[AI] Dynamic difficulty adjusted: ${oldDifficulty} → ${newDifficulty} ` +
        `(score: ${performanceScore.toFixed(2)}, turn: ${currentTurn})`
      );

      // Log to learning data
      this.learningData.adaptationTriggers.push(
        `Turn ${currentTurn}: Difficulty ${adjustment} from ${oldDifficulty} to ${newDifficulty} (performance score: ${performanceScore.toFixed(2)})`
      );
    }
  }

  /**
   * Get current difficulty adjustment status
   */
  public getDifficultyAdjustmentStatus(): {
    enabled: boolean;
    currentDifficulty: AIDifficulty;
    performanceScore: number;
    recentAdjustments: string[];
  } {
    const avgPerformance = this.calculateAveragePerformance();
    const performanceScore = this.performanceBaseline ? this.calculatePerformanceScore(avgPerformance) : 0;
    const recentAdjustments = this.learningData.adaptationTriggers.slice(-5); // Last 5 adjustments

    return {
      enabled: this.dynamicDifficultyEnabled,
      currentDifficulty: this.difficulty,
      performanceScore,
      recentAdjustments
    };
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
          isAppropriate =
            decision.type === AIDecisionType.MOVE_UNIT ||
            decision.type === AIDecisionType.WITHDRAW ||
            decision.type === AIDecisionType.LOAD_TRANSPORT ||
            decision.type === AIDecisionType.UNLOAD_TRANSPORT;
          break;
        case TurnPhase.ACTION:
          // Action phase - combat, special abilities, and logistics
          // CRITICAL FIX: Removed MOVE_UNIT from action phase to prevent pathfinding errors
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

    for (const decision of decisions.slice(0, 8)) {
      // Limit actions per turn
      const action = this.convertDecisionToActionWithFallback(decision, gameState);
      if (action) {
        actions.push(action);
      }
    }
    return actions;
  }

  /**
   * Convert decision to action with fallback system
   */
  private convertDecisionToActionWithFallback(decision: AIDecision, gameState: GameState): GameAction | null {
    // First, try the primary action
    const primaryAction = this.convertDecisionToAction(decision, gameState);
    
    // If primary action would succeed and isn't blacklisted, use it
    if (primaryAction && !this.isActionBlacklisted(primaryAction.unitId, primaryAction.type)) {
      return primaryAction;
    }
    
    // If primary action is blacklisted or null, try fallback actions
    if (primaryAction) {
      const fallbackActionTypes = this.fallbackActions.get(primaryAction.type) ?? [];
      
      for (const fallbackType of fallbackActionTypes) {
        if (!this.isActionBlacklisted(primaryAction.unitId, fallbackType)) {
          const fallbackAction = this.createFallbackAction(primaryAction, fallbackType, gameState);
          if (fallbackAction) {
            return fallbackAction;
          }
        }
      }
    }
    
    return null; // No valid action found
  }

  /**
   * Create a fallback action for a unit
   */
  private createFallbackAction(originalAction: GameAction, fallbackType: ActionType, gameState: GameState): GameAction | null {
    const unit = gameState.getUnit(originalAction.unitId);
    if (!unit) return null;
    
    switch (fallbackType) {
      case ActionType.MOVE: {
        // Create a simple move action - move to a random nearby position
        const currentPos = unit.state.position;
        const nearbyPositions = [
          new Hex(currentPos.q + 1, currentPos.r),
          new Hex(currentPos.q - 1, currentPos.r),
          new Hex(currentPos.q, currentPos.r + 1),
          new Hex(currentPos.q, currentPos.r - 1),
        ];
        
        for (const pos of nearbyPositions) {
          if (gameState.map.isValidHex(pos) && gameState.getUnitsAt(pos).length === 0) {
            return {
              type: ActionType.MOVE,
              playerId: this.aiPlayerId,
              unitId: originalAction.unitId,
              targetPosition: pos,
            };
          }
        }
        return null;
      }
        
      case ActionType.ATTACK: {
        // Find a nearby enemy to attack
        const enemyPlayer = this.getEnemyPlayer(gameState);
        const enemies = enemyPlayer ? enemyPlayer.getLivingUnits() : [];
        const nearestEnemy = enemies.find((enemy: Unit) => {
          const distance = Math.abs(enemy.state.position.q - unit.state.position.q) + 
                          Math.abs(enemy.state.position.r - unit.state.position.r);
          return distance <= 2; // Within attack range
        });
        
        if (nearestEnemy) {
          return {
            type: ActionType.ATTACK,
            playerId: this.aiPlayerId,
            unitId: originalAction.unitId,
            targetId: nearestEnemy.id,
          };
        }
        return null;
      }
        
      default:
        return null;
    }
  }

  /**
   * Convert a single AI decision to a game action
   */
  private convertDecisionToAction(decision: AIDecision, _gameState: GameState): GameAction | null {
    switch (decision.type) {
      case AIDecisionType.MOVE_UNIT:
        if (decision.unitId && decision.targetPosition) {
          // Validate unit can actually move before generating action
          const unit = _gameState.getUnit(decision.unitId);
          if (unit?.stats.mv && unit.stats.mv > 0) {
            return {
              type: ActionType.MOVE,
              playerId: this.aiPlayerId,
              unitId: decision.unitId,
              targetPosition: decision.targetPosition,
              ...(decision.metadata && { data: decision.metadata }), // Preserve metadata for test detection
            };
          }
          // If unit can't move, don't generate action
          return null;
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
          // Find a hiding-related ability the unit actually has
          const unit = _gameState.getUnit(decision.unitId);
          if (unit) {
            const hideAbility = unit.specialAbilities.find(
              ability =>
                ability.name.toLowerCase().includes('hide') ||
                ability.name.toLowerCase().includes('stealth') ||
                ability.name.toLowerCase().includes('conceal')
            );

            if (hideAbility) {
              return {
                type: ActionType.SPECIAL_ABILITY,
                playerId: this.aiPlayerId,
                unitId: decision.unitId,
                data: { abilityName: hideAbility.name },
              };
            }
          }
          // If unit has no hide ability, don't generate action
          return null;
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
        if (decision.unitId && decision.metadata && 'unitsToLaunch' in decision.metadata) {
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
    const defaultSupply = 10;
    const totalSupply = units.reduce((sum, unit) => sum + (unit.stats.sp ?? defaultSupply), 0);
    const currentSupply = units.reduce(
      (sum, unit) => sum + (unit.state.currentSP ?? unit.stats.sp ?? defaultSupply),
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
      const supplyUnits = allUnits.filter(
        unit => unit.type === UnitType.USS_WASP || unit.getCargoCapacity() > 0
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
          if (distance <= 3) {
            // Enemy threatens supply within 3 hexes
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
   * Update performance metrics based on action results
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
   * Update comprehensive performance metrics for dynamic difficulty adjustment
   */
  private updateComprehensivePerformanceMetrics(gameState: GameState): void {
    const aiPlayer = gameState.getPlayer(this.aiPlayerId);
    if (!aiPlayer) return;

    // Reset current metrics (they'll be recalculated)
    this.performanceMetrics.casualtiesTaken = 0;
    this.performanceMetrics.objectivesHeld = 0;
    this.performanceMetrics.unitsPreserved = 0;
    this.performanceMetrics.resourceEfficiency = 0;

    // Calculate units preserved vs casualties taken
    const units = aiPlayer.getLivingUnits();
    let totalUnits = 0;
    let healthyUnits = 0;
    let totalMaxHP = 0;
    let totalCurrentHP = 0;

    for (const unit of units) {
      totalUnits++;
      totalMaxHP += unit.stats.hp;
      totalCurrentHP += unit.state.currentHP;
      
      if (unit.state.currentHP === unit.stats.hp) {
        healthyUnits++;
      } else if (unit.state.currentHP === 0) {
        this.performanceMetrics.casualtiesTaken++;
      }
    }

    this.performanceMetrics.unitsPreserved = healthyUnits;
    this.performanceMetrics.resourceEfficiency = totalUnits > 0 ? totalCurrentHP / totalMaxHP : 0;

    // Calculate objectives held
    let objectivesHeld = 0;
    const map = gameState.map;
    
    // Scan map for objectives controlled by AI
    for (let q = 0; q < 8; q++) {
      for (let r = 0; r < 6; r++) {
        const hex = map.getHex(new Hex(q, r, -q - r));
        if (hex?.objective) {
          // Check if AI has units on or near this objective
          const nearbyUnits = units.filter((unit: Unit) => {
            const distance = Math.max(
              Math.abs(unit.state.position.q - q),
              Math.abs(unit.state.position.r - r),
              Math.abs(unit.state.position.s - (-q - r))
            );
            return distance <= 1; // Within 1 hex of objective
          });
          
          if (nearbyUnits.length > 0) {
            objectivesHeld++;
          }
        }
      }
    }
    
    this.performanceMetrics.objectivesHeld = objectivesHeld;

    // Update ambush success tracking (this would need more sophisticated tracking)
    // For now, we'll use a simplified approach based on special ability usage
    const recentSuccessfulAbilities = this.learningData.successfulTactics.filter(
      tactic => tactic.type === AIDecisionType.SPECIAL_ABILITY
    ).length;
    this.performanceMetrics.successfulAmbushes = Math.min(recentSuccessfulAbilities, 5);

    // Player surprises - track when AI does something unexpected or particularly effective
    // This would ideally be tracked based on player reaction time or effectiveness
    // For now, we'll use a placeholder based on recent learning data
    this.performanceMetrics.playerSurprises = this.learningData.adaptationTriggers.length;
  }

  /**
   * Analyze battle outcomes for learning during the game
   */
  private analyzeBattleOutcomes(currentTurn: number, gameState: GameState): void {
    const aiPlayer = gameState.getPlayer(this.aiPlayerId);
    if (!aiPlayer) return;

    // Analyze current tactical situation
    const tacticalAnalysis = this.analyzeTacticalSituation(gameState);
    
    // Extract learning opportunities from recent decisions
    this.extractTurnLearning(currentTurn, tacticalAnalysis);
    
    // Update tactical adaptation based on current performance
    this.updateTacticalAdaptation(tacticalAnalysis);
  }

  /**
   * Analyze battle end for comprehensive learning
   */
  private analyzeBattleEnd(gameState: GameState, battleResult: 'victory' | 'defeat' | 'draw'): void {
    // Analyze what worked and what didn't throughout the battle
    const battleAnalysis = this.analyzeBattlePerformance(gameState, battleResult);
    
    // Extract strategic lessons
    this.extractStrategicLessons(battleAnalysis, battleResult);
    
    // Update successful/failed tactics based on final outcome
    this.categorizeTacticsbyOutcome(battleResult);
    
    // Learn from enemy behavior patterns
    this.analyzeEnemyPatterns(gameState);
  }

  /**
   * Update long-term learning patterns
   */
  private updateLongTermLearning(gameState: GameState, battleResult: 'victory' | 'defeat' | 'draw'): void {
    // Add this battle to performance history
    this.learningData.performanceHistory.push({ ...this.performanceMetrics });
    
    // Keep only last 20 battles for analysis
    if (this.learningData.performanceHistory.length > 20) {
      this.learningData.performanceHistory = this.learningData.performanceHistory.slice(-20);
    }
    
    // Analyze performance trends
    this.analyzePerformanceTrends(battleResult);
    
    // Update adaptation triggers based on patterns
    this.updateAdaptationTriggers(gameState, battleResult);
  }

  /**
   * Analyze current tactical situation for learning
   */
  private analyzeTacticalSituation(gameState: GameState): TacticalSituationAnalysis {
    const aiPlayer = gameState.getPlayer(this.aiPlayerId);
    if (!aiPlayer) {
      return { effectiveness: 0, threatLevel: 0, objectives: 0, casualties: 0, resources: 0 };
    }

    const units = aiPlayer.getLivingUnits();
    const enemies = gameState.getAllUnits().filter(unit => unit.side !== aiPlayer.side);
    
    // Calculate tactical effectiveness
    const totalUnits = units.length;
    const healthyUnits = units.filter(unit => unit.state.currentHP === unit.stats.hp).length;
    const effectiveness = totalUnits > 0 ? healthyUnits / totalUnits : 0;
    
    // Calculate threat level
    const nearbyThreats = enemies.filter(enemy => {
      return units.some(unit => {
        const distance = Math.max(
          Math.abs(unit.state.position.q - enemy.state.position.q),
          Math.abs(unit.state.position.r - enemy.state.position.r),
          Math.abs(unit.state.position.s - enemy.state.position.s)
        );
        return distance <= 3; // Within 3 hexes
      });
    });
    const threatLevel = nearbyThreats.length / Math.max(enemies.length, 1);
    
    // Calculate objective control
    const objectives = this.calculateObjectiveControl(gameState);
    
    // Calculate casualty ratio
    const casualties = this.performanceMetrics.casualtiesTaken / Math.max(totalUnits, 1);
    
    // Calculate resource efficiency
    const resources = this.performanceMetrics.resourceEfficiency;
    
    return {
      effectiveness,
      threatLevel,
      objectives,
      casualties,
      resources
    };
  }

  /**
   * Extract learning from current turn
   */
  private extractTurnLearning(currentTurn: number, analysis: TacticalSituationAnalysis): void {
    // Identify if this turn was particularly good or bad
    const overallScore = (analysis.effectiveness * 0.3) + 
                        ((1 - analysis.threatLevel) * 0.2) + 
                        (analysis.objectives * 0.3) + 
                        ((1 - analysis.casualties) * 0.2);
    
    // Learn from exceptional turns
    if (overallScore > 0.8) {
      // Excellent turn - reinforce recent successful tactics
      this.reinforceSuccessfulTactics(currentTurn, 'excellent_turn');
    } else if (overallScore < 0.3) {
      // Poor turn - analyze what went wrong
      this.analyzeFailedTactics(currentTurn, 'poor_turn', analysis);
    }
    
    // Learn from specific situations
    if (analysis.threatLevel > 0.7) {
      this.learnFromHighThreatSituation(currentTurn, analysis);
    }
    
    if (analysis.objectives > 0.7) {
      this.learnFromObjectiveSuccess(currentTurn, analysis);
    }
  }

  /**
   * Update tactical adaptation based on current analysis
   */
  private updateTacticalAdaptation(analysis: TacticalSituationAnalysis): void {
    // Adjust risk tolerance based on current situation
    if (analysis.casualties > 0.5) {
      // Taking heavy casualties - become more conservative
      this.playerPattern.riskTolerance = Math.max(0.1, this.playerPattern.riskTolerance - 0.1);
    } else if (analysis.effectiveness > 0.8 && analysis.threatLevel < 0.3) {
      // Doing well with low threat - can afford more risk
      this.playerPattern.riskTolerance = Math.min(0.9, this.playerPattern.riskTolerance + 0.05);
    }
    
    // Adjust adaptation rate based on performance consistency
    const recentPerformance = this.learningData.performanceHistory.slice(-5);
    if (recentPerformance.length >= 3) {
      const variance = this.calculatePerformanceVariance(recentPerformance);
      if (variance < 0.1) {
        // Consistent performance - slower adaptation
        this.playerPattern.adaptationRate = Math.max(0.2, this.playerPattern.adaptationRate - 0.05);
      } else if (variance > 0.3) {
        // Inconsistent performance - faster adaptation
        this.playerPattern.adaptationRate = Math.min(0.8, this.playerPattern.adaptationRate + 0.1);
      }
    }
  }

  /**
   * Analyze battle performance for comprehensive learning
   */
  private analyzeBattlePerformance(gameState: GameState, battleResult: 'victory' | 'defeat' | 'draw'): BattlePerformanceAnalysis {
    const aiPlayer = gameState.getPlayer(this.aiPlayerId);
    if (!aiPlayer) {
      return { unitEffectiveness: 0, tacticalSuccess: 0, strategicSuccess: 0, adaptationSuccess: 0 };
    }

    // Calculate unit effectiveness
    const units = aiPlayer.getLivingUnits();
    const totalStartingUnits = units.length + this.performanceMetrics.casualtiesTaken;
    const unitEffectiveness = totalStartingUnits > 0 ? units.length / totalStartingUnits : 0;
    
    // Calculate tactical success (damage dealt vs taken)
    const damageRatio = this.performanceMetrics.casualtiesTaken > 0 ? 
      this.performanceMetrics.casualtiesInflicted / this.performanceMetrics.casualtiesTaken : 
      this.performanceMetrics.casualtiesInflicted;
    const tacticalSuccess = Math.min(1, damageRatio / 2); // Normalize to 0-1
    
    // Calculate strategic success (objectives + special achievements)
    const objectiveSuccess = this.performanceMetrics.objectivesHeld / Math.max(1, this.countTotalObjectives(gameState));
    const strategicSuccess = (objectiveSuccess + this.performanceMetrics.successfulAmbushes / 5) / 2;
    
    // Calculate adaptation success (how well we adapted during battle)
    const adaptationSuccess = battleResult === 'victory' ? 1 : 
                             battleResult === 'draw' ? 0.5 : 0;
    
    return {
      unitEffectiveness,
      tacticalSuccess,
      strategicSuccess,
      adaptationSuccess
    };
  }

  /**
   * Extract strategic lessons from battle
   */
  private extractStrategicLessons(analysis: BattlePerformanceAnalysis, battleResult: 'victory' | 'defeat' | 'draw'): void {
    const lessons: string[] = [];
    
    // Learn from unit effectiveness
    if (analysis.unitEffectiveness < 0.3) {
      lessons.push('Focus on force preservation and defensive positioning');
      this.adjustTacticalPriorities('preserve_force', 0.2);
    } else if (analysis.unitEffectiveness > 0.8) {
      lessons.push('Aggressive tactics were successful - reinforce offensive capabilities');
      this.adjustTacticalPriorities('inflict_casualties', 0.1);
    }
    
    // Learn from tactical success
    if (analysis.tacticalSuccess < 0.4) {
      lessons.push('Improve target selection and combat positioning');
      this.adjustTacticalPriorities('gather_intelligence', 0.15);
    }
    
    // Learn from strategic success
    if (analysis.strategicSuccess < 0.3) {
      lessons.push('Focus more on objective-based strategy');
      this.adjustTacticalPriorities('secure_objectives', 0.2);
    }
    
    // Learn from adaptation
    if (analysis.adaptationSuccess < 0.5 && battleResult === 'defeat') {
      lessons.push('Improve mid-battle adaptation and flexibility');
      this.playerPattern.adaptationRate = Math.min(0.8, this.playerPattern.adaptationRate + 0.1);
    }
    
    // Store lessons for future reference
    this.learningData.adaptationTriggers.push(
      `Battle ${battleResult}: ${lessons.join(', ')}`
    );
  }

  /**
   * Categorize tactics by battle outcome
   */
  private categorizeTacticsbyOutcome(battleResult: 'victory' | 'defeat' | 'draw'): void {
    const recentTactics = this.learningData.successfulTactics.slice(-10); // Last 10 tactics
    
    if (battleResult === 'victory') {
      // Reinforce tactics that led to victory
      for (const tactic of recentTactics) {
        // Increase the priority of successful tactics
        const reinforcedTactic = { ...tactic, priority: tactic.priority + 1 };
        this.learningData.successfulTactics.push(reinforcedTactic);
      }
    } else if (battleResult === 'defeat') {
      // Mark recent tactics as potentially problematic
      for (const tactic of recentTactics) {
        this.learningData.failedTactics.push({
          ...tactic,
          reasoning: `Used in defeat - reconsider effectiveness`
        });
      }
    }
    
    // Limit the size of tactic lists
    if (this.learningData.successfulTactics.length > 100) {
      this.learningData.successfulTactics = this.learningData.successfulTactics.slice(-75);
    }
    
    if (this.learningData.failedTactics.length > 50) {
      this.learningData.failedTactics = this.learningData.failedTactics.slice(-30);
    }
  }

  /**
   * Analyze enemy patterns for counter-strategy development
   */
  private analyzeEnemyPatterns(gameState: GameState): void {
    // This would analyze enemy behavior patterns for future counter-tactics
    // For now, we'll implement a basic pattern recognition system
    
    const aiPlayer = gameState.getPlayer(this.aiPlayerId);
    if (!aiPlayer) return;
    
    const enemies = gameState.getAllUnits().filter(unit => unit.side !== aiPlayer.side);
    const enemyPositions = enemies.map(unit => new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s));
    
    // Analyze clustering patterns
    const clusterAnalysis = this.analyzeEnemyClustering(enemyPositions);
    
    // Analyze movement patterns (would need turn-by-turn tracking)
    const movementAnalysis = this.analyzeEnemyMovement(enemies);
    
    // Store patterns for future use
    this.updateEnemyPatterns(clusterAnalysis, movementAnalysis);
  }

  /**
   * Analyze performance trends over multiple battles
   */
  private analyzePerformanceTrends(battleResult: 'victory' | 'defeat' | 'draw'): void {
    const recentHistory = this.learningData.performanceHistory.slice(-10);
    
    if (recentHistory.length >= 5) {
      // Analyze trends in key metrics
      const casualties = recentHistory.map(h => h.casualtiesTaken);
      const effectiveness = recentHistory.map(h => h.resourceEfficiency);
      
      // Calculate trends
      const casualtyTrend = this.calculateTrend(casualties);
      const effectivenessTrend = this.calculateTrend(effectiveness);
      
      // Adapt based on trends
      if (casualtyTrend > 0.1) {
        // Casualties increasing - become more defensive
        this.learningData.adaptationTriggers.push(
          `Trend analysis: Increasing casualties - adopting defensive posture`
        );
        this.adjustTacticalPriorities('preserve_force', 0.15);
      }
      
      if (effectivenessTrend < -0.1) {
        // Effectiveness decreasing - need tactical adjustment
        this.learningData.adaptationTriggers.push(
          `Trend analysis: Decreasing effectiveness - adjusting tactics`
        );
        this.adjustTacticalPriorities('gather_intelligence', 0.1);
      }
    }
  }

  /**
   * Update adaptation triggers based on patterns
   */
  private updateAdaptationTriggers(gameState: GameState, battleResult: 'victory' | 'defeat' | 'draw'): void {
    // Keep adaptation triggers list manageable
    if (this.learningData.adaptationTriggers.length > 20) {
      this.learningData.adaptationTriggers = this.learningData.adaptationTriggers.slice(-15);
    }
    
    // Add battle result to triggers
    const turn = gameState.turn;
    this.learningData.adaptationTriggers.push(
      `Turn ${turn}: Battle ${battleResult} - Performance: ${this.performanceMetrics.resourceEfficiency.toFixed(2)}`
    );
  }

  /**
   * Update tactical learning
   */
  private updateTacticalLearning(actions: GameAction[], results: unknown[]): void {
    // Track failed actions and implement blacklist system
    for (let i = 0; i < actions.length && i < results.length; i++) {
      const action = actions[i];
      const result = results[i] as { success: boolean; message?: string };
      
      if (!result.success) {
        // Only blacklist actions that are fundamentally impossible for this unit
        // Don't penalize the AI for blocked actions - those are learning opportunities
        if (this.shouldBlacklistAction(action, result.message || '')) {
          this.trackActionFailure(action.unitId, action.type, result.message || 'Unknown failure');
        } else {
          // Log blocked action for learning but don't penalize
          console.log(`[AI] Blocked action (learning): ${action.unitId} ${action.type} - ${result.message}`);
        }
      } else {
        // Reset failure count for successful actions
        this.resetActionFailureCount(action.unitId, action.type);
      }
    }
  }

  /**
   * Determine if an action should be blacklisted vs just being a learning opportunity
   */
  private shouldBlacklistAction(action: GameAction, failureMessage: string): boolean {
    // Don't blacklist actions that are just blocked by game rules or temporary conditions
    const learningOnlyFailures = [
      'Unit cannot move this turn',
      'No valid path to target',
      'Insufficient movement',
      'Cannot attack target',
      'Cannot target hidden unit',
      'Invalid attack parameters',
      'Unit is not adjacent to objective',
      'Unit has already acted this turn',
      'Unit not in range',
      'Target not in range',
      'Cannot perform action in current phase',
      'Not enough command points',
      'Invalid action parameters',
    ];
    
    // Check if this is a learning-only failure (don't blacklist)
    for (const learningFailure of learningOnlyFailures) {
      if (failureMessage.includes(learningFailure)) {
        return false;
      }
    }
    
    // Blacklist actions that are fundamentally impossible for this unit type
    const blacklistFailures = [
      'Unit does not have this ability',
      'Unit type cannot perform this action',
      'USS Wasp has no embarked aircraft',
      'No aircraft available for launch',
      'Invalid ability name',
      'Unknown action type',
      'Unit does not exist',
    ];
    
    // Check if this should be blacklisted
    for (const blacklistFailure of blacklistFailures) {
      if (failureMessage.includes(blacklistFailure)) {
        return true;
      }
    }
    
    // Default: don't blacklist, treat as learning opportunity
    return false;
  }

  /**
   * Track action failure for a unit
   */
  private trackActionFailure(unitId: string, actionType: ActionType, failureReason: string): void {
    // Initialize failure tracking for this unit if needed
    if (!this.actionFailureHistory.has(unitId)) {
      this.actionFailureHistory.set(unitId, new Map());
    }
    
    const unitFailures = this.actionFailureHistory.get(unitId)!;
    const currentFailures = unitFailures.get(actionType) || 0;
    const newFailureCount = currentFailures + 1;
    
    unitFailures.set(actionType, newFailureCount);
    
    // Blacklist actions that fail repeatedly (threshold: 3 failures)
    if (newFailureCount >= 3) {
      this.blacklistActionForUnit(unitId, actionType);
      console.log(`[AI] Blacklisted action ${actionType} for unit ${unitId} (${newFailureCount} failures)`);
    }
    
    // Log failure for debugging
    console.log(`[AI] Action failure tracked: ${unitId} ${actionType} (${newFailureCount} failures) - ${failureReason}`);
  }

  /**
   * Reset failure count for successful actions
   */
  private resetActionFailureCount(unitId: string, actionType: ActionType): void {
    const unitFailures = this.actionFailureHistory.get(unitId);
    if (unitFailures) {
      unitFailures.delete(actionType);
    }
  }

  /**
   * Blacklist an action for a specific unit
   */
  private blacklistActionForUnit(unitId: string, actionType: ActionType): void {
    if (!this.blacklistedActions.has(unitId)) {
      this.blacklistedActions.set(unitId, new Set());
    }
    
    this.blacklistedActions.get(unitId)!.add(actionType);
  }

  /**
   * Check if an action is blacklisted for a unit
   */
  private isActionBlacklisted(unitId: string, actionType: ActionType): boolean {
    const blacklistedForUnit = this.blacklistedActions.get(unitId);
    return blacklistedForUnit ? blacklistedForUnit.has(actionType) : false;
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

  // Helper methods for battle learning system

  /**
   * Calculate objective control ratio
   */
  private calculateObjectiveControl(gameState: GameState): number {
    const aiPlayer = gameState.getPlayer(this.aiPlayerId);
    if (!aiPlayer) return 0;

    const units = aiPlayer.getLivingUnits();
    const map = gameState.map;
    let totalObjectives = 0;
    let controlledObjectives = 0;

    // Scan map for objectives
    for (let q = 0; q < 8; q++) {
      for (let r = 0; r < 6; r++) {
        const hex = map.getHex(new Hex(q, r, -q - r));
        if (hex?.objective) {
          totalObjectives++;
          
          // Check if AI has units on or near this objective
          const nearbyUnits = units.filter(unit => {
            const distance = Math.max(
              Math.abs(unit.state.position.q - q),
              Math.abs(unit.state.position.r - r),
              Math.abs(unit.state.position.s - (-q - r))
            );
            return distance <= 1;
          });
          
          if (nearbyUnits.length > 0) {
            controlledObjectives++;
          }
        }
      }
    }

    return totalObjectives > 0 ? controlledObjectives / totalObjectives : 0;
  }

  /**
   * Reinforce successful tactics
   */
  private reinforceSuccessfulTactics(currentTurn: number, reason: string): void {
    const recentTactics = this.learningData.successfulTactics.slice(-5);
    
    for (const tactic of recentTactics) {
      const reinforcedTactic = { 
        ...tactic, 
        priority: tactic.priority + 1,
        reasoning: `${tactic.reasoning} - Reinforced: ${reason} (Turn ${currentTurn})`
      };
      this.learningData.successfulTactics.push(reinforcedTactic);
    }
  }

  /**
   * Analyze failed tactics
   */
  private analyzeFailedTactics(currentTurn: number, reason: string, analysis: TacticalSituationAnalysis): void {
    const recentTactics = this.learningData.successfulTactics.slice(-5);
    
    for (const tactic of recentTactics) {
      this.learningData.failedTactics.push({
        ...tactic,
        reasoning: `${reason} - Turn ${currentTurn}: effectiveness=${analysis.effectiveness.toFixed(2)}, threats=${analysis.threatLevel.toFixed(2)}`
      });
    }
  }

  /**
   * Learn from high threat situations
   */
  private learnFromHighThreatSituation(currentTurn: number, analysis: TacticalSituationAnalysis): void {
    this.learningData.adaptationTriggers.push(
      `Turn ${currentTurn}: High threat situation (${analysis.threatLevel.toFixed(2)}) - emphasize defensive tactics`
    );
    
    // Adjust tactical priorities toward defensive actions
    this.adjustTacticalPriorities('preserve_force', 0.1);
    this.adjustTacticalPriorities('gather_intelligence', 0.05);
  }

  /**
   * Learn from objective success
   */
  private learnFromObjectiveSuccess(currentTurn: number, analysis: TacticalSituationAnalysis): void {
    this.learningData.adaptationTriggers.push(
      `Turn ${currentTurn}: Objective success (${analysis.objectives.toFixed(2)}) - reinforce objective-focused tactics`
    );
    
    // Reinforce objective-focused tactics
    this.adjustTacticalPriorities('secure_objectives', 0.1);
    this.adjustTacticalPriorities('defend_objectives', 0.05);
  }

  /**
   * Calculate performance variance
   */
  private calculatePerformanceVariance(performances: AIPerformanceMetrics[]): number {
    if (performances.length < 2) return 0;
    
    const efficiencies = performances.map(p => p.resourceEfficiency);
    const mean = efficiencies.reduce((sum, val) => sum + val, 0) / efficiencies.length;
    const variance = efficiencies.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / efficiencies.length;
    
    return variance;
  }

  /**
   * Count total objectives on map
   */
  private countTotalObjectives(gameState: GameState): number {
    const map = gameState.map;
    let totalObjectives = 0;

    for (let q = 0; q < 8; q++) {
      for (let r = 0; r < 6; r++) {
        const hex = map.getHex(new Hex(q, r, -q - r));
        if (hex?.objective) {
          totalObjectives++;
        }
      }
    }

    return totalObjectives;
  }

  /**
   * Adjust tactical priorities based on learning
   */
  private adjustTacticalPriorities(priority: string, adjustment: number): void {
    // This would interface with the AIDecisionMaker to adjust tactical priorities
    // For now, we'll store the adjustment in learning data
    this.learningData.adaptationTriggers.push(
      `Priority adjustment: ${priority} ${adjustment > 0 ? '+' : ''}${adjustment.toFixed(2)}`
    );
  }

  /**
   * Analyze enemy clustering patterns
   */
  private analyzeEnemyClustering(enemyPositions: Hex[]): ClusterAnalysis {
    if (enemyPositions.length === 0) {
      return { avgClusterSize: 0, clusterCount: 0, spreadPattern: 'dispersed' };
    }

    // Simple clustering analysis
    const clusters: Hex[][] = [];
    const processed = new Set<number>();

    for (let i = 0; i < enemyPositions.length; i++) {
      if (processed.has(i)) continue;

      const cluster = [enemyPositions[i]];
      processed.add(i);

      // Find nearby positions
      for (let j = i + 1; j < enemyPositions.length; j++) {
        if (processed.has(j)) continue;

        const distance = Math.max(
          Math.abs(enemyPositions[i].q - enemyPositions[j].q),
          Math.abs(enemyPositions[i].r - enemyPositions[j].r),
          Math.abs(enemyPositions[i].s - enemyPositions[j].s)
        );

        if (distance <= 2) { // Within 2 hexes = clustered
          cluster.push(enemyPositions[j]);
          processed.add(j);
        }
      }

      clusters.push(cluster);
    }

    const avgClusterSize = clusters.reduce((sum, cluster) => sum + cluster.length, 0) / clusters.length;
    const clusterCount = clusters.length;
    
    let spreadPattern: 'concentrated' | 'dispersed' | 'mixed' = 'mixed';
    if (avgClusterSize > 3) {
      spreadPattern = 'concentrated';
    } else if (avgClusterSize < 1.5) {
      spreadPattern = 'dispersed';
    }

    return { avgClusterSize, clusterCount, spreadPattern };
  }

  /**
   * Analyze enemy movement patterns
   */
  private analyzeEnemyMovement(enemies: Unit[]): MovementAnalysis {
    // This would need turn-by-turn tracking of enemy positions
    // For now, we'll provide a basic implementation
    
    let avgMovementDistance = 0;
    let movementPattern: 'aggressive' | 'defensive' | 'neutral' = 'neutral';
    
    // Simple analysis based on enemy unit clustering
    // For now, we'll analyze based on enemy positions only
    if (enemies.length > 1) {
      // Calculate average distance between enemies
      let totalDistance = 0;
      let pairCount = 0;
      
      for (let i = 0; i < enemies.length; i++) {
        for (let j = i + 1; j < enemies.length; j++) {
          const distance = Math.max(
            Math.abs(enemies[i].state.position.q - enemies[j].state.position.q),
            Math.abs(enemies[i].state.position.r - enemies[j].state.position.r),
            Math.abs(enemies[i].state.position.s - enemies[j].state.position.s)
          );
          totalDistance += distance;
          pairCount++;
        }
      }
      
      avgMovementDistance = pairCount > 0 ? totalDistance / pairCount : 0;
      
      // Determine movement pattern based on clustering
      if (avgMovementDistance < 3) {
        movementPattern = 'aggressive'; // Tightly grouped
      } else if (avgMovementDistance > 6) {
        movementPattern = 'defensive'; // Spread out
      }
    }

    return { avgMovementDistance, movementPattern };
  }

  /**
   * Update enemy patterns in learning data
   */
  private updateEnemyPatterns(clusterAnalysis: ClusterAnalysis, movementAnalysis: MovementAnalysis): void {
    // Store enemy patterns for future tactical decisions
    this.learningData.adaptationTriggers.push(
      `Enemy pattern: ${clusterAnalysis.spreadPattern} clustering (${clusterAnalysis.avgClusterSize.toFixed(1)} avg), ${movementAnalysis.movementPattern} movement`
    );
  }

  /**
   * Calculate trend from numeric array
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression slope
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, idx) => sum + val * idx, 0);
    const sumX2 = values.reduce((sum, _, idx) => sum + idx * idx, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
}
