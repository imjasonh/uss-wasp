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
  AIDifficulty
} from './types';
import { Unit } from '../game/Unit';
import { Hex, HexCoordinate } from '../hex';
import { UnitCategory } from '../game/types';

/**
 * Core AI decision-making engine
 */
export class AIDecisionMaker {
  private config: AIConfiguration;
  private decisionHistory: AIDecision[] = [];
  private threatAssessments: Map<string, ThreatAssessment> = new Map();

  constructor(difficulty: AIDifficulty = AIDifficulty.VETERAN) {
    this.config = this.createConfiguration(difficulty);
  }

  /**
   * Main decision-making entry point
   */
  makeDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];

    // Update threat assessments
    this.updateThreatAssessments(context);

    // Analyze current tactical situation
    const tacticalPriorities = this.determineTacticalPriorities(context);

    // Generate decisions based on priorities
    for (const priority of tacticalPriorities) {
      const priorityDecisions = this.generateDecisionsForPriority(priority, context);
      decisions.push(...priorityDecisions);
    }

    // Apply difficulty-based filtering and mistakes
    const filteredDecisions = this.applyDifficultyModifiers(decisions, context);

    // Store decisions for learning
    this.decisionHistory.push(...filteredDecisions);

    return filteredDecisions;
  }

  /**
   * Determine current tactical priorities based on game state
   */
  private determineTacticalPriorities(context: AIDecisionContext): TacticalPriority[] {
    const priorities: { priority: TacticalPriority; weight: number }[] = [];

    // Analyze force preservation needs
    const averageHealth = this.calculateAverageUnitHealth(context.availableUnits);
    if (averageHealth < 0.5) {
      priorities.push({ priority: TacticalPriority.PRESERVE_FORCE, weight: 8 });
    }

    // Analyze objective threats
    const objectiveThreatLevel = this.assessObjectiveThreats(context);
    if (objectiveThreatLevel > 0.7) {
      priorities.push({ priority: TacticalPriority.DEFEND_OBJECTIVES, weight: 9 });
    }

    // Analyze terrain control
    const territoryControl = context.resourceStatus.territoryControl;
    if (territoryControl < 0.6) {
      priorities.push({ priority: TacticalPriority.DENY_TERRAIN, weight: 7 });
    }

    // Analyze enemy vulnerability
    const enemyVulnerability = this.assessEnemyVulnerability(context.enemyUnits);
    if (enemyVulnerability > 0.1) { // Lower threshold to encourage combat
      priorities.push({ priority: TacticalPriority.INFLICT_CASUALTIES, weight: 8 });
    }
    
    // If units are in combat range, prioritize fighting over movement (HIGHEST PRIORITY)
    const unitsInRange = this.countUnitsInCombatRange(context);
    if (unitsInRange > 0) {
      priorities.push({ priority: TacticalPriority.INFLICT_CASUALTIES, weight: 20 }); // Maximum priority for combat
    }

    // Check for USS Wasp operations opportunities
    const hasWasp = context.availableUnits.some(unit => unit.type === 'uss_wasp');
    if (hasWasp) {
      priorities.push({ priority: TacticalPriority.WASP_OPERATIONS, weight: 9 });
    }
    
    // Check for transport/logistics needs
    const hasTransports = context.availableUnits.some(unit => unit.getCargoCapacity() > 0);
    if (hasTransports) {
      priorities.push({ priority: TacticalPriority.MANAGE_LOGISTICS, weight: 6 });
    }
    
    // Check for special ability opportunities
    const hasSpecialAbilities = context.availableUnits.some(unit => 
      unit.specialAbilities.length > 0 && unit.canAct()
    );
    if (hasSpecialAbilities) {
      priorities.push({ priority: TacticalPriority.USE_SPECIAL_ABILITIES, weight: 8 });
    }
    
    // Check for objective opportunities (always important)
    priorities.push({ priority: TacticalPriority.SECURE_OBJECTIVES, weight: 7 });

    // Always include intelligence gathering
    priorities.push({ priority: TacticalPriority.GATHER_INTELLIGENCE, weight: 4 });

    // Sort by weight and return top priorities
    return priorities
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 7) // Increased to 7 priorities for new capabilities
      .map(p => p.priority);
  }

  /**
   * Generate specific decisions for a tactical priority
   */
  private generateDecisionsForPriority(
    priority: TacticalPriority, 
    context: AIDecisionContext
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
            reasoning: `Unit ${unit.type} withdrawing from high threat area (${threat.overallThreatLevel}% threat)`
          });
        }

        // Consider hiding if unit can be hidden
        if (unit.canBeHidden() && !unit.isHidden()) {
          decisions.push({
            type: AIDecisionType.HIDE_UNIT,
            priority: 7,
            unitId: unit.id,
            reasoning: `Hiding ${unit.type} to avoid detection and preserve force`
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
      
      for (const defender of defenders.slice(0, 2)) { // Limit to 2 defenders per objective
        const defensePosition = this.findOptimalDefensePosition(objective.position, defender, context);
        
        if (defensePosition) {
          decisions.push({
            type: AIDecisionType.MOVE_UNIT,
            priority: 9,
            unitId: defender.id,
            targetPosition: defensePosition,
            reasoning: `Moving ${defender.type} to defend ${objective.type} objective`,
            metadata: { objectiveId: objective.id }
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
      const availableUnits = context.availableUnits.filter(unit => 
        !unit.state.hasMoved && !usedUnits.has(unit.id) && this.canUnitReachPosition(unit, terrain.position, context)
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
          metadata: { terrainValue: terrain.strategicValue }
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
    const combatUnits = context.availableUnits.filter(unit => 
      unit.canAct() && !unit.state.hasActed
    );

    for (const unit of combatUnits) {
      // Analyze potential targets
      const targets = this.findValidTargets(unit, context.enemyUnits, context);
      
      for (const target of targets) {
        const engagement = this.analyzeEngagement(unit, target, context);
        
        if (engagement.shouldEngage && engagement.confidence > 0.3) { // Much lower threshold for aggressive combat
          decisions.push({
            type: AIDecisionType.ATTACK_TARGET,
            priority: 15, // Very high priority for actual combat
            unitId: unit.id,
            targetUnitId: target.id,
            reasoning: `${unit.type} engaging ${target.type} with ${Math.round(engagement.confidence * 100)}% confidence`,
            metadata: { 
              engagementAnalysis: engagement,
              expectedCasualties: this.estimateCasualties(unit, target)
            }
          });
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
    const scoutUnits = context.availableUnits.filter(unit =>
      unit.hasCategory(UnitCategory.INFANTRY) && !unit.state.hasMoved
    );

    // Identify areas where we need better intelligence
    const unknownAreas = this.identifyIntelligenceGaps(context);

    for (const area of unknownAreas.slice(0, 2)) { // Limit scouting missions
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
            metadata: { missionType: 'reconnaissance' }
          });
        }
      }
    }

    return decisions;
  }

  /**
   * Apply difficulty-based modifiers to decisions
   */
  private applyDifficultyModifiers(decisions: AIDecision[], context: AIDecisionContext): AIDecision[] {
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
    const unitPosition = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s);
    
    let immediateThreats: Unit[] = [];
    let approachingThreats: Unit[] = [];
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
      recommendedResponse: totalThreat > 8 ? TacticalPriority.PRESERVE_FORCE : TacticalPriority.INFLICT_CASUALTIES
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
          cheatingLevel: 0
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
          cheatingLevel: 0
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
          cheatingLevel: 0
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
          cheatingLevel: 0
        };
      
      default:
        return this.createConfiguration(AIDifficulty.VETERAN);
    }
  }

  // Helper methods (implementations would be added as needed)
  private calculateAverageUnitHealth(units: Unit[]): number {
    if (units.length === 0) return 1;
    const totalHealth = units.reduce((sum, unit) => sum + (unit.state.currentHP / unit.stats.hp), 0);
    return totalHealth / units.length;
  }

  private assessObjectiveThreats(context: AIDecisionContext): number {
    // Implementation would analyze threat to objectives
    return 0.5; // Placeholder
  }

  private assessEnemyVulnerability(enemyUnits: Unit[]): number {
    if (enemyUnits.length === 0) return 0;
    
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
    // Implementation would find safe position for withdrawal
    return null; // Placeholder
  }

  private getThreatenedObjectives(context: AIDecisionContext): any[] {
    // Implementation would identify objectives under threat
    return []; // Placeholder
  }

  private findBestDefenders(position: Hex, units: Unit[]): Unit[] {
    // Implementation would select optimal defenders
    return []; // Placeholder
  }

  private findOptimalDefensePosition(objective: Hex, unit: Unit, context: AIDecisionContext): Hex | null {
    // Implementation would find best defensive position
    return null; // Placeholder
  }

  private identifyKeyTerrain(context: AIDecisionContext): any[] {
    // Identify reachable positions that move toward objectives
    const keyTerrain: any[] = [];
    
    for (const unit of context.availableUnits) {
      if (unit.state.hasMoved) continue;
      
      // Find positions within movement range that move toward enemies
      const moveRange = unit.stats.mv;
      
      // Generate positions in a circle around the unit
      for (let dq = -moveRange; dq <= moveRange; dq++) {
        for (let dr = -moveRange; dr <= moveRange; dr++) {
          const ds = -dq - dr;
          
          // Check if position is within movement range (hex distance)
          const distance = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
          if (distance > moveRange || distance === 0) continue;
          
          const targetPos = new Hex(
            unit.state.position.q + dq,
            unit.state.position.r + dr,
            unit.state.position.s + ds
          );
          
          // Skip positions outside reasonable map bounds (0-5 range for 6x6 map)
          if (targetPos.q < 0 || targetPos.q > 5 || 
              targetPos.r < 0 || targetPos.r > 5) {
            continue;
          }
          
          // Check if this position moves us closer to enemies
          let improvesPosition = false;
          for (const enemy of context.enemyUnits) {
            const currentDistance = this.calculateDistance(unit.state.position, enemy.state.position);
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
              type: 'advance_position'
            });
          }
        }
      }
    }
    
    return keyTerrain.slice(0, 5); // Return best movement options
  }

  private canUnitReachPosition(unit: Unit, position: Hex, context: AIDecisionContext): boolean {
    // Simple movement range check
    const distance = this.calculateDistance(unit.state.position, position);
    return distance <= unit.stats.mv && !unit.state.hasMoved;
  }

  private selectBestUnitForPosition(units: Unit[], terrain: any): Unit {
    // Implementation would select optimal unit for terrain
    return units[0]; // Placeholder
  }

  private findValidTargets(unit: Unit, enemies: Unit[], context: AIDecisionContext): Unit[] {
    // Find enemies that this unit can potentially attack
    const targets: Unit[] = [];
    
    for (const enemy of enemies) {
      // Basic range check - for now, assume all ground units can attack adjacent hexes
      const distance = this.calculateDistance(unit.state.position, enemy.state.position);
      const maxRange = this.getUnitRange(unit);
      
      if (distance <= maxRange && enemy.isAlive()) {
        targets.push(enemy);
      }
    }
    
    return targets;
  }

  private analyzeEngagement(attacker: Unit, target: Unit, context: AIDecisionContext): EngagementAnalysis {
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
      confidence: confidence
    };
  }

  private estimateCasualties(attacker: Unit, target: Unit): any {
    // Implementation would estimate combat casualties
    return {}; // Placeholder
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
    // Implementation would find closest unit to position
    return units[0] || null; // Placeholder
  }

  private findOptimalObservationPosition(area: Hex, unit: Unit, context: AIDecisionContext): Hex | null {
    // Implementation would find best observation position
    return null; // Placeholder
  }

  private limitCoordination(decisions: AIDecision[]): AIDecision[] {
    // Implementation would limit multi-unit coordination
    return decisions; // Placeholder
  }

  private introduceMistakes(decisions: AIDecision[], context: AIDecisionContext): AIDecision[] {
    // Implementation would introduce AI mistakes based on difficulty
    return decisions; // Placeholder
  }

  // Additional helper methods for basic AI functionality
  private calculateDistance(pos1: HexCoordinate, pos2: HexCoordinate): number {
    // Simple hex distance calculation using cube coordinates
    return Math.max(
      Math.abs(pos1.q - pos2.q),
      Math.abs(pos1.r - pos2.r),
      Math.abs(pos1.s - pos2.s)
    ) / 2;
  }

  private getUnitRange(unit: Unit): number {
    // Basic unit range - most ground units can attack adjacent hexes
    if (unit.hasCategory(UnitCategory.ARTILLERY)) {
      return 4; // Artillery has longer range
    }
    if (unit.hasCategory(UnitCategory.AIRCRAFT)) {
      return 8; // Aircraft have much longer range
    }
    if (unit.hasCategory(UnitCategory.HELICOPTER)) {
      return 6; // Helicopters have good range
    }
    return 2; // Default range for most units (slightly increased)
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
      { q: 0, r: 1, s: -1 }
    ];

    for (const dir of directions) {
      adjacent.push(new Hex(
        center.q + dir.q,
        center.r + dir.r,
        center.s + dir.s
      ));
    }

    return adjacent;
  }

  private countUnitsInCombatRange(context: AIDecisionContext): number {
    let count = 0;
    
    for (const unit of context.availableUnits) {
      const targets = this.findValidTargets(unit, context.enemyUnits, context);
      if (targets.length > 0) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Generate USS Wasp operations decisions
   */
  private generateWaspOperationsDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];
    
    for (const unit of context.availableUnits) {
      if (unit.type === 'uss_wasp') {
        // Simple USS Wasp decisions - launch aircraft
        decisions.push({
          type: AIDecisionType.LAUNCH_FROM_WASP,
          priority: 8,
          unitId: unit.id,
          reasoning: 'Launching aircraft from USS Wasp for assault operations'
        });
      }
    }
    
    return decisions;
  }

  /**
   * Generate logistics/transport decisions
   */
  private generateLogisticsDecisions(context: AIDecisionContext): AIDecision[] {
    const decisions: AIDecision[] = [];
    const usedUnits = new Set<string>(); // Track units already assigned
    
    for (const unit of context.availableUnits) {
      if (unit.getCargoCapacity() > 0 && !usedUnits.has(unit.id)) {
        usedUnits.add(unit.id); // Mark unit as used
        // Simple transport decision
        decisions.push({
          type: AIDecisionType.LOAD_TRANSPORT,
          priority: 6,
          unitId: unit.id,
          reasoning: 'Loading transport for tactical deployment'
        });
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
        decisions.push({
          type: AIDecisionType.SPECIAL_ABILITY,
          priority: 7,
          unitId: unit.id,
          reasoning: `Using special ability: ${unit.specialAbilities[0]}`
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
    
    // Create simple objective-based movement
    for (const unit of context.availableUnits) {
      if (!unit.state.hasMoved && !usedUnits.has(unit.id)) {
        // Move toward center of map (simple objective)
        const centerPos = new Hex(3, 3, -6);
        const distance = this.calculateDistance(unit.state.position, centerPos);
        
        if (distance > 1) {
          usedUnits.add(unit.id); // Mark unit as used
          decisions.push({
            type: AIDecisionType.MOVE_UNIT,
            priority: 7,
            unitId: unit.id,
            targetPosition: centerPos,
            reasoning: 'Moving toward central objective area'
          });
        }
      }
    }
    
    return decisions;
  }
}