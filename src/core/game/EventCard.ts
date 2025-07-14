/**
 * Event Card System - Dynamic gameplay elements for USS Wasp operations
 * 
 * This module implements the Event Card System that adds strategic depth 
 * and dynamic gameplay elements to USS Wasp operations.
 */

import { PlayerSide, UnitType, TurnPhase } from './types';
import { GameState } from './GameState';
import { Player } from './Player';
import { Unit } from './Unit';
import { Hex } from '../hex';

/**
 * Types of event card effects
 */
export enum EventCardEffectType {
  IMMEDIATE = 'immediate',
  DURATION = 'duration',
  TRIGGERED = 'triggered',
  PASSIVE = 'passive'
}

/**
 * Event card rarity levels
 */
export enum EventCardRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  LEGENDARY = 'legendary'
}

/**
 * Event card play conditions
 */
export interface EventCardCondition {
  readonly type: 'phase' | 'unit_type' | 'player_side' | 'turn_number' | 'unit_count' | 'terrain';
  readonly value: string | number;
  readonly comparison?: '=' | '>' | '<' | '>=' | '<=';
}

/**
 * Event card effect parameters
 */
export interface EventCardEffect {
  readonly type: EventCardEffectType;
  readonly duration?: number; // In turns
  readonly target: 'self' | 'enemy' | 'all_units' | 'specific_unit' | 'terrain' | 'wasp' | 'global';
  readonly magnitude: number;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Core Event Card interface
 */
export interface EventCard {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly flavorText: string;
  readonly rarity: EventCardRarity;
  readonly cost: number; // Command Points required to play
  readonly effects: EventCardEffect[];
  readonly playConditions?: EventCardCondition[];
  readonly canPlayMultiple: boolean;
  readonly artwork?: string; // Path to card artwork
}

/**
 * Active event card effect tracking
 */
export interface ActiveEventEffect {
  readonly cardId: string;
  readonly cardName: string;
  readonly effect: EventCardEffect;
  readonly playerId: string;
  readonly startTurn: number;
  readonly endTurn?: number;
  readonly isActive: boolean;
}

/**
 * Player's event card hand
 */
export interface EventCardHand {
  readonly playerId: string;
  readonly cards: EventCard[];
  readonly maxHandSize: number;
  readonly cardsPlayedThisTurn: string[];
}

/**
 * Event card deck configuration
 */
export interface EventDeckConfig {
  readonly deckSize: number;
  readonly startingHandSize: number;
  readonly maxHandSize: number;
  readonly cardsPerTurn: number;
  readonly rarityDistribution: {
    [key in EventCardRarity]: number;
  };
}

/**
 * Event card play result
 */
export interface EventCardPlayResult {
  readonly success: boolean;
  readonly message: string;
  readonly effectsApplied: ActiveEventEffect[];
  readonly data?: Record<string, unknown>;
}

/**
 * Event Card Manager - Handles all event card operations
 */
export class EventCardManager {
  private readonly deck: EventCard[] = [];
  private readonly hands: Map<string, EventCardHand> = new Map();
  private readonly activeEffects: ActiveEventEffect[] = [];
  private readonly config: EventDeckConfig;

  constructor(config: EventDeckConfig) {
    this.config = config;
    this.initializeDeck();
  }

  /**
   * Initialize the event card deck with predefined cards
   */
  private initializeDeck(): void {
    // This will be populated with actual event cards
    this.deck.push(...this.createEventCards());
    this.shuffleDeck();
  }

