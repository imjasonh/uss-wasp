/**
 * AI State Machine for strategic decision making
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { 
  AIState, 
  AIDecisionContext, 
  StrategicAssessment,
  StateTransitionTrigger,
  TacticalPriority,
  AIConfiguration
} from './types';
import { Unit } from '../game/Unit';

/**
 * AI strategic state machine
 */
export class AIStateMachine {
  private currentState: AIState;
  private stateHistory: { state: AIState; turn: number; reason: string }[] = [];
  private transitionTriggers!: StateTransitionTrigger[];

  constructor(_config: AIConfiguration) {
    this.currentState = AIState.PREPARATION;
    this.initializeTransitionTriggers();
  }

  /**
   * Update state machine based on current game context
   */
  update(context: AIDecisionContext): StrategicAssessment {
    // Analyze current strategic situation
    const assessment = this.analyzeStrategicSituation(context);
    
    // Check for state transitions
    const shouldTransition = this.checkStateTransitions(context);
    
    if (shouldTransition) {
      this.transitionToState(shouldTransition.newState, shouldTransition.condition, context.turn);
    }

    return {
      currentState: this.currentState,
      recommendedState: assessment.recommendedState,
      stateConfidence: assessment.stateConfidence,
      keyFactors: assessment.keyFactors,
      timeToTransition: assessment.timeToTransition,
      strategicPriorities: this.getStrategicPriorities()
    };
  }

  /**
   * Get current AI state
   */
  getCurrentState(): AIState {
    return this.currentState;
  }

  /**
   * Force transition to specific state (for testing/debugging)
   */
  forceTransition(newState: AIState, reason: string, turn: number): void {
    this.transitionToState(newState, reason, turn);
  }

  /**
   * Get strategic priorities based on current state
   */
  getStrategicPriorities(): TacticalPriority[] {
    switch (this.currentState) {
      case AIState.PREPARATION:
        return [
          TacticalPriority.GATHER_INTELLIGENCE,
          TacticalPriority.DENY_TERRAIN,
          TacticalPriority.PRESERVE_FORCE
        ];
      
      case AIState.ACTIVE_DEFENSE:
        return [
          TacticalPriority.DEFEND_OBJECTIVES,
          TacticalPriority.INFLICT_CASUALTIES,
          TacticalPriority.DENY_TERRAIN
        ];
      
      case AIState.GUERRILLA_WARFARE:
        return [
          TacticalPriority.INFLICT_CASUALTIES,
          TacticalPriority.PRESERVE_FORCE,
          TacticalPriority.GATHER_INTELLIGENCE
        ];
      
      case AIState.FINAL_STAND:
        return [
          TacticalPriority.DEFEND_OBJECTIVES,
          TacticalPriority.INFLICT_CASUALTIES,
          TacticalPriority.PRESERVE_FORCE
        ];
      
      default:
        return [TacticalPriority.PRESERVE_FORCE];
    }
  }

