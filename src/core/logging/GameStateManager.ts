/**
 * Game State Management System
 * Handles saving, loading, and restoring game states from snapshots
 */

import { GameState } from '../game/GameState';
import { GameMap } from '../game/Map';
import { Player } from '../game/Player';
import { Unit } from '../game/Unit';
import { PlayerSide, UnitType } from '../game/types';
import { Hex } from '../hex';
import { getUnitTemplate } from '../units/UnitDefinitions';
import { GameSnapshot, GameLogger } from './GameLogger';

export interface GameStateRestoreResult {
  success: boolean;
  gameState?: GameState;
  error?: string;
}

export interface GameStateManagerOptions {
  autoSnapshot: boolean;          // Automatically create snapshots at turn boundaries
  maxSnapshots: number;           // Maximum number of snapshots to keep
  snapshotInterval: number;       // Create snapshot every N turns
}

/**
 * Manages game state persistence and restoration
 */
export class GameStateManager {
  private options: GameStateManagerOptions;

  constructor(
    private logger: GameLogger,
    options?: Partial<GameStateManagerOptions>
  ) {
    this.options = {
      autoSnapshot: true,
      maxSnapshots: 50,
      snapshotInterval: 1,
      ...options
    };
  }

  /**
   * Create an automatic snapshot if conditions are met
   */
  checkAutoSnapshot(gameState: GameState): string | null {
    if (!this.options.autoSnapshot) return null;
    
    const shouldSnapshot = gameState.turn % this.options.snapshotInterval === 0;
    if (!shouldSnapshot) return null;

    const description = `Auto-snapshot T${gameState.turn}:${gameState.phase}`;
    const snapshotId = this.logger.createSnapshot(gameState, description);
    
    // Clean up old snapshots if we have too many
    this.cleanupOldSnapshots();
    
    return snapshotId;
  }