  /**
   * Create all event cards for the game
   */
  private createEventCards(): EventCard[] {
    const cards: EventCard[] = [];

    // Air Support Cards
    cards.push({
      id: 'air_support_delay',
      name: 'Air Support Delay',
      description: 'Adverse weather conditions delay air operations',
      flavorText: 'Dark clouds gather over the task force...',
      rarity: EventCardRarity.COMMON,
      cost: 0,
      effects: [{
        type: EventCardEffectType.DURATION,
        duration: 2,
        target: 'all_units',
        magnitude: -2,
        description: 'All aircraft have -2 movement for 2 turns',
        metadata: { unitTypes: ['HARRIER', 'SUPER_COBRA', 'OSPREY'] }
      }],
      canPlayMultiple: false
    });

    cards.push({
      id: 'close_air_support',
      name: 'Close Air Support',
      description: 'Coordinated air support provides tactical advantage',
      flavorText: 'Strike aircraft sweep in from the horizon...',
      rarity: EventCardRarity.UNCOMMON,
      cost: 3,
      effects: [{
        type: EventCardEffectType.IMMEDIATE,
        target: 'specific_unit',
        magnitude: 3,
        description: 'Target unit gains +3 attack for this combat',
        metadata: { selectTarget: true }
      }],
      playConditions: [{
        type: 'phase',
        value: TurnPhase.ACTION
      }],
      canPlayMultiple: true
    });

    // Weather Cards
    cards.push({
      id: 'storm_surge',
      name: 'Storm Surge',
      description: 'Rough seas affect amphibious operations',
      flavorText: 'Waves crash over the landing craft...',
      rarity: EventCardRarity.COMMON,
      cost: 0,
      effects: [{
        type: EventCardEffectType.DURATION,
        duration: 3,
        target: 'all_units',
        magnitude: 1,
        description: 'All amphibious units have +1 movement cost for 3 turns',
        metadata: { unitTypes: ['LCAC', 'AAV_7'] }
      }],
      canPlayMultiple: false
    });

    cards.push({
      id: 'clear_skies',
      name: 'Clear Skies',
      description: 'Perfect weather enhances all operations',
      flavorText: 'The sun breaks through the clouds...',
      rarity: EventCardRarity.RARE,
      cost: 2,
      effects: [{
        type: EventCardEffectType.DURATION,
        duration: 3,
        target: 'all_units',
        magnitude: 1,
        description: 'All units gain +1 movement for 3 turns'
      }],
      canPlayMultiple: false
    });

    // Intelligence Cards
    cards.push({
      id: 'intelligence_coup',
      name: 'Intelligence Coup',
      description: 'Valuable intelligence reveals enemy positions',
      flavorText: 'Encrypted communications are intercepted...',
      rarity: EventCardRarity.UNCOMMON,
      cost: 2,
      effects: [{
        type: EventCardEffectType.IMMEDIATE,
        target: 'enemy',
        magnitude: 0,
        description: 'Reveal all hidden enemy units for 1 turn',
        metadata: { revealHidden: true }
      }],
      canPlayMultiple: true
    });

    // Supply Cards
    cards.push({
      id: 'supply_drop',
      name: 'Emergency Supply Drop',
      description: 'Critical supplies are air-dropped to the front lines',
      flavorText: 'Parachutes bloom in the sky...',
      rarity: EventCardRarity.UNCOMMON,
      cost: 1,
      effects: [{
        type: EventCardEffectType.IMMEDIATE,
        target: 'self',
        magnitude: 2,
        description: 'Gain 2 additional Command Points this turn'
      }],
      canPlayMultiple: true
    });

    // Equipment Cards
    cards.push({
      id: 'equipment_malfunction',
      name: 'Equipment Malfunction',
      description: 'Critical equipment fails at the worst moment',
      flavorText: 'Sparks fly from damaged systems...',
      rarity: EventCardRarity.COMMON,
      cost: 0,
      effects: [{
        type: EventCardEffectType.IMMEDIATE,
        target: 'specific_unit',
        magnitude: -1,
        description: 'Target unit cannot take actions this turn',
        metadata: { selectTarget: true, skipTurn: true }
      }],
      canPlayMultiple: true
    });

    // Tactical Cards
    cards.push({
      id: 'tactical_surprise',
      name: 'Tactical Surprise',
      description: 'Swift maneuvering catches the enemy off-guard',
      flavorText: 'The element of surprise is everything...',
      rarity: EventCardRarity.RARE,
      cost: 3,
      effects: [{
        type: EventCardEffectType.IMMEDIATE,
        target: 'self',
        magnitude: 1,
        description: 'Take an additional action this turn',
        metadata: { extraAction: true }
      }],
      playConditions: [{
        type: 'phase',
        value: TurnPhase.ACTION
      }],
      canPlayMultiple: false
    });

    // USS Wasp Specific Cards
    cards.push({
      id: 'wasp_engine_trouble',
      name: 'Engine Trouble',
      description: 'USS Wasp experiences mechanical difficulties',
      flavorText: 'The great ship shudders to a halt...',
      rarity: EventCardRarity.UNCOMMON,
      cost: 0,
      effects: [{
        type: EventCardEffectType.DURATION,
        duration: 2,
        target: 'wasp',
        magnitude: 0,
        description: 'USS Wasp cannot launch or recover aircraft for 2 turns',
        metadata: { disableOperations: true }
      }],
      playConditions: [{
        type: 'unit_type',
        value: 'USS_WASP'
      }],
      canPlayMultiple: false
    });

    cards.push({
      id: 'rapid_deployment',
      name: 'Rapid Deployment',
      description: 'Efficient operations accelerate unit deployment',
      flavorText: 'The deck crew works with practiced precision...',
      rarity: EventCardRarity.RARE,
      cost: 2,
      effects: [{
        type: EventCardEffectType.IMMEDIATE,
        target: 'wasp',
        magnitude: 0,
        description: 'Launch up to 3 units from USS Wasp this turn',
        metadata: { bonusLaunch: 3 }
      }],
      playConditions: [{
        type: 'unit_type',
        value: 'USS_WASP'
      }],
      canPlayMultiple: false
    });

    // Defensive Cards
    cards.push({
      id: 'defensive_positions',
      name: 'Defensive Positions',
      description: 'Units establish strong defensive positions',
      flavorText: 'Sandbags and camouflage are hastily prepared...',
      rarity: EventCardRarity.COMMON,
      cost: 1,
      effects: [{
        type: EventCardEffectType.DURATION,
        duration: 3,
        target: 'all_units',
        magnitude: 1,
        description: 'All infantry units gain +1 defense for 3 turns',
        metadata: { unitCategory: 'INFANTRY' }
      }],
      canPlayMultiple: false
    });

    // Communication Cards
    cards.push({
      id: 'communications_jam',
      name: 'Communications Jam',
      description: 'Enemy jamming disrupts coordination',
      flavorText: 'Static fills the radio channels...',
      rarity: EventCardRarity.UNCOMMON,
      cost: 0,
      effects: [{
        type: EventCardEffectType.DURATION,
        duration: 2,
        target: 'enemy',
        magnitude: -1,
        description: 'Enemy units have -1 coordination for 2 turns',
        metadata: { affectsCoordination: true }
      }],
      canPlayMultiple: false
    });

    // Morale Cards
    cards.push({
      id: 'heroic_action',
      name: 'Heroic Action',
      description: 'Exceptional bravery inspires nearby units',
      flavorText: 'One soldier\'s courage rallies the troops...',
      rarity: EventCardRarity.LEGENDARY,
      cost: 4,
      effects: [{
        type: EventCardEffectType.IMMEDIATE,
        target: 'all_units',
        magnitude: 2,
        description: 'All friendly units gain +2 to all stats for this turn',
        metadata: { temporaryBoost: true }
      }],
      canPlayMultiple: false
    });

    // Reconnaissance Cards
    cards.push({
      id: 'scout_report',
      name: 'Scout Report',
      description: 'Detailed reconnaissance provides tactical advantage',
      flavorText: 'The recon team reports back with vital intelligence...',
      rarity: EventCardRarity.COMMON,
      cost: 1,
      effects: [{
        type: EventCardEffectType.IMMEDIATE,
        target: 'self',
        magnitude: 0,
        description: 'Reveal enemy positions within 3 hexes of your units',
        metadata: { scoutRange: 3 }
      }],
      canPlayMultiple: true
    });

    // Medical Cards
    cards.push({
      id: 'medical_evacuation',
      name: 'Medical Evacuation',
      description: 'Rapid medical support saves lives',
      flavorText: 'The medevac helicopter swoops in...',
      rarity: EventCardRarity.UNCOMMON,
      cost: 2,
      effects: [{
        type: EventCardEffectType.IMMEDIATE,
        target: 'specific_unit',
        magnitude: 2,
        description: 'Target damaged unit recovers 2 HP',
        metadata: { selectTarget: true, healing: true }
      }],
      canPlayMultiple: true
    });

    return cards;
  }

