/**
 * Main UI application entry point
 */

import { PixiRenderer } from './renderer/PixiRenderer';
import { MapRenderer } from './renderer/MapRenderer';
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
  private selectedUnit?: Unit;

  async initialize(): Promise<void> {
    console.log('🎮 Initializing USS Wasp Game UI...');

    // Initialize game state
    this.initializeGame();

    // Initialize renderer
    this.initializeRenderer();

    // Set up event handlers
    this.setupEventHandlers();

    // Initial render
    this.render();

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
    // Hex selection
    (this.renderer.getApp().view as EventTarget).addEventListener('hexSelected', (event: any) => {
      const hex = event.detail as Hex;
      this.onHexSelected(hex);
    });

    // Unit selection
    (this.renderer.getApp().view as EventTarget).addEventListener('unitSelected', (event: any) => {
      const unit = event.detail as Unit;
      this.onUnitSelected(unit);
    });

    // UI button handlers
    const nextPhaseBtn = document.getElementById('next-phase-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    const newGameBtn = document.getElementById('new-game-btn');

    nextPhaseBtn?.addEventListener('click', () => this.nextPhase());
    endTurnBtn?.addEventListener('click', () => this.endTurn());
    newGameBtn?.addEventListener('click', () => this.newGame());
  }

  private onHexSelected(hex: Hex): void {
    console.log('Hex selected:', hex.q, hex.r);
    
    // Update hex info display
    this.updateHexInfo(hex);
    
    // If we have a selected unit, try to move it
    if (this.selectedUnit && this.selectedUnit.canMove()) {
      this.moveUnit(this.selectedUnit, hex);
    }
  }

  private onUnitSelected(unit: Unit): void {
    console.log('Unit selected:', unit.type, unit.id);
    this.selectedUnit = unit;
    this.updateUnitInfo(unit);
  }

  private moveUnit(unit: Unit, targetHex: Hex): void {
    // Simple movement - just move to target (no pathfinding for now)
    unit.moveTo(targetHex);
    this.render();
    
    console.log(`Moved ${unit.type} to (${targetHex.q}, ${targetHex.r})`);
    
    // Update unit info
    this.updateUnitInfo(unit);
  }

  private nextPhase(): void {
    this.gameState.nextPhase();
    this.updateGameStatusDisplay();
    
    console.log(`Advanced to ${this.gameState.phase} phase`);
  }

  private endTurn(): void {
    // Advance through remaining phases to end turn
    while (this.gameState.phase !== 'event') {
      this.gameState.nextPhase();
    }
    this.updateGameStatusDisplay();
    
    console.log(`Turn ${this.gameState.turn} started`);
  }

  private newGame(): void {
    console.log('Starting new game...');
    this.initializeGame();
    this.render();
    this.updateAllDisplays();
  }

  private render(): void {
    // Render map
    const hexes = this.mapRenderer.getAllHexes();
    this.renderer.renderHexGrid(hexes, (hex) => this.mapRenderer.getTerrainColor(hex));

    // Render units
    this.renderer.renderUnits(this.gameState);
  }

  private updateHexInfo(hex: Hex): void {
    const hexInfo = this.mapRenderer.getHexInfo(hex);
    const unitInfoDiv = document.getElementById('unit-info');
    
    if (unitInfoDiv) {
      unitInfoDiv.innerHTML = `
        <div class="info-item">
          <span class="info-label">Hex:</span>
          <span class="info-value">${hexInfo.coordinate}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Terrain:</span>
          <span class="info-value">${hexInfo.terrain}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Movement:</span>
          <span class="info-value">${hexInfo.movementCost} MP</span>
        </div>
        <div class="info-item">
          <span class="info-label">Defense:</span>
          <span class="info-value">+${hexInfo.defenseBonus}</span>
        </div>
        ${hexInfo.objective ? `
        <div class="info-item">
          <span class="info-label">Objective:</span>
          <span class="info-value">${hexInfo.objective.type}</span>
        </div>
        ` : ''}
      `;
    }
  }

  private updateUnitInfo(unit: Unit): void {
    const unitInfoDiv = document.getElementById('unit-info');
    
    if (unitInfoDiv) {
      const unitName = unit.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      unitInfoDiv.innerHTML = `
        <div class="info-item">
          <span class="info-label">Unit:</span>
          <span class="info-value">${unitName}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Side:</span>
          <span class="info-value">${unit.side}</span>
        </div>
        <div class="info-item">
          <span class="info-label">HP:</span>
          <span class="info-value">${unit.state.currentHP}/${unit.stats.hp}</span>
        </div>
        <div class="info-item">
          <span class="info-label">ATK:</span>
          <span class="info-value">${unit.getEffectiveAttack()}</span>
        </div>
        <div class="info-item">
          <span class="info-label">DEF:</span>
          <span class="info-value">${unit.stats.def}</span>
        </div>
        <div class="info-item">
          <span class="info-label">MV:</span>
          <span class="info-value">${unit.getEffectiveMovement()}</span>
        </div>
        ${unit.state.suppressionTokens > 0 ? `
        <div class="info-item">
          <span class="info-label">Suppression:</span>
          <span class="info-value">${unit.state.suppressionTokens}</span>
        </div>
        ` : ''}
      `;
    }
  }

  private updateGameStatusDisplay(): void {
    const turnDisplay = document.getElementById('turn-display');
    const phaseDisplay = document.getElementById('phase-display');
    const activePlayerDisplay = document.getElementById('active-player');

    if (turnDisplay) turnDisplay.textContent = this.gameState.turn.toString();
    if (phaseDisplay) phaseDisplay.textContent = this.gameState.phase.charAt(0).toUpperCase() + this.gameState.phase.slice(1);
    
    const activePlayer = this.gameState.getActivePlayer();
    if (activePlayerDisplay && activePlayer) {
      activePlayerDisplay.textContent = activePlayer.side.charAt(0).toUpperCase() + activePlayer.side.slice(1);
    }

    // Update player stats
    const assaultPlayer = this.gameState.getPlayerBySide(PlayerSide.Assault);
    const defenderPlayer = this.gameState.getPlayerBySide(PlayerSide.Defender);

    if (assaultPlayer) {
      const assaultCPDisplay = document.getElementById('assault-cp');
      const assaultUnitsDisplay = document.getElementById('assault-units');
      if (assaultCPDisplay) assaultCPDisplay.textContent = assaultPlayer.commandPoints.toString();
      if (assaultUnitsDisplay) assaultUnitsDisplay.textContent = assaultPlayer.getLivingUnits().length.toString();
    }

    if (defenderPlayer) {
      const defenderCPDisplay = document.getElementById('defender-cp');
      const defenderUnitsDisplay = document.getElementById('defender-units');
      if (defenderCPDisplay) defenderCPDisplay.textContent = defenderPlayer.commandPoints.toString();
      if (defenderUnitsDisplay) defenderUnitsDisplay.textContent = defenderPlayer.getLivingUnits().length.toString();
    }
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

  private updateAllDisplays(): void {
    this.updateGameStatusDisplay();
    this.updateObjectivesDisplay();
    
    // Clear unit/hex info
    const unitInfoDiv = document.getElementById('unit-info');
    if (unitInfoDiv) {
      unitInfoDiv.innerHTML = '<div class="info-item"><span class="info-label">No unit selected</span></div>';
    }
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