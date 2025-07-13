/**
 * Combat resolution system based on game rules
 */

import { Hex, hasLineOfSight } from '../hex';
import { Unit } from './Unit';
import { GameMap } from './Map';
import { GameState } from './GameState';
import { 
  DiceRoll, 
  UnitCategory, 
  StatusEffect,
  UnitType 
} from './types';

/**
 * Combat modifiers that can be applied
 */
export interface CombatModifiers {
  terrainCover: number;        // DEF bonus from terrain
  flankAttack: number;         // ATK bonus for flanking
  suppressionPenalty: number;  // ATK penalty for suppression
  ambushBonus: number;         // ATK bonus for ambush (defender only)
  specialAbilityBonus: number; // ATK bonus from special abilities
  other: number;               // Other modifiers
}

/**
 * Combat resolution result
 */
export interface CombatResult {
  readonly attacker: Unit;
  readonly defender: Unit;
  readonly attackRoll: DiceRoll;
  readonly hits: number;
  readonly damage: number;
  readonly defenderDestroyed: boolean;
  readonly modifiers: CombatModifiers;
  readonly description: string;
}

/**
 * Combat system implementation
 */
export class CombatSystem {
  /**
   * Resolve combat between two units
   */
  static resolveCombat(
    attacker: Unit,
    defender: Unit,
    gameState: GameState,
    ambushBonus: boolean = false
  ): CombatResult {
    // Calculate modifiers
    const modifiers = this.calculateModifiers(
      attacker, 
      defender, 
      gameState.map, 
      ambushBonus
    );

    // Calculate effective attack dice
    let attackDice = attacker.getEffectiveAttack();
    attackDice += modifiers.flankAttack;
    attackDice += modifiers.ambushBonus;
    attackDice += modifiers.specialAbilityBonus;
    attackDice = Math.max(0, attackDice);

    // Calculate effective defense value
    let defenseValue = defender.stats.def;
    defenseValue += modifiers.terrainCover;
    defenseValue = Math.max(1, defenseValue); // Minimum DEF of 1

    // Roll dice
    const attackRoll = this.rollDice(attackDice, defenseValue);
    
    // Apply damage
    const damage = attackRoll.total;
    const wasDestroyed = defender.state.currentHP <= damage;
    
    if (damage > 0) {
      defender.takeDamage(damage);
    }

    // Consume supply if attacker has SP
    if (attacker.stats.sp && attacker.stats.sp > 0) {
      attacker.consumeSupply(1);
    }

    // Mark attacker as having acted
    attacker.state.hasActed = true;

    // Generate description
    const description = this.generateCombatDescription(
      attacker, 
      defender, 
      attackRoll, 
      damage, 
      wasDestroyed,
      modifiers
    );

    return {
      attacker,
      defender,
      attackRoll,
      hits: attackRoll.total,
      damage,
      defenderDestroyed: wasDestroyed,
      modifiers,
      description,
    };
  }

  /**
   * Check if attack is valid
   */
  static canAttack(
    attacker: Unit,
    defender: Unit,
    gameState: GameState
  ): { valid: boolean; reason?: string } {
    // Check if attacker can act
    if (!attacker.canAct()) {
      return { valid: false, reason: 'Attacker cannot act' };
    }

    // Check if units are on different sides
    if (attacker.side === defender.side) {
      return { valid: false, reason: 'Cannot attack friendly units' };
    }

    // Check if defender is alive
    if (!defender.isAlive()) {
      return { valid: false, reason: 'Target is already destroyed' };
    }

    // Check line of sight
    if (!this.hasLineOfSight(attacker, defender, gameState.map)) {
      return { valid: false, reason: 'No line of sight to target' };
    }

    // Check range (most units can only attack adjacent or visible units)
    const distance = new Hex(
      attacker.state.position.q, 
      attacker.state.position.r, 
      attacker.state.position.s
    ).distanceTo(defender.state.position);

    if (!this.isInRange(attacker, defender, distance)) {
      return { valid: false, reason: 'Target out of range' };
    }

    // Check special restrictions (e.g., AA units can only attack aircraft)
    if (!this.canTargetUnitType(attacker, defender)) {
      return { valid: false, reason: 'Cannot target this unit type' };
    }

    return { valid: true };
  }

  /**
   * Calculate combat modifiers
   */
  private static calculateModifiers(
    attacker: Unit,
    defender: Unit,
    map: GameMap,
    ambushBonus: boolean
  ): CombatModifiers {
    let terrainCover = map.getDefenseBonus(defender.state.position);
    let flankAttack = 0;
    let suppressionPenalty = attacker.isSuppressed() ? -1 : 0;
    let ambushBonusValue = ambushBonus ? 1 : 0;
    let specialAbilityBonus = 0;
    let other = 0;

    // Check for flanking (simplified - adjacent hex counts as flank)
    const distance = new Hex(
      attacker.state.position.q,
      attacker.state.position.r,
      attacker.state.position.s
    ).distanceTo(defender.state.position);
    
    if (distance === 1) {
      flankAttack = 1; // Adjacent attack bonus
    }

    // Apply special ability bonuses
    specialAbilityBonus += this.getSpecialAbilityBonus(attacker, defender, map);

    return {
      terrainCover,
      flankAttack,
      suppressionPenalty,
      ambushBonus: ambushBonusValue,
      specialAbilityBonus,
      other,
    };
  }