  /**
   * Shuffle the event card deck
   */
  private shuffleDeck(): void {
    for (let i = this.deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
    }
  }

  /**
   * Initialize a player's event card hand
   */
  public initializePlayerHand(playerId: string): void {
    const hand: EventCardHand = {
      playerId,
      cards: [],
      maxHandSize: this.config.maxHandSize,
      cardsPlayedThisTurn: []
    };

    // Store hand first before drawing cards
    this.hands.set(playerId, hand);

    // Draw starting hand
    for (let i = 0; i < this.config.startingHandSize; i++) {
      this.drawCard(playerId);
    }
  }

  /**
   * Draw a card from the deck to player's hand
   */
  public drawCard(playerId: string): EventCard | null {
    const hand = this.hands.get(playerId);
    if (!hand) {
      return null;
    }

    if (hand.cards.length >= hand.maxHandSize) {
      return null; // Hand is full
    }

    if (this.deck.length === 0) {
      return null; // Deck is empty
    }

    const card = this.deck.pop();
    if (card) {
      hand.cards.push(card);
      return card;
    }

    return null;
  }

  /**
   * Get a player's current hand
   */
  public getPlayerHand(playerId: string): EventCard[] {
    const hand = this.hands.get(playerId);
    return hand ? [...hand.cards] : [];
  }

