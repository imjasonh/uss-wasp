/**
 * Comprehensive Game Logging System
 * Tracks all game events, decisions, and state changes for debugging and analysis
 */

import { GameState } from '../game/GameState';
import { Unit } from '../game/Unit';
import { AIDecision } from '../ai/types';
import { ActionType, PlayerSide } from '../game/types';
import { GameAction } from '../game/GameState';
import { ActionResult } from '../game/GameEngine';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export enum LogCategory {
  GAME_STATE = 'game_state',
  UNIT_ACTION = 'unit_action',
  AI_DECISION = 'ai_decision',
  COMBAT = 'combat',
  MOVEMENT = 'movement',
  PHASE_CHANGE = 'phase_change',
  VICTORY = 'victory',
  ERROR = 'error'
}

export interface LogEntry {
  readonly id: string;
  readonly timestamp: number;
  readonly gameId: string;
  readonly turn: number;
  readonly phase: string;
  readonly level: LogLevel;
  readonly category: LogCategory;
  readonly message: string;
  readonly data?: any;
  readonly playerId?: string | undefined;
  readonly unitId?: string | undefined;
}

export interface GameSnapshot {
  readonly snapshotId: string;
  readonly timestamp: number;
  readonly gameId: string;
  readonly turn: number;
  readonly phase: string;
  readonly gameState: any; // Serialized game state
  readonly description: string;
}

/**
 * Comprehensive game logging system
 */
export class GameLogger {
  private logs: LogEntry[] = [];
  private snapshots: GameSnapshot[] = [];
  private logIdCounter = 0;
  private snapshotIdCounter = 0;
  
  constructor(
    private gameId: string,
    private minLogLevel: LogLevel = LogLevel.DEBUG
  ) {}

