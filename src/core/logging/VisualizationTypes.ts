/**
 * Enhanced types for game visualization logging
 * Extends the base logging system with rich data for game replay and analysis
 */

import { LogEntry, GameSnapshot } from './GameLogger';
import { Hex } from '../hex';
import { UnitType, TerrainType, PlayerSide } from '../game/types';
import { AIDecision } from '../ai/types';
import { CombatResult } from '../game/Combat';

/**
 * Enhanced movement path with visualization data
 */
export interface VisualizationMovementPath {
  readonly startPosition: Hex;
  readonly endPosition: Hex;
  readonly hexPath: Hex[];
  readonly movementCosts: number[];
  readonly totalCost: number;
  readonly terrainEncountered: TerrainType[];
  readonly difficultTerrain: boolean;
  readonly pathBlocked: boolean;
  readonly alternativeRoutes: number;
}

/**
 * Spatial context around an action for visualization
 */
export interface SpatialContext {
  readonly centerHex: Hex;
  readonly radius: number;
  readonly nearbyUnits: UnitSpatialData[];
  readonly terrainData: HexTerrainData[];
  readonly lineOfSightData: LineOfSightData[];
  readonly threatsInRange: ThreatData[];
  readonly objectivesInRange: ObjectiveData[];
}

/**
 * Unit spatial data for visualization context
 */
export interface UnitSpatialData {
  readonly id: string;
  readonly type: UnitType;
  readonly side: PlayerSide;
  readonly position: Hex;
  readonly currentHP: number;
  readonly maxHP: number;
  readonly canAct: boolean;
  readonly hasMoved: boolean;
  readonly isHidden: boolean;
  readonly statusEffects: string[];
  readonly distanceFromAction: number;
  readonly hasLineOfSight: boolean;
  readonly threatsTo: string[];
  readonly threatenedBy: string[];
}

/**
 * Hex terrain data for visualization
 */
export interface HexTerrainData {
  readonly position: Hex;
  readonly terrain: TerrainType;
  readonly elevation: number;
  readonly coverValue: number;
  readonly movementCost: number;
  readonly features: string[];
  readonly hasObjective: boolean;
  readonly objectiveType: string | undefined;
  readonly controlledBy: PlayerSide | undefined;
  readonly fortified: boolean;
}

/**
 * Line of sight data for visualization
 */
export interface LineOfSightData {
  readonly fromHex: Hex;
  readonly toHex: Hex;
  readonly blocked: boolean;
  readonly blockingHexes: Hex[];
  readonly partialCover: boolean;
  readonly distance: number;
}

/**
 * Threat assessment data for visualization
 */
export interface ThreatData {
  readonly threatUnitId: string;
  readonly threatToUnitId: string;
  readonly threatLevel: number;
  readonly threatType: 'direct_fire' | 'indirect_fire' | 'melee' | 'special';
  readonly canAttackThisTurn: boolean;
  readonly requiredMovement: number;
}

/**
 * Objective data for spatial context
 */
export interface ObjectiveData {
  readonly id: string;
  readonly type: string;
  readonly position: Hex;
  readonly value: number;
  readonly controlledBy: PlayerSide | undefined;
  readonly distanceFromAction: number;
  readonly contestedThisTurn: boolean;
}

/**
 * Animation and visual effect metadata
 */
export interface VisualizationEffects {
  readonly primaryEffect: EffectData;
  readonly secondaryEffects: EffectData[];
  readonly cameraGuidance: CameraGuidance;
  readonly attentionPriority: number; // 1-10, how important this event is
  readonly duration: number; // Suggested duration in milliseconds
  readonly soundCues: SoundCue[];
}

/**
 * Visual effect data
 */
export interface EffectData {
  readonly type: 'movement' | 'combat' | 'explosion' | 'status' | 'environment';
  readonly position: Hex;
  readonly intensity: 'low' | 'medium' | 'high' | 'critical';
  readonly duration: number;
  readonly particles: ParticleData[];
  readonly animations: AnimationData[];
}

