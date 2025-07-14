/**
 * Enhanced game controller with full rule implementation
 */

import { Hex } from '../core/hex';
import { GameState, Unit, Player } from '../core/game';
import { GameEngine, ActionResult } from '../core/game/GameEngine';
import { WaspOperationalLevel } from '../core/game/WaspOperations';
import { Fortification } from '../core/game/Map';
import {
  ActionType,
  TurnPhase,
  PlayerSide,
  UnitType,
  UnitCategory,
  StatusEffect,
  TerrainType,
} from '../core/game/types';
import { PixiRenderer } from './renderer/PixiRenderer';
import { MapRenderer } from './renderer/MapRenderer';
import { 
  FortificationPalette, 
  FortificationType, 
  DEFAULT_FORTIFICATION_CONFIG 
} from './components/FortificationUI';

/**
 * UI modes for different interaction states
 */
export enum UIMode {
  NORMAL = 'normal',
  UNIT_SELECTED = 'unit_selected',
  MOVE_TARGET = 'move_target',
  ATTACK_TARGET = 'attack_target',
  LOAD_TARGET = 'load_target',
  UNLOAD_TARGET = 'unload_target',
  ABILITY_TARGET = 'ability_target',
  FORTIFICATION_PLACEMENT = 'fortification_placement',
}

/**
 * Enhanced game controller with full rules
 */
export class GameController {
  private readonly gameEngine: GameEngine;
  private selectedUnit: Unit | undefined;
  private uiMode: UIMode = UIMode.NORMAL;
  private pendingAbility: string | undefined;
  private readonly actionHistory: ActionResult[] = [];
  private fortificationPalette: FortificationPalette | null = null;
  private selectedFortificationType: FortificationType | null = null;

  public constructor(
    private readonly gameState: GameState,
    private readonly renderer: PixiRenderer,
    private readonly mapRenderer: MapRenderer
  ) {
    this.gameEngine = new GameEngine(gameState);
    this.setupGameEventListeners();

    // Initialize displays
    this.updateGameStatusDisplay();
    this.updateWaspDisplay();
    this.initializeFortificationSystem();
  }

  /**
   * Set up event listeners for game interactions
   */
  private setupGameEventListeners(): void {
    // Hex selection events
    (this.renderer.getApp().view as EventTarget).addEventListener('hexSelected', (event: Event) => {
      const customEvent = event as CustomEvent<Hex>;
      const hex = customEvent.detail;
      this.onHexSelected(hex);
    });

    // Unit selection events
    (this.renderer.getApp().view as EventTarget).addEventListener(
      'unitSelected',
      (event: Event) => {
        const customEvent = event as CustomEvent<Unit>;
        const unit = customEvent.detail;
        this.onUnitSelected(unit);
      }
    );
  }

  /**
   * Handle hex selection based on current UI mode
   */
  private onHexSelected(hex: Hex): void {
    switch (this.uiMode) {
      case UIMode.NORMAL:
        this.displayHexInfo(hex);
        break;
      case UIMode.MOVE_TARGET:
        this.attemptMove(hex);
        break;
      case UIMode.ATTACK_TARGET:
        this.attemptAttackAtHex(hex);
        break;
      case UIMode.LOAD_TARGET:
        this.attemptLoad(hex);
        break;
      case UIMode.UNLOAD_TARGET:
        this.attemptUnload(hex);
        break;
      case UIMode.ABILITY_TARGET:
        this.attemptAbilityAtHex(hex);
        break;
      case UIMode.FORTIFICATION_PLACEMENT:
        this.onHexClickForFortification(hex);
        break;
      default:
        this.displayHexInfo(hex);
    }
  }

  /**
   * Handle unit selection
   */
  private onUnitSelected(unit: Unit): void {
    // Check if it's the active player's unit
    const activePlayer = this.gameState.getActivePlayer();
    if (!activePlayer || unit.side !== activePlayer.side) {
      this.showMessage('Not your unit', 'error');
      return;
    }

    this.selectedUnit = unit;
    this.uiMode = UIMode.UNIT_SELECTED;
    this.updateUnitActionButtons(unit);
    this.displayUnitInfo(unit);

    // Highlight valid movement hexes
    this.highlightValidMoves(unit);
  }

  /**
   * Attempt to move selected unit to target hex
   */
  private attemptMove(targetHex: Hex): void {
    if (!this.selectedUnit) {
      return;
    }

    const action = {
      type: ActionType.MOVE,
      playerId: this.gameState.activePlayerId,
      unitId: this.selectedUnit.id,
      targetPosition: targetHex,
    };

    const result = this.gameEngine.executeAction(action);
    this.handleActionResult(result);

    if (result.success) {
      this.render();
      this.resetUIModeInternal();
    }
  }

  /**
   * Attempt load action
   */
  private attemptLoad(targetHex: Hex): void {
    if (!this.selectedUnit) {
      return;
    }

    const targets = this.gameState.getUnitsAt(targetHex);
    const transportableUnits = targets.filter(
      unit =>
        this.selectedUnit && unit.side === this.selectedUnit.side && unit !== this.selectedUnit
    );

    if (transportableUnits.length === 0) {
      this.showMessage('No transportable units at target hex', 'error');
      return;
    }

    // Load the first available unit
    const target = transportableUnits[0];

    const action = {
      type: ActionType.LOAD,
      playerId: this.gameState.activePlayerId,
      unitId: this.selectedUnit.id,
      targetId: target.id,
    };

    const result = this.gameEngine.executeAction(action);
    this.handleActionResult(result);

    if (result.success) {
      this.render();
      this.resetUIModeInternal();
    }
  }

