/**
 * AI system types and interfaces
 */

import { Unit } from '../game/Unit';
import { GameState } from '../game/GameState';
import { Hex } from '../hex';
import { UnitType } from '../game/types';

/**
 * AI difficulty levels
 */
export enum AIDifficulty {
  NOVICE = 'novice',
  VETERAN = 'veteran', 
  ELITE = 'elite',
  ADAPTIVE = 'adaptive'
}

/**
 * AI strategic states
 */
export enum AIState {
  PREPARATION = 'preparation',
  ACTIVE_DEFENSE = 'active_defense',
  GUERRILLA_WARFARE = 'guerrilla_warfare',
  FINAL_STAND = 'final_stand'
}

/**
 * AI tactical priorities
 */
export enum TacticalPriority {
  PRESERVE_FORCE = 'preserve_force',
  DENY_TERRAIN = 'deny_terrain',
  INFLICT_CASUALTIES = 'inflict_casualties',
  GATHER_INTELLIGENCE = 'gather_intelligence',
  DEFEND_OBJECTIVES = 'defend_objectives',
  MANAGE_LOGISTICS = 'manage_logistics',
  WASP_OPERATIONS = 'wasp_operations',
  HIDDEN_OPERATIONS = 'hidden_operations',
  USE_SPECIAL_ABILITIES = 'use_special_abilities',
  SECURE_OBJECTIVES = 'secure_objectives'
}

/**
 * Hidden unit AI states
 */
export enum HiddenUnitState {
  CONCEALED = 'concealed',
  SUSPICIOUS = 'suspicious', 
  PREPARING = 'preparing',
  REVEALED = 'revealed',
  ESCAPING = 'escaping'
}

/**
 * Detection levels for fuzzy detection system
 */
export enum DetectionLevel {
  HIDDEN = 0,           // Completely hidden
  SUSPICIOUS = 1,       // Player notices something odd
  DETECTED = 2,         // Player knows something is there
  IDENTIFIED = 3,       // Player knows unit type and rough position
  REVEALED = 4          // Exact position and capabilities known
}

/**
 * Resource status for AI planning
 */
export interface ResourceStatus {
  commandPoints: number;
  ammunition: number;
  supplyLines: number;
  unitCondition: number; // Average HP percentage
  territoryControl: number; // Percentage of objectives held
}

/**
 * AI decision context
 */
export interface AIDecisionContext {
  gameState: GameState;
  aiPlayer: string;
  turn: number;
  phase: string;
  availableUnits: Unit[];
  enemyUnits: Unit[];
  threatLevel: number;
  resourceStatus: ResourceStatus;
}

/**
 * Types of AI decisions
 */
export enum AIDecisionType {
  MOVE_UNIT = 'move_unit',
  ATTACK_TARGET = 'attack_target',
  HIDE_UNIT = 'hide_unit',
  REVEAL_UNIT = 'reveal_unit',
  DEPLOY_HIDDEN = 'deploy_hidden',
  FORTIFY_POSITION = 'fortify_position',
  WITHDRAW = 'withdraw',
  SPECIAL_ABILITY = 'special_ability',
  COORDINATE_ATTACK = 'coordinate_attack',
  SET_AMBUSH = 'set_ambush',
  CHANGE_STRATEGY = 'change_strategy',
  LAUNCH_FROM_WASP = 'launch_from_wasp',
  RECOVER_TO_WASP = 'recover_to_wasp',
  LOAD_TRANSPORT = 'load_transport',
  UNLOAD_TRANSPORT = 'unload_transport',
  SECURE_OBJECTIVE = 'secure_objective'
}

/**
 * AI decision result
 */
export interface AIDecision {
  type: AIDecisionType;
  priority: number;
  unitId?: string;
  targetPosition?: Hex;
  targetUnitId?: string;
  reasoning: string;
  metadata?: Record<string, unknown>;
}

/**
 * Terrain tactical value assessment
 */
export interface TerrainValue {
  coverBonus: number;        // Combat defensive modifier
  concealment: number;       // Hidden unit detection difficulty
  observationRange: number;  // Vision and firing range
  escapeRoutes: number;      // Available withdrawal paths
  supply: number;            // Ammunition and reinforcement access
  strategicValue: number;    // Objective importance
  totalValue: number;        // Combined tactical value
}

/**
 * AI threat assessment
 */
export interface ThreatAssessment {
  immediateThreats: Unit[];     // Units that can attack this turn
  approachingThreats: Unit[];   // Units moving toward positions
  objectiveThreats: Unit[];     // Units threatening objectives
  overallThreatLevel: number;   // 0-100 threat scale
  recommendedResponse: TacticalPriority;
}

/**
 * AI engagement analysis
 */
export interface EngagementAnalysis {
  friendlyAdvantage: number;    // Local force ratio
  terrainAdvantage: number;     // Defensive modifiers
  supplyStatus: number;         // Ammunition availability
  escapeOptions: number;        // Withdrawal possibilities
  strategicValue: number;       // Importance of position
  playerVulnerability: number;  // Enemy disadvantages
  shouldEngage: boolean;        // Recommended action
  confidence: number;           // Confidence in analysis (0-1)
}