/**
 * Particle effect data
 */
export interface ParticleData {
  readonly type: 'smoke' | 'fire' | 'debris' | 'dust' | 'spark' | 'water';
  readonly count: number;
  readonly spread: number;
  readonly lifetime: number;
  readonly color: string;
}

/**
 * Animation data
 */
export interface AnimationData {
  readonly type: 'unit_move' | 'unit_attack' | 'unit_damage' | 'terrain_change';
  readonly duration: number;
  readonly easing: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out';
  readonly keyframes: AnimationKeyframe[];
}

/**
 * Animation keyframe
 */
export interface AnimationKeyframe {
  readonly time: number; // 0-1 percentage of animation
  readonly position?: Hex;
  readonly rotation?: number;
  readonly scale?: number;
  readonly opacity?: number;
}

/**
 * Camera guidance for optimal viewing
 */
export interface CameraGuidance {
  readonly suggestedPosition: Hex;
  readonly suggestedZoom: number;
  readonly suggestedAngle: number;
  readonly followUnit: string | undefined;
  readonly focusArea: Hex[];
  readonly transitionTime: number;
}

/**
 * Sound effect cues
 */
export interface SoundCue {
  readonly type: 'weapon_fire' | 'explosion' | 'movement' | 'ambient' | 'voice';
  readonly sound: string;
  readonly volume: number;
  readonly delay: number;
  readonly position?: Hex; // For 3D positioned audio
}

/**
 * Enhanced combat visualization data
 */
export interface VisualizationCombatResult extends CombatResult {
  readonly attackVector: LineOfSightData;
  readonly terrainEffects: TerrainCombatEffects;
  readonly tacticalSituation: TacticalSituation;
  readonly visualEffects: VisualizationEffects;
  readonly damageVisualization: DamageVisualization;
}

/**
 * Terrain effects on combat for visualization
 */
export interface TerrainCombatEffects {
  readonly attackerTerrain: HexTerrainData;
  readonly defenderTerrain: HexTerrainData;
  readonly coverProvided: number;
  readonly elevationAdvantage: number;
  readonly movementPenalties: number;
  readonly visualObstacles: Hex[];
}

/**
 * Tactical situation assessment for visualization
 */
export interface TacticalSituation {
  readonly flanking: boolean;
  readonly ambush: boolean;
  readonly supportingUnits: string[];
  readonly escapePaths: Hex[];
  readonly reinforcements: string[];
  readonly strategicImportance: number;
}

/**
 * Damage visualization data
 */
export interface DamageVisualization {
  readonly hitLocation: 'front' | 'side' | 'rear' | 'top';
  readonly damageType: 'kinetic' | 'explosive' | 'fire' | 'special';
  readonly severity: 'light' | 'moderate' | 'heavy' | 'critical';
  readonly unitReaction: 'none' | 'suppressed' | 'retreat' | 'destroyed';
  readonly statusChanges: string[];
}

/**
 * Enhanced log entry with visualization data
 */
export interface VisualizationLogEntry extends LogEntry {
  readonly spatialContext: SpatialContext;
  readonly visualEffects: VisualizationEffects;
  readonly beforeState: UnitStateSnapshot[];
  readonly afterState: UnitStateSnapshot[];
  movementPath: VisualizationMovementPath | undefined;
  combatVisualization: VisualizationCombatResult | undefined;
  aiDecisionVisualization: AIDecisionVisualization | undefined;
}

/**
 * Unit state snapshot for before/after comparison
 */
export interface UnitStateSnapshot {
  readonly unitId: string;
  readonly position: Hex;
  readonly currentHP: number;
  readonly statusEffects: string[];
  readonly hasActed: boolean;
  readonly hasMoved: boolean;
  readonly isHidden: boolean;
  readonly cargo: string[];
  readonly timestamp: number;
}

/**
 * AI decision visualization data
 */
export interface AIDecisionVisualization {
  readonly decision: AIDecision;
  readonly alternativesConsidered: AIDecision[];
  readonly decisionFactors: DecisionFactor[];
  readonly threatAssessment: ThreatData[];
  readonly strategicImportance: number;
  readonly riskAssessment: number;
  readonly expectedOutcome: string;
}