  /**
   * Attempt unload action
   */
  private attemptUnload(targetHex: Hex): void {
    if (!this.selectedUnit) {
      return;
    }

    const action = {
      type: ActionType.UNLOAD,
      playerId: this.gameState.activePlayerId,
      unitId: this.selectedUnit.id,
      targetPosition: targetHex,
    };

    const result = this.gameEngine.executeAction(action);
    this.handleActionResult(result);

    if (result.success) {
      this.render();
      this.resetUIModeInternal();
    }
  }

  /**
   * Attempt attack at target hex
   */
  private attemptAttackAtHex(targetHex: Hex): void {
    if (!this.selectedUnit) {
      return;
    }

    const targets = this.gameState.getUnitsAt(targetHex);
    const enemyTargets = targets.filter(
      unit => this.selectedUnit && unit.side !== this.selectedUnit.side
    );

    if (enemyTargets.length === 0) {
      this.showMessage('No enemy units at target hex', 'error');
      return;
    }

    // For now, attack the first enemy unit
    const target = enemyTargets[0];

    const action = {
      type: ActionType.ATTACK,
      playerId: this.gameState.activePlayerId,
      unitId: this.selectedUnit.id,
      targetId: target.id,
    };

    const result = this.gameEngine.executeAction(action);
    this.handleActionResult(result);

    if (result.success) {
      this.render();
      this.resetUIModeInternal();
    }
  }

  /**
   * Attempt special ability at target hex
   */
  private attemptAbilityAtHex(targetHex: Hex): void {
    if (!this.selectedUnit || !this.pendingAbility) {
      return;
    }

    const action = {
      type: ActionType.SPECIAL_ABILITY,
      playerId: this.gameState.activePlayerId,
      unitId: this.selectedUnit.id,
      data: {
        abilityName: this.pendingAbility,
        targetHex: targetHex,
      },
    };

    const result = this.gameEngine.executeAction(action);
    this.handleActionResult(result);

    if (result.success) {
      this.render();
      this.resetUIModeInternal();
    }
  }

  /**
   * Handle action result and provide feedback
   */
  private handleActionResult(result: ActionResult): void {
    this.actionHistory.push(result);

    if (result.success) {
      this.showMessage(`✅ ${result.message}`, 'success');
      this.updateGameStatusDisplay();
      this.updateWaspDisplay();
    } else {
      this.showMessage(`❌ ${result.message}`, 'error');
    }
  }

  /**
   * Update all game status displays
   */
  private updateGameStatusDisplay(): void {
    this.updateElement('turn-display', this.gameState.turn.toString());
    this.updateElement('phase-display', this.gameState.phase);

    const activePlayer = this.gameState.getActivePlayer();
    this.updateElement('active-player', activePlayer ? activePlayer.side : 'None');

    // Update player stats
    const assaultPlayer = this.gameState.getPlayerBySide(PlayerSide.Assault);
    const defenderPlayer = this.gameState.getPlayerBySide(PlayerSide.Defender);

    if (assaultPlayer) {
      this.updateElement('assault-cp', assaultPlayer.commandPoints.toString());
      this.updateElement('assault-units', assaultPlayer.getLivingUnits().length.toString());
    }

    if (defenderPlayer) {
      this.updateElement('defender-cp', defenderPlayer.commandPoints.toString());
      this.updateElement('defender-units', defenderPlayer.getLivingUnits().length.toString());
    }

    // Check for victory conditions
    if (this.gameState.isGameOver) {
      this.showGameEndScreen();
    }
  }

  /**
   * Update USS Wasp status display
   */
  private updateWaspDisplay(): void {
    const assaultPlayer = this.gameState.getPlayerBySide(PlayerSide.Assault);
    if (!assaultPlayer) {
      return;
    }

    const waspUnit = assaultPlayer.getLivingUnits().find(unit => unit.type === UnitType.USS_WASP);
    if (!waspUnit) {
      this.updateElement(
        'wasp-status',
        '<div class="info-item"><span class="info-label">No USS Wasp</span></div>'
      );
      return;
    }

    const waspStatus = this.gameState.getWaspStatus();
    if (!waspStatus) {
      return;
    }

    const statusClass = this.getStatusClass(waspStatus.flightDeck);
    const wellStatusClass = this.getStatusClass(waspStatus.wellDeck);
    const c2StatusClass = this.getStatusClass(waspStatus.c2System);

    const statusHtml = `
      <div class="info-item">
        <span class="info-label">Structural:</span>
        <span class="info-value">${waspStatus.structuralIntegrity}/${waspUnit.stats.hp} HP</span>
      </div>
      <div class="info-item">
        <span class="info-label">Flight Deck:</span>
        <span class="info-value ${statusClass}">${waspStatus.flightDeck}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Well Deck:</span>
        <span class="info-value ${wellStatusClass}">${waspStatus.wellDeck}</span>
      </div>
      <div class="info-item">
        <span class="info-label">C2 System:</span>
        <span class="info-value ${c2StatusClass}">${waspStatus.c2System}</span>
      </div>
    `;

    this.updateElement('wasp-status', statusHtml);

    // Update launch capacities
    // Note: Launch counts would need to be tracked separately in WaspOperations
    // For now, show capacity based on operational level
    const flightCapacity = this.getCapacityForStatus(waspStatus.flightDeck);
    const wellCapacity = this.getCapacityForStatus(waspStatus.wellDeck);

    this.updateElement('flight-deck-capacity', `0/${flightCapacity}`);
    this.updateElement('well-deck-capacity', `0/${wellCapacity}`);

    // Update cargo display
    this.updateWaspCargoDisplay(waspUnit);
  }

