/**
 * Unit representation and abilities
 */

import { HexCoordinate } from '../hex';
import { 
  UnitType, 
  UnitCategory, 
  PlayerSide, 
  StatusEffect
} from './types';

/**
 * Unit statistics as defined in the rules
 */
export interface UnitStats {
  readonly mv: number;          // Movement Allowance
  readonly atk: number;         // Attack Dice
  readonly def: number;         // Defense Value (lower is better)
  readonly hp: number;          // Hit Points
  readonly sp?: number;         // Supply Points (optional)
  readonly pointCost: number;   // Points cost for force selection
}

/**
 * Special abilities that units can have
 */
export interface SpecialAbility {
  readonly name: string;
  readonly description: string;
  readonly cpCost?: number;     // Command Point cost to activate
  readonly usesPerTurn?: number; // Limited uses per turn
}

/**
 * Unit state that can change during the game
 */
export interface UnitState {
  position: HexCoordinate;
  currentHP: number;
  currentSP: number;
  statusEffects: Set<StatusEffect>;
  facingDirection: number; // 0-5 for hex facing
  hasActed: boolean;
  hasMoved: boolean;
  suppressionTokens: number;
  cargo: Unit[]; // Transported units
}

/**
 * Complete unit definition
 */
export class Unit {
  public readonly id: string;
  public readonly type: UnitType;
  public readonly side: PlayerSide;
  public readonly stats: UnitStats;
  public readonly categories: Set<UnitCategory>;
  public readonly specialAbilities: SpecialAbility[];
  public state: UnitState;

  constructor(
    id: string,
    type: UnitType,
    side: PlayerSide,
    stats: UnitStats,
    categories: UnitCategory[],
    specialAbilities: SpecialAbility[],
    initialPosition: HexCoordinate
  ) {
    this.id = id;
    this.type = type;
    this.side = side;
    this.stats = stats;
    this.categories = new Set(categories);
    this.specialAbilities = specialAbilities;
    
    this.state = {
      position: initialPosition,
      currentHP: stats.hp,
      currentSP: stats.sp || 0,
      statusEffects: new Set(),
      facingDirection: 0,
      hasActed: false,
      hasMoved: false,
      suppressionTokens: 0,
      cargo: [],
    };
  }

  /**
   * Check if unit is alive
   */
  isAlive(): boolean {
    return this.state.currentHP > 0;
  }

  /**
   * Check if unit is destroyed
   */
  isDestroyed(): boolean {
    return this.state.currentHP <= 0;
  }

  /**
   * Check if unit can act this turn
   */
  canAct(): boolean {
    return this.isAlive() && 
           !this.state.hasActed && 
           !this.state.statusEffects.has(StatusEffect.PINNED);
  }

  /**
   * Check if unit can move this turn
   */
  canMove(): boolean {
    return this.isAlive() && 
           !this.state.hasMoved && 
           !this.state.statusEffects.has(StatusEffect.PINNED);
  }

  /**
   * Check if unit is hidden
   */
  isHidden(): boolean {
    return this.state.statusEffects.has(StatusEffect.HIDDEN);
  }

  /**
   * Check if unit is a dummy marker
   */
  isDummy(): boolean {
    return this.state.statusEffects.has(StatusEffect.DUMMY);
  }

  /**
   * Check if unit is suppressed
   */
  isSuppressed(): boolean {
    return this.state.suppressionTokens > 0;
  }

  /**
   * Check if unit is pinned (2+ suppression tokens)
   */
  isPinned(): boolean {
    return this.state.suppressionTokens >= 2;
  }

  /**
   * Get effective movement allowance (considering suppression)
   */
  getEffectiveMovement(): number {
    let mv = this.stats.mv;
    if (this.state.suppressionTokens >= 1) {
      mv -= 1;
    }
    return Math.max(0, mv);
  }

  /**
   * Get effective attack dice (considering suppression)
   */
  getEffectiveAttack(): number {
    let atk = this.stats.atk;
    if (this.state.suppressionTokens >= 1) {
      atk -= 1;
    }
    return Math.max(0, atk);
  }

  /**
   * Take damage and apply suppression
   */
  takeDamage(damage: number): void {
    if (damage <= 0) return;
    
    this.state.currentHP = Math.max(0, this.state.currentHP - damage);
    
    // Add suppression if unit survives
    if (this.state.currentHP > 0) {
      this.state.suppressionTokens = Math.min(2, this.state.suppressionTokens + 1);
      
      // Update status effects
      if (this.state.suppressionTokens === 1) {
        this.state.statusEffects.add(StatusEffect.SUPPRESSED);
      } else if (this.state.suppressionTokens >= 2) {
        this.state.statusEffects.delete(StatusEffect.SUPPRESSED);
        this.state.statusEffects.add(StatusEffect.PINNED);
      }
    }
  }

