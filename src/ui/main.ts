/**
 * Main UI application entry point
 */

import { PixiRenderer } from './renderer/PixiRenderer';
import { MapRenderer } from './renderer/MapRenderer';
import { GameController } from './GameController';
import { GameState, Player } from '../core/game';
import { UnitType, PlayerSide } from '../core/game/types';
import { Unit } from '../core/game/Unit';
import { UNIT_DEFINITIONS } from '../core/units/UnitDefinitions';
import { Hex } from '../core/hex';

/**
 * Main UI controller class
 */
class GameUI {
  private renderer!: PixiRenderer;
  private mapRenderer!: MapRenderer;
  private gameState!: GameState;
  private gameController!: GameController;

  async initialize(): Promise<void> {
    console.log('🎮 Initializing USS Wasp Game UI...');

    // Initialize game state
    this.initializeGame();

    // Initialize renderer
    this.initializeRenderer();

    // Initialize game controller
    this.gameController = new GameController(this.gameState, this.renderer, this.mapRenderer);

    // Set up event handlers
    this.setupEventHandlers();

    // Initial render
    this.render();

    // Make game controller globally available for button clicks
    (window as any).gameController = this.gameController;

    console.log('✅ Game UI initialized successfully!');
  }

  private initializeGame(): void {
    // Create demo map
    const map = MapRenderer.createDemoMap();
    this.mapRenderer = new MapRenderer(map);
    this.gameState = new GameState('ui-demo', map);

    // Add players
    const assaultPlayer = new Player('assault', PlayerSide.Assault);
    const defenderPlayer = new Player('defender', PlayerSide.Defender);

    this.gameState.addPlayer(assaultPlayer);
    this.gameState.addPlayer(defenderPlayer);

    // Add demo units for Assault force
    const waspPosition = new Hex(0, 7, -7); // Offshore
    const wasp = new Unit(
      'wasp-1',
      UnitType.USS_WASP,
      PlayerSide.Assault,
      UNIT_DEFINITIONS[UnitType.USS_WASP].stats,
      UNIT_DEFINITIONS[UnitType.USS_WASP].categories,
      UNIT_DEFINITIONS[UnitType.USS_WASP].specialAbilities,
      waspPosition
    );

    const marinePosition = new Hex(2, 5, -7); // On beach
    const marines = new Unit(
      'marines-1',
      UnitType.MARINE_SQUAD,
      PlayerSide.Assault,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].stats,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].categories,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].specialAbilities,
      marinePosition
    );

    const harrierPosition = new Hex(1, 7, -8); // Near Wasp
    const harrier = new Unit(
      'harrier-1',
      UnitType.HARRIER,
      PlayerSide.Assault,
      UNIT_DEFINITIONS[UnitType.HARRIER].stats,
      UNIT_DEFINITIONS[UnitType.HARRIER].categories,
      UNIT_DEFINITIONS[UnitType.HARRIER].specialAbilities,
      harrierPosition
    );

    assaultPlayer.addUnit(wasp);
    assaultPlayer.addUnit(marines);
    assaultPlayer.addUnit(harrier);

    // Add demo units for Defender force
    const defenderPosition1 = new Hex(4, 3, -7); // In urban area
    const defender1 = new Unit(
      'infantry-1',
      UnitType.INFANTRY_SQUAD,
      PlayerSide.Defender,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].stats,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].categories,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].specialAbilities,
      defenderPosition1
    );

    const defenderPosition2 = new Hex(8, 1, -9); // In woods
    const defender2 = new Unit(
      'infantry-2',
      UnitType.INFANTRY_SQUAD,
      PlayerSide.Defender,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].stats,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].categories,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].specialAbilities,
      defenderPosition2
    );

    const atgmPosition = new Hex(6, 2, -8); // On hills
    const atgm = new Unit(
      'atgm-1',
      UnitType.ATGM_TEAM,
      PlayerSide.Defender,
      UNIT_DEFINITIONS[UnitType.ATGM_TEAM].stats,
      UNIT_DEFINITIONS[UnitType.ATGM_TEAM].categories,
      UNIT_DEFINITIONS[UnitType.ATGM_TEAM].specialAbilities,
      atgmPosition
    );

    defenderPlayer.addUnit(defender1);
    defenderPlayer.addUnit(defender2);
    defenderPlayer.addUnit(atgm);

    // Generate initial command points
    this.gameState.generateCommandPoints();

    console.log('🗺️ Demo game initialized with', 
      assaultPlayer.getLivingUnits().length, 'assault units and',
      defenderPlayer.getLivingUnits().length, 'defender units');
  }

  private initializeRenderer(): void {
    const gameCanvas = document.getElementById('game-canvas');
    if (!gameCanvas) {
      throw new Error('Game canvas element not found');
    }

    // Calculate canvas size
    const rect = gameCanvas.getBoundingClientRect();
    
    this.renderer = new PixiRenderer(gameCanvas, {
      width: rect.width,
      height: rect.height,
      hexSize: 30,
      backgroundColor: 0x0f3460,
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      const newRect = gameCanvas.getBoundingClientRect();
      this.renderer.resize(newRect.width, newRect.height);
    });
  }

  private setupEventHandlers(): void {
    // UI button handlers
    const newGameBtn = document.getElementById('new-game-btn');
    newGameBtn?.addEventListener('click', () => this.newGame());
  }


  private newGame(): void {
    console.log('Starting new game...');
    this.initializeGame();
    
    // Reinitialize game controller
    this.gameController = new GameController(this.gameState, this.renderer, this.mapRenderer);
    (window as any).gameController = this.gameController;
    
    this.render();
    this.updateObjectivesDisplay();
  }

  private render(): void {
    // Render map
    const hexes = this.mapRenderer.getAllHexes();
    this.renderer.renderHexGrid(hexes, (hex) => this.mapRenderer.getTerrainColor(hex));

    // Render units
    this.renderer.renderUnits(this.gameState);
  }


  private updateObjectivesDisplay(): void {
    const objectivesDiv = document.getElementById('objectives-list');
    if (!objectivesDiv) return;

    const objectives = this.mapRenderer.getAllObjectives();
    
    if (objectives.length === 0) {
      objectivesDiv.innerHTML = '<div class="info-item"><span class="info-label">No objectives</span></div>';
      return;
    }

    objectivesDiv.innerHTML = objectives.map(obj => 
      `<div class="info-item">
         <span class="info-label">${obj.type}:</span>
         <span class="info-value">${obj.coordinate}</span>
       </div>`
    ).join('');
  }

}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  const gameUI = new GameUI();
  
  try {
    await gameUI.initialize();
  } catch (error) {
    console.error('Failed to initialize game UI:', error);
    
    // Show error message to user
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.innerHTML = `
        <div class="loading">
          ❌ Failed to initialize game: ${error}
        </div>
      `;
    }
  }
});