  /**
   * Update Wasp cargo display
   */
  private updateWaspCargoDisplay(waspUnit: Unit): void {
    const cargoDisplay = waspUnit.state.cargo
      .map(
        cargoUnit =>
          `<div class="info-item">
        <span class="info-label">${cargoUnit.type}:</span>
        <span class="info-value">${cargoUnit.id}</span>
      </div>`
      )
      .join('');

    this.updateElement(
      'wasp-cargo',
      cargoDisplay || '<div class="info-item"><span class="info-label">No cargo</span></div>'
    );
  }

  /**
   * Show game end screen
   */
  private showGameEndScreen(): void {
    const winnerId = this.gameState.winner;
    if (winnerId) {
      const winnerPlayer = this.gameState.getPlayer(winnerId);
      this.showMessage(
        `Game Over! ${winnerPlayer ? `${winnerPlayer.side} wins!` : `Player ${winnerId} wins!`}`,
        'info'
      );
    } else {
      this.showMessage('Game Over! Draw!', 'info');
    }
  }

  /**
   * Show message to user
   */
  private showMessage(message: string, type: 'info' | 'success' | 'error'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);

    // Display in UI message area
    const messageDiv = document.getElementById('game-message');
    if (messageDiv) {
      messageDiv.className = `message message-${type}`;
      messageDiv.textContent = message;

      // Auto-clear after 3 seconds
      setTimeout(() => {
        messageDiv.className = 'message';
        messageDiv.textContent = '';
      }, 3000);
    }
  }

  /**
   * Helper to update DOM element content
   */
  private updateElement(id: string, content: string): void {
    const element = document.getElementById(id);
    if (element) {
      element.innerHTML = content;
    }
  }

  /**
   * Reset UI mode to normal (internal)
   */
  private resetUIModeInternal(): void {
    this.uiMode = UIMode.NORMAL;
    this.selectedUnit = undefined;
    this.pendingAbility = undefined;
    this.clearHighlights();
    this.updateActionButtons();
  }

  /**
   * Highlight valid movement hexes for unit
   */
  private highlightValidMoves(unit: Unit): void {
    if (!unit.canMove()) {
      return;
    }

    const validHexes: Hex[] = [];
    const movement = unit.getEffectiveMovement();
    const currentPos = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s);

    // Check all hexes within movement range
    for (const hex of currentPos.range(movement)) {
      if (hex.equals(currentPos)) {
        continue;
      }

      const path = this.gameEngine.calculateMovementPath(unit, hex);
      if (path.valid) {
        validHexes.push(hex);
      }
    }

    // Render highlights (this would be implemented in the renderer)
    this.renderer.highlightHexes(validHexes, 'movement');
  }

  /**
   * Update unit action buttons based on unit capabilities
   */
  private updateUnitActionButtons(unit: Unit): void {
    const actionButtons = document.getElementById('unit-actions');
    if (!actionButtons) {
      return;
    }

    const buttons: string[] = [];

    // Movement button
    if (unit.canMove() && this.isValidPhase(ActionType.MOVE)) {
      buttons.push('<button onclick="gameController.startMove()">Move</button>');
    }

    // Attack button
    if (unit.canAct() && this.isValidPhase(ActionType.ATTACK)) {
      buttons.push('<button onclick="gameController.startAttack()">Attack</button>');
    }

    // Special abilities
    for (const ability of unit.specialAbilities) {
      if (this.canUseAbility(unit, ability.name)) {
        buttons.push(
          `<button onclick="gameController.useAbility('${ability.name}')">${ability.name}</button>`
        );
      }
    }

    // Load/Unload for transports
    if (unit.getCargoCapacity() > 0) {
      buttons.push('<button onclick="gameController.startLoad()">Load</button>');
      if (unit.state.cargo.length > 0) {
        buttons.push('<button onclick="gameController.startUnload()">Unload</button>');
      }
    }

    // Hide/Reveal for eligible units
    if (unit.isHidden()) {
      buttons.push('<button onclick="gameController.revealUnit()">Reveal</button>');
    } else if (unit.canBeHidden()) {
      buttons.push('<button onclick="gameController.hideUnit()">Hide</button>');
    }

    actionButtons.innerHTML = buttons.join('');
  }

  /**
   * Update general action buttons
   */
  private updateActionButtons(): void {
    const phaseButtons = document.getElementById('phase-actions');
    if (!phaseButtons) {
      return;
    }

    const buttons: string[] = [];

    // Phase-specific buttons
    switch (this.gameState.phase) {
      case TurnPhase.COMMAND:
        buttons.push('<button onclick="gameController.generateCP()">Generate CP</button>');
        break;
      case TurnPhase.DEPLOYMENT:
        buttons.push('<button onclick="gameController.showDeployment()">Deploy Units</button>');
        buttons.push('<button onclick="gameController.deployHiddenUnits()">Deploy Hidden</button>');
        break;
      case TurnPhase.ACTION:
        buttons.push('<button onclick="gameController.endActions()">End Actions</button>');
        break;
      default:
        // No specific buttons for other phases
        break;
    }

    // Always available
    buttons.push('<button onclick="gameController.nextPhase()">Next Phase</button>');
    buttons.push('<button onclick="gameController.endTurn()">End Turn</button>');

    // Debug controls
    buttons.push(
      '<button onclick="gameController.toggleFogOfWar()" style="background: #666; font-size: 10px;">Toggle FOW</button>'
    );

    phaseButtons.innerHTML = buttons.join('');
  }

  /**
   * Check if action is valid for current phase
   */
  private isValidPhase(actionType: ActionType): boolean {
    switch (this.gameState.phase) {
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
          ActionType.REVEAL,
        ].includes(actionType);
      default:
        return false;
    }
  }

  /**
   * Check if unit can use ability
   */
  private canUseAbility(unit: Unit, abilityName: string): boolean {
    const ability = unit.specialAbilities.find(a => a.name === abilityName);
    if (!ability) {
      return false;
    }

    // Check CP cost
    if (ability.cpCost) {
      const player = this.gameState.getPlayer(this.gameState.activePlayerId);
      if (!player || player.commandPoints < ability.cpCost) {
        return false;
      }
    }

    // Check uses per turn
    if (ability.usesPerTurn !== undefined) {
      // Would need to track ability usage per turn
      return true; // Simplified for now
    }

    return this.isValidPhase(ActionType.SPECIAL_ABILITY);
  }

  /**
   * Highlight valid attack targets for unit
   */
  private highlightValidTargets(unit: Unit, type: 'attack' | 'ability'): void {
    const validHexes: Hex[] = [];
    // Use a simple range calculation: attack value determines range
    const range = Math.max(1, unit.getEffectiveAttack());
    const currentPos = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s);

    // Check all hexes within attack range
    for (const hex of currentPos.range(range)) {
      if (hex.equals(currentPos)) {
        continue;
      }

      // Check if there are enemy units at this hex
      const unitsAtHex = this.gameState.getUnitsAt(hex);
      const hasEnemies = unitsAtHex.some(target => target.side !== unit.side);

      if (hasEnemies) {
        validHexes.push(hex);
      }
    }

    // Render highlights
    this.renderer.highlightHexes(validHexes, type);
  }

  /**
   * Highlight valid load targets for unit
   */
  private highlightLoadTargets(unit: Unit): void {
    const validHexes: Hex[] = [];
    const currentPos = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s);

    // Only highlight if this unit can carry cargo
    if (unit.getCargoCapacity() === 0) {
      return;
    }

    // Highlight adjacent hexes with friendly units that can be loaded
    for (const hex of currentPos.range(1)) {
      if (hex.equals(currentPos)) {
        continue;
      }

      const unitsAtHex = this.gameState.getUnitsAt(hex);
      const hasLoadableUnits = unitsAtHex.some(
        target => target.side === unit.side && target !== unit && this.canUnitLoad(unit, target)
      );

      if (hasLoadableUnits) {
        validHexes.push(hex);
      }
    }

    this.renderer.highlightHexes(validHexes, 'movement');
  }

  /**
   * Check if unit can load target unit
   */
  private canUnitLoad(transport: Unit, target: Unit): boolean {
    // Basic checks: transport has capacity and target is compatible
    if (transport.getCargoCapacity() === 0) {
      return false;
    }
    if (transport.state.cargo.length >= transport.getCargoCapacity()) {
      return false;
    }

    // Infantry can usually be loaded into any transport
    if (target.hasCategory(UnitCategory.INFANTRY)) {
      return true;
    }

    // Vehicles need appropriate transport
    if (target.hasCategory(UnitCategory.VEHICLE)) {
      return transport.type === UnitType.LCAC || transport.type === UnitType.SUPER_STALLION;
    }

    return false;
  }

  /**
   * Highlight valid unload targets for unit
   */
  private highlightUnloadTargets(unit: Unit): void {
    const validHexes: Hex[] = [];
    const currentPos = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s);

    // Only highlight if this unit has cargo
    if (unit.state.cargo.length === 0) {
      return;
    }

    // Highlight adjacent hexes where units can be unloaded
    for (const hex of currentPos.range(1)) {
      if (hex.equals(currentPos)) {
        continue;
      }

      // Check if hex is valid for unloading (basic check - not deep water)
      const mapHex = this.gameState.map.getHex(hex);
      if (mapHex && mapHex.terrain !== TerrainType.DEEP_WATER) {
        validHexes.push(hex);
      }
    }

    this.renderer.highlightHexes(validHexes, 'movement');
  }

  /**
   * Clear all highlights
   */
  private clearHighlights(): void {
    this.renderer.clearHighlights();
  }

  /**
   * Display hex information
   */
  private displayHexInfo(hex: Hex): void {
    const hexInfo = this.mapRenderer.getHexInfo(hex);
    const unitInfoDiv = document.getElementById('unit-info');

    if (unitInfoDiv) {
      unitInfoDiv.innerHTML = `
        <h4>Hex Information</h4>
        <div class="info-item">
          <span class="info-label">Coordinate:</span>
          <span class="info-value">${hexInfo.coordinate}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Terrain:</span>
          <span class="info-value">${hexInfo.terrain}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Movement Cost:</span>
          <span class="info-value">${hexInfo.movementCost} MP</span>
        </div>
        <div class="info-item">
          <span class="info-label">Defense Bonus:</span>
          <span class="info-value">+${hexInfo.defenseBonus}</span>
        </div>
        ${
          hexInfo.objective
            ? `
        <div class="info-item">
          <span class="info-label">Objective:</span>
          <span class="info-value">${hexInfo.objective.type}</span>
        </div>
        `
            : ''
        }
        ${
          hexInfo.isOffshore
            ? `
        <div class="info-item">
          <span class="info-label">Special:</span>
          <span class="info-value">Offshore Zone</span>
        </div>
        `
            : ''
        }
      `;
    }
  }

  /**
   * Display unit information
   */
  private displayUnitInfo(unit: Unit): void {
    const unitInfoDiv = document.getElementById('unit-info');

    if (unitInfoDiv) {
      const unitName = unit.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

      unitInfoDiv.innerHTML = `
        <h4>${unitName}</h4>
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
          <span class="info-label">Movement:</span>
          <span class="info-value">${unit.getEffectiveMovement()}/${unit.stats.mv}</span>
        </div>
        ${
          unit.stats.sp
            ? `
        <div class="info-item">
          <span class="info-label">Supply:</span>
          <span class="info-value">${unit.state.currentSP}/${unit.stats.sp}</span>
        </div>
        `
            : ''
        }
        ${
          unit.state.suppressionTokens > 0
            ? `
        <div class="info-item">
          <span class="info-label">Suppression:</span>
          <span class="info-value">${unit.state.suppressionTokens}</span>
        </div>
        `
            : ''
        }
        ${
          unit.state.cargo.length > 0
            ? `
        <div class="info-item">
          <span class="info-label">Cargo:</span>
          <span class="info-value">${unit.state.cargo.length}/${unit.getCargoCapacity()}</span>
        </div>
        `
            : ''
        }
        <div class="info-item">
          <span class="info-label">Status:</span>
          <span class="info-value">${this.getUnitStatus(unit)}</span>
        </div>
      `;
    }
  }

  /**
   * Get unit status string
   */
  private getUnitStatus(unit: Unit): string {
    const statuses: string[] = [];

    if (unit.isHidden()) {
      statuses.push('Hidden');
    }
    if (unit.isSuppressed()) {
      statuses.push('Suppressed');
    }
    if (unit.isPinned()) {
      statuses.push('Pinned');
    }
    if (unit.state.hasMoved) {
      statuses.push('Moved');
    }
    if (unit.state.hasActed) {
      statuses.push('Acted');
    }

    return statuses.length > 0 ? statuses.join(', ') : 'Ready';
  }

  /**
   * Render the current game state
   */
  private render(): void {
    // Render map
    const hexes = this.mapRenderer.getAllHexes();
    this.renderer.renderHexGrid(hexes, hex => this.mapRenderer.getTerrainColor(hex));

    // Render fortifications
    this.renderer.renderFortifications(this.gameState);

    // Render units (with fog of war for current player)
    const activePlayer = this.gameState.getActivePlayer();
    const viewingPlayerId = activePlayer?.id;
    this.renderer.renderUnits(this.gameState, viewingPlayerId);

    // Update USS Wasp display
    this.updateWaspDisplay();
  }

  // Public methods for UI buttons

  public startMove(): void {
    this.uiMode = UIMode.MOVE_TARGET;
    this.showMessage('Select target hex for movement', 'info');
    if (this.selectedUnit) {
      this.highlightValidMoves(this.selectedUnit);
    }
  }

  public startAttack(): void {
    this.uiMode = UIMode.ATTACK_TARGET;
    this.showMessage('Select target for attack', 'info');
    if (this.selectedUnit) {
      this.highlightValidTargets(this.selectedUnit, 'attack');
    }
  }

  public useAbility(abilityName: string): void {
    this.pendingAbility = abilityName;
    this.uiMode = UIMode.ABILITY_TARGET;
    this.showMessage(`Select target for ${abilityName}`, 'info');
  }

  public revealUnit(): void {
    if (!this.selectedUnit) {
      return;
    }

    const action = {
      type: ActionType.REVEAL,
      playerId: this.gameState.activePlayerId,
      unitId: this.selectedUnit.id,
    };

    const result = this.gameEngine.executeAction(action);
    this.handleActionResult(result);

    if (result.success) {
      this.render();
      this.resetUIModeInternal();
    }
  }

  public nextPhase(): void {
    const previousPhase = this.gameState.phase;
    this.gameState.nextPhase();

    // Handle phase transition effects
    this.handlePhaseTransition(previousPhase, this.gameState.phase);

    this.updateGameStatusDisplay();
    this.updateActionButtons();
    this.resetUIModeInternal();
    this.render();
  }

  /**
   * Handle phase transition effects
   */
  private handlePhaseTransition(fromPhase: TurnPhase, toPhase: TurnPhase): void {
    // Clear turn state when transitioning phases
    this.clearTurnState();

    switch (toPhase) {
      case TurnPhase.EVENT:
        this.showMessage(`Turn ${this.gameState.turn} begins`, 'info');
        this.processEventPhase();
        break;
      case TurnPhase.COMMAND:
        this.processCommandPhase();
        break;
      case TurnPhase.DEPLOYMENT:
        this.processDeploymentPhase();
        break;
      case TurnPhase.MOVEMENT:
        this.processMovementPhase();
        break;
      case TurnPhase.ACTION:
        this.processActionPhase();
        break;
      case TurnPhase.END:
        this.processEndPhase();
        break;
      default:
        // Unknown phase
        break;
    }
  }

  /**
   * Clear turn state (unit movement, actions, etc.)
   */
  private clearTurnState(): void {
    // Reset unit states for new turn/phase
    for (const player of this.gameState.getAllPlayers()) {
      for (const unit of player.getLivingUnits()) {
        // Reset movement and action flags for appropriate phases
        if (
          this.gameState.phase === TurnPhase.MOVEMENT ||
          this.gameState.phase === TurnPhase.EVENT
        ) {
          unit.state.hasMoved = false;
        }
        if (this.gameState.phase === TurnPhase.ACTION || this.gameState.phase === TurnPhase.EVENT) {
          unit.state.hasActed = false;
        }
      }
    }
  }

  /**
   * Process event phase
   */
  private processEventPhase(): void {
    // Roll for random events, update fog of war, etc.
    this.gameState.fogOfWar.updateVisibility();
  }

  /**
   * Process command phase
   */
  private processCommandPhase(): void {
    this.gameState.generateCommandPoints();
    this.showMessage('Command points generated', 'success');
  }

  /**
   * Process deployment phase
   */
  private processDeploymentPhase(): void {
    this.showMessage('Deployment phase - launch units and deploy hidden forces', 'info');
  }

  /**
   * Process movement phase
   */
  private processMovementPhase(): void {
    this.showMessage('Movement phase - move your units', 'info');
  }

  /**
   * Process action phase
   */
  private processActionPhase(): void {
    this.showMessage('Action phase - attack, use abilities, and secure objectives', 'info');
  }

  /**
   * Process end phase
   */
  private processEndPhase(): void {
    // Check victory conditions
    this.checkVictoryConditions();

    // Reset suppression, recover units, etc.
    this.processEndTurnEffects();

    this.showMessage('Turn completed', 'info');
  }

  /**
   * Check victory conditions
   */
  private checkVictoryConditions(): void {
    // Check if game is already over
    if (this.gameState.isGameOver) {
      return;
    }

    // Check various victory conditions
    const assaultPlayer = this.gameState.getPlayerBySide(PlayerSide.Assault);
    const defenderPlayer = this.gameState.getPlayerBySide(PlayerSide.Defender);

    if (!assaultPlayer || !defenderPlayer) {
      return;
    }

    // Check unit elimination victory
    if (assaultPlayer.getLivingUnits().length === 0) {
      this.gameState.winner = defenderPlayer.id;
      this.gameState.isGameOver = true;
      this.showMessage('Defender wins by elimination!', 'info');
      return;
    }

    if (defenderPlayer.getLivingUnits().length === 0) {
      this.gameState.winner = assaultPlayer.id;
      this.gameState.isGameOver = true;
      this.showMessage('Assault wins by elimination!', 'info');
      return;
    }

    // Check USS Wasp destruction
    const waspUnit = assaultPlayer.getLivingUnits().find(unit => unit.type === UnitType.USS_WASP);
    if (!waspUnit) {
      this.gameState.winner = defenderPlayer.id;
      this.gameState.isGameOver = true;
      this.showMessage('Defender wins - USS Wasp destroyed!', 'info');
      return;
    }

    // Check turn limit (example: 10 turns)
    if (this.gameState.turn >= 10) {
      // Determine winner by objectives or units remaining
      const assaultScore = this.calculatePlayerScore(assaultPlayer);
      const defenderScore = this.calculatePlayerScore(defenderPlayer);

      if (assaultScore > defenderScore) {
        this.gameState.winner = assaultPlayer.id;
        this.showMessage('Assault wins by points!', 'info');
      } else if (defenderScore > assaultScore) {
        this.gameState.winner = defenderPlayer.id;
        this.showMessage('Defender wins by points!', 'info');
      } else {
        this.showMessage('Game ends in a draw!', 'info');
      }
      this.gameState.isGameOver = true;
    }
  }

  /**
   * Calculate player score for victory determination
   */
  private calculatePlayerScore(player: Player): number {
    let score = 0;

    // Points for surviving units
    score += player.getLivingUnits().length * 10;

    // Points for command points remaining
    score += player.commandPoints * 5;

    // TODO: Add objective control scoring when objectives are implemented

    return score;
  }

  /**
   * Process end of turn effects
   */
  private processEndTurnEffects(): void {
    // Remove suppression tokens, recover units, etc.
    for (const player of this.gameState.getAllPlayers()) {
      for (const unit of player.getLivingUnits()) {
        // Remove one suppression token per turn
        if (unit.state.suppressionTokens > 0) {
          unit.state.suppressionTokens = Math.max(0, unit.state.suppressionTokens - 1);
        }

        // Clear pinned status
        unit.state.statusEffects.delete(StatusEffect.PINNED);
      }
    }
  }

  public endTurn(): void {
    // Advance through remaining phases to end turn
    while (this.gameState.phase !== TurnPhase.EVENT) {
      this.gameState.nextPhase();
    }
    this.updateGameStatusDisplay();
    this.updateActionButtons();
    this.resetUIModeInternal();
  }

  public generateCP(): void {
    this.gameState.generateCommandPoints();
    this.updateGameStatusDisplay();
    this.showMessage('Command points generated', 'success');
  }

  public showDeployment(): void {
    this.showMessage('Deployment phase - launch units from USS Wasp', 'info');
  }

  public endActions(): void {
    this.showMessage('Action phase ended', 'info');
    this.nextPhase();
  }

  public hideUnit(): void {
    if (!this.selectedUnit) {
      return;
    }

    if (!this.selectedUnit.canBeHidden()) {
      this.showMessage('This unit cannot be hidden', 'error');
      return;
    }

    if (this.selectedUnit.isHidden()) {
      this.showMessage('Unit is already hidden', 'error');
      return;
    }

    this.selectedUnit.hide();
    this.gameState.fogOfWar.updateVisibility();
    this.render();
    this.showMessage(`${this.selectedUnit.type} is now hidden`, 'success');
  }

  public deployHiddenUnits(): void {
    this.gameState.deployHiddenUnits();
    this.render();
    this.showMessage('Defender units deployed in hidden positions', 'success');
  }

  public toggleFogOfWar(): void {
    // Toggle between fog of war and full visibility (for debugging)
    const activePlayer = this.gameState.getActivePlayer();
    if (activePlayer) {
      // Clear fog of war to show all units
      this.gameState.fogOfWar.clearFogOfWar();
      this.render();
      this.showMessage('Fog of war cleared (debug mode)', 'info');
    }
  }

  public resetUIMode(): void {
    this.resetUIModeInternal();
    this.showMessage('Action cancelled', 'info');
  }

  public startLoad(): void {
    this.uiMode = UIMode.LOAD_TARGET;
    this.showMessage('Select unit to load into selected transport', 'info');
    if (this.selectedUnit) {
      this.highlightLoadTargets(this.selectedUnit);
    }
  }

  public startUnload(): void {
    this.uiMode = UIMode.UNLOAD_TARGET;
    this.showMessage('Select hex to unload cargo', 'info');
    if (this.selectedUnit) {
      this.highlightUnloadTargets(this.selectedUnit);
    }
  }

  public showWaspLaunchOptions(): void {
    this.showMessage('USS Wasp launch operations not yet implemented', 'info');
  }

  public showWaspRecoveryOptions(): void {
    this.showMessage('USS Wasp recovery operations not yet implemented', 'info');
  }

  /**
   * Get capacity based on operational status
   */
  private getCapacityForStatus(status: WaspOperationalLevel): number {
    switch (status) {
      case WaspOperationalLevel.OPERATIONAL:
        return 2;
      case WaspOperationalLevel.DEGRADED:
      case WaspOperationalLevel.LIMITED:
        return 1;
      case WaspOperationalLevel.DAMAGED:
      case WaspOperationalLevel.OFFLINE:
        return 0;
      default:
        return 0;
    }
  }

  /**
   * Get CSS class for operational status
   */
  private getStatusClass(status: WaspOperationalLevel): string {
    switch (status) {
      case WaspOperationalLevel.OPERATIONAL:
        return 'status-operational';
      case WaspOperationalLevel.DEGRADED:
        return 'status-degraded';
      case WaspOperationalLevel.LIMITED:
        return 'status-limited';
      case WaspOperationalLevel.DAMAGED:
        return 'status-damaged';
      case WaspOperationalLevel.OFFLINE:
        return 'status-offline';
      default:
        return 'status-unknown';
    }
  }

  /**
   * Initialize fortification system
   */
  private initializeFortificationSystem(): void {
    // Only initialize in browser environment (not in tests)
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }

    // Create fortification palette container if it doesn't exist
    let paletteContainer = document.getElementById('fortification-palette');
    if (!paletteContainer) {
      paletteContainer = document.createElement('div');
      paletteContainer.id = 'fortification-palette';
      document.body.appendChild(paletteContainer);
    }

    // Initialize fortification palette
    this.fortificationPalette = new FortificationPalette(
      paletteContainer,
      DEFAULT_FORTIFICATION_CONFIG,
      (type: FortificationType | null) => this.onFortificationTypeSelected(type)
    );

    // Initially hide the palette (show only during deployment phase)
    this.updateFortificationPaletteVisibility();
  }

  /**
   * Handle fortification type selection
   */
  private onFortificationTypeSelected(type: FortificationType | null): void {
    this.selectedFortificationType = type;
    
    if (type) {
      this.setUIMode(UIMode.FORTIFICATION_PLACEMENT);
      this.showMessage(`Click on a hex to place ${type}. Right-click to cancel.`, 'info');
    } else {
      this.setUIMode(UIMode.NORMAL);
      this.selectedFortificationType = null;
      this.showMessage('Fortification placement cancelled.', 'info');
    }
  }

  /**
   * Handle hex click for fortification placement
   */
  public onHexClickForFortification(hex: Hex): boolean {
    if (this.uiMode !== UIMode.FORTIFICATION_PLACEMENT || !this.selectedFortificationType) {
      return false;
    }

    // Validate placement
    const validationResult = this.validateFortificationPlacement(hex, this.selectedFortificationType);
    if (!validationResult.valid) {
      this.showMessage(`Cannot place fortification: ${validationResult.reason}`, 'error');
      return false;
    }

    // Create fortification
    const fortification: Fortification = this.createFortification(hex, this.selectedFortificationType);
    
    // Add to map
    this.gameState.map.addFortification(fortification);
    
    // Update palette
    if (this.fortificationPalette) {
      this.fortificationPalette.fortificationPlaced(this.selectedFortificationType);
    }

    // Update display
    this.renderFortifications();
    this.showMessage(`${this.selectedFortificationType} placed at ${hex.toString()}`, 'success');

    // Auto-deselect if no more of this type available or manually deselect
    const paletteState = this.fortificationPalette?.getState();
    if (paletteState && paletteState.remainingLimits[this.selectedFortificationType] <= 0) {
      this.onFortificationTypeSelected(null);
    }

    return true;
  }

  /**
   * Validate fortification placement
   */
  private validateFortificationPlacement(
    hex: Hex, 
    type: FortificationType
  ): { valid: boolean; reason?: string } {
    // Check if hex is on the map
    const mapHex = this.gameState.map.getHex(hex);
    if (!mapHex) {
      return { valid: false, reason: 'Position is outside map boundaries' };
    }

    // Check if there's already a fortification at this position
    const existingFortification = this.gameState.map.getFortificationAt(hex);
    if (existingFortification) {
      return { valid: false, reason: 'A fortification already exists at this position' };
    }

    // Check if there's a unit at this position
    const unitsAtPosition = this.gameState.getUnitsAt(hex);
    if (unitsAtPosition.length > 0) {
      return { valid: false, reason: 'Cannot place fortification on occupied hex' };
    }

    // Check terrain restrictions
    const terrainRestrictions = this.getFortificationTerrainRestrictions(type);
    if (terrainRestrictions.forbidden.includes(mapHex.terrain)) {
      return { valid: false, reason: `Cannot place ${type} on ${mapHex.terrain} terrain` };
    }

    // Check if only defender can place fortifications
    const currentPlayer = this.gameState.getActivePlayer();
    if (currentPlayer?.side !== PlayerSide.Defender) {
      return { valid: false, reason: 'Only the defender can place fortifications' };
    }

    // Check if it's the correct phase
    if (this.gameState.phase !== TurnPhase.DEPLOYMENT) {
      return { valid: false, reason: 'Fortifications can only be placed during deployment phase' };
    }

    return { valid: true };
  }

  /**
   * Get terrain restrictions for fortification type
   */
  private getFortificationTerrainRestrictions(type: FortificationType): {
    forbidden: TerrainType[];
    preferred?: TerrainType[];
  } {
    switch (type) {
      case FortificationType.BUNKER:
        return {
          forbidden: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER]
        };
      case FortificationType.MINEFIELD:
        return {
          forbidden: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER, TerrainType.MOUNTAINS]
        };
      case FortificationType.TRENCH:
        return {
          forbidden: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER, TerrainType.MOUNTAINS],
          preferred: [TerrainType.CLEAR, TerrainType.HILLS]
        };
      case FortificationType.BARRICADE:
        return {
          forbidden: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER]
        };
      default:
        return { forbidden: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER] };
    }
  }

  /**
   * Create fortification object
   */
  private createFortification(hex: Hex, type: FortificationType): Fortification {
    const stats = this.getFortificationStats(type);
    return {
      id: `${type}-${hex.q}-${hex.r}-${Date.now()}`,
      type,
      position: hex,
      defenseBonus: stats.defenseBonus,
      movementPenalty: stats.movementPenalty,
      blocksLOS: stats.blocksLOS
    };
  }

  /**
   * Get fortification statistics
   */
  private getFortificationStats(type: FortificationType): {
    defenseBonus: number;
    movementPenalty: number;
    blocksLOS: boolean;
  } {
    switch (type) {
      case FortificationType.BUNKER:
        return { defenseBonus: 3, movementPenalty: 0, blocksLOS: true };
      case FortificationType.MINEFIELD:
        return { defenseBonus: 0, movementPenalty: 2, blocksLOS: false };
      case FortificationType.TRENCH:
        return { defenseBonus: 2, movementPenalty: 1, blocksLOS: false };
      case FortificationType.BARRICADE:
        return { defenseBonus: 1, movementPenalty: 1, blocksLOS: false };
      default:
        return { defenseBonus: 0, movementPenalty: 0, blocksLOS: false };
    }
  }

  /**
   * Update fortification palette visibility based on game phase and player
   */
  private updateFortificationPaletteVisibility(): void {
    // Only update in browser environment
    if (typeof document === 'undefined') {
      return;
    }
    
    const paletteContainer = document.getElementById('fortification-palette');
    if (!paletteContainer) {
      return;
    }

    const currentPlayer = this.gameState.getActivePlayer();
    const isDefender = currentPlayer?.side === PlayerSide.Defender;
    const isDeploymentPhase = this.gameState.phase === TurnPhase.DEPLOYMENT;
    
    const shouldShow = isDefender && isDeploymentPhase;
    
    if (shouldShow) {
      paletteContainer.classList.remove('hidden');
    } else {
      paletteContainer.classList.add('hidden');
      // Reset UI mode if hiding palette
      if (this.uiMode === UIMode.FORTIFICATION_PLACEMENT) {
        this.setUIMode(UIMode.NORMAL);
      }
    }
  }

  /**
   * Render all fortifications on the map
   */
  private renderFortifications(): void {
    // Render fortifications using PixiRenderer
    this.renderer.renderFortifications(this.gameState);
    this.updateGameStatusDisplay();
  }

  /**
   * Set UI mode and handle state transitions
   */
  private setUIMode(mode: UIMode): void {
    this.uiMode = mode;
    
    // Clear selected unit when entering fortification mode
    if (mode === UIMode.FORTIFICATION_PLACEMENT) {
      this.selectedUnit = undefined;
    }
    
    // Update UI elements based on mode
    this.updateModeDisplay();
  }

  /**
   * Update mode display (placeholder for UI feedback)
   */
  private updateModeDisplay(): void {
    const modeDisplay = document.getElementById('ui-mode-display');
    if (modeDisplay) {
      switch (this.uiMode) {
        case UIMode.FORTIFICATION_PLACEMENT:
          modeDisplay.textContent = `Placing: ${this.selectedFortificationType ?? 'None'}`;
          break;
        default:
          modeDisplay.textContent = '';
      }
    }
  }

  /**
   * Handle phase changes to update fortification system
   */
  public onPhaseChanged(): void {
    this.updateFortificationPaletteVisibility();
    
    // Reset fortification placement when leaving deployment phase
    if (this.gameState.phase !== TurnPhase.DEPLOYMENT && this.uiMode === UIMode.FORTIFICATION_PLACEMENT) {
      this.onFortificationTypeSelected(null);
    }
  }

  /**
   * Get current UI mode
   */
  public getCurrentUIMode(): UIMode {
    return this.uiMode;
  }

  /**
   * Check if in fortification placement mode
   */
  public isInFortificationPlacementMode(): boolean {
    return this.uiMode === UIMode.FORTIFICATION_PLACEMENT;
  }
}