  /**
   * Remove suppression tokens
   */
  removeSuppression(amount: number = 1): void {
    this.state.suppressionTokens = Math.max(0, this.state.suppressionTokens - amount);
    
    // Update status effects
    if (this.state.suppressionTokens === 0) {
      this.state.statusEffects.delete(StatusEffect.SUPPRESSED);
      this.state.statusEffects.delete(StatusEffect.PINNED);
    } else if (this.state.suppressionTokens === 1) {
      this.state.statusEffects.delete(StatusEffect.PINNED);
      this.state.statusEffects.add(StatusEffect.SUPPRESSED);
    }
  }

  /**
   * Hide unit (place hidden marker)
   */
  hide(): void {
    this.state.statusEffects.add(StatusEffect.HIDDEN);
  }

  /**
   * Create dummy marker (deception)
   */
  makeDummy(): void {
    this.state.statusEffects.add(StatusEffect.DUMMY);
  }

  /**
   * Reveal hidden unit
   */
  reveal(): void {
    this.state.statusEffects.delete(StatusEffect.HIDDEN);
    this.state.statusEffects.delete(StatusEffect.DUMMY);
  }

  /**
   * Check if unit can be hidden
   */
  canBeHidden(): boolean {
    // Only certain unit types can be hidden initially
    return this.side === PlayerSide.Defender && 
           this.hasCategory(UnitCategory.INFANTRY);
  }

  /**
   * Reset turn-based state
   */
  resetTurnState(): void {
    this.state.hasActed = false;
    this.state.hasMoved = false;
  }

  /**
   * Move unit to new position
   */
  moveTo(position: HexCoordinate): void {
    this.state.position = position;
    this.state.hasMoved = true;
  }

  /**
   * Consume supply points
   */
  consumeSupply(amount: number = 1): boolean {
    if (this.state.currentSP >= amount) {
      this.state.currentSP -= amount;
      return true;
    }
    return false;
  }

  /**
   * Resupply unit
   */
  resupply(amount?: number): void {
    const maxSP = this.stats.sp || 0;
    this.state.currentSP = amount !== undefined 
      ? Math.min(maxSP, this.state.currentSP + amount)
      : maxSP;
  }

  /**
   * Load cargo unit
   */
  loadCargo(unit: Unit): boolean {
    // Check if this unit can carry cargo and has capacity
    const maxCargo = this.getCargoCapacity();
    if (maxCargo === 0 || this.state.cargo.length >= maxCargo) {
      return false;
    }
    
    this.state.cargo.push(unit);
    return true;
  }

  /**
   * Unload cargo unit
   */
  unloadCargo(unitId: string): Unit | undefined {
    const index = this.state.cargo.findIndex(u => u.id === unitId);
    if (index >= 0) {
      return this.state.cargo.splice(index, 1)[0];
    }
    return undefined;
  }

  /**
   * Get cargo capacity based on unit type
   */
  getCargoCapacity(): number {
    switch (this.type) {
      case UnitType.OSPREY:
        return 2; // 2 Marine Squads or 1 Humvee
      case UnitType.SUPER_STALLION:
        return 3; // 3 Marine Squads or mixed
      case UnitType.LCAC:
        return 3; // 2 AAVs or 3 Marine Squads or mixed
      case UnitType.AAV_7:
        return 1; // 1 Marine Squad
      default:
        return 0;
    }
  }

  /**
   * Check if unit has specific category
   */
  hasCategory(category: UnitCategory): boolean {
    return this.categories.has(category);
  }

  /**
   * Check if unit has specific ability
   */
  hasAbility(abilityName: string): boolean {
    return this.specialAbilities.some(ability => ability.name === abilityName);
  }

  /**
   * Get copy of unit state for external inspection
   */
  getState(): Readonly<UnitState> {
    return {
      ...this.state,
      statusEffects: new Set(this.state.statusEffects),
      cargo: [...this.state.cargo],
    };
  }

  /**
   * Create a deep copy of the unit
   */
  clone(): Unit {
    const clone = new Unit(
      this.id,
      this.type,
      this.side,
      this.stats,
      Array.from(this.categories),
      [...this.specialAbilities],
      this.state.position
    );
    
    clone.state = {
      ...this.state,
      statusEffects: new Set(this.state.statusEffects),
      cargo: this.state.cargo.map(unit => unit.clone()),
    };
    
    return clone;
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    return `${this.type}(${this.id}) at ${this.state.position.q},${this.state.position.r} HP:${this.state.currentHP}/${this.stats.hp}`;
  }
}