  /**
   * Get special ability attack bonuses
   */
  private static getSpecialAbilityBonus(
    attacker: Unit,
    defender: Unit,
    map: GameMap
  ): number {
    let bonus = 0;

    // Marine Squad urban specialist
    if (attacker.type === UnitType.MARINE_SQUAD) {
      const defenderHex = map.getHex(defender.state.position);
      if (defenderHex?.terrain === 'urban') {
        bonus += 1;
      }
    }

    // ATGM Team anti-vehicle specialist
    if (attacker.type === UnitType.ATGM_TEAM && 
        defender.hasCategory(UnitCategory.VEHICLE)) {
      bonus += 2;
    }

    // AA Team bonuses
    if (attacker.type === UnitType.AA_TEAM) {
      if (defender.hasCategory(UnitCategory.AIRCRAFT)) {
        // Can only attack aircraft, but no specific bonus mentioned
      }
      if (defender.hasCategory(UnitCategory.HELICOPTER)) {
        bonus += 2;
      }
    }

    // Harrier close air support
    if (attacker.type === UnitType.HARRIER &&
        attacker.state.hasMoved &&
        defender.hasCategory(UnitCategory.GROUND)) {
      const distance = new Hex(
        attacker.state.position.q,
        attacker.state.position.r,
        attacker.state.position.s
      ).distanceTo(defender.state.position);
      
      if (distance === 1) {
        bonus += 1;
      }
    }

    // MARSOC recon specialist vs recently revealed units
    if (attacker.type === UnitType.MARSOC &&
        defender.state.statusEffects.has(StatusEffect.HIDDEN)) {
      bonus += 1;
    }

    return bonus;
  }

  /**
   * Check if attacker has line of sight to defender
   */
  private static hasLineOfSight(
    attacker: Unit,
    defender: Unit,
    map: GameMap
  ): boolean {
    return hasLineOfSight(
      attacker.state.position,
      defender.state.position,
      (hex) => map.blocksLOS(hex)
    );
  }

  /**
   * Check if target is in range
   */
  private static isInRange(
    attacker: Unit,
    _defender: Unit,
    distance: number
  ): boolean {
    // Most units can attack adjacent (distance 1)
    if (distance <= 1) {
      return true;
    }

    // Aircraft can attack at longer range
    if (attacker.hasCategory(UnitCategory.AIRCRAFT) ||
        attacker.hasCategory(UnitCategory.HELICOPTER)) {
      return distance <= 3;
    }

    // Long-range artillery can attack anywhere
    if (attacker.type === UnitType.LONG_RANGE_ARTILLERY) {
      return true;
    }

    // Mortar team has 5 hex range but can't attack adjacent
    if (attacker.type === UnitType.MORTAR_TEAM) {
      return distance > 1 && distance <= 5;
    }

    // USS Wasp Sea Sparrow has 5 hex range
    if (attacker.type === UnitType.USS_WASP) {
      return distance <= 5;
    }
    
    // BALANCE FIX: Give AA units extended range to counter air dominance
    if (attacker.type === UnitType.AA_TEAM) {
      return distance <= 3; // Match aircraft range
    }
    
    if (attacker.type === UnitType.SAM_SITE) {
      return distance <= 4; // Longer range for static SAM sites
    }

    return false;
  }

  /**
   * Check if attacker can target this unit type
   */
  private static canTargetUnitType(
    attacker: Unit,
    defender: Unit
  ): boolean {
    // AA units can only target aircraft
    if (attacker.type === UnitType.AA_TEAM) {
      return defender.hasCategory(UnitCategory.AIRCRAFT) ||
             defender.hasCategory(UnitCategory.HELICOPTER);
    }

    // All other units can target any enemy unit
    return true;
  }

  /**
   * Roll dice for combat
   */
  private static rollDice(numberOfDice: number, targetNumber: number): DiceRoll {
    const dice: number[] = [];
    let hits = 0;

    for (let i = 0; i < numberOfDice; i++) {
      const roll = Math.floor(Math.random() * 6) + 1;
      dice.push(roll);
      
      if (roll >= targetNumber) {
        hits++;
      }
    }

    return {
      dice,
      total: hits,
      modifier: 0, // Already applied to target number
      finalResult: hits,
    };
  }

  /**
   * Generate descriptive text for combat result
   */
  private static generateCombatDescription(
    attacker: Unit,
    defender: Unit,
    roll: DiceRoll,
    damage: number,
    destroyed: boolean,
    modifiers: CombatModifiers
  ): string {
    let description = `${attacker.type} attacks ${defender.type}`;
    
    if (roll.dice.length > 0) {
      description += ` (rolled ${roll.dice.join(', ')})`;
    }
    
    if (damage > 0) {
      description += ` for ${damage} damage`;
      if (destroyed) {
        description += ` - TARGET DESTROYED`;
      }
    } else {
      description += ` - no hits`;
    }

    // Add modifier details if significant
    const significantModifiers: string[] = [];
    if (modifiers.terrainCover > 0) {
      significantModifiers.push(`+${modifiers.terrainCover} terrain cover`);
    }
    if (modifiers.flankAttack > 0) {
      significantModifiers.push(`+${modifiers.flankAttack} flanking`);
    }
    if (modifiers.ambushBonus > 0) {
      significantModifiers.push(`+${modifiers.ambushBonus} ambush`);
    }
    if (modifiers.specialAbilityBonus > 0) {
      significantModifiers.push(`+${modifiers.specialAbilityBonus} special`);
    }

    if (significantModifiers.length > 0) {
      description += ` (${significantModifiers.join(', ')})`;
    }

    return description;
  }

  /**
   * Handle special combat effects (like mortar suppression)
   */
  static applySpecialCombatEffects(
    attacker: Unit,
    _defender: Unit,
    _result: CombatResult
  ): void {
    // Mortar team always applies suppression
    if (attacker.type === UnitType.MORTAR_TEAM) {
      if (_defender.isAlive()) {
        _defender.state.suppressionTokens = Math.min(
          2, 
          _defender.state.suppressionTokens + 1
        );
      }
    }

    // Add other special effects as needed
  }
}