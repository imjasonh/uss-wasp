/**
 * Central game state management
 */

import { Hex } from '../hex';
import { Unit } from './Unit';
import { Player } from './Player';
import { GameMap } from './Map';
import { FogOfWar } from './FogOfWar';
import { 
  PlayerSide, 
  TurnPhase, 
  VictoryCondition,
  ActionType 
} from './types';

/**
 * Game action that can be performed
 */
export interface GameAction {
  readonly type: ActionType;
  readonly playerId: string;
  readonly unitId: string;
  readonly targetId?: string;
  readonly targetPosition?: Hex;
  readonly data?: Record<string, any>;
}

/**
 * Game event for logging and replay
 */
export interface GameEvent {
  readonly turn: number;
  readonly phase: TurnPhase;
  readonly timestamp: number;
  readonly type: string;
  readonly description: string;
  readonly data?: Record<string, any>;
}

/**
 * Complete game state
 */
export class GameState {
  public readonly gameId: string;
  public readonly map: GameMap;
  public readonly players: Map<string, Player>;
  public readonly fogOfWar: FogOfWar;
  public turn: number;
  public phase: TurnPhase;
  public activePlayerId: string;
  public maxTurns: number;
  public isGameOver: boolean;
  public winner?: string;
  public victoryCondition?: VictoryCondition;
  public events: GameEvent[];
  public lastActionTime: number;

  constructor(gameId: string, map: GameMap, maxTurns: number = 15) {
    this.gameId = gameId;
    this.map = map;
    this.players = new Map();
    this.turn = 1;
    this.phase = TurnPhase.EVENT;
    this.activePlayerId = '';
    this.maxTurns = maxTurns;
    this.isGameOver = false;
    this.events = [];
    this.lastActionTime = Date.now();
    
    // Initialize fog of war system
    this.fogOfWar = new FogOfWar(this);
  }

  /**
   * Add player to the game
   */
  addPlayer(player: Player): void {
    this.players.set(player.id, player);
    
    // Set first player as active
    if (this.players.size === 1) {
      this.activePlayerId = player.id;
    }
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  /**
   * Get active player
   */
  getActivePlayer(): Player | undefined {
    return this.players.get(this.activePlayerId);
  }

  /**
   * Get player by side
   */
  getPlayerBySide(side: PlayerSide): Player | undefined {
    for (const player of this.players.values()) {
      if (player.side === side) {
        return player;
      }
    }
    return undefined;
  }

  /**
   * Get all players
   */
  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  /**
   * Get unit by ID from any player
   */
  getUnit(unitId: string): Unit | undefined {
    for (const player of this.players.values()) {
      const unit = player.getUnit(unitId);
      if (unit) {
        return unit;
      }
    }
    return undefined;
  }

  /**
   * Get all units on the map
   */
  getAllUnits(): Unit[] {
    const units: Unit[] = [];
    for (const player of this.players.values()) {
      units.push(...player.getLivingUnits());
    }
    return units;
  }

  /**
   * Get units at specific position
   */
  getUnitsAt(position: Hex): Unit[] {
    return this.getAllUnits().filter(unit => 
      new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s).equals(position)
    );
  }

  /**
   * Add event to game log
   */
  addEvent(type: string, description: string, data?: Record<string, any>): void {
    const event: GameEvent = {
      turn: this.turn,
      phase: this.phase,
      timestamp: Date.now(),
      type,
      description,
      ...(data && { data }),
    };
    this.events.push(event);
  }

  /**
   * Advance to next turn phase
   */
  nextPhase(): void {
    switch (this.phase) {
      case TurnPhase.EVENT:
        this.phase = TurnPhase.COMMAND;
        break;
      case TurnPhase.COMMAND:
        this.phase = TurnPhase.DEPLOYMENT;
        break;
      case TurnPhase.DEPLOYMENT:
        this.phase = TurnPhase.MOVEMENT;
        break;
      case TurnPhase.MOVEMENT:
        this.phase = TurnPhase.ACTION;
        break;
      case TurnPhase.ACTION:
        this.phase = TurnPhase.END;
        break;
      case TurnPhase.END:
        this.nextTurn();
        break;
    }
    
    // Update fog of war visibility
    this.fogOfWar.updateVisibility();
    
    this.addEvent('phase_change', `Advanced to ${this.phase} phase`);
  }