  /**
   * Add a card to a player's hand (for testing purposes)
   */
  public addCardToHand(playerId: string, card: EventCard): boolean {
    const hand = this.hands.get(playerId);
    if (!hand) {
      return false;
    }

    if (hand.cards.length >= hand.maxHandSize) {
      return false;
    }

    hand.cards.push(card);
    return true;
  }

  /**
   * Check if a card can be played
   */
  public canPlayCard(cardId: string, playerId: string, gameState: GameState): boolean {
    const hand = this.hands.get(playerId);
    if (!hand) {
      return false;
    }

    const card = hand.cards.find(c => c.id === cardId);
    if (!card) {
      return false;
    }

    // Check if card was already played this turn
    if (hand.cardsPlayedThisTurn.includes(cardId) && !card.canPlayMultiple) {
      return false;
    }

    // Check command point cost
    const player = gameState.getPlayer(playerId);
    if (!player || player.commandPoints < card.cost) {
      return false;
    }

    // Check play conditions
    if (card.playConditions) {
      for (const condition of card.playConditions) {
        if (!this.checkPlayCondition(condition, gameState, playerId)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if a play condition is met
   */
  private checkPlayCondition(condition: EventCardCondition, gameState: GameState, playerId: string): boolean {
    switch (condition.type) {
      case 'phase':
        return gameState.phase === condition.value;
      
      case 'turn_number':
        const comparison = condition.comparison || '=';
        const turnNum = gameState.turn;
        const targetTurn = condition.value as number;
        
        switch (comparison) {
          case '=': return turnNum === targetTurn;
          case '>': return turnNum > targetTurn;
          case '<': return turnNum < targetTurn;
          case '>=': return turnNum >= targetTurn;
          case '<=': return turnNum <= targetTurn;
          default: return false;
        }
      
      case 'unit_type':
        const player = gameState.getPlayer(playerId);
        if (!player) return false;
        
        const hasUnitType = player.getLivingUnits().some(unit => 
          unit.type === condition.value
        );
        return hasUnitType;
      
      case 'player_side':
        const playerSide = gameState.getPlayer(playerId)?.side;
        return playerSide === condition.value;
      
      case 'unit_count':
        const unitCount = gameState.getPlayer(playerId)?.getLivingUnits().length || 0;
        const targetCount = condition.value as number;
        const countComparison = condition.comparison || '=';
        
        switch (countComparison) {
          case '=': return unitCount === targetCount;
          case '>': return unitCount > targetCount;
          case '<': return unitCount < targetCount;
          case '>=': return unitCount >= targetCount;
          case '<=': return unitCount <= targetCount;
          default: return false;
        }
      
      default:
        return false;
    }
  }

  /**
   * Play an event card
   */
  public playCard(cardId: string, playerId: string, gameState: GameState, targetData?: Record<string, unknown>): EventCardPlayResult {
    if (!this.canPlayCard(cardId, playerId, gameState)) {
      return {
        success: false,
        message: 'Cannot play this card',
        effectsApplied: []
      };
    }

    const hand = this.hands.get(playerId);
    const card = hand?.cards.find(c => c.id === cardId);
    if (!card || !hand) {
      return {
        success: false,
        message: 'Card not found in hand',
        effectsApplied: []
      };
    }

    // Pay command point cost
    const player = gameState.getPlayer(playerId);
    if (!player || !player.spendCommandPoints(card.cost)) {
      return {
        success: false,
        message: 'Insufficient command points',
        effectsApplied: []
      };
    }

    // Remove card from hand
    hand.cards = hand.cards.filter(c => c.id !== cardId);
    hand.cardsPlayedThisTurn.push(cardId);

    // Apply card effects
    const effectsApplied: ActiveEventEffect[] = [];
    
    for (const effect of card.effects) {
      const activeEffect = this.applyCardEffect(card, effect, playerId, gameState, targetData);
      if (activeEffect) {
        effectsApplied.push(activeEffect);
      }
    }

    return {
      success: true,
      message: `${card.name} played successfully`,
      effectsApplied,
      data: { cardName: card.name, effects: effectsApplied.length }
    };
  }

  /**
   * Apply a single card effect
   */
  private applyCardEffect(card: EventCard, effect: EventCardEffect, playerId: string, gameState: GameState, targetData?: Record<string, unknown>): ActiveEventEffect | null {
    const activeEffect: ActiveEventEffect = {
      cardId: card.id,
      cardName: card.name,
      effect,
      playerId,
      startTurn: gameState.turn,
      endTurn: effect.duration ? gameState.turn + effect.duration : undefined,
      isActive: true
    };

    // Add to active effects if it has duration
    if (effect.type === EventCardEffectType.DURATION) {
      this.activeEffects.push(activeEffect);
    }

    // Apply immediate effects
    if (effect.type === EventCardEffectType.IMMEDIATE) {
      this.applyImmediateEffect(effect, playerId, gameState, targetData);
    }

    return activeEffect;
  }

  /**
   * Apply immediate effect to game state
   */
  private applyImmediateEffect(effect: EventCardEffect, playerId: string, gameState: GameState, targetData?: Record<string, unknown>): void {
    const player = gameState.getPlayer(playerId);
    if (!player) return;

    switch (effect.target) {
      case 'self':
        if (effect.metadata?.extraAction) {
          // Grant extra action (would need GameState integration)
          console.log(`Player ${playerId} gains an extra action`);
        }
        break;
      
      case 'specific_unit':
        if (targetData?.unitId) {
          const unit = gameState.getUnit(targetData.unitId as string);
          if (unit && effect.metadata?.healing) {
            unit.heal(effect.magnitude);
          }
        }
        break;
      
      case 'enemy':
        if (effect.metadata?.revealHidden) {
          // Reveal hidden enemy units (would need FogOfWar integration)
          console.log('Revealing hidden enemy units');
        }
        break;
    }
  }

  /**
   * Update active effects for new turn
   */
  public updateActiveEffects(currentTurn: number): void {
    // Remove expired effects
    this.activeEffects.forEach(effect => {
      if (effect.endTurn && currentTurn > effect.endTurn) {
        effect.isActive = false;
      }
    });

    // Clean up inactive effects
    this.activeEffects.splice(0, this.activeEffects.length, 
      ...this.activeEffects.filter(effect => effect.isActive)
    );
  }

  /**
   * Reset cards played this turn
   */
  public resetTurnCards(): void {
    for (const hand of this.hands.values()) {
      hand.cardsPlayedThisTurn.length = 0;
    }
  }

  /**
   * Get all active effects
   */
  public getActiveEffects(): ActiveEventEffect[] {
    return [...this.activeEffects];
  }

  /**
   * Get active effects affecting a specific unit
   */
  public getActiveEffectsForUnit(unitId: string): ActiveEventEffect[] {
    return this.activeEffects.filter(effect => 
      effect.effect.metadata?.unitId === unitId ||
      effect.effect.target === 'all_units'
    );
  }

  /**
   * Get deck statistics
   */
  public getDeckStats(): { cardsRemaining: number; totalCards: number } {
    const totalCards = this.deck.length + 
      Array.from(this.hands.values()).reduce((sum, hand) => sum + hand.cards.length, 0);
    
    return {
      cardsRemaining: this.deck.length,
      totalCards
    };
  }
}

/**
 * Default event deck configuration
 */
export const DEFAULT_EVENT_DECK_CONFIG: EventDeckConfig = {
  deckSize: 45,
  startingHandSize: 3,
  maxHandSize: 7,
  cardsPerTurn: 1,
  rarityDistribution: {
    [EventCardRarity.COMMON]: 0.5,
    [EventCardRarity.UNCOMMON]: 0.3,
    [EventCardRarity.RARE]: 0.15,
    [EventCardRarity.LEGENDARY]: 0.05
  }
};