  /**
   * Analyze strategic situation and recommend state
   */
  private analyzeStrategicSituation(context: AIDecisionContext): {
    recommendedState: AIState;
    stateConfidence: number;
    keyFactors: string[];
    timeToTransition: number;
  } {
    const factors: string[] = [];
    let recommendedState = this.currentState;
    let confidence = 0.5;
    let timeToTransition = 0;

    // Analyze force strength
    const forceRatio = this.calculateForceRatio(context);
    if (forceRatio < 0.3) {
      factors.push(`Low force ratio: ${Math.round(forceRatio * 100)}%`);
      if (this.currentState !== AIState.GUERRILLA_WARFARE && this.currentState !== AIState.FINAL_STAND) {
        recommendedState = AIState.GUERRILLA_WARFARE;
        confidence = 0.8;
        timeToTransition = 1;
      }
    }

    // Analyze territorial control
    const territoryControl = context.resourceStatus.territoryControl;
    if (territoryControl < 0.4) {
      factors.push(`Low territory control: ${Math.round(territoryControl * 100)}%`);
      if (this.currentState === AIState.PREPARATION || this.currentState === AIState.ACTIVE_DEFENSE) {
        recommendedState = AIState.GUERRILLA_WARFARE;
        confidence = 0.7;
        timeToTransition = 2;
      }
    }

    // Analyze enemy proximity to objectives
    const objectiveThreat = this.assessObjectiveThreats(context);
    if (objectiveThreat > 0.8) {
      factors.push(`Critical objective threat: ${Math.round(objectiveThreat * 100)}%`);
      if (this.currentState !== AIState.FINAL_STAND) {
        recommendedState = AIState.FINAL_STAND;
        confidence = 0.9;
        timeToTransition = 0; // Immediate
      }
    }

    // Analyze turn progression
    const gameProgression = context.turn / 15; // Assuming 15 turn limit
    if (gameProgression > 0.8 && territoryControl < 0.6) {
      factors.push(`Late game with poor position: Turn ${context.turn}`);
      recommendedState = AIState.FINAL_STAND;
      confidence = 0.8;
      timeToTransition = 1;
    }

    // Early game considerations
    if (context.turn <= 3 && this.currentState === AIState.PREPARATION) {
      factors.push('Early game preparation phase');
      if (this.hasEnemyLanded(context)) {
        recommendedState = AIState.ACTIVE_DEFENSE;
        confidence = 0.7;
        timeToTransition = 1;
      }
    }

    return {
      recommendedState,
      stateConfidence: confidence,
      keyFactors: factors,
      timeToTransition
    };
  }

  /**
   * Check if any state transition triggers are met
   */
  private checkStateTransitions(
    context: AIDecisionContext
  ): StateTransitionTrigger | null {
    for (const trigger of this.transitionTriggers) {
      if (this.evaluateTriggerCondition(trigger, context)) {
        return trigger;
      }
    }
    return null;
  }

  /**
   * Evaluate if a specific trigger condition is met
   */
  private evaluateTriggerCondition(
    trigger: StateTransitionTrigger, 
    context: AIDecisionContext
  ): boolean {
    switch (trigger.condition) {
      case 'force_ratio_low':
        return this.calculateForceRatio(context) < trigger.threshold;
      
      case 'territory_lost':
        return context.resourceStatus.territoryControl < trigger.threshold;
      
      case 'objective_threatened':
        return this.assessObjectiveThreats(context) > trigger.threshold;
      
      case 'enemy_landed':
        return this.hasEnemyLanded(context);
      
      case 'turn_threshold':
        return context.turn >= trigger.threshold;
      
      case 'casualties_heavy':
        return this.calculateCasualtyRate(context) > trigger.threshold;
      
      case 'supplies_low':
        return context.resourceStatus.ammunition < trigger.threshold;
      
      default:
        return false;
    }
  }

  /**
   * Transition to new state
   */
  private transitionToState(newState: AIState, reason: string, turn: number): void {
    if (newState === this.currentState) return;

    // Record state transition
    this.stateHistory.push({
      state: this.currentState,
      turn,
      reason: `Transitioning from ${this.currentState} to ${newState}: ${reason}`
    });

    console.log(`[AI] State transition: ${this.currentState} -> ${newState} (${reason})`);
    this.currentState = newState;
  }