/**
 * Player behavior pattern recognition
 */
export interface PlayerPattern {
  landingPreferences: Hex[];     // Favorite landing zones
  movementTendencies: string[];  // Tactical preferences
  targetPriorities: UnitType[];  // Which units attacked first
  riskTolerance: number;         // Aggressive vs cautious (0-1)
  adaptationRate: number;        // How quickly they adjust (0-1)
  predictability: number;        // How consistent their patterns are (0-1)
}

/**
 * AI performance metrics
 */
export interface AIPerformanceMetrics {
  casualtiesInflicted: number;
  casualtiesTaken: number;
  objectivesHeld: number;
  successfulAmbushes: number;
  unitsPreserved: number;
  resourceEfficiency: number;
  playerSurprises: number; // Unexpected tactical successes
}

/**
 * AI learning data
 */
export interface AILearningData {
  playerPatterns: PlayerPattern;
  successfulTactics: AIDecision[];
  failedTactics: AIDecision[];
  performanceHistory: AIPerformanceMetrics[];
  adaptationTriggers: string[];
}

/**
 * AI configuration for different difficulty levels
 */
export interface AIConfiguration {
  difficulty: AIDifficulty;
  reactionTime: number;          // Turns to respond to threats
  coordinationLevel: number;     // Multi-unit coordination ability
  patternRecognition: number;    // Player behavior learning rate
  resourceOptimization: number;  // Efficiency of resource use
  tacticalComplexity: number;    // Sophistication of plans
  mistakeFrequency: number;      // How often AI makes suboptimal moves
  cheatingLevel: number;         // Information advantages (0 = fair)
}

/**
 * AI personality traits that define behavioral patterns
 */
export interface AIPersonality extends AIConfiguration {
  readonly name: string;           // Human-readable personality name
  readonly aggression: number;     // 0-5: Conservative to Aggressive
  readonly forwardLooking: number; // 0-5: Naive to Strategic
  readonly mistakes: number;       // 0-5: Error-prone to Precise
  
  // Derived tactical priority weights (calculated from personality traits)
  readonly priorityWeights: Record<TacticalPriority, number>;
  
  // Behavioral modifiers
  readonly riskTolerance: number;      // Willingness to take calculated risks
  readonly adaptability: number;       // How quickly AI changes tactics
  readonly specialization: number;     // Focus on specific unit types/abilities
}

/**
 * Predefined AI personality types
 */
export enum AIPersonalityType {
  BERSERKER = 'berserker',         // High aggression, low planning
  STRATEGIST = 'strategist',       // High planning, moderate aggression
  CONSERVATIVE = 'conservative',   // Low aggression, high survival focus
  BALANCED = 'balanced',           // Moderate across all traits
  ROOKIE = 'rookie',               // High mistakes, low forward-looking
  VETERAN = 'veteran',             // Low mistakes, high experience
  SPECIALIST = 'specialist',       // Focused on specific tactics
  ADAPTIVE = 'adaptive'            // Changes behavior based on situation
}

/**
 * AI state transition triggers
 */
export interface StateTransitionTrigger {
  condition: string;
  threshold: number;
  newState: AIState;
  priority: number;
}

/**
 * Base AI behavior interface
 */
export interface AIBehavior {
  readonly name: string;
  readonly priority: number;
  canExecute(context: AIDecisionContext): boolean;
  execute(context: AIDecisionContext): AIDecision[];
  evaluate(context: AIDecisionContext): number; // Utility score
}

/**
 * AI behavior tree node types
 */
export enum BehaviorNodeType {
  SEQUENCE = 'sequence',         // Execute children in order until one fails
  SELECTOR = 'selector',         // Execute children until one succeeds
  PARALLEL = 'parallel',         // Execute all children simultaneously
  DECORATOR = 'decorator',       // Modify child behavior
  LEAF = 'leaf'                 // Action or condition node
}

/**
 * AI behavior tree node
 */
export interface BehaviorTreeNode {
  type: BehaviorNodeType;
  name: string;
  children?: BehaviorTreeNode[];
  behavior?: AIBehavior;
  condition?: (context: AIDecisionContext) => boolean;
  decorator?: (result: unknown) => unknown;
}

/**
 * AI strategic assessment
 */
export interface StrategicAssessment {
  currentState: AIState;
  recommendedState: AIState;
  stateConfidence: number;
  keyFactors: string[];
  timeToTransition: number;
  strategicPriorities: TacticalPriority[];
}

/**
 * AI tactical coordination
 */
export interface TacticalCoordination {
  primaryUnit: string;           // Lead unit for coordination
  supportingUnits: string[];     // Units providing support
  coordinationType: string;      // Type of coordinated action
  timing: number;               // Turn to execute coordination
  fallbackPlan: AIDecision[];   // Alternative if coordination fails
}