/**
 * AI decision factors for visualization
 */
export interface DecisionFactor {
  readonly factor: string;
  readonly weight: number;
  readonly value: number;
  readonly reasoning: string;
  readonly importance: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Hex activity timeline for heatmap visualization
 */
export interface HexActivity {
  readonly position: Hex;
  readonly turn: number;
  readonly phase: string;
  readonly activities: ActivityEvent[];
  unitsPresent: string[];
  combatEvents: number;
  movementEvents: number;
  readonly strategicImportance: number;
}

/**
 * Activity event in a hex
 */
export interface ActivityEvent {
  readonly type: 'movement' | 'combat' | 'ability' | 'objective';
  readonly timestamp: number;
  readonly unitId: string;
  readonly intensity: number;
  readonly success: boolean;
}

/**
 * Game flow analysis for overview visualization
 */
export interface GameFlowAnalysis {
  readonly gameId: string;
  readonly duration: number;
  readonly totalTurns: number;
  readonly majorEvents: MajorEvent[];
  readonly momentumShifts: MomentumShift[];
  readonly territoryControl: TerritoryControlData[];
  readonly casualtyProgression: CasualtyData[];
  readonly objectiveContests: ObjectiveContest[];
}

/**
 * Major game events for timeline visualization
 */
export interface MajorEvent {
  readonly turn: number;
  readonly phase: string;
  readonly type: 'first_blood' | 'objective_captured' | 'unit_destroyed' | 'breakthrough' | 'retreat';
  readonly description: string;
  readonly participants: string[];
  readonly location: Hex;
  readonly impact: number;
  readonly gameChanging: boolean;
}

/**
 * Momentum shift tracking
 */
export interface MomentumShift {
  readonly turn: number;
  readonly fromSide: PlayerSide;
  readonly toSide: PlayerSide;
  readonly cause: string;
  readonly magnitude: number;
  readonly triggeringEvent: string;
}

/**
 * Territory control over time
 */
export interface TerritoryControlData {
  readonly turn: number;
  readonly assaultControl: number;
  readonly defenderControl: number;
  readonly contestedHexes: number;
  readonly objectivesHeld: {
    assault: number;
    defender: number;
  };
}

/**
 * Casualty progression tracking
 */
export interface CasualtyData {
  readonly turn: number;
  readonly assaultCasualties: number;
  readonly defenderCasualties: number;
  readonly assaultUnitsRemaining: number;
  readonly defenderUnitsRemaining: number;
  readonly exchangeRatio: number;
}

/**
 * Objective contest tracking
 */
export interface ObjectiveContest {
  readonly objectiveId: string;
  readonly turn: number;
  readonly contestedBy: PlayerSide[];
  readonly controlChanges: number;
  readonly battleIntensity: number;
  readonly strategicValue: number;
}

/**
 * Complete visualization game log
 */
export interface VisualizationGameLog {
  readonly gameId: string;
  readonly metadata: {
    readonly startTime: number;
    readonly endTime: number;
    readonly totalTurns: number;
    readonly winner: PlayerSide | undefined;
    readonly victoryCondition: string | undefined;
    readonly logVersion: string;
  };
  readonly logs: VisualizationLogEntry[];
  readonly snapshots: GameSnapshot[];
  readonly hexActivity: HexActivity[];
  readonly gameFlow: GameFlowAnalysis;
  readonly summary: GameVisualizationSummary;
}

/**
 * Game visualization summary
 */
export interface GameVisualizationSummary {
  readonly totalActions: number;
  readonly combatEngagements: number;
  readonly movementActions: number;
  readonly objectiveCaptures: number;
  readonly unitsDestroyed: number;
  readonly majorEvents: number;
  readonly aiDecisions: number;
  readonly averageActionTime: number;
  readonly hottestHex: Hex;
  readonly longestMovement: number;
  readonly biggestBattle: string;
}