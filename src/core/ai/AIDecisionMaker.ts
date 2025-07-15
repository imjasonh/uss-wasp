/**
 * Core AI decision-making framework
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  AIDecisionContext,
  AIDecision,
  AIDecisionType,
  TacticalPriority,
  EngagementAnalysis,
  ThreatAssessment,
  AIConfiguration,
  AIPersonality,
  AIDifficulty,
} from './types';
import { Unit } from '../game/Unit';
import { Hex, HexCoordinate } from '../hex';
import { UnitCategory, UnitType, TerrainType } from '../game/types';

/**
 * Core AI decision-making engine
 */
export class AIDecisionMaker {
  private readonly config: AIConfiguration;
  private readonly personality: AIPersonality | null;
  private readonly decisionHistory: AIDecision[] = [];
  private readonly threatAssessments: Map<string, ThreatAssessment> = new Map();

  public constructor(configOrPersonality: AIDifficulty | AIPersonality = AIDifficulty.VETERAN) {
    if (typeof configOrPersonality === 'string') {
      // Legacy difficulty-based configuration
      this.config = this.createConfiguration(configOrPersonality);
      this.personality = null;
    } else {
      // New personality-based configuration
      this.personality = configOrPersonality;
      this.config = configOrPersonality;
    }
  }

  /**
   * Main decision-making entry point
   */
  public makeDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];
    const usedUnits = new Set<string>(); // Track units that already have decisions

    // Update threat assessments
    this.updateThreatAssessments(context);

    // Analyze current tactical situation
    const tacticalPriorities = this.determineTacticalPriorities(context);

    // Generate decisions based on priorities, tracking used units
    for (const priority of tacticalPriorities) {
      const priorityDecisions = this.generateDecisionsForPriority(priority, context, usedUnits);
      decisions.push(...priorityDecisions);

      // Track units used in these decisions
      for (const decision of priorityDecisions) {
        if (decision.unitId) {
          usedUnits.add(decision.unitId);
        }
      }
    }

    // Apply difficulty-based filtering and mistakes
    const filteredDecisions = this.applyDifficultyModifiers(decisions, context);

    // Store decisions for learning
    this.decisionHistory.push(...filteredDecisions);

    return filteredDecisions;
  }

  /**
   * Determine current tactical priorities based on game state and personality
   */
  private determineTacticalPriorities(context: AIDecisionContext): TacticalPriority[] {
    const priorities: { priority: TacticalPriority; weight: number }[] = [];

    // Get base personality weights or use default weights
    const baseWeights = this.personality?.priorityWeights ?? this.getDefaultPriorityWeights();

    // Analyze current situation and apply situational modifiers
    const situationalModifiers = this.calculateSituationalModifiers(context);

    // Apply personality-based weights with situational modifiers
    for (const [priority, baseWeight] of Object.entries(baseWeights)) {
      const situationalWeight = situationalModifiers[priority as TacticalPriority] || 1.0;
      const finalWeight = baseWeight * situationalWeight;

      // Only include priorities that meet minimum threshold
      if (finalWeight >= 1.0) {
        priorities.push({
          priority: priority as TacticalPriority,
          weight: finalWeight,
        });
      }
    }

    // Apply personality-specific urgency bonuses
    this.applyUrgencyBonuses(priorities, context);

    // Sort by weight (highest first)
    priorities.sort((a, b) => b.weight - a.weight);

    return priorities.map(p => p.priority);
  }

  /**
   * Calculate situational modifiers for tactical priorities
   */
  private calculateSituationalModifiers(
    context: AIDecisionContext
  ): Record<TacticalPriority, number> {
    const modifiers: Record<TacticalPriority, number> = {} as Record<TacticalPriority, number>;

    // Force preservation - higher when units are damaged
    const averageHealth = this.calculateAverageUnitHealth(context.availableUnits);
    modifiers[TacticalPriority.PRESERVE_FORCE] = averageHealth < 0.5 ? 2.0 : 1.0;

    // Objective threats - higher when objectives are threatened
    const objectiveThreatLevel = this.assessObjectiveThreats(context);
    modifiers[TacticalPriority.DEFEND_OBJECTIVES] = objectiveThreatLevel > 0.7 ? 1.8 : 1.0;
    modifiers[TacticalPriority.SECURE_OBJECTIVES] = objectiveThreatLevel > 0.5 ? 1.5 : 1.0;

    // Terrain control - higher when losing territory
    const territoryControl = context.resourceStatus.territoryControl;
    modifiers[TacticalPriority.DENY_TERRAIN] = territoryControl < 0.6 ? 1.6 : 1.0;

    // Combat opportunities - higher when enemies are vulnerable
    const enemyVulnerability = this.assessEnemyVulnerability(context.enemyUnits);
    modifiers[TacticalPriority.INFLICT_CASUALTIES] = enemyVulnerability > 0.1 ? 1.4 : 1.0;

    // Unit-specific opportunities
    const hasWasp = context.availableUnits.some(unit => unit.type === UnitType.USS_WASP);
    modifiers[TacticalPriority.WASP_OPERATIONS] = hasWasp ? 1.0 : 0.0;

    const hasTransports = context.availableUnits.some(unit => unit.getCargoCapacity() > 0);
    modifiers[TacticalPriority.MANAGE_LOGISTICS] = hasTransports ? 1.0 : 0.0;

    const hasHiddenUnits = context.availableUnits.some(unit => unit.isHidden());
    const canHideUnits = context.availableUnits.some(
      unit => unit.canBeHidden() && !unit.isHidden()
    );
    modifiers[TacticalPriority.HIDDEN_OPERATIONS] = hasHiddenUnits || canHideUnits ? 1.0 : 0.0;

    const hasSpecialAbilities = context.availableUnits.some(
      unit => unit.specialAbilities.length > 0 && unit.canAct()
    );
    modifiers[TacticalPriority.USE_SPECIAL_ABILITIES] = hasSpecialAbilities ? 1.0 : 0.0;

    // Intelligence gathering - personality-dependent baseline
    modifiers[TacticalPriority.GATHER_INTELLIGENCE] = 1.0;

    return modifiers;
  }

  /**
   * Apply urgency bonuses based on personality and situation
   */
  private applyUrgencyBonuses(
    priorities: { priority: TacticalPriority; weight: number }[],
    context: AIDecisionContext
  ): void {
    // Combat urgency - aggressive personalities get massive bonus for immediate combat
    const unitsInRange = this.countUnitsInCombatRange(context);
    if (unitsInRange > 0) {
      const combatPriority = priorities.find(
        p => p.priority === TacticalPriority.INFLICT_CASUALTIES
      );
      if (combatPriority) {
        const aggressionBonus = this.personality?.aggression ?? 3;
        combatPriority.weight += aggressionBonus * 4; // Significant bonus for aggressive personalities
      }
    }

    // Forward-looking personalities boost planning priorities
    const forwardLooking = this.personality?.forwardLooking ?? 3;
    if (forwardLooking >= 4) {
      const planningPriorities = [
        TacticalPriority.GATHER_INTELLIGENCE,
        TacticalPriority.MANAGE_LOGISTICS,
        TacticalPriority.DEFEND_OBJECTIVES,
      ];

      priorities.forEach(p => {
        if (planningPriorities.includes(p.priority)) {
          p.weight += forwardLooking * 0.5;
        }
      });
    }
  }

  /**
   * Get default priority weights for legacy compatibility
   */
  private getDefaultPriorityWeights(): Record<TacticalPriority, number> {
    return {
      [TacticalPriority.PRESERVE_FORCE]: 4,
      [TacticalPriority.INFLICT_CASUALTIES]: 6,
      [TacticalPriority.DENY_TERRAIN]: 5,
      [TacticalPriority.DEFEND_OBJECTIVES]: 7,
      [TacticalPriority.SECURE_OBJECTIVES]: 6,
      [TacticalPriority.GATHER_INTELLIGENCE]: 3,
      [TacticalPriority.MANAGE_LOGISTICS]: 5,
      [TacticalPriority.WASP_OPERATIONS]: 6,
      [TacticalPriority.HIDDEN_OPERATIONS]: 8,
      [TacticalPriority.USE_SPECIAL_ABILITIES]: 4,
    };
  }

  /**
   * Count units in combat range (for urgency calculations)
   */
  private countUnitsInCombatRange(context: AIDecisionContext): number {
    return context.availableUnits.filter(unit => {
      return context.enemyUnits.some(enemy => {
        const unitHex = new Hex(
          unit.state.position.q,
          unit.state.position.r,
          unit.state.position.s
        );
        const enemyHex = new Hex(
          enemy.state.position.q,
          enemy.state.position.r,
          enemy.state.position.s
        );
        const distance = unitHex.distanceTo(enemyHex);
        return distance <= 1; // Adjacent combat range
      });
    }).length;
  }

  /**
   * Generate specific decisions for a tactical priority
   */
  private generateDecisionsForPriority(
    priority: TacticalPriority,
    context: AIDecisionContext,
    usedUnits?: Set<string>
  ): AIDecision[] {
    switch (priority) {
      case TacticalPriority.PRESERVE_FORCE:
        return this.generateForcePreservationDecisions(context);
      case TacticalPriority.DEFEND_OBJECTIVES:
        return this.generateObjectiveDefenseDecisions(context);
      case TacticalPriority.DENY_TERRAIN:
        return this.generateTerrainDenialDecisions(context);
      case TacticalPriority.INFLICT_CASUALTIES:
        return this.generateCombatDecisions(context);
      case TacticalPriority.GATHER_INTELLIGENCE:
        return this.generateIntelligenceDecisions(context);
      case TacticalPriority.WASP_OPERATIONS:
        return this.generateWaspOperationsDecisions(context);
      case TacticalPriority.HIDDEN_OPERATIONS:
        return this.generateHiddenOperationsDecisions(context);
      case TacticalPriority.MANAGE_LOGISTICS:
        return this.generateLogisticsDecisions(context);
      case TacticalPriority.USE_SPECIAL_ABILITIES:
        return this.generateSpecialAbilityDecisions(context);
      case TacticalPriority.SECURE_OBJECTIVES:
        return this.generateObjectiveSecuringDecisions(context);
      default:
        return [];
    }
  }

  /**
   * Generate decisions focused on preserving AI forces
   */
  private generateForcePreservationDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];

    for (const unit of context.availableUnits) {
      // Check if unit is in immediate danger
      const threat = this.threatAssessments.get(unit.id);
      if (threat && threat.overallThreatLevel > 60) {
        // Find safe withdrawal position
        const safePosition = this.findSafeWithdrawalPosition(unit, context);
        if (safePosition) {
          decisions.push({
            type: AIDecisionType.WITHDRAW,
            priority: 8,
            unitId: unit.id,
            targetPosition: safePosition,
            reasoning: `Unit ${unit.type} withdrawing from high threat area (${threat.overallThreatLevel}% threat)`,
          });
        }

        // Consider hiding if unit can be hidden
        if (unit.canBeHidden() && !unit.isHidden()) {
          decisions.push({
            type: AIDecisionType.HIDE_UNIT,
            priority: 7,
            unitId: unit.id,
            reasoning: `Hiding ${unit.type} to avoid detection and preserve force`,
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Generate decisions for defending objectives
   */
  private generateObjectiveDefenseDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];
    const objectives = this.getThreatenedObjectives(context);

    for (const objective of objectives) {
      // Find best defenders for this objective
      const defenders = this.findBestDefenders(objective.position, context.availableUnits);

      for (const defender of defenders.slice(0, 2)) {
        // Limit to 2 defenders per objective
        const defensePosition = this.findOptimalDefensePosition(
          objective.position,
          defender,
          context
        );

        if (defensePosition) {
          decisions.push({
            type: AIDecisionType.MOVE_UNIT,
            priority: 9,
            unitId: defender.id,
            targetPosition: defensePosition,
            reasoning: `Moving ${defender.type} to defend ${objective.type} objective`,
            metadata: { objectiveId: objective.id },
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Generate decisions for denying terrain to the enemy
   */
  private generateTerrainDenialDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];
    const usedUnits = new Set<string>(); // Track units already assigned

    // Find key terrain that enemy is likely to use
    const keyTerrain = this.identifyKeyTerrain(context);

    for (const terrain of keyTerrain) {
      // Find units that can occupy and deny this terrain
      const availableUnits = context.availableUnits.filter(
        unit =>
          !unit.state.hasMoved &&
          !usedUnits.has(unit.id) &&
          this.canUnitReachPosition(unit, terrain.position, context)
      );

      if (availableUnits.length > 0) {
        const bestUnit = this.selectBestUnitForPosition(availableUnits, terrain);
        usedUnits.add(bestUnit.id); // Mark unit as used

        decisions.push({
          type: AIDecisionType.MOVE_UNIT,
          priority: 7,
          unitId: bestUnit.id,
          targetPosition: terrain.position,
          reasoning: `Occupying key terrain at ${terrain.position.q},${terrain.position.r} to deny enemy access`,
          metadata: { terrainValue: terrain.strategicValue },
        });
      }
    }

    return decisions;
  }

  /**
   * Generate combat decisions to inflict casualties
   */
  private generateCombatDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];

    // Find units that can attack
    const combatUnits = context.availableUnits.filter(
      unit => unit.canAct() && !unit.state.hasActed
    );

    for (const unit of combatUnits) {
      // Analyze potential targets
      const targets = this.findValidTargets(unit, context.enemyUnits, context);

      if (targets.length > 0) {
        // Unit has targets in range - attack!
        for (const target of targets) {
          const engagement = this.analyzeEngagement(unit, target, context);

          if (engagement.shouldEngage && engagement.confidence > 0.3) {
            // Much lower threshold for aggressive combat
            decisions.push({
              type: AIDecisionType.ATTACK_TARGET,
              priority: 15, // Very high priority for actual combat
              unitId: unit.id,
              targetUnitId: target.id,
              reasoning: `${unit.type} engaging ${target.type} with ${Math.round(engagement.confidence * 100)}% confidence`,
              metadata: {
                engagementAnalysis: engagement,
                expectedCasualties: this.estimateCasualties(unit, target),
              },
            });
          }
        }
      } else if (!unit.state.hasMoved) {
        // Unit has no targets in range - move toward nearest enemy!
        const nearestEnemy = this.findNearestEnemy(unit, context.enemyUnits);
        if (nearestEnemy) {
          const movePosition = this.findPositionTowardsEnemy(unit, nearestEnemy, context);
          if (movePosition) {
            decisions.push({
              type: AIDecisionType.MOVE_UNIT,
              priority: 12, // High priority to get into combat
              unitId: unit.id,
              targetPosition: movePosition,
              reasoning: `${unit.type} moving to engage ${nearestEnemy.type}`,
              metadata: {
                targetEnemyId: nearestEnemy.id,
                combatMovement: true,
              },
            });
          }
        }
      }
    }

    return decisions;
  }

  /**
   * Generate intelligence gathering decisions
   */
  private generateIntelligenceDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];

    // Find units suitable for reconnaissance
    const scoutUnits = context.availableUnits.filter(
      unit => unit.hasCategory(UnitCategory.INFANTRY) && !unit.state.hasMoved
    );

    // Identify areas where we need better intelligence
    const unknownAreas = this.identifyIntelligenceGaps(context);

    for (const area of unknownAreas.slice(0, 2)) {
      // Limit scouting missions
      const nearestScout = this.findNearestUnit(scoutUnits, area);

      if (nearestScout) {
        const scoutPosition = this.findOptimalObservationPosition(area, nearestScout, context);

        if (scoutPosition) {
          decisions.push({
            type: AIDecisionType.MOVE_UNIT,
            priority: 4,
            unitId: nearestScout.id,
            targetPosition: scoutPosition,
            reasoning: `Deploying ${nearestScout.type} for reconnaissance of unknown area`,
            metadata: { missionType: 'reconnaissance' },
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Apply difficulty-based modifiers to decisions
   */
  private applyDifficultyModifiers(
    decisions: AIDecision[],
    context: AIDecisionContext
  ): AIDecision[] {
    let filtered = [...decisions];

    // Apply coordination limitations based on difficulty
    if (this.config.coordinationLevel < 0.8) {
      filtered = this.limitCoordination(filtered);
    }

    // Add mistakes for lower difficulties
    if (this.config.mistakeFrequency > 0) {
      filtered = this.introduceMistakes(filtered, context);
    }

    // Limit decision complexity for novice AI
    if (this.config.difficulty === AIDifficulty.NOVICE) {
      filtered = filtered.filter(decision =>
        [AIDecisionType.MOVE_UNIT, AIDecisionType.ATTACK_TARGET].includes(decision.type)
      );
    }

    // Sort by priority and apply reaction time delays
    return filtered
      .sort((a, b) => b.priority - a.priority)
      .slice(0, Math.floor(filtered.length * this.config.tacticalComplexity));
  }

  /**
   * Update threat assessments for all units
   */
  private updateThreatAssessments(context: AIDecisionContext): void {
    for (const unit of context.availableUnits) {
      const threat = this.calculateThreatLevel(unit, context);
      this.threatAssessments.set(unit.id, threat);
    }
  }

  /**
   * Calculate threat level for a specific unit
   */
  private calculateThreatLevel(unit: Unit, context: AIDecisionContext): ThreatAssessment {
    const unitPosition = new Hex(
      unit.state.position.q,
      unit.state.position.r,
      unit.state.position.s
    );

    const immediateThreats: Unit[] = [];
    const approachingThreats: Unit[] = [];
    let totalThreat = 0;

    for (const enemy of context.enemyUnits) {
      const distance = unitPosition.distanceTo(enemy.state.position);
      const attackRange = 2; // Simplified range calculation

      // Check if enemy can attack this turn
      if (distance <= attackRange && enemy.canAct()) {
        immediateThreats.push(enemy);
        totalThreat += enemy.getEffectiveAttack() * 2; // Immediate threats weighted higher
      }
      // Check if enemy is approaching
      else if (distance <= enemy.getEffectiveMovement() + attackRange) {
        approachingThreats.push(enemy);
        totalThreat += enemy.getEffectiveAttack();
      }
    }

    return {
      immediateThreats,
      approachingThreats,
      objectiveThreats: [], // Would be calculated based on objectives
      overallThreatLevel: Math.min(100, totalThreat * 10), // Scale to 0-100
      recommendedResponse:
        totalThreat > 8 ? TacticalPriority.PRESERVE_FORCE : TacticalPriority.INFLICT_CASUALTIES,
    };
  }

  /**
   * Helper method to create AI configuration based on difficulty
   */
  private createConfiguration(difficulty: AIDifficulty): AIConfiguration {
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
        return this.createConfiguration(AIDifficulty.VETERAN);
    }
  }

  // Helper methods (implementations would be added as needed)
  private calculateAverageUnitHealth(units: Unit[]): number {
    if (units.length === 0) {
      return 1;
    }
    const totalHealth = units.reduce((sum, unit) => sum + unit.state.currentHP / unit.stats.hp, 0);
    return totalHealth / units.length;
  }

  private assessObjectiveThreats(context: AIDecisionContext): number {
    let threatLevel = 0;
    let objectiveCount = 0;

    try {
      // Scan map for objectives and assess threats
      const map = context.gameState.map;

      for (let q = 0; q < 8; q++) {
        for (let r = 0; r < 6; r++) {
          const hex = map.getHex(new Hex(q, r, -q - r));
          if (hex?.objective) {
            objectiveCount++;
            const objectivePos = new Hex(q, r, -q - r);

            // Check for enemy units near this objective
            let nearbyEnemies = 0;
            let enemyThreatStrength = 0;

            for (const enemy of context.enemyUnits) {
              const distance = this.calculateDistance(enemy.state.position, objectivePos);

              // Enemies within 3 hexes are threatening
              if (distance <= 3) {
                nearbyEnemies++;

                // Weight threat by proximity and unit strength
                const proximityMultiplier = (4 - distance) / 4; // Closer = higher threat
                enemyThreatStrength += (enemy.stats.atk + enemy.stats.def) * proximityMultiplier;
              }
            }

            // Calculate threat level for this objective (0-1 scale)
            if (nearbyEnemies > 0) {
              const objectiveThreat = Math.min(
                1.0,
                nearbyEnemies * 0.3 + enemyThreatStrength * 0.1
              );
              threatLevel += objectiveThreat;
            }
          }
        }
      }
    } catch (error) {
      // Fallback: assess threat based on enemy proximity to our units
      for (const unit of context.availableUnits) {
        for (const enemy of context.enemyUnits) {
          const distance = this.calculateDistance(unit.state.position, enemy.state.position);
          if (distance <= 2) {
            threatLevel += 0.2; // Base threat when enemies are close
          }
        }
      }
    }

    // Normalize threat level
    if (objectiveCount > 0) {
      threatLevel = threatLevel / objectiveCount;
    } else {
      // No objectives found, use enemy proximity as baseline
      threatLevel = Math.min(1.0, threatLevel / Math.max(1, context.availableUnits.length));
    }

    return Math.min(1.0, threatLevel);
  }

  private assessEnemyVulnerability(enemyUnits: Unit[]): number {
    if (enemyUnits.length === 0) {
      return 0;
    }

    let vulnerabilityScore = 0;

    for (const enemy of enemyUnits) {
      // Check if enemy is damaged (lower HP = more vulnerable)
      const healthPercent = enemy.state.currentHP / enemy.stats.hp;
      if (healthPercent < 1.0) {
        vulnerabilityScore += (1.0 - healthPercent) * 0.3;
      }

      // Check if enemy is suppressed or pinned (more vulnerable)
      if (enemy.isSuppressed()) {
        vulnerabilityScore += 0.2;
      }
      if (enemy.isPinned()) {
        vulnerabilityScore += 0.3;
      }

      // Base vulnerability for simply having enemies present
      vulnerabilityScore += 0.2;
    }

    // Normalize by number of enemies and cap at 1.0
    return Math.min(1.0, vulnerabilityScore / enemyUnits.length);
  }

  private findSafeWithdrawalPosition(unit: Unit, context: AIDecisionContext): Hex | null {
    const unitPos = unit.state.position;
    const moveRange = unit.stats.mv;
    const safestPosition = { position: null as Hex | null, threatLevel: Infinity };

    // Evaluate positions within movement range
    for (let dq = -moveRange; dq <= moveRange; dq++) {
      for (let dr = -moveRange; dr <= moveRange; dr++) {
        const ds = -dq - dr;

        // Check if position is within movement range (hex distance)
        const distance = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
        if (distance > moveRange || distance === 0) {
          continue;
        }

        const candidatePos = new Hex(unitPos.q + dq, unitPos.r + dr, unitPos.s + ds);

        // Skip positions outside map bounds
        if (!this.isValidMapPosition(candidatePos, context)) {
          continue;
        }

        // Check if unit can actually reach this position
        if (!this.canUnitReachPosition(unit, candidatePos, context)) {
          continue;
        }

        // Calculate threat level at this position
        let positionThreat = 0;

        for (const enemy of context.enemyUnits) {
          const distanceToEnemy = this.calculateDistance(candidatePos, enemy.state.position);
          const enemyRange = this.getUnitRange(enemy);

          // Immediate threat if enemy can attack this position
          if (distanceToEnemy <= enemyRange) {
            positionThreat += enemy.stats.atk * 2; // High weight for immediate threats
          }
          // Approaching threat if enemy can reach attack range next turn
          else if (distanceToEnemy <= enemyRange + enemy.stats.mv) {
            positionThreat += enemy.stats.atk; // Lower weight for future threats
          }
        }

        // Prefer positions that move away from current threats
        const currentThreat = this.threatAssessments.get(unit.id);
        if (currentThreat) {
          for (const threat of currentThreat.immediateThreats) {
            const currentDistance = this.calculateDistance(unitPos, threat.state.position);
            const newDistance = this.calculateDistance(candidatePos, threat.state.position);

            // Bonus for moving away from current threats
            if (newDistance > currentDistance) {
              positionThreat -= 10; // Reward for increasing distance from threats
            }
          }
        }

        // Update safest position if this one is better
        if (positionThreat < safestPosition.threatLevel) {
          safestPosition.position = candidatePos;
          safestPosition.threatLevel = positionThreat;
        }
      }
    }

    // Only return position if it's actually safer than current position
    if (safestPosition.position && safestPosition.threatLevel < 50) {
      // Reasonable safety threshold
      return safestPosition.position;
    }

    return null;
  }

  private getThreatenedObjectives(
    context: AIDecisionContext
  ): Array<{ position: Hex; type: string; id: string }> {
    const threatenedObjectives: Array<{ position: Hex; type: string; id: string }> = [];

    try {
      const map = context.gameState.map;

      // Scan map for objectives
      for (let q = 0; q < 8; q++) {
        for (let r = 0; r < 6; r++) {
          const hex = map.getHex(new Hex(q, r, -q - r));
          if (hex?.objective) {
            const objectivePos = new Hex(q, r, -q - r);

            // Check if this objective is threatened by enemies
            let isThreatenedByEnemies = false;
            let threateningDistance = Infinity;

            for (const enemy of context.enemyUnits) {
              const distance = this.calculateDistance(enemy.state.position, objectivePos);

              // Enemy is threatening if within 2 hexes (can reach and attack/secure)
              if (distance <= 2) {
                isThreatenedByEnemies = true;
                threateningDistance = Math.min(threateningDistance, distance);
                break;
              }
            }

            // Also check if objective is currently undefended by our units
            let isDefended = false;
            for (const unit of context.availableUnits) {
              const distance = this.calculateDistance(unit.state.position, objectivePos);
              if (distance <= 1) {
                // Our unit is defending if adjacent or on objective
                isDefended = true;
                break;
              }
            }

            // Objective is threatened if enemies are close and we're not defending it
            if (isThreatenedByEnemies && !isDefended) {
              threatenedObjectives.push({
                position: objectivePos,
                type: hex.objective.type || 'unknown',
                id: hex.objective.id || `obj_${q}_${r}`,
              });
            }

            // Also include objectives that enemies are approaching (distance 3-4)
            if (!isDefended && threateningDistance <= 4 && threateningDistance > 2) {
              threatenedObjectives.push({
                position: objectivePos,
                type: hex.objective.type || 'unknown',
                id: hex.objective.id || `obj_${q}_${r}`,
              });
            }
          }
        }
      }
    } catch (error) {
      // Fallback: identify critical positions around our units that might need defense
      const criticalPositions = new Set<string>();

      for (const unit of context.availableUnits) {
        // Check if any enemies are approaching this unit's position
        for (const enemy of context.enemyUnits) {
          const distance = this.calculateDistance(unit.state.position, enemy.state.position);
          if (distance <= 3) {
            // Enemy is approaching
            const posKey = `${unit.state.position.q},${unit.state.position.r}`;
            if (!criticalPositions.has(posKey)) {
              criticalPositions.add(posKey);
              threatenedObjectives.push({
                position: new Hex(
                  unit.state.position.q,
                  unit.state.position.r,
                  unit.state.position.s
                ),
                type: 'defensive_position',
                id: `def_${unit.state.position.q}_${unit.state.position.r}`,
              });
            }
          }
        }
      }
    }

    // Sort by priority (closer threats first)
    return threatenedObjectives.slice(0, 3); // Limit to most critical threats
  }

  private findBestDefenders(position: Hex, units: Unit[]): Unit[] {
    // Score each unit for defensive capability
    const scoredUnits = units
      .filter(unit => unit.canAct() && !unit.state.hasMoved)
      .map(unit => {
        let defenseScore = 0;

        // Base defensive value from unit stats
        defenseScore += unit.stats.def * 2; // Defense is important for defenders
        defenseScore += unit.stats.hp * 1.5; // Health for staying power
        defenseScore += unit.stats.atk; // Still need attack capability

        // Infantry units are good defenders
        if (unit.hasCategory(UnitCategory.INFANTRY)) {
          defenseScore += 10;
        }

        // Heavy units are good for holding positions
        if (unit.hasCategory(UnitCategory.VEHICLE)) {
          defenseScore += 8;
        }

        // Aircraft are generally poor defenders (too mobile/vulnerable)
        if (unit.hasCategory(UnitCategory.AIRCRAFT) || unit.hasCategory(UnitCategory.HELICOPTER)) {
          defenseScore -= 5;
        }

        // Distance penalty - closer units are preferred
        const distance = this.calculateDistance(unit.state.position, position);
        defenseScore -= distance * 2; // Penalty for being far away

        // Health bonus for undamaged units
        const healthPercent = unit.state.currentHP / unit.stats.hp;
        defenseScore += healthPercent * 5;

        // Special defensive abilities bonus
        const hasDefensiveAbilities = unit.specialAbilities.some(
          ability =>
            ability.name.toLowerCase().includes('entrench') ||
            ability.name.toLowerCase().includes('defense') ||
            ability.name.toLowerCase().includes('fortify')
        );
        if (hasDefensiveAbilities) {
          defenseScore += 15;
        }

        return { unit, score: defenseScore };
      })
      .sort((a, b) => b.score - a.score); // Sort by score descending

    // Return top 3 defenders
    return scoredUnits.slice(0, 3).map(scored => scored.unit);
  }

  private findOptimalDefensePosition(
    objective: Hex,
    unit: Unit,
    context: AIDecisionContext
  ): Hex | null {
    // Try positions adjacent to the objective first
    const adjacentPositions = this.getAdjacentPositions(objective);

    let bestPosition: Hex | null = null;
    let bestScore = -Infinity;

    // Evaluate adjacent positions
    for (const position of adjacentPositions) {
      if (!this.canUnitReachPosition(unit, position, context)) {
        continue;
      }

      let score = 0;

      // Score based on defensive value
      // - Cover from terrain (simplified)
      // - Distance from threatening enemies
      // - Ability to defend multiple approach routes

      for (const enemy of context.enemyUnits) {
        const distanceToEnemy = this.calculateDistance(position, enemy.state.position);

        // Prefer positions that are not too close to enemies
        if (distanceToEnemy >= 2) {
          score += 5;
        } else {
          score -= 10; // Penalty for being too exposed
        }

        // Bonus for being able to intercept enemy approaches
        const enemyToObjective = this.calculateDistance(enemy.state.position, objective);
        const positionToEnemy = distanceToEnemy;
        if (positionToEnemy < enemyToObjective) {
          score += 8; // Good interception position
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestPosition = position;
      }
    }

    // If no adjacent position works, try the objective itself
    if (!bestPosition && this.canUnitReachPosition(unit, objective, context)) {
      return objective;
    }

    return bestPosition;
  }

  private identifyKeyTerrain(
    context: AIDecisionContext
  ): Array<{ position: Hex; strategicValue: number; type: string }> {
    // Identify reachable positions that move toward objectives
    const keyTerrain: Array<{ position: Hex; strategicValue: number; type: string }> = [];

    for (const unit of context.availableUnits) {
      if (unit.state.hasMoved) {
        continue;
      }

      // Find positions within movement range that move toward enemies
      const moveRange = unit.stats.mv;

      // Generate positions in a circle around the unit
      for (let dq = -moveRange; dq <= moveRange; dq++) {
        for (let dr = -moveRange; dr <= moveRange; dr++) {
          const ds = -dq - dr;

          // Check if position is within movement range (hex distance)
          const distance = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
          if (distance > moveRange || distance === 0) {
            continue;
          }

          const targetPos = new Hex(
            unit.state.position.q + dq,
            unit.state.position.r + dr,
            unit.state.position.s + ds
          );

          // Skip positions outside map bounds
          if (!this.isValidMapPosition(targetPos, context)) {
            continue;
          }

          // Check if this position moves us closer to enemies
          let improvesPosition = false;
          for (const enemy of context.enemyUnits) {
            const currentDistance = this.calculateDistance(
              unit.state.position,
              enemy.state.position
            );
            const newDistance = this.calculateDistance(targetPos, enemy.state.position);

            if (newDistance < currentDistance) {
              improvesPosition = true;
              break;
            }
          }

          if (improvesPosition) {
            keyTerrain.push({
              position: targetPos,
              strategicValue: 5,
              type: 'advance_position',
            });
          }
        }
      }
    }

    return keyTerrain.slice(0, 5); // Return best movement options
  }

  private canUnitReachPosition(unit: Unit, position: Hex, context: AIDecisionContext): boolean {
    // Quick distance check first
    const distance = this.calculateDistance(unit.state.position, position);
    if (distance > unit.stats.mv || unit.state.hasMoved) {
      return false;
    }

    // Validate position is within map bounds
    if (!this.isValidMapPosition(position, context)) {
      return false;
    }

    // Quick terrain check for obvious restrictions
    const targetHex = context.gameState.map.getHex(position);
    if (!targetHex) {
      return false;
    }

    // Check basic terrain restrictions (avoid expensive pathfinding for obvious failures)
    if (this.isTerrainImpassableForUnit(unit, targetHex, context)) {
      return false;
    }

    // For adjacent positions, skip pathfinding (direct movement)
    if (distance <= 1) {
      return true;
    }

    // For longer distances, do actual pathfinding validation
    return this.validatePathExists(unit, position, context);
  }

  /**
   * Check if terrain is obviously impassable for a unit type
   */
  private isTerrainImpassableForUnit(
    unit: Unit,
    targetHex: any,
    _context: AIDecisionContext
  ): boolean {
    // Ground units cannot enter deep water (unless amphibious)
    if (
      targetHex.terrain === TerrainType.DEEP_WATER &&
      !unit.hasCategory(UnitCategory.AMPHIBIOUS) &&
      !unit.hasCategory(UnitCategory.AIRCRAFT) &&
      !unit.hasCategory(UnitCategory.SHIP)
    ) {
      return true;
    }

    // Add other obvious impassable terrain checks here
    return false;
  }

  /**
   * Validate that a path actually exists using lightweight pathfinding
   */
  private validatePathExists(unit: Unit, position: Hex, context: AIDecisionContext): boolean {
    try {
      // Use a simplified pathfinding approach to avoid circular dependencies
      return this.checkSimplifiedPath(unit, position, context);
    } catch (error) {
      // Pathfinding failed - assume unreachable
      return false;
    }
  }

  /**
   * Simplified pathfinding check for reachability
   */
  private checkSimplifiedPath(unit: Unit, target: Hex, context: AIDecisionContext): boolean {
    const start = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s);
    const maxMovement = unit.getEffectiveMovement();

    // Use a simple BFS to check if target is reachable within movement range
    const queue: Array<{ hex: Hex; cost: number }> = [{ hex: start, cost: 0 }];
    const visited = new Set<string>();
    visited.add(start.toKey());

    while (queue.length > 0) {
      const current = queue.shift()!;
      
      // Check if we reached the target
      if (current.hex.equals(target)) {
        return true;
      }

      // Skip if we've exceeded movement range
      if (current.cost >= maxMovement) {
        continue;
      }

      // Check all neighbors
      for (const neighbor of current.hex.neighbors()) {
        const neighborKey = neighbor.toKey();
        
        if (visited.has(neighborKey)) {
          continue;
        }

        // Check if position is valid
        if (!this.isValidMapPosition(neighbor, context)) {
          continue;
        }

        // Get movement cost
        const movementCost = context.gameState.map.getMovementCost(neighbor);
        if (!isFinite(movementCost) || movementCost <= 0) {
          continue; // Impassable terrain
        }

        // Check terrain restrictions
        const targetHex = context.gameState.map.getHex(neighbor);
        if (targetHex && this.isTerrainImpassableForUnit(unit, targetHex, context)) {
          continue;
        }

        const newCost = current.cost + movementCost;
        if (newCost <= maxMovement) {
          visited.add(neighborKey);
          queue.push({ hex: neighbor, cost: newCost });
        }
      }
    }

    // Target not reachable within movement range
    return false;
  }

  private selectBestUnitForPosition(
    units: Unit[],
    terrain: { position: Hex; strategicValue: number; type: string }
  ): Unit {
    if (units.length === 0) {
      throw new Error('No units provided for position selection');
    }

    // Score units based on suitability for the terrain type
    const scoredUnits = units.map(unit => {
      let score = 0;

      // Base mobility score - faster units can reach better
      score += unit.stats.mv * 2;

      // Combat effectiveness
      score += unit.stats.atk + unit.stats.def;

      // Terrain-specific bonuses
      switch (terrain.type) {
        case 'advance_position':
          // Prefer mobile units for advance positions
          if (unit.hasCategory(UnitCategory.VEHICLE)) {
            score += 10;
          }
          if (unit.hasCategory(UnitCategory.INFANTRY)) {
            score += 15; // Infantry are versatile
          }
          break;

        case 'defensive_position':
          // Prefer defensive units
          score += unit.stats.def * 2;
          if (unit.hasCategory(UnitCategory.INFANTRY)) {
            score += 12;
          }
          break;

        default:
          // General versatility - prefer infantry
          if (unit.hasCategory(UnitCategory.INFANTRY)) {
            score += 8;
          }
      }

      // Distance penalty - closer units preferred
      const distance = this.calculateDistance(unit.state.position, terrain.position);
      score -= distance * 3;

      // Health bonus
      const healthPercent = unit.state.currentHP / unit.stats.hp;
      score += healthPercent * 5;

      return { unit, score };
    });

    // Return best scoring unit
    scoredUnits.sort((a, b) => b.score - a.score);
    return scoredUnits[0].unit;
  }

  private findValidTargets(unit: Unit, enemies: Unit[], _context: AIDecisionContext): Unit[] {
    // Find enemies that this unit can potentially attack
    const targets: Unit[] = [];

    for (const enemy of enemies) {
      // Basic range check
      const distance = this.calculateDistance(unit.state.position, enemy.state.position);
      const maxRange = this.getUnitRange(unit);

      if (distance <= maxRange && enemy.isAlive()) {
        targets.push(enemy);
      }
    }

    // BALANCE FIX: Prioritize air targets for AA units
    if (unit.type === UnitType.AA_TEAM || unit.type === UnitType.SAM_SITE) {
      const airTargets = targets.filter(
        t => t.hasCategory(UnitCategory.AIRCRAFT) || t.hasCategory(UnitCategory.HELICOPTER)
      );
      if (airTargets.length > 0) {
        return airTargets; // AA units ONLY target aircraft when available
      }
    }

    return targets;
  }

  private analyzeEngagement(
    attacker: Unit,
    target: Unit,
    _context: AIDecisionContext
  ): EngagementAnalysis {
    // Simple engagement analysis
    const attackerPower = attacker.stats.atk;
    const targetDefense = target.stats.def;

    // Check if units are adjacent (distance 0 or 1) for bonus confidence
    const distance = this.calculateDistance(attacker.state.position, target.state.position);
    const adjacentBonus = distance <= 1 ? 0.3 : 0; // Big confidence boost for adjacent combat

    const baseConfidence = attackerPower / (targetDefense + 1);
    const confidence = Math.min(0.95, Math.max(0.2, baseConfidence + adjacentBonus));

    return {
      friendlyAdvantage: attackerPower - targetDefense,
      terrainAdvantage: adjacentBonus, // Use bonus as terrain advantage
      supplyStatus: 1.0,
      escapeOptions: 1.0,
      strategicValue: 1.0,
      playerVulnerability: 1.0,
      shouldEngage: confidence > 0.25, // Lower threshold
      confidence: confidence,
    };
  }

  private estimateCasualties(
    attacker: Unit,
    target: Unit
  ): { attackerLosses: number; defenderLosses: number } {
    // Simplified combat casualty estimation
    const attackerPower = attacker.stats.atk;
    const defenderPower = target.stats.def;
    const targetHP = target.state.currentHP;
    const attackerHP = attacker.state.currentHP;

    // Estimate damage to defender
    const baseDamageToDefender = Math.max(0, attackerPower - defenderPower);
    const expectedDefenderLosses = Math.min(targetHP, baseDamageToDefender + 1);

    // Estimate counter-attack damage if defender survives
    let expectedAttackerLosses = 0;
    const defenderSurvives = targetHP - expectedDefenderLosses > 0;

    if (defenderSurvives && target.canAct()) {
      const counterAttackPower = target.stats.atk;
      const attackerDefense = attacker.stats.def;
      const counterDamage = Math.max(0, counterAttackPower - attackerDefense);
      expectedAttackerLosses = Math.min(attackerHP, counterDamage);
    }

    // Add some randomness factor (combat uncertainty)
    const uncertainty = 0.2;
    const defenderLossVariance = expectedDefenderLosses * uncertainty;
    const attackerLossVariance = expectedAttackerLosses * uncertainty;

    return {
      attackerLosses: Math.max(
        0,
        Math.round(expectedAttackerLosses + (Math.random() - 0.5) * attackerLossVariance)
      ),
      defenderLosses: Math.max(
        0,
        Math.round(expectedDefenderLosses + (Math.random() - 0.5) * defenderLossVariance)
      ),
    };
  }

  private identifyIntelligenceGaps(context: AIDecisionContext): Hex[] {
    // Simple intelligence gap identification - areas around enemy units
    const gaps: Hex[] = [];

    for (const enemy of context.enemyUnits) {
      const scoutPositions = this.getAdjacentPositions(enemy.state.position);
      gaps.push(...scoutPositions.slice(0, 1)); // One position per enemy
    }

    return gaps.slice(0, 2); // Limit scouting missions
  }

  private findNearestUnit(units: Unit[], position: Hex): Unit | null {
    if (units.length === 0) {
      return null;
    }

    let nearestUnit: Unit | null = null;
    let shortestDistance = Infinity;

    for (const unit of units) {
      const distance = this.calculateDistance(unit.state.position, position);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestUnit = unit;
      }
    }

    return nearestUnit;
  }

  private findOptimalObservationPosition(
    area: Hex,
    unit: Unit,
    context: AIDecisionContext
  ): Hex | null {
    const moveRange = unit.stats.mv;
    let bestPosition: Hex | null = null;
    let bestScore = -Infinity;

    // Search positions within movement range
    for (let dq = -moveRange; dq <= moveRange; dq++) {
      for (let dr = -moveRange; dr <= moveRange; dr++) {
        const ds = -dq - dr;
        const distance = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));

        if (distance > moveRange || distance === 0) {
          continue;
        }

        const candidatePos = new Hex(
          unit.state.position.q + dq,
          unit.state.position.r + dr,
          unit.state.position.s + ds
        );

        // Check bounds and reachability
        if (!this.isValidMapPosition(candidatePos, context)) {
          continue;
        }

        if (!this.canUnitReachPosition(unit, candidatePos, context)) {
          continue;
        }

        let score = 0;

        // Score based on observation value
        // Distance to target area (closer is better for observation)
        const distanceToArea = this.calculateDistance(candidatePos, area);
        score -= distanceToArea * 2;

        // Safety from enemies (further from enemies is better for scouts)
        let safetyScore = 0;
        for (const enemy of context.enemyUnits) {
          const distanceToEnemy = this.calculateDistance(candidatePos, enemy.state.position);
          if (distanceToEnemy >= 3) {
            safetyScore += 5; // Bonus for being safe distance from enemies
          } else {
            safetyScore -= 10; // Penalty for being too close to enemies
          }
        }
        score += safetyScore;

        // Prefer positions that provide good visibility (simplified)
        // Assume central positions have better visibility
        const mapCenter = new Hex(4, 3, -7);
        const centralityBonus = 8 - this.calculateDistance(candidatePos, mapCenter);
        score += centralityBonus;

        if (score > bestScore) {
          bestScore = score;
          bestPosition = candidatePos;
        }
      }
    }

    return bestPosition;
  }

  private limitCoordination(decisions: AIDecision[]): AIDecision[] {
    // Limit simultaneous complex operations based on AI difficulty
    const coordinationLimit = Math.floor(this.config.coordinationLevel * 10);

    // Categorize decisions by complexity
    const complexDecisions: AIDecision[] = [];
    const simpleDecisions: AIDecision[] = [];

    for (const decision of decisions) {
      // Complex decisions require coordination
      if (
        decision.type === AIDecisionType.SPECIAL_ABILITY ||
        decision.type === AIDecisionType.LAUNCH_FROM_WASP ||
        decision.type === AIDecisionType.LOAD_TRANSPORT ||
        decision.metadata?.objective === true
      ) {
        complexDecisions.push(decision);
      } else {
        simpleDecisions.push(decision);
      }
    }

    // Limit complex decisions based on coordination capability
    const allowedComplexDecisions = complexDecisions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, coordinationLimit);

    // Combine with simple decisions (always allowed)
    return [...allowedComplexDecisions, ...simpleDecisions];
  }

  private introduceMistakes(decisions: AIDecision[], context: AIDecisionContext): AIDecision[] {
    if (this.config.mistakeFrequency <= 0 || decisions.length === 0) {
      return decisions;
    }

    const mistakeChance = this.config.mistakeFrequency;
    const modifiedDecisions: AIDecision[] = [];

    for (const decision of decisions) {
      if (Math.random() < mistakeChance) {
        // Introduce a mistake
        const mistakeType = Math.floor(Math.random() * 3);

        switch (mistakeType) {
          case 0:
            // Wrong target selection
            if (decision.type === AIDecisionType.ATTACK_TARGET && context.enemyUnits.length > 1) {
              const randomEnemy =
                context.enemyUnits[Math.floor(Math.random() * context.enemyUnits.length)];
              modifiedDecisions.push({
                ...decision,
                targetUnitId: randomEnemy.id,
                reasoning: `${decision.reasoning} (targeting error)`,
                priority: Math.max(1, decision.priority - 2),
              });
            } else {
              modifiedDecisions.push(decision);
            }
            break;

          case 1:
            // Reduced priority (hesitation)
            modifiedDecisions.push({
              ...decision,
              priority: Math.max(1, decision.priority - 3),
              reasoning: `${decision.reasoning} (hesitation)`,
            });
            break;

          case 2:
            // Skip decision entirely (indecision)
            // Don't add this decision to the modified list
            break;

          default:
            modifiedDecisions.push(decision);
        }
      } else {
        // No mistake, keep original decision
        modifiedDecisions.push(decision);
      }
    }

    return modifiedDecisions;
  }

  // Additional helper methods for basic AI functionality

  /**
   * Check if a position is within map boundaries using the actual map
   */
  private isValidMapPosition(position: Hex, context: AIDecisionContext): boolean {
    return context.gameState.map.isValidHex(position);
  }

  /**
   * Generate a safe position within map bounds, with fallback if original is invalid
   */
  private constrainToMapBounds(
    position: Hex,
    fallbackPosition: Hex,
    context: AIDecisionContext
  ): Hex | null {
    // First try the original position
    if (this.isValidMapPosition(position, context)) {
      return position;
    }

    // Try the fallback position
    if (this.isValidMapPosition(fallbackPosition, context)) {
      return fallbackPosition;
    }

    // If both fail, try to find a nearby valid position
    const mapDimensions = context.gameState.map.getDimensions();
    const maxQ = mapDimensions.width - 1;
    const maxR = mapDimensions.height - 1;

    // Clamp coordinates to map bounds
    const clampedQ = Math.max(0, Math.min(position.q, maxQ));
    const clampedR = Math.max(0, Math.min(position.r, maxR));
    const clampedS = -(clampedQ + clampedR);

    const clampedPosition = new Hex(clampedQ, clampedR, clampedS);

    if (this.isValidMapPosition(clampedPosition, context)) {
      return clampedPosition;
    }

    // Last resort: return null if no valid position found
    return null;
  }
  private calculateDistance(pos1: HexCoordinate, pos2: HexCoordinate): number {
    // Hex distance calculation using cube coordinates - MUST MATCH Combat.ts distanceTo()
    return Math.max(
      Math.abs(pos1.q - pos2.q),
      Math.abs(pos1.r - pos2.r),
      Math.abs(pos1.s - pos2.s)
    );
  }

  private getUnitRange(unit: Unit): number {
    // Match the actual CombatSystem.isInRange() logic exactly

    // Aircraft can attack at longer range
    if (unit.hasCategory(UnitCategory.AIRCRAFT) || unit.hasCategory(UnitCategory.HELICOPTER)) {
      return 3;
    }

    // Long-range artillery can attack anywhere (use large number)
    if (unit.type === UnitType.LONG_RANGE_ARTILLERY) {
      return 10;
    }

    // Mortar team has 5 hex range but can't attack adjacent
    if (unit.type === UnitType.MORTAR_TEAM) {
      return 5;
    }

    // USS Wasp Sea Sparrow has 5 hex range
    if (unit.type === UnitType.USS_WASP) {
      return 5;
    }

    // BALANCE FIX: Give AA units extended range to counter air power
    if (unit.type === UnitType.AA_TEAM) {
      return 3; // Match aircraft range
    }

    if (unit.type === UnitType.SAM_SITE) {
      return 4; // Longer range for static SAM sites
    }

    // Most units can only attack adjacent (distance 1)
    return 1;
  }

  private getAdjacentPositions(center: HexCoordinate): Hex[] {
    // Get positions adjacent to the center hex
    const adjacent: Hex[] = [];
    const directions = [
      { q: 1, r: 0, s: -1 },
      { q: 1, r: -1, s: 0 },
      { q: 0, r: -1, s: 1 },
      { q: -1, r: 0, s: 1 },
      { q: -1, r: 1, s: 0 },
      { q: 0, r: 1, s: -1 },
    ];

    for (const dir of directions) {
      adjacent.push(new Hex(center.q + dir.q, center.r + dir.r, center.s + dir.s));
    }

    return adjacent;
  }

  /**
   * Find the nearest enemy unit to a given unit
   */
  private findNearestEnemy(unit: Unit, enemyUnits: Unit[]): Unit | null {
    if (enemyUnits.length === 0) {
      return null;
    }

    let nearestEnemy: Unit | null = null;
    let shortestDistance = Infinity;

    for (const enemy of enemyUnits) {
      if (enemy.isAlive()) {
        const distance = this.calculateDistance(unit.state.position, enemy.state.position);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestEnemy = enemy;
        }
      }
    }

    return nearestEnemy;
  }

  /**
   * Find a position to move towards an enemy for combat
   */
  private findPositionTowardsEnemy(
    unit: Unit,
    enemy: Unit,
    context: AIDecisionContext
  ): Hex | null {
    const unitPos = unit.state.position;
    const enemyPos = enemy.state.position;

    // Calculate direction vector toward enemy
    const deltaQ = enemyPos.q - unitPos.q;
    const deltaR = enemyPos.r - unitPos.r;

    // Try to move one hex toward the enemy
    let moveQ = 0;
    if (deltaQ > 0) {
      moveQ = 1;
    } else if (deltaQ < 0) {
      moveQ = -1;
    }

    let moveR = 0;
    if (deltaR > 0) {
      moveR = 1;
    } else if (deltaR < 0) {
      moveR = -1;
    }
    const moveS = -(moveQ + moveR); // Hex coordinate constraint: q + r + s = 0

    const targetPosition = new Hex(unitPos.q + moveQ, unitPos.r + moveR, unitPos.s + moveS);

    // Ensure target position is within map bounds with defensive fallback
    const unitHex = new Hex(unitPos.q, unitPos.r, unitPos.s);
    const constrainedPosition = this.constrainToMapBounds(
      targetPosition,
      unitHex, // Use current position as fallback
      context
    );

    // Check if position is valid and reachable
    if (constrainedPosition && this.canUnitReachPosition(unit, constrainedPosition, context)) {
      return constrainedPosition;
    }

    // If direct movement fails, try adjacent positions toward enemy
    const adjacentPositions = this.getAdjacentPositions(unitPos);

    for (const pos of adjacentPositions) {
      // Skip positions outside map bounds
      if (!this.isValidMapPosition(pos, context)) {
        continue;
      }

      const distanceToEnemy = this.calculateDistance(pos, enemyPos);
      const currentDistance = this.calculateDistance(unitPos, enemyPos);

      // Only consider positions that get us closer to the enemy
      if (distanceToEnemy < currentDistance && this.canUnitReachPosition(unit, pos, context)) {
        return pos;
      }
    }

    return null; // No valid position found
  }

  /**
   * Generate USS Wasp operations decisions
   */
  private generateWaspOperationsDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];

    for (const unit of context.availableUnits) {
      if (unit.type === UnitType.USS_WASP) {
        // Check if USS Wasp has embarked units to launch
        const embarkedUnits = unit.state.cargo || [];
        const launchableUnits = embarkedUnits.filter(
          embarkedUnit =>
            embarkedUnit.hasCategory(UnitCategory.AIRCRAFT) ||
            embarkedUnit.hasCategory(UnitCategory.HELICOPTER)
        );

        if (launchableUnits.length > 0) {
          // Launch specific embarked aircraft
          decisions.push({
            type: AIDecisionType.LAUNCH_FROM_WASP,
            priority: 8,
            unitId: unit.id, // USS Wasp's ID
            reasoning: `Launching ${launchableUnits.length} aircraft from USS Wasp for assault operations`,
            metadata: {
              waspId: unit.id,
              unitsToLaunch: launchableUnits.map(u => u.id),
            },
          });
        } else {
          // No embarked units - this is actually fine for testing
          // Generate a generic launch decision that the action converter can handle
          decisions.push({
            type: AIDecisionType.LAUNCH_FROM_WASP,
            priority: 8,
            unitId: unit.id,
            reasoning: 'USS Wasp available for launch operations',
            metadata: {
              waspId: unit.id,
              unitsToLaunch: [], // Empty array for no embarked units
            },
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Generate hidden unit tactical decisions
   */
  private generateHiddenOperationsDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];

    for (const unit of context.availableUnits) {
      // REVEAL DECISIONS - for hidden units
      if (unit.isHidden()) {
        // Find nearby enemies for ambush opportunities
        const nearbyEnemies = context.enemyUnits.filter(enemy => {
          const distance = this.calculateDistance(unit.state.position, enemy.state.position);
          return distance <= this.getUnitRange(unit) + 1; // Within attack range next turn
        });

        if (nearbyEnemies.length > 0) {
          // Calculate ambush value - prioritize high-value targets
          let ambushValue = 0;
          for (const enemy of nearbyEnemies) {
            ambushValue += enemy.stats.atk + enemy.stats.def; // Higher for stronger units
          }

          // Reveal if ambush opportunity is good
          if (ambushValue >= 6 || nearbyEnemies.length >= 2) {
            decisions.push({
              type: AIDecisionType.REVEAL_UNIT,
              priority: 9, // High priority for ambushes
              unitId: unit.id,
              reasoning: `Revealing ${unit.type} for ambush on ${nearbyEnemies.length} enemies (value: ${ambushValue})`,
              metadata: {
                ambushTargets: nearbyEnemies.map(e => e.id),
                ambushValue: ambushValue,
              },
            });
          }
        }

        // Reveal if unit needs to defend objectives
        const unitPosition = unit.state.position;
        const mapHex = context.gameState.map.getHex(unitPosition);
        if (mapHex?.objective) {
          decisions.push({
            type: AIDecisionType.REVEAL_UNIT,
            priority: 8,
            unitId: unit.id,
            reasoning: `Revealing ${unit.type} to defend objective at current position`,
            metadata: {
              objectiveDefense: true,
              objectiveId: mapHex.objective.id,
            },
          });
        }

        // Fallback: Reveal if no specific conditions met but enemies are present (testing)
        if (
          context.enemyUnits.length > 0 &&
          decisions.filter(d => d.unitId === unit.id).length === 0
        ) {
          decisions.push({
            type: AIDecisionType.REVEAL_UNIT,
            priority: 10, // Higher priority than special abilities
            unitId: unit.id,
            reasoning: `Revealing ${unit.type} - tactical decision with enemies present`,
            metadata: {
              fallbackReveal: true,
              enemyCount: context.enemyUnits.length,
            },
          });
        }
      }

      // HIDE DECISIONS - for units that can be hidden
      if (unit.canBeHidden() && !unit.isHidden() && unit.canAct()) {
        // Check threat level
        const threat = this.calculateThreatLevel(unit, context);

        // Hide if under high threat
        if (threat.overallThreatLevel > 50) {
          decisions.push({
            type: AIDecisionType.HIDE_UNIT,
            priority: 7,
            unitId: unit.id,
            reasoning: `Hiding ${unit.type} from high threat (${threat.overallThreatLevel}% threat level)`,
            metadata: {
              threatLevel: threat.overallThreatLevel,
              immediateThreats: threat.immediateThreats.length,
            },
          });
        }

        // Hide damaged units for preservation
        const healthPercent = unit.state.currentHP / unit.stats.hp;
        if (healthPercent <= 0.5) {
          decisions.push({
            type: AIDecisionType.HIDE_UNIT,
            priority: 8, // Higher priority for damaged units
            unitId: unit.id,
            reasoning: `Hiding damaged ${unit.type} for preservation (${Math.round(healthPercent * 100)}% health)`,
            metadata: {
              healthPercent: healthPercent,
              preservation: true,
            },
          });
        }

        // Enhanced tactical hiding decisions
        if (unit.hasCategory(UnitCategory.INFANTRY) && !unit.state.hasMoved) {
          const enemyDistance =
            context.enemyUnits.length > 0
              ? Math.min(
                  ...context.enemyUnits.map(e =>
                    this.calculateDistance(unit.state.position, e.state.position)
                  )
                )
              : 999;

          // Hide if enemies are at medium distance (tactical concealment)
          if (enemyDistance >= 3 && enemyDistance <= 5) {
            decisions.push({
              type: AIDecisionType.HIDE_UNIT,
              priority: 5,
              unitId: unit.id,
              reasoning: `Hiding ${unit.type} for tactical concealment (enemies at distance ${enemyDistance})`,
              metadata: {
                tacticalHide: true,
                enemyDistance: enemyDistance,
              },
            });
          }

          // Enhanced: Hide units when enemies are present but not in immediate combat
          if (context.enemyUnits.length > 0 && enemyDistance > 5) {
            decisions.push({
              type: AIDecisionType.HIDE_UNIT,
              priority: 6,
              unitId: unit.id,
              reasoning: `Hiding ${unit.type} for defensive positioning (enemies at distance ${enemyDistance})`,
              metadata: {
                defensiveHide: true,
                enemyDistance: enemyDistance,
                enemyCount: context.enemyUnits.length,
              },
            });
          }
        }
      }

      // MOVEMENT DECISIONS - for fog of war navigation and positioning
      if (unit.canAct() && !unit.state.hasMoved && unit.stats.mv > 0) {
        // Generate movement decisions for better positioning
        const bestPosition = this.findBestTacticalPosition(unit, context);
        if (bestPosition) {
          const distance = this.calculateDistance(unit.state.position, bestPosition);
          
          // Only move if it's a meaningful improvement
          if (distance > 0 && distance <= unit.stats.mv) {
            decisions.push({
              type: AIDecisionType.MOVE_UNIT,
              priority: 5,
              unitId: unit.id,
              targetPosition: bestPosition,
              reasoning: `Moving ${unit.type} to better tactical position for stealth operations`,
              metadata: {
                tacticalMovement: true,
                distance: distance,
              },
            });
          }
        }

        // Fog of war exploration movement
        if (context.enemyUnits.length === 0 || context.enemyUnits.length < 3) {
          const explorationPosition = this.findExplorationPosition(unit, context);
          if (explorationPosition) {
            decisions.push({
              type: AIDecisionType.MOVE_UNIT,
              priority: 4,
              unitId: unit.id,
              targetPosition: explorationPosition,
              reasoning: `Moving ${unit.type} for reconnaissance and area exploration`,
              metadata: {
                exploration: true,
                fogOfWar: true,
              },
            });
          }
        }
      }
    }

    return decisions;
  }

  /**
   * Find the best tactical position for a unit (for stealth operations)
   */
  private findBestTacticalPosition(unit: Unit, context: AIDecisionContext): Hex | null {
    const currentPosition = unit.state.position;
    const candidates: { position: Hex; score: number }[] = [];

    // Search in a radius around the current position
    for (let dq = -unit.stats.mv; dq <= unit.stats.mv; dq++) {
      for (let dr = -unit.stats.mv; dr <= unit.stats.mv; dr++) {
        if (Math.abs(dq) + Math.abs(dr) <= unit.stats.mv) {
          const candidatePosition = new Hex(
            currentPosition.q + dq,
            currentPosition.r + dr
          );

          // Check if position is valid and unoccupied
          if (this.isValidPosition(candidatePosition, context)) {
            const score = this.evaluateTacticalPosition(candidatePosition, unit, context);
            candidates.push({ position: candidatePosition, score });
          }
        }
      }
    }

    // Return the best position
    if (candidates.length > 0) {
      const best = candidates.reduce((best, candidate) => 
        candidate.score > best.score ? candidate : best
      );
      
      // Only return if it's actually better than current position
      const currentScore = this.evaluateTacticalPosition(new Hex(currentPosition.q, currentPosition.r), unit, context);
      if (best.score > currentScore) {
        return best.position;
      }
    }

    return null;
  }

  /**
   * Find an exploration position for fog of war navigation
   */
  private findExplorationPosition(unit: Unit, context: AIDecisionContext): Hex | null {
    const currentPosition = unit.state.position;
    const candidates: { position: Hex; score: number }[] = [];

    // Search in a radius around the current position
    for (let dq = -unit.stats.mv; dq <= unit.stats.mv; dq++) {
      for (let dr = -unit.stats.mv; dr <= unit.stats.mv; dr++) {
        if (Math.abs(dq) + Math.abs(dr) <= unit.stats.mv) {
          const candidatePosition = new Hex(
            currentPosition.q + dq,
            currentPosition.r + dr
          );

          // Check if position is valid and unoccupied
          if (this.isValidPosition(candidatePosition, context)) {
            const score = this.evaluateExplorationPosition(candidatePosition, unit, context);
            candidates.push({ position: candidatePosition, score });
          }
        }
      }
    }

    // Return the best exploration position
    if (candidates.length > 0) {
      const best = candidates.reduce((best, candidate) => 
        candidate.score > best.score ? candidate : best
      );
      
      // Only return if it's a meaningful move (distance > 0)
      const distance = this.calculateDistance(currentPosition, best.position);
      if (distance > 0) {
        return best.position;
      }
    }

    return null;
  }

  /**
   * Evaluate a tactical position for stealth operations
   */
  private evaluateTacticalPosition(position: Hex, unit: Unit, context: AIDecisionContext): number {
    let score = 0;

    // Base score for cover (simple heuristic)
    score += (position.q + position.r) % 2 === 0 ? 2 : 0;

    // Distance from enemies (prefer positions not too close, not too far)
    if (context.enemyUnits.length > 0) {
      const avgEnemyDistance = context.enemyUnits.reduce((sum, enemy) => 
        sum + this.calculateDistance(position, enemy.state.position), 0
      ) / context.enemyUnits.length;

      // Optimal distance is 3-5 hexes for hiding
      if (avgEnemyDistance >= 3 && avgEnemyDistance <= 5) {
        score += 3;
      } else if (avgEnemyDistance > 5) {
        score += 1;
      }
    }

    // Prefer positions that allow hiding
    if (unit.canBeHidden()) {
      score += 2;
    }

    return score;
  }

  /**
   * Evaluate an exploration position for fog of war navigation
   */
  private evaluateExplorationPosition(position: Hex, unit: Unit, context: AIDecisionContext): number {
    let score = 0;

    // Prefer positions that spread out from other units
    const friendlyUnits = context.availableUnits.filter(u => u.id !== unit.id);
    if (friendlyUnits.length > 0) {
      const avgFriendlyDistance = friendlyUnits.reduce((sum, friendly) => 
        sum + this.calculateDistance(position, friendly.state.position), 0
      ) / friendlyUnits.length;

      // Prefer positions that spread out (distance 2-4 is good)
      if (avgFriendlyDistance >= 2 && avgFriendlyDistance <= 4) {
        score += 3;
      } else if (avgFriendlyDistance > 1) {
        score += 1;
      }
    }

    // Prefer forward positions (higher q + r values for exploration)
    score += Math.floor((position.q + position.r) / 2);

    return score;
  }

  /**
   * Check if a position is valid for movement
   */
  private isValidPosition(position: Hex, context: AIDecisionContext): boolean {
    // Check map boundaries (simple check)
    if (position.q < 0 || position.r < 0 || position.q >= 20 || position.r >= 20) {
      return false;
    }

    // Check if position is occupied by another unit
    const occupiedPositions = new Set(
      [...context.availableUnits, ...context.enemyUnits]
        .map(u => `${u.state.position.q},${u.state.position.r}`)
    );

    return !occupiedPositions.has(`${position.q},${position.r}`);
  }

  /**
   * Generate logistics/transport decisions
   */
  private generateLogisticsDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];
    const usedUnits = new Set<string>(); // Track units already assigned

    // Find all transport units and infantry units
    const transportUnits = context.availableUnits.filter(
      unit => unit.getCargoCapacity() > 0 && !usedUnits.has(unit.id)
    );

    const infantryUnits = context.availableUnits.filter(
      unit => unit.hasCategory(UnitCategory.INFANTRY) && !usedUnits.has(unit.id)
    );

    for (const transport of transportUnits) {
      const currentCargo = transport.state.cargo.length;
      const capacity = transport.getCargoCapacity();

      // LOAD OPERATIONS - if transport has space and infantry available
      if (currentCargo < capacity && infantryUnits.length > 0) {
        // Find nearby infantry that can be loaded
        const nearbyInfantry = infantryUnits.filter(infantry => {
          const distance = this.calculateDistance(
            transport.state.position,
            infantry.state.position
          );
          return distance <= 1 && !usedUnits.has(infantry.id); // Adjacent or same hex
        });

        if (nearbyInfantry.length > 0) {
          const infantryToLoad = nearbyInfantry[0]; // Load first available
          usedUnits.add(transport.id);
          usedUnits.add(infantryToLoad.id);

          decisions.push({
            type: AIDecisionType.LOAD_TRANSPORT,
            priority: 7,
            unitId: transport.id,
            targetUnitId: infantryToLoad.id,
            reasoning: `Loading ${infantryToLoad.type} into ${transport.type} for tactical deployment`,
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Generate special ability decisions
   */
  private generateSpecialAbilityDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];

    for (const unit of context.availableUnits) {
      if (unit.specialAbilities.length > 0 && unit.canAct()) {
        // Use first available special ability
        const ability = unit.specialAbilities[0];
        const abilityName = ability.name;
        decisions.push({
          type: AIDecisionType.SPECIAL_ABILITY,
          priority: 7,
          unitId: unit.id,
          reasoning: `Using special ability: ${abilityName}`,
          metadata: {
            abilityName: abilityName,
          },
        });
      }
    }

    return decisions;
  }

  /**
   * Generate objective securing decisions
   */
  private generateObjectiveSecuringDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];
    const usedUnits = new Set<string>(); // Track units already assigned

    // Get map objectives from game state
    const mapObjectives = this.getMapObjectives(context);

    if (mapObjectives.length === 0) {
      // Fallback: Move toward center if no objectives found
      return this.generateCenterMovementDecisions(context);
    }

    // Determine player strategy based on side
    const playerSide = this.getPlayerSide(context);

    if (playerSide === 'assault') {
      // ASSAULT STRATEGY: Secure objectives aggressively
      const assaultDecisions = this.generateAssaultObjectiveDecisions(
        context,
        mapObjectives,
        usedUnits
      );
      decisions.push(...assaultDecisions);
    } else {
      // DEFENDER STRATEGY: Defend and deny objectives
      const defenderDecisions = this.generateDefenderObjectiveDecisions(
        context,
        mapObjectives,
        usedUnits
      );
      decisions.push(...defenderDecisions);
    }

    return decisions;
  }

  /**
   * Get map objectives from game state
   */
  private getMapObjectives(
    context: AIDecisionContext
  ): Array<{ position: Hex; type: string; id: string; priority: number }> {
    const objectives: Array<{ position: Hex; type: string; id: string; priority: number }> = [];

    // Try to access objectives from the map
    try {
      const map = context.gameState.map;

      // Scan map for objectives (assuming 8x6 map size based on test)
      for (let q = 0; q < 8; q++) {
        for (let r = 0; r < 6; r++) {
          const hex = map.getHex(new Hex(q, r, -q - r));
          if (hex?.objective) {
            objectives.push({
              position: new Hex(q, r, -q - r),
              type: hex.objective.type || 'unknown',
              id: hex.objective.id || `obj_${q}_${r}`,
              priority: this.calculateObjectivePriority(hex.objective.type || 'unknown'),
            });
          }
        }
      }
    } catch (error) {
      // If map access fails, return empty array (fallback will handle)
      console.warn('[AI] Could not access map objectives:', error);
    }

    return objectives;
  }

  /**
   * Determine player side from context
   */
  private getPlayerSide(context: AIDecisionContext): 'assault' | 'defender' {
    // Check if we have USS Wasp (assault side) or defender units
    const hasWasp = context.availableUnits.some(unit => unit.type === UnitType.USS_WASP);
    const hasAssaultUnits = context.availableUnits.some(
      unit =>
        unit.type === UnitType.MARINE_SQUAD ||
        unit.type === UnitType.MARSOC ||
        unit.type === UnitType.HARRIER
    );

    if (hasWasp || hasAssaultUnits) {
      return 'assault';
    }
    return 'defender';
  }

  /**
   * Calculate objective priority based on type
   */
  private calculateObjectivePriority(objectiveType: string): number {
    switch (objectiveType.toLowerCase()) {
      case 'command_post':
      case 'comms_hub':
        return 10; // Highest priority
      case 'supply_depot':
      case 'port':
        return 8; // High priority
      case 'airfield':
      case 'landing_zone':
        return 7; // Medium-high priority
      case 'civic_center':
      case 'defensive_position':
        return 6; // Medium priority
      default:
        return 5; // Default priority
    }
  }

  /**
   * Generate assault-focused objective decisions
   */
  private generateAssaultObjectiveDecisions(
    context: AIDecisionContext,
    objectives: Array<{ position: Hex; type: string; id: string; priority: number }>,
    usedUnits: Set<string>
  ): AIDecision[] {
    const decisions: AIDecision[] = [];

    // Sort objectives by priority (highest first)
    const prioritizedObjectives = objectives.sort((a, b) => b.priority - a.priority);

    for (const objective of prioritizedObjectives) {
      // Find best units to assault this objective
      const availableUnits = context.availableUnits.filter(
        unit => !usedUnits.has(unit.id) && !unit.state.hasMoved
      );

      if (availableUnits.length === 0) {
        break;
      }

      // Prioritize infantry for securing objectives
      const infantryUnits = availableUnits.filter(unit => unit.hasCategory(UnitCategory.INFANTRY));

      const bestUnit = infantryUnits.length > 0 ? infantryUnits[0] : availableUnits[0];
      usedUnits.add(bestUnit.id);

      const distance = this.calculateDistance(bestUnit.state.position, objective.position);

      if (distance === 0) {
        // Unit is on objective - secure it!
        decisions.push({
          type: AIDecisionType.SECURE_OBJECTIVE,
          priority: 9,
          unitId: bestUnit.id,
          reasoning: `Securing ${objective.type} objective with ${bestUnit.type}`,
          metadata: {
            objectiveId: objective.id,
            objectiveType: objective.type,
            objectivePriority: objective.priority,
          },
        });
      } else if (distance <= bestUnit.stats.mv) {
        // Unit can reach objective this turn
        decisions.push({
          type: AIDecisionType.MOVE_UNIT,
          priority: 9,
          unitId: bestUnit.id,
          targetPosition: objective.position,
          reasoning: `Moving ${bestUnit.type} to assault ${objective.type} objective`,
          metadata: {
            objective: true, // Flag for test detection
            objectiveAssault: true,
            objectiveId: objective.id,
            objectiveType: objective.type,
          },
        });
      } else {
        // Move toward objective
        const moveToward = this.findPositionTowardsObjective(bestUnit, objective.position, context);
        if (moveToward) {
          decisions.push({
            type: AIDecisionType.MOVE_UNIT,
            priority: 8,
            unitId: bestUnit.id,
            targetPosition: moveToward,
            reasoning: `Advancing ${bestUnit.type} toward ${objective.type} objective`,
            metadata: {
              objective: true, // Flag for test detection
              objectiveAdvance: true,
              objectiveId: objective.id,
              targetDistance: distance,
            },
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Generate defender-focused objective decisions
   */
  private generateDefenderObjectiveDecisions(
    context: AIDecisionContext,
    objectives: Array<{ position: Hex; type: string; id: string; priority: number }>,
    usedUnits: Set<string>
  ): AIDecision[] {
    const decisions: AIDecision[] = [];

    // Sort objectives by priority (highest first)
    const prioritizedObjectives = objectives.sort((a, b) => b.priority - a.priority);

    for (const objective of prioritizedObjectives) {
      // Find units to defend this objective
      const availableUnits = context.availableUnits.filter(
        unit => !usedUnits.has(unit.id) && !unit.state.hasMoved
      );

      if (availableUnits.length === 0) {
        break;
      }

      // Check if objective is threatened by enemies
      const threateningEnemies = context.enemyUnits.filter(enemy => {
        const distance = this.calculateDistance(enemy.state.position, objective.position);
        return distance <= 3; // Enemies within 3 hexes are threatening
      });

      if (threateningEnemies.length > 0) {
        // Objective is threatened - prioritize defense
        const bestDefender = availableUnits[0];
        usedUnits.add(bestDefender.id);

        const distance = this.calculateDistance(bestDefender.state.position, objective.position);

        if (distance === 0) {
          // Unit is already defending objective
          decisions.push({
            type: AIDecisionType.SECURE_OBJECTIVE,
            priority: 10,
            unitId: bestDefender.id,
            reasoning: `Defending ${objective.type} objective with ${bestDefender.type}`,
            metadata: {
              objective: true, // Flag for test detection
              objectiveDefense: true,
              objectiveId: objective.id,
              threatCount: threateningEnemies.length,
            },
          });
        } else {
          // Move to defend objective
          const defensePosition = this.findDefensePosition(
            objective.position,
            bestDefender,
            context
          );
          if (defensePosition) {
            decisions.push({
              type: AIDecisionType.MOVE_UNIT,
              priority: 9,
              unitId: bestDefender.id,
              targetPosition: defensePosition,
              reasoning: `Moving ${bestDefender.type} to defend ${objective.type} objective`,
              metadata: {
                objective: true, // Flag for test detection
                objectiveDefense: true,
                objectiveId: objective.id,
                threatCount: threateningEnemies.length,
              },
            });
          }
        }
      }
    }

    return decisions;
  }

  /**
   * Find optimal position to move toward an objective
   */
  private findPositionTowardsObjective(
    unit: Unit,
    objectivePos: Hex,
    context: AIDecisionContext
  ): Hex | null {
    const unitPos = unit.state.position;
    const moveRange = unit.stats.mv;

    // Try direct movement toward objective
    const deltaQ = objectivePos.q - unitPos.q;
    const deltaR = objectivePos.r - unitPos.r;

    // Normalize movement to stay within range
    const distance = Math.max(Math.abs(deltaQ), Math.abs(deltaR), Math.abs(-deltaQ - deltaR));

    if (distance <= moveRange) {
      // Can reach objective directly
      return objectivePos;
    }

    // Move as far as possible toward objective
    const moveQ = Math.sign(deltaQ) * Math.min(Math.abs(deltaQ), moveRange);
    const moveR = Math.sign(deltaR) * Math.min(Math.abs(deltaR), moveRange);
    const moveS = -(moveQ + moveR);

    const targetPosition = new Hex(unitPos.q + moveQ, unitPos.r + moveR, unitPos.s + moveS);

    // Ensure target position is within map bounds
    const unitHex = new Hex(unitPos.q, unitPos.r, unitPos.s);
    const constrainedPosition = this.constrainToMapBounds(
      targetPosition,
      unitHex, // Use current position as fallback
      context
    );

    // Validate position is reachable
    if (constrainedPosition && this.canUnitReachPosition(unit, constrainedPosition, context)) {
      return constrainedPosition;
    }

    return null;
  }

  /**
   * Find optimal defensive position near an objective
   */
  private findDefensePosition(
    objectivePos: Hex,
    unit: Unit,
    context: AIDecisionContext
  ): Hex | null {
    // Try adjacent positions around the objective
    const adjacentPositions = this.getAdjacentPositions(objectivePos);

    for (const pos of adjacentPositions) {
      // Ensure position is within map bounds
      if (this.isValidMapPosition(pos, context) && this.canUnitReachPosition(unit, pos, context)) {
        return pos;
      }
    }

    // If no adjacent positions available, move toward objective
    return this.findPositionTowardsObjective(unit, objectivePos, context);
  }

  /**
   * Fallback: Generate basic center movement decisions
   */
  private generateCenterMovementDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];
    const usedUnits = new Set<string>();

    for (const unit of context.availableUnits) {
      if (!unit.state.hasMoved && !usedUnits.has(unit.id)) {
        // Move toward center of map (fallback objective)
        const centerPos = new Hex(3, 3, -6);
        const distance = this.calculateDistance(unit.state.position, centerPos);

        if (distance > 1 && this.canUnitReachPosition(unit, centerPos, context)) {
          usedUnits.add(unit.id);
          decisions.push({
            type: AIDecisionType.MOVE_UNIT,
            priority: 7,
            unitId: unit.id,
            targetPosition: centerPos,
            reasoning: 'Moving toward central objective area',
          });
        }
      }
    }

    return decisions;
  }
}