  /**
   * Restore game state from a snapshot
   */
  restoreFromSnapshot(snapshotId: string, mapWidth: number = 8, mapHeight: number = 8): GameStateRestoreResult {
    const snapshot = this.logger.getSnapshot(snapshotId);
    if (!snapshot) {
      return { success: false, error: `Snapshot ${snapshotId} not found` };
    }

    try {
      const gameState = this.deserializeGameState(snapshot.gameState, mapWidth, mapHeight);
      return { success: true, gameState };
    } catch (error) {
      return { 
        success: false, 
        error: `Failed to restore snapshot: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Deserialize a saved game state
   */
  private deserializeGameState(serializedState: any, mapWidth: number, mapHeight: number): GameState {
    // Create new game map (we don't serialize terrain yet)
    const map = new GameMap(mapWidth, mapHeight);
    
    // Create new game state
    const gameState = new GameState(
      serializedState.gameId,
      map,
      serializedState.maxTurns
    );

    // Restore basic game state
    gameState.turn = serializedState.turn;
    gameState.phase = serializedState.phase;
    gameState.activePlayerId = serializedState.activePlayerId;
    gameState.isGameOver = serializedState.isGameOver;
    gameState.winner = serializedState.winner;

    // Restore players and their units
    for (const playerData of serializedState.players) {
      const player = new Player(playerData.id, playerData.side);
      player.commandPoints = playerData.commandPoints;

      // Restore units for this player
      for (const unitData of playerData.units) {
        const unit = this.deserializeUnit(unitData);
        player.addUnit(unit);
      }

      gameState.addPlayer(player);
    }

    return gameState;
  }

  /**
   * Deserialize a unit from saved data
   */
  private deserializeUnit(unitData: any): Unit {
    // Get unit template
    const template = getUnitTemplate(unitData.type as UnitType);
    
    // Create position hex
    const position = new Hex(unitData.position.q, unitData.position.r, unitData.position.s);
    
    // Create unit
    const unit = new Unit(
      unitData.id,
      template.type,
      unitData.side as PlayerSide,
      template.stats,
      template.categories,
      template.specialAbilities,
      position
    );

    // Restore unit state
    unit.state.currentHP = unitData.currentHP;
    unit.state.hasActed = unitData.hasActed;
    unit.state.hasMoved = unitData.hasMoved;
    unit.state.suppressionTokens = unitData.suppressionTokens;
    // Restore hidden status
    if (unitData.isHidden) {
      unit.hide();
    }
    
    // Restore status effects
    unit.state.statusEffects.clear();
    if (unitData.statusEffects) {
      for (const effect of unitData.statusEffects) {
        unit.state.statusEffects.add(effect);
      }
    }

    // Restore cargo
    if (unitData.cargo) {
      unit.state.cargo = unitData.cargo;
    }

    return unit;
  }

  /**
   * Export a snapshot to a file-friendly format
   */
  exportSnapshot(snapshotId: string): string | null {
    const snapshot = this.logger.getSnapshot(snapshotId);
    if (!snapshot) return null;

    return JSON.stringify({
      ...snapshot,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    }, null, 2);
  }

  /**
   * Import a snapshot from exported data
   */
  importSnapshot(exportedData: string): string | null {
    try {
      const data = JSON.parse(exportedData);
      
      // Validate the data structure
      if (!data.snapshotId || !data.gameState) {
        throw new Error('Invalid snapshot data format');
      }

      // Create a new snapshot in the logger
      const snapshot: GameSnapshot = {
        snapshotId: data.snapshotId,
        timestamp: data.timestamp,
        gameId: data.gameId,
        turn: data.turn,
        phase: data.phase,
        gameState: data.gameState,
        description: data.description + ' (imported)'
      };

      // Add to logger's snapshots
      (this.logger as any).snapshots.push(snapshot);
      
      return snapshot.snapshotId;
    } catch (error) {
      console.error('Failed to import snapshot:', error);
      return null;
    }
  }

  /**
   * Get snapshot diff between two snapshots
   */
  getSnapshotDiff(fromSnapshotId: string, toSnapshotId: string): any {
    const fromSnapshot = this.logger.getSnapshot(fromSnapshotId);
    const toSnapshot = this.logger.getSnapshot(toSnapshotId);
    
    if (!fromSnapshot || !toSnapshot) {
      return null;
    }

    const diff = {
      turnDiff: toSnapshot.turn - fromSnapshot.turn,
      phaseDiff: `${fromSnapshot.phase} → ${toSnapshot.phase}`,
      timeDiff: toSnapshot.timestamp - fromSnapshot.timestamp,
      playerChanges: this.comparePlayerStates(fromSnapshot.gameState, toSnapshot.gameState),
      summary: `${fromSnapshot.description} → ${toSnapshot.description}`
    };

    return diff;
  }

  /**
   * Compare player states between two snapshots
   */
  private comparePlayerStates(fromState: any, toState: any): any {
    const changes: any = {};
    
    for (const fromPlayer of fromState.players) {
      const toPlayer = toState.players.find((p: any) => p.id === fromPlayer.id);
      if (!toPlayer) continue;

      const playerChanges: any = {};
      
      // Compare command points
      if (fromPlayer.commandPoints !== toPlayer.commandPoints) {
        playerChanges.commandPoints = {
          from: fromPlayer.commandPoints,
          to: toPlayer.commandPoints,
          diff: toPlayer.commandPoints - fromPlayer.commandPoints
        };
      }

      // Compare unit counts
      if (fromPlayer.units.length !== toPlayer.units.length) {
        playerChanges.unitCount = {
          from: fromPlayer.units.length,
          to: toPlayer.units.length,
          diff: toPlayer.units.length - fromPlayer.units.length
        };
      }

      // Find unit changes
      const unitChanges: any = {};
      for (const fromUnit of fromPlayer.units) {
        const toUnit = toPlayer.units.find((u: any) => u.id === fromUnit.id);
        if (!toUnit) {
          unitChanges[fromUnit.id] = { status: 'destroyed', type: fromUnit.type };
        } else if (fromUnit.currentHP !== toUnit.currentHP) {
          unitChanges[fromUnit.id] = {
            status: 'damaged',
            type: fromUnit.type,
            hpChange: toUnit.currentHP - fromUnit.currentHP
          };
        }
      }

      if (Object.keys(unitChanges).length > 0) {
        playerChanges.units = unitChanges;
      }

      if (Object.keys(playerChanges).length > 0) {
        changes[fromPlayer.id] = playerChanges;
      }
    }

    return changes;
  }

  /**
   * Clean up old snapshots to stay within limits
   */
  private cleanupOldSnapshots(): void {
    const snapshots = this.logger.getSnapshots();
    if (snapshots.length <= this.options.maxSnapshots) return;

    // Remove oldest snapshots
    const toRemove = snapshots.length - this.options.maxSnapshots;
    (this.logger as any).snapshots.splice(0, toRemove);
  }

  /**
   * Get available snapshots with metadata
   */
  getAvailableSnapshots(): Array<{
    snapshotId: string;
    description: string;
    turn: number;
    phase: string;
    timestamp: number;
    timeSince: string;
  }> {
    const now = Date.now();
    return this.logger.getSnapshots().map(snapshot => ({
      snapshotId: snapshot.snapshotId,
      description: snapshot.description,
      turn: snapshot.turn,
      phase: snapshot.phase,
      timestamp: snapshot.timestamp,
      timeSince: this.formatTimeSince(now - snapshot.timestamp)
    }));
  }

  /**
   * Format time since as human readable
   */
  private formatTimeSince(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s ago`;
    return `${seconds}s ago`;
  }
}

/**
 * Create a test scenario with logging
 */
export function createTestScenarioWithLogging(gameId: string): {
  gameState: GameState;
  logger: GameLogger;
  stateManager: GameStateManager;
} {
  const map = new GameMap(8, 8);
  const gameState = new GameState(gameId, map, 20);
  
  // Initialize logging
  const logger = new GameLogger(gameId);
  const stateManager = new GameStateManager(logger);
  
  return { gameState, logger, stateManager };
}