  /**
   * Advance to next turn
   */
  private nextTurn(): void {
    this.turn++;
    this.phase = TurnPhase.EVENT;
    
    // Reset turn state for all players
    for (const player of this.players.values()) {
      player.resetTurnState();
      player.processSuppressionRemoval();
      player.clearCommandPoints();
    }
    
    // Update fog of war at start of turn
    this.fogOfWar.updateVisibility();
    
    this.addEvent('turn_start', `Turn ${this.turn} begins`);
    
    // Check if game should end due to turn limit
    if (this.turn > this.maxTurns) {
      this.checkVictoryConditions();
    }
  }

  /**
   * Check victory conditions for all players
   */
  checkVictoryConditions(): boolean {
    for (const player of this.players.values()) {
      const enemy = this.getEnemyPlayer(player.id);
      if (!enemy) continue;
      
      const conditions = player.checkVictoryConditions(this.turn, this.maxTurns, enemy);
      
      if (conditions.length > 0) {
        this.isGameOver = true;
        this.winner = player.id;
        this.victoryCondition = conditions[0]; // Use first condition found
        
        this.addEvent('game_end', `${player.side} wins by ${this.victoryCondition}`, {
          winner: player.id,
          condition: this.victoryCondition,
        });
        
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get enemy player
   */
  private getEnemyPlayer(playerId: string): Player | undefined {
    const player = this.getPlayer(playerId);
    if (!player) return undefined;
    
    const enemySide = player.side === PlayerSide.Assault 
      ? PlayerSide.Defender 
      : PlayerSide.Assault;
      
    return this.getPlayerBySide(enemySide);
  }

  /**
   * Generate command points for the current phase
   */
  generateCommandPoints(): void {
    if (this.phase === TurnPhase.COMMAND) {
      for (const player of this.players.values()) {
        player.generateCommandPoints();
      }
      this.addEvent('command_generation', 'Command points generated');
    }
  }

  /**
   * Switch active player
   */
  switchActivePlayer(): void {
    const currentPlayer = this.getActivePlayer();
    if (!currentPlayer) return;
    
    // Find the other player
    for (const player of this.players.values()) {
      if (player.id !== this.activePlayerId) {
        this.activePlayerId = player.id;
        this.addEvent('player_switch', `${player.side} is now active`);
        break;
      }
    }
  }

  /**
   * Set active player by side
   */
  setActivePlayerBySide(side: PlayerSide): void {
    const player = this.getPlayerBySide(side);
    if (player) {
      this.activePlayerId = player.id;
    }
  }

  /**
   * Validate if an action can be performed
   */
  canPerformAction(action: GameAction): { valid: boolean; reason?: string } {
    // Check if game is over
    if (this.isGameOver) {
      return { valid: false, reason: 'Game is over' };
    }
    
    // Check if it's the correct phase for this action
    if (!this.isValidActionForPhase(action.type)) {
      return { valid: false, reason: `Action ${action.type} not valid in ${this.phase} phase` };
    }
    
    // Check if it's the player's turn (for actions that require it)
    if (this.requiresPlayerTurn(action.type) && action.playerId !== this.activePlayerId) {
      return { valid: false, reason: 'Not your turn' };
    }
    
    // Check if player exists
    const player = this.getPlayer(action.playerId);
    if (!player) {
      return { valid: false, reason: 'Player not found' };
    }
    
    // Check if unit exists and belongs to player
    const unit = player.getUnit(action.unitId);
    if (!unit) {
      return { valid: false, reason: 'Unit not found' };
    }
    
    // Check if unit can act
    if (this.requiresUnitAction(action.type) && !unit.canAct()) {
      return { valid: false, reason: 'Unit cannot act' };
    }
    
    return { valid: true };
  }

  /**
   * Check if action type is valid for current phase
   */
  private isValidActionForPhase(actionType: ActionType): boolean {
    switch (this.phase) {
      case TurnPhase.DEPLOYMENT:
        return actionType === ActionType.MOVE; // Launch from Wasp
      case TurnPhase.MOVEMENT:
        return actionType === ActionType.MOVE;
      case TurnPhase.ACTION:
        return [
          ActionType.ATTACK,
          ActionType.LOAD,
          ActionType.UNLOAD,
          ActionType.SPECIAL_ABILITY,
          ActionType.SECURE_OBJECTIVE,
          ActionType.REVEAL
        ].includes(actionType);
      default:
        return false;
    }
  }

  /**
   * Check if action requires it to be player's turn
   */
  private requiresPlayerTurn(actionType: ActionType): boolean {
    return [
      ActionType.MOVE,
      ActionType.ATTACK,
      ActionType.LOAD,
      ActionType.UNLOAD,
      ActionType.SPECIAL_ABILITY,
      ActionType.SECURE_OBJECTIVE,
      ActionType.REVEAL
    ].includes(actionType);
  }

  /**
   * Check if action requires unit to be able to act
   */
  private requiresUnitAction(actionType: ActionType): boolean {
    return [
      ActionType.ATTACK,
      ActionType.LOAD,
      ActionType.UNLOAD,
      ActionType.SPECIAL_ABILITY,
      ActionType.SECURE_OBJECTIVE,
      ActionType.REVEAL
    ].includes(actionType);
  }

  /**
   * Get game state summary for UI
   */
  getGameSummary(): {
    gameId: string;
    turn: number;
    phase: TurnPhase;
    activePlayer: string;
    isGameOver: boolean;
    winner?: string | undefined;
    victoryCondition?: VictoryCondition | undefined;
    players: ReturnType<Player['getStatus']>[];
  } {
    return {
      gameId: this.gameId,
      turn: this.turn,
      phase: this.phase,
      activePlayer: this.activePlayerId,
      isGameOver: this.isGameOver,
      players: this.getAllPlayers().map(p => p.getStatus()),
      ...(this.winner && { winner: this.winner }),
      ...(this.victoryCondition && { victoryCondition: this.victoryCondition }),
    };
  }

  /**
   * Create a deep copy of the game state
   */
  clone(): GameState {
    const clone = new GameState(this.gameId, this.map, this.maxTurns);
    
    // Clone players
    for (const player of this.players.values()) {
      const playerClone = new Player(player.id, player.side);
      playerClone.commandPoints = player.commandPoints;
      
      // Clone units
      for (const unit of player.units.values()) {
        playerClone.addUnit(unit.clone());
      }
      
      // Clone objectives
      for (const objective of player.objectives.values()) {
        playerClone.addObjective({ ...objective });
      }
      
      // Clone Wasp status
      if (player.waspStatus) {
        playerClone.waspStatus = { ...player.waspStatus };
      }
      
      clone.addPlayer(playerClone);
    }
    
    // Copy other state
    clone.turn = this.turn;
    clone.phase = this.phase;
    clone.activePlayerId = this.activePlayerId;
    clone.isGameOver = this.isGameOver;
    if (this.winner) clone.winner = this.winner;
    if (this.victoryCondition) clone.victoryCondition = this.victoryCondition;
    clone.events = [...this.events];
    clone.lastActionTime = this.lastActionTime;
    
    return clone;
  }

  /**
   * Get units visible to a specific player
   */
  getVisibleUnitsForPlayer(playerId: string): Unit[] {
    const visibleUnitIds = this.fogOfWar.getVisibleUnitsForPlayer(playerId);
    const allUnits: Unit[] = [];
    
    for (const player of this.players.values()) {
      allUnits.push(...player.getLivingUnits());
    }
    
    return allUnits.filter(unit => visibleUnitIds.has(unit.id));
  }

  /**
   * Check if a unit is visible to a player
   */
  isUnitVisibleToPlayer(unitId: string, playerId: string): boolean {
    return this.fogOfWar.isUnitVisibleToPlayer(unitId, playerId);
  }

  /**
   * Get explored hexes for a player
   */
  getExploredHexesForPlayer(playerId: string): Set<string> {
    return this.fogOfWar.getExploredHexesForPlayer(playerId);
  }

  /**
   * Deploy hidden units for defender
   */
  deployHiddenUnits(): void {
    const defender = this.getPlayerBySide(PlayerSide.Defender);
    if (!defender) return;

    for (const unit of defender.getLivingUnits()) {
      if (unit.canBeHidden()) {
        this.fogOfWar.deployHiddenUnit(unit);
      }
    }
    
    this.fogOfWar.updateVisibility();
  }

  /**
   * Force reveal a unit (when attacked or moving visibly)
   */
  forceRevealUnit(unitId: string): void {
    const unit = this.getUnit(unitId);
    if (unit) {
      this.fogOfWar.forceReveal(unit);
    }
  }
}