  /**
   * Log a game event
   */
  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    gameState: GameState,
    data?: any,
    playerId?: string,
    unitId?: string
  ): void {
    if (level < this.minLogLevel) return;

    const entry: LogEntry = {
      id: `log_${++this.logIdCounter}`,
      timestamp: Date.now(),
      gameId: this.gameId,
      turn: gameState.turn,
      phase: gameState.phase,
      level,
      category,
      message,
      data,
      playerId,
      unitId
    };

    this.logs.push(entry);
    
    // Console output for immediate feedback
    const levelName = LogLevel[level];
    const categoryName = category.toUpperCase();
    console.log(`[${levelName}][${categoryName}] T${entry.turn}:${entry.phase} - ${message}`);
    if (data && level >= LogLevel.WARN) {
      console.log('  Data:', data);
    }
  }

  /**
   * Log unit action
   */
  logUnitAction(
    action: GameAction,
    result: ActionResult,
    gameState: GameState,
    unit?: Unit
  ): void {
    const success = result.success ? '✅' : '❌';
    const message = `${success} ${action.type}: ${action.unitId} - ${result.message}`;
    
    this.log(
      result.success ? LogLevel.INFO : LogLevel.WARN,
      LogCategory.UNIT_ACTION,
      message,
      gameState,
      { action, result, unitStats: unit?.stats },
      action.playerId,
      action.unitId
    );
  }

  /**
   * Log AI decision
   */
  logAIDecision(
    decision: AIDecision,
    gameState: GameState,
    playerId: string
  ): void {
    const message = `AI Decision: ${decision.type} (priority ${decision.priority}) - ${decision.reasoning}`;
    
    this.log(
      LogLevel.INFO,
      LogCategory.AI_DECISION,
      message,
      gameState,
      { decision },
      playerId,
      decision.unitId
    );
  }

  /**
   * Log combat result with detailed information
   */
  logCombat(
    attacker: Unit,
    defender: Unit,
    result: any,
    gameState: GameState
  ): void {
    const damage = result.damage || 0;
    const destroyed = result.defenderDestroyed ? ' - TARGET DESTROYED' : '';
    const message = `Combat: ${attacker.type} vs ${defender.type} - ${damage} damage${destroyed}`;
    
    this.log(
      LogLevel.INFO,
      LogCategory.COMBAT,
      message,
      gameState,
      {
        attacker: { id: attacker.id, type: attacker.type, hp: attacker.state.currentHP },
        defender: { id: defender.id, type: defender.type, hp: defender.state.currentHP },
        result: result
      },
      undefined,
      attacker.id
    );
  }

  /**
   * Log phase change
   */
  logPhaseChange(
    oldPhase: string,
    newPhase: string,
    gameState: GameState
  ): void {
    const message = `Phase transition: ${oldPhase} → ${newPhase}`;
    
    this.log(
      LogLevel.INFO,
      LogCategory.PHASE_CHANGE,
      message,
      gameState,
      { oldPhase, newPhase }
    );
  }

  /**
   * Create a game state snapshot
   */
  createSnapshot(
    gameState: GameState,
    description: string = `Turn ${gameState.turn} - ${gameState.phase}`
  ): string {
    const snapshotId = `snapshot_${++this.snapshotIdCounter}`;
    
    // Serialize the game state
    const serializedState = this.serializeGameState(gameState);
    
    const snapshot: GameSnapshot = {
      snapshotId,
      timestamp: Date.now(),
      gameId: this.gameId,
      turn: gameState.turn,
      phase: gameState.phase,
      gameState: serializedState,
      description
    };

    this.snapshots.push(snapshot);
    
    this.log(
      LogLevel.INFO,
      LogCategory.GAME_STATE,
      `📸 Snapshot created: ${description}`,
      gameState,
      { snapshotId, snapshotCount: this.snapshots.length }
    );

    return snapshotId;
  }

  /**
   * Serialize game state for storage
   */
  private serializeGameState(gameState: GameState): any {
    return {
      gameId: gameState.gameId,
      turn: gameState.turn,
      maxTurns: gameState.maxTurns,
      phase: gameState.phase,
      activePlayerId: gameState.activePlayerId,
      isGameOver: gameState.isGameOver,
      winner: gameState.winner,
      players: Array.from(gameState.players.values()).map(player => ({
        id: player.id,
        side: player.side,
        commandPoints: player.commandPoints,
        units: Array.from(player.units.values()).map(unit => ({
          id: unit.id,
          type: unit.type,
          side: unit.side,
          position: unit.state.position,
          currentHP: unit.state.currentHP,
          hasActed: unit.state.hasActed,
          hasMoved: unit.state.hasMoved,
          suppressionTokens: unit.state.suppressionTokens,
          isHidden: unit.isHidden(),
          statusEffects: Array.from(unit.state.statusEffects),
          cargo: unit.state.cargo
        }))
      })),
      // Map state would go here if we had terrain/objectives
      metadata: {
        serializedAt: Date.now(),
        snapshotVersion: '1.0'
      }
    };
  }

  /**
   * Get all logs
   */
  getLogs(
    category?: LogCategory,
    minLevel?: LogLevel,
    fromTurn?: number,
    toTurn?: number
  ): LogEntry[] {
    return this.logs.filter(log => {
      if (category && log.category !== category) return false;
      if (minLevel !== undefined && log.level < minLevel) return false;
      if (fromTurn !== undefined && log.turn < fromTurn) return false;
      if (toTurn !== undefined && log.turn > toTurn) return false;
      return true;
    });
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): GameSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get specific snapshot
   */
  getSnapshot(snapshotId: string): GameSnapshot | undefined {
    return this.snapshots.find(s => s.snapshotId === snapshotId);
  }

  /**
   * Get game summary statistics
   */
  getGameSummary(): any {
    const totalLogs = this.logs.length;
    const logsByCategory = this.logs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const combatLogs = this.getLogs(LogCategory.COMBAT);
    const unitActionLogs = this.getLogs(LogCategory.UNIT_ACTION);
    const aiDecisionLogs = this.getLogs(LogCategory.AI_DECISION);

    return {
      gameId: this.gameId,
      totalLogs,
      totalSnapshots: this.snapshots.length,
      logsByCategory,
      combatEvents: combatLogs.length,
      unitActions: unitActionLogs.length,
      aiDecisions: aiDecisionLogs.length,
      gameStartTime: this.logs[0]?.timestamp,
      gameEndTime: this.logs[this.logs.length - 1]?.timestamp,
      finalTurn: Math.max(...this.logs.map(l => l.turn), 0)
    };
  }

  /**
   * Export logs to JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      gameId: this.gameId,
      logs: this.logs,
      snapshots: this.snapshots,
      summary: this.getGameSummary()
    }, null, 2);
  }

  /**
   * Clear all logs and snapshots
   */
  clear(): void {
    this.logs = [];
    this.snapshots = [];
    this.logIdCounter = 0;
    this.snapshotIdCounter = 0;
  }
}

/**
 * Global game logger instance
 */
let globalLogger: GameLogger | null = null;

/**
 * Initialize global logger
 */
export function initializeGameLogger(gameId: string, minLogLevel: LogLevel = LogLevel.DEBUG): GameLogger {
  globalLogger = new GameLogger(gameId, minLogLevel);
  return globalLogger;
}

/**
 * Get global logger
 */
export function getGameLogger(): GameLogger | null {
  return globalLogger;
}

/**
 * Convenience logging functions
 */
export function logInfo(category: LogCategory, message: string, gameState: GameState, data?: any): void {
  globalLogger?.log(LogLevel.INFO, category, message, gameState, data);
}

export function logWarn(category: LogCategory, message: string, gameState: GameState, data?: any): void {
  globalLogger?.log(LogLevel.WARN, category, message, gameState, data);
}

export function logError(category: LogCategory, message: string, gameState: GameState, data?: any): void {
  globalLogger?.log(LogLevel.ERROR, category, message, gameState, data);
}