/**
 * Game State Visualization Tools
 * Provides text-based and data visualization of game states for debugging
 */

import { GameState } from '../game/GameState';
import { Unit } from '../game/Unit';
import { Player } from '../game/Player';
import { PlayerSide, UnitType } from '../game/types';
import { Hex } from '../hex';
import { GameSnapshot, GameLogger } from './GameLogger';
import { GameStateManager } from './GameStateManager';

export interface VisualizationOptions {
  showHidden: boolean; // Show hidden units
  showHP: boolean; // Show unit HP
  showMovement: boolean; // Show movement indicators
  showCombat: boolean; // Highlight combat-capable units
  mapWidth: number; // Map width for display
  mapHeight: number; // Map height for display
}

export interface UnitVisualization {
  id: string;
  type: UnitType;
  side: PlayerSide;
  position: { q: number; r: number; s: number };
  symbol: string;
  color: 'red' | 'blue' | 'gray' | 'yellow';
  status: string;
  hp: string;
  canAct: boolean;
  isHidden: boolean;
}

export interface MapVisualization {
  width: number;
  height: number;
  grid: string[][];
  units: UnitVisualization[];
  legend: Record<string, string>;
  summary: string;
}

/**
 * Visualizes game states for debugging and analysis
 */
export class GameStateVisualizer {
  private readonly defaultOptions: VisualizationOptions = {
    showHidden: true,
    showHP: true,
    showMovement: false,
    showCombat: false,
    mapWidth: 8,
    mapHeight: 8,
  };

  constructor(private readonly options?: Partial<VisualizationOptions>) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Create a text-based visualization of the game state
   */
  visualizeGameState(gameState: GameState, options?: Partial<VisualizationOptions>): string {
    const opts = { ...this.defaultOptions, ...this.options, ...options };
    const mapViz = this.createMapVisualization(gameState, opts);

    return this.renderTextMap(mapViz, gameState);
  }

  /**
   * Visualize from a snapshot
   */
  visualizeSnapshot(
    snapshot: GameSnapshot,
    stateManager: GameStateManager,
    options?: Partial<VisualizationOptions>
  ): string | null {
    const opts = { ...this.defaultOptions, ...this.options, ...options };
    const restoreResult = stateManager.restoreFromSnapshot(
      snapshot.snapshotId,
      opts.mapWidth,
      opts.mapHeight
    );

    if (!restoreResult.success || !restoreResult.gameState) {
      return `❌ Failed to restore snapshot: ${restoreResult.error}`;
    }

    return this.visualizeGameState(restoreResult.gameState, options);
  }

  /**
   * Create structured map visualization data
   */
  createMapVisualization(gameState: GameState, options: VisualizationOptions): MapVisualization {
    const grid: string[][] = [];
    const units: UnitVisualization[] = [];

    // Initialize empty grid
    for (let r = 0; r < options.mapHeight; r++) {
      grid[r] = [];
      for (let q = 0; q < options.mapWidth; q++) {
        grid[r][q] = '·'; // Empty space
      }
    }

    // Place units on grid
    for (const player of gameState.players.values()) {
      for (const unit of player.units.values()) {
        if (!unit.isAlive()) {
          continue;
        }
        if (unit.isHidden() && !options.showHidden) {
          continue;
        }

        const unitViz = this.createUnitVisualization(unit, options);
        units.push(unitViz);

        // Place on grid if within bounds
        const pos = unit.state.position;
        if (pos.q >= 0 && pos.q < options.mapWidth && pos.r >= 0 && pos.r < options.mapHeight) {
          grid[pos.r][pos.q] = unitViz.symbol;
        }
      }
    }

    return {
      width: options.mapWidth,
      height: options.mapHeight,
      grid,
      units,
      legend: this.createLegend(),
      summary: this.createGameSummary(gameState),
    };
  }

  /**
   * Create visualization data for a single unit
   */
  private createUnitVisualization(unit: Unit, options: VisualizationOptions): UnitVisualization {
    const symbol = this.getUnitSymbol(unit);
    const color = this.getUnitColor(unit);
    const status = this.getUnitStatus(unit, options);
    const hp = options.showHP ? `${unit.state.currentHP}/${unit.stats.hp}` : '';

    return {
      id: unit.id,
      type: unit.type,
      side: unit.side,
      position: unit.state.position,
      symbol,
      color,
      status,
      hp,
      canAct: unit.canAct(),
      isHidden: unit.isHidden(),
    };
  }

  /**
   * Get symbol for unit type
   */
  private getUnitSymbol(unit: Unit): string {
    if (unit.isHidden()) {
      return '?';
    }

    const symbols: Record<string, string> = {
      // Assault units (uppercase)
      uss_wasp: 'W',
      harrier: 'H',
      osprey: 'O',
      super_stallion: 'S',
      super_cobra: 'C',
      lcac: 'L',
      lcu: 'U',
      aav_7: 'A',
      marine_squad: 'M',
      marsoc: 'R',
      humvee: 'V',

      // Defender units (lowercase)
      infantry_squad: 'i',
      atgm_team: 't',
      aa_team: 'a',
      mortar_team: 'm',
      technical: 'v',
      militia_squad: 'l',
      long_range_artillery: 'g',
      artillery: 'g',
      sam_site: 's',
    };

    return symbols[unit.type] || '?';
  }

  /**
   * Get color for unit side
   */
  private getUnitColor(unit: Unit): 'red' | 'blue' | 'gray' | 'yellow' {
    if (unit.isHidden()) {
      return 'gray';
    }
    if (!unit.isAlive()) {
      return 'gray';
    }
    if (unit.state.currentHP < unit.stats.hp) {
      return 'yellow';
    } // Damaged

    return unit.side === PlayerSide.Assault ? 'blue' : 'red';
  }

  /**
   * Get status string for unit
   */
  private getUnitStatus(unit: Unit, options: VisualizationOptions): string {
    const status: string[] = [];

    if (!unit.isAlive()) {
      status.push('KIA');
    } else if (unit.isHidden()) {
      status.push('Hidden');
    }

    if (unit.state.hasActed) {
      status.push('Acted');
    }
    if (unit.state.hasMoved) {
      status.push('Moved');
    }
    if (unit.state.suppressionTokens > 0) {
      status.push(`Suppressed(${unit.state.suppressionTokens})`);
    }

    if (options.showCombat && unit.canAct()) {
      status.push('Ready');
    }

    return status.join(', ') || 'Active';
  }

  /**
   * Create legend for symbols
   */
  private createLegend(): Record<string, string> {
    return {
      // Assault (Blue/Uppercase)
      W: 'USS Wasp',
      H: 'Harrier',
      O: 'Osprey',
      S: 'Super Stallion',
      C: 'Super Cobra',
      A: 'AAV-7',
      M: 'Marines',
      R: 'MARSOC',
      V: 'Humvee',
      L: 'LCAC',
      U: 'LCU',

      // Defender (Red/Lowercase)
      i: 'Infantry',
      t: 'ATGM Team',
      a: 'AA Team',
      m: 'Mortar',
      g: 'Artillery',
      s: 'SAM Site',
      v: 'Technical',
      l: 'Militia',

      // Special
      '?': 'Hidden Unit',
      '·': 'Empty',
    };
  }

  /**
   * Create game summary
   */
  private createGameSummary(gameState: GameState): string {
    const assaultPlayer = Array.from(gameState.players.values()).find(
      p => p.side === PlayerSide.Assault
    );
    const defenderPlayer = Array.from(gameState.players.values()).find(
      p => p.side === PlayerSide.Defender
    );

    const assaultAlive = assaultPlayer?.getLivingUnits().length || 0;
    const defenderAlive = defenderPlayer?.getLivingUnits().length || 0;

    return `Turn ${gameState.turn} - ${gameState.phase} | Assault: ${assaultAlive} | Defender: ${defenderAlive}`;
  }

  /**
   * Render text-based map
   */
  private renderTextMap(mapViz: MapVisualization, gameState: GameState): string {
    const lines: string[] = [];

    // Header
    lines.push('🗺️  GAME STATE VISUALIZATION');
    lines.push('═══════════════════════════');
    lines.push(mapViz.summary);
    lines.push('');

    // Map grid with coordinates
    lines.push(
      `   ${Array.from({ length: mapViz.width }, (_, i) => i.toString().padStart(2)).join('')}`
    );

    for (let r = 0; r < mapViz.height; r++) {
      const row = `${r.toString().padStart(2)} ${mapViz.grid[r].map(cell => ` ${cell}`).join('')}`;
      lines.push(row);
    }

    lines.push('');

    // Unit details
    if (mapViz.units.length > 0) {
      lines.push('📋 UNIT DETAILS:');
      lines.push('─────────────────');

      // Group by side
      const assaultUnits = mapViz.units.filter(u => u.side === PlayerSide.Assault);
      const defenderUnits = mapViz.units.filter(u => u.side === PlayerSide.Defender);

      if (assaultUnits.length > 0) {
        lines.push('🔵 ASSAULT FORCES:');
        assaultUnits.forEach(unit => {
          const pos = `(${unit.position.q},${unit.position.r})`;
          const hp = unit.hp ? ` ${unit.hp}HP` : '';
          const status = unit.status ? ` [${unit.status}]` : '';
          lines.push(`   ${unit.symbol} ${unit.type} ${pos}${hp}${status}`);
        });
        lines.push('');
      }

      if (defenderUnits.length > 0) {
        lines.push('🔴 DEFENDER FORCES:');
        defenderUnits.forEach(unit => {
          const pos = `(${unit.position.q},${unit.position.r})`;
          const hp = unit.hp ? ` ${unit.hp}HP` : '';
          const status = unit.status ? ` [${unit.status}]` : '';
          lines.push(`   ${unit.symbol} ${unit.type} ${pos}${hp}${status}`);
        });
        lines.push('');
      }
    }

    // Legend
    lines.push('📚 LEGEND:');
    lines.push('──────────');
    Object.entries(mapViz.legend).forEach(([symbol, meaning]) => {
      lines.push(`   ${symbol} = ${meaning}`);
    });

    return lines.join('\n');
  }

  /**
   * Compare two snapshots visually
   */
  compareSnapshots(
    snapshot1: GameSnapshot,
    snapshot2: GameSnapshot,
    stateManager: GameStateManager
  ): string {
    const viz1 = this.visualizeSnapshot(snapshot1, stateManager);
    const viz2 = this.visualizeSnapshot(snapshot2, stateManager);

    if (!viz1 || !viz2) {
      return '❌ Failed to visualize one or both snapshots';
    }

    const lines: string[] = [];
    lines.push('🔄 SNAPSHOT COMPARISON');
    lines.push('═══════════════════════');
    lines.push(`From: ${snapshot1.description} (T${snapshot1.turn})`);
    lines.push(`To:   ${snapshot2.description} (T${snapshot2.turn})`);
    lines.push('');
    lines.push('BEFORE:');
    lines.push('-------');
    lines.push(viz1);
    lines.push('');
    lines.push('AFTER:');
    lines.push('------');
    lines.push(viz2);

    return lines.join('\n');
  }

  /**
   * Export visualization as JSON for external tools
   */
  exportVisualization(gameState: GameState, options?: Partial<VisualizationOptions>): string {
    const opts = { ...this.defaultOptions, ...this.options, ...options };
    const mapViz = this.createMapVisualization(gameState, opts);

    return JSON.stringify(
      {
        gameId: gameState.gameId,
        turn: gameState.turn,
        phase: gameState.phase,
        visualization: mapViz,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

/**
 * Quick visualization function for debugging
 */
export function quickVisualize(gameState: GameState): void {
  const visualizer = new GameStateVisualizer();
  console.log(visualizer.visualizeGameState(gameState));
}

/**
 * Visualize from logger snapshots
 */
export function visualizeFromLogger(logger: GameLogger, snapshotId?: string): void {
  const stateManager = new GameStateManager(logger);
  const visualizer = new GameStateVisualizer();

  if (snapshotId) {
    const snapshot = logger.getSnapshot(snapshotId);
    if (snapshot) {
      const viz = visualizer.visualizeSnapshot(snapshot, stateManager);
      if (viz) {
        console.log(viz);
      }
    } else {
      console.log(`❌ Snapshot ${snapshotId} not found`);
    }
  } else {
    // Show latest snapshot
    const snapshots = logger.getSnapshots();
    if (snapshots.length > 0) {
      const latest = snapshots[snapshots.length - 1];
      const viz = visualizer.visualizeSnapshot(latest, stateManager);
      if (viz) {
        console.log(viz);
      }
    } else {
      console.log('❌ No snapshots available');
    }
  }
}