  /**
   * Initialize state transition triggers
   */
  private initializeTransitionTriggers(): void {
    this.transitionTriggers = [
      // Preparation -> Active Defense
      {
        condition: 'enemy_landed',
        threshold: 1,
        newState: AIState.ACTIVE_DEFENSE,
        priority: 8
      },
      
      // Active Defense -> Guerrilla Warfare
      {
        condition: 'force_ratio_low',
        threshold: 0.4,
        newState: AIState.GUERRILLA_WARFARE,
        priority: 7
      },
      {
        condition: 'territory_lost',
        threshold: 0.5,
        newState: AIState.GUERRILLA_WARFARE,
        priority: 6
      },
      
      // Any state -> Final Stand
      {
        condition: 'objective_threatened',
        threshold: 0.8,
        newState: AIState.FINAL_STAND,
        priority: 9
      },
      {
        condition: 'turn_threshold',
        threshold: 12, // Late game
        newState: AIState.FINAL_STAND,
        priority: 5
      },
      
      // Guerrilla -> Final Stand
      {
        condition: 'force_ratio_low',
        threshold: 0.2,
        newState: AIState.FINAL_STAND,
        priority: 8
      }
    ];

    // Sort triggers by priority
    this.transitionTriggers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate friendly to enemy force ratio
   */
  private calculateForceRatio(context: AIDecisionContext): number {
    const friendlyStrength = this.calculateForceStrength(context.availableUnits);
    const enemyStrength = this.calculateForceStrength(context.enemyUnits);
    
    if (enemyStrength === 0) return 1; // No enemies
    return friendlyStrength / (friendlyStrength + enemyStrength);
  }

  /**
   * Calculate total force strength for a unit array
   */
  private calculateForceStrength(units: Unit[]): number {
    return units.reduce((strength, unit) => {
      const healthRatio = unit.state.currentHP / unit.stats.hp;
      const baseStrength = unit.getEffectiveAttack() + unit.stats.def;
      return strength + (baseStrength * healthRatio);
    }, 0);
  }

  /**
   * Assess threats to objectives
   */
  private assessObjectiveThreats(context: AIDecisionContext): number {
    // This would analyze enemy proximity to objectives
    // For now, return a placeholder value
    const enemyCount = context.enemyUnits.length;
    const friendlyCount = context.availableUnits.length;
    
    if (friendlyCount === 0) return 1.0;
    
    // Simple threat assessment based on unit ratio and positions
    const threatRatio = enemyCount / (enemyCount + friendlyCount);
    return Math.min(1.0, threatRatio * 1.5); // Scale up threat perception
  }

  /**
   * Check if enemy has landed forces
   */
  private hasEnemyLanded(context: AIDecisionContext): boolean {
    // Check if any enemy units are on land (not in water)
    return context.enemyUnits.some(unit => {
      const mapHex = context.gameState.map.getHex(unit.state.position);
      return mapHex && mapHex.terrain !== 'deep_water' && mapHex.terrain !== 'shallow_water';
    });
  }

  /**
   * Calculate casualty rate for AI forces
   */
  private calculateCasualtyRate(context: AIDecisionContext): number {
    const currentUnits = context.availableUnits.length;
    const totalHealthRatio = context.availableUnits.reduce((sum, unit) => 
      sum + (unit.state.currentHP / unit.stats.hp), 0
    ) / Math.max(1, currentUnits);
    
    // Casualty rate is inverse of health ratio
    return 1 - totalHealthRatio;
  }

  /**
   * Get state history for debugging/analysis
   */
  getStateHistory(): { state: AIState; turn: number; reason: string }[] {
    return [...this.stateHistory];
  }

  /**
   * Get state-specific behavior modifiers
   */
  getStateBehaviorModifiers(): {
    aggressiveness: number;
    riskTolerance: number;
    coordinationEmphasis: number;
    resourceConservation: number;
  } {
    switch (this.currentState) {
      case AIState.PREPARATION:
        return {
          aggressiveness: 0.2,
          riskTolerance: 0.8,
          coordinationEmphasis: 0.6,
          resourceConservation: 0.9
        };
      
      case AIState.ACTIVE_DEFENSE:
        return {
          aggressiveness: 0.6,
          riskTolerance: 0.5,
          coordinationEmphasis: 0.8,
          resourceConservation: 0.7
        };
      
      case AIState.GUERRILLA_WARFARE:
        return {
          aggressiveness: 0.8,
          riskTolerance: 0.3,
          coordinationEmphasis: 0.4,
          resourceConservation: 0.9
        };
      
      case AIState.FINAL_STAND:
        return {
          aggressiveness: 1.0,
          riskTolerance: 0.1,
          coordinationEmphasis: 0.9,
          resourceConservation: 0.2
        };
      
      default:
        return {
          aggressiveness: 0.5,
          riskTolerance: 0.5,
          coordinationEmphasis: 0.5,
          resourceConservation: 0.5
        };
    }
  }
}