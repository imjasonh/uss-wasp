/**
 * Main AI Controller - coordinates all AI systems
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { AIDecisionMaker } from './AIDecisionMaker';
import { AIStateMachine } from './AIStateMachine';
import {
  AIDifficulty,
  AIDecisionContext,
  AIDecision,
  AIConfiguration,
  AIState,
  PlayerPattern,
  AILearningData,
  AIPerformanceMetrics,
} from './types';
import { GameState } from '../game/GameState';
import { Player } from '../game/Player';
import { Unit } from '../game/Unit';
import { PlayerSide, ActionType } from '../game/types';
import { GameAction } from '../game/GameState';
import { getGameLogger } from '../logging/GameLogger';

/**
 * Main AI Controller that manages all AI systems
 */
export class AIController {
  private decisionMaker: AIDecisionMaker;
  private stateMachine: AIStateMachine;
  private readonly aiPlayerId: string;
  private difficulty: AIDifficulty;
  private playerPattern!: PlayerPattern;
  private learningData!: AILearningData;
  private performanceMetrics!: AIPerformanceMetrics;
  private isEnabled: boolean = true;

  constructor(aiPlayerId: string, difficulty: AIDifficulty = AIDifficulty.VETERAN) {
    this.aiPlayerId = aiPlayerId;
    this.difficulty = difficulty;
    this.decisionMaker = new AIDecisionMaker(difficulty);

    const config = this.createAIConfiguration(difficulty);
    this.stateMachine = new AIStateMachine(config);

    this.initializeAIData();
  }

  /**
   * Main AI update - called each turn to generate AI actions
   */
  update(gameState: GameState): GameAction[] {
    if (!this.isEnabled) {
      return [];
    }

    // Only generate actions for appropriate phases
    const currentPhase = gameState.phase;
    if (currentPhase === 'event' || currentPhase === 'end') {
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
  processActionResults(actions: GameAction[], results: any[]): void {
    // Update performance metrics based on action outcomes
    this.updatePerformanceMetrics(actions, results);

    // Learn from successful/failed tactics
    this.updateTacticalLearning(actions, results);
  }

  /**
   * Analyze player behavior for pattern recognition
   */
  analyzePlayerBehavior(gameState: GameState, playerActions: GameAction[]): void {
    // Update player pattern recognition
    this.updatePlayerPatterns(gameState, playerActions);
  }

  /**
   * Get current AI state for UI display
   */
  getAIStatus(): {
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
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Change AI difficulty level
   */
  setDifficulty(newDifficulty: AIDifficulty): void {
    if (newDifficulty === this.difficulty) {
      return;
    }

    this.difficulty = newDifficulty;
    this.decisionMaker = new AIDecisionMaker(newDifficulty);

    const config = this.createAIConfiguration(newDifficulty);
    this.stateMachine = new AIStateMachine(config);

    console.log(`[AI] Difficulty changed to ${newDifficulty}`);
  }

  /**
   * Force AI state transition (for testing)
   */
  forceStateTransition(newState: AIState, reason: string): void {
    this.stateMachine.forceTransition(newState, reason, 0);
  }

  /**
   * Get AI learning data for analysis
   */
  getLearningData(): AILearningData {
    return { ...this.learningData };
  }

  /**
   * Reset AI learning data
   */
  resetLearningData(): void {
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
  private filterDecisionsForPhase(decisions: AIDecision[], phase: string): AIDecision[] {
    const filtered: AIDecision[] = [];

    for (const decision of decisions) {
      let isAppropriate = false;

      switch (phase) {
        case 'command':
          // Command phase - no movement/combat actions
          isAppropriate = false;
          break;
        case 'deployment':
        case 'movement':
          // Movement phases - movement and logistics actions
          isAppropriate = decision.type === 'move_unit' || 
                          decision.type === 'withdraw' ||
                          decision.type === 'load_transport' ||
                          decision.type === 'unload_transport';
          break;
        case 'action':
          // Action phase - combat, special abilities, and logistics
          isAppropriate =
            decision.type === 'attack_target' ||
            decision.type === 'hide_unit' ||
            decision.type === 'reveal_unit' ||
            decision.type === 'special_ability' ||
            decision.type === 'launch_from_wasp' ||
            decision.type === 'recover_to_wasp' ||
            decision.type === 'load_transport' ||
            decision.type === 'unload_transport' ||
            decision.type === 'secure_objective';
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
      case 'move_unit':
        if (decision.unitId && decision.targetPosition) {
          return {
            type: ActionType.MOVE,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            targetPosition: decision.targetPosition,
          };
        }
        break;

      case 'attack_target':
        if (decision.unitId && decision.targetUnitId) {
          return {
            type: ActionType.ATTACK,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            targetId: decision.targetUnitId,
          };
        }
        break;

      case 'hide_unit':
        if (decision.unitId) {
          return {
            type: ActionType.SPECIAL_ABILITY,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            data: { abilityName: 'hide' },
          };
        }
        break;

      case 'reveal_unit':
        if (decision.unitId) {
          return {
            type: ActionType.REVEAL,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
          };
        }
        break;

      case 'launch_from_wasp':
        if (decision.unitId && decision.metadata?.unitsToLaunch) {
          return {
            type: ActionType.LAUNCH_FROM_WASP,
            playerId: this.aiPlayerId,
            unitId: decision.metadata.waspId || decision.unitId,
            data: { unitIds: decision.metadata.unitsToLaunch },
          };
        }
        break;

      case 'recover_to_wasp':
        if (decision.unitId) {
          return {
            type: ActionType.RECOVER_TO_WASP,
            playerId: this.aiPlayerId,
            unitId: decision.metadata?.waspId || decision.unitId,
            data: { unitIds: [decision.unitId] },
          };
        }
        break;

      case 'load_transport':
        if (decision.unitId && decision.targetUnitId) {
          return {
            type: ActionType.LOAD,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            targetId: decision.targetUnitId,
          };
        }
        break;

      case 'unload_transport':
        if (decision.unitId) {
          return {
            type: ActionType.UNLOAD,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            ...(decision.targetPosition && { targetPosition: decision.targetPosition }),
          };
        }
        break;

      case 'secure_objective':
        if (decision.unitId) {
          return {
            type: ActionType.SECURE_OBJECTIVE,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
          };
        }
        break;

      case 'special_ability':
        if (decision.unitId && decision.metadata?.abilityName) {
          return {
            type: ActionType.SPECIAL_ABILITY,
            playerId: this.aiPlayerId,
            unitId: decision.unitId,
            data: {
              abilityName: decision.metadata.abilityName,
              ...decision.metadata,
            },
          };
        }
        break;

      default:
        console.warn(`[AI] Unknown decision type: ${decision.type}`);
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
    const totalSupply = units.reduce((sum, unit) => sum + (unit.stats.sp || 10), 0);
    const currentSupply = units.reduce(
      (sum, unit) => sum + (unit.state.currentSP || unit.stats.sp || 10),
      0
    );

    return totalSupply > 0 ? currentSupply / totalSupply : 1;
  }

  /**
   * Assess supply line status
   */
  private assessSupplyLines(_gameState: GameState): number {
    // Simplified supply line assessment
    return 0.8; // Placeholder
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
  private updatePerformanceMetrics(actions: GameAction[], _results: any[]): void {
    // Update metrics based on action results
    for (let i = 0; i < actions.length && i < _results.length; i++) {
      const action = actions[i];
      const result = _results[i];

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
  private updateTacticalLearning(_actions: GameAction[], _results: any[]): void {
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
  private logAIState(strategicAssessment: any, decisions: AIDecision[]): void {
    if (decisions.length > 0) {
      console.log(
        `[AI] State: ${strategicAssessment.currentState}, Decisions: ${decisions.length}`
      );
      decisions.slice(0, 3).forEach(decision => {
        console.log(`  - ${decision.type}: ${decision.reasoning}`);
      });
    }
  }
}
