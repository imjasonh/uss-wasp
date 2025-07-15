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
  ObjectiveType,
} from '../core/game/types';
import { PixiRenderer } from './renderer/PixiRenderer';
import { MapRenderer } from './renderer/MapRenderer';
import {
  FortificationPalette,
  FortificationType,
  DEFAULT_FORTIFICATION_CONFIG,
} from './components/FortificationUI';
import { MapEditor } from './MapEditor';

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
  MAP_EDITOR = 'map_editor',
}

/**
 * Constants for objective scoring
 */
const OBJECTIVE_POINT_VALUES = {
  PORT: 50,
  AIRFIELD: 40,
  COMMS_HUB: 30,
  CIVIC_CENTER: 20,
  HIGH_VALUE_TARGET: 25,
  DEFAULT: 10,
} as const;

const SCORING_MULTIPLIERS = {
  UNIT_POINTS: 10,
  COMMAND_POINTS: 5,
  PERCENTAGE_SCALE: 100,
} as const;

const GAME_CONSTANTS = {
  MAX_TURNS: 10,
  MESSAGE_TIMEOUT: 3000,
  WASP_CAPACITY: 2,
} as const;

/**
 * Objective control status for a single objective
 */
export interface ObjectiveStatus {
  readonly id: string;
  readonly type: ObjectiveType;
  readonly position: Hex;
  readonly controlledBy: string | null;
  readonly isPrimary: boolean;
  readonly pointValue: number;
  readonly description: string;
}

/**
 * Overall objective control summary
 */
export interface ObjectiveControl {
  readonly assaultPoints: number;
  readonly defenderPoints: number;
  readonly neutralObjectives: number;
  readonly totalObjectives: number;
  readonly objectives: ObjectiveStatus[];
  readonly assaultProgress: number; // 0-100%
  readonly defenderProgress: number; // 0-100%
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
  private mapEditor: MapEditor | null = null;

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

    // Update objective control display
    this.updateObjectiveControlDisplay();

    // Check for victory conditions
    if (this.gameState.isGameOver) {
      this.showGameEndScreen();
    }
  }

  /**
   * Update objective control display in the UI
   */
  private updateObjectiveControlDisplay(): void {
    const objectiveControl = this.calculateObjectiveControl();
    const objectivesList = document.getElementById('objectives-list');

    if (!objectivesList) {
      return;
    }

    let html = '';

    // Overall control summary
    html += '<div class="objective-summary">';
    html += '<div class="info-grid">';
    html += `<div class="info-item">`;
    html += `<span class="info-label">Assault Score:</span>`;
    html += `<span class="info-value assault-score">${objectiveControl.assaultPoints}</span>`;
    html += `</div>`;
    html += `<div class="info-item">`;
    html += `<span class="info-label">Defender Score:</span>`;
    html += `<span class="info-value defender-score">${objectiveControl.defenderPoints}</span>`;
    html += `</div>`;
    html += `<div class="info-item">`;
    html += `<span class="info-label">Neutral:</span>`;
    html += `<span class="info-value">${objectiveControl.neutralObjectives}</span>`;
    html += `</div>`;
    html += `<div class="info-item">`;
    html += `<span class="info-label">Total:</span>`;
    html += `<span class="info-value">${objectiveControl.totalObjectives}</span>`;
    html += `</div>`;
    html += '</div>';

    // Progress bars
    html += '<div class="progress-section">';
    html += '<div class="progress-bar-container">';
    html += '<div class="progress-label">Assault Progress</div>';
    html += '<div class="progress-bar">';
    html += `<div class="progress-fill assault-progress" style="width: ${objectiveControl.assaultProgress}%"></div>`;
    html += `<span class="progress-text">${Math.round(objectiveControl.assaultProgress)}%</span>`;
    html += '</div>';
    html += '</div>';
    html += '<div class="progress-bar-container">';
    html += '<div class="progress-label">Defender Progress</div>';
    html += '<div class="progress-bar">';
    html += `<div class="progress-fill defender-progress" style="width: ${objectiveControl.defenderProgress}%"></div>`;
    html += `<span class="progress-text">${Math.round(objectiveControl.defenderProgress)}%</span>`;
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    // Individual objectives
    if (objectiveControl.objectives.length > 0) {
      html += '<div class="objective-details">';
      html += '<div class="section-divider">Objectives</div>';

      for (const objective of objectiveControl.objectives) {
        const controlClass = this.getObjectiveControlClass(objective.controlledBy);
        const controlText = this.getObjectiveControlText(objective.controlledBy);
        const primaryIcon = objective.isPrimary ? '⭐' : '';

        html += '<div class="objective-item">';
        html += `<div class="objective-header">`;
        html += `<span class="objective-name">${primaryIcon} ${this.getObjectiveTypeDisplayName(objective.type)}</span>`;
        html += `<span class="objective-points">${objective.pointValue}pts</span>`;
        html += `</div>`;
        html += `<div class="objective-status ${controlClass}">${controlText}</div>`;
        html += `<div class="objective-description">${objective.description}</div>`;
        html += '</div>';
      }

      html += '</div>';
    } else {
      html += '<div class="info-item"><span class="info-label">No objectives found</span></div>';
    }

    objectivesList.innerHTML = html;
  }

  /**
   * Get CSS class for objective control status
   */
  private getObjectiveControlClass(controlledBy: string | null): string {
    if (!controlledBy) {
      return 'neutral';
    }

    const assaultPlayer = this.gameState.getPlayerBySide(PlayerSide.Assault);
    const defenderPlayer = this.gameState.getPlayerBySide(PlayerSide.Defender);

    if (controlledBy === assaultPlayer?.id) {
      return 'assault-controlled';
    }
    if (controlledBy === defenderPlayer?.id) {
      return 'defender-controlled';
    }
    return 'neutral';
  }

  /**
   * Get display text for objective control status
   */
  private getObjectiveControlText(controlledBy: string | null): string {
    if (!controlledBy) {
      return 'Neutral';
    }

    const assaultPlayer = this.gameState.getPlayerBySide(PlayerSide.Assault);
    const defenderPlayer = this.gameState.getPlayerBySide(PlayerSide.Defender);

    if (controlledBy === assaultPlayer?.id) {
      return 'Assault';
    }
    if (controlledBy === defenderPlayer?.id) {
      return 'Defender';
    }
    return 'Unknown';
  }

  /**
   * Get display name for objective type
   */
  private getObjectiveTypeDisplayName(type: ObjectiveType): string {
    switch (type) {
      case ObjectiveType.PORT:
        return 'Port';
      case ObjectiveType.AIRFIELD:
        return 'Airfield';
      case ObjectiveType.COMMS_HUB:
        return 'Comms Hub';
      case ObjectiveType.CIVIC_CENTER:
        return 'Civic Center';
      case ObjectiveType.HIGH_VALUE_TARGET:
        return 'HVT';
      default:
        return 'Unknown';
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

      // Auto-clear after timeout
      setTimeout(() => {
        messageDiv.className = 'message';
        messageDiv.textContent = '';
      }, GAME_CONSTANTS.MESSAGE_TIMEOUT);
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

    // Secure objective for infantry units
    if (unit.hasCategory(UnitCategory.INFANTRY) && this.isValidPhase(ActionType.SECURE_OBJECTIVE)) {
      const mapHex = this.gameState.map.getHex(unit.state.position);
      if (mapHex?.objective) {
        buttons.push(
          '<button onclick="gameController.secureObjective()">Secure Objective</button>'
        );
      }
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

    // Check turn limit
    if (this.gameState.turn >= GAME_CONSTANTS.MAX_TURNS) {
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
   * Calculate objective control status for both players
   */
  private calculateObjectiveControl(): ObjectiveControl {
    const mapObjectives = this.gameState.map.getObjectives();
    const objectives: ObjectiveStatus[] = [];

    let assaultPoints = 0;
    let defenderPoints = 0;
    let neutralObjectives = 0;

    // Get player IDs for comparison
    const assaultPlayer = this.gameState.getPlayerBySide(PlayerSide.Assault);
    const defenderPlayer = this.gameState.getPlayerBySide(PlayerSide.Defender);

    for (const mapHex of mapObjectives) {
      if (!mapHex.objective) {
        continue;
      }

      const objectiveStatus: ObjectiveStatus = {
        id: mapHex.objective.id,
        type: mapHex.objective.type,
        position: new Hex(mapHex.coordinate.q, mapHex.coordinate.r, mapHex.coordinate.s),
        controlledBy: mapHex.objective.controlledBy ?? null,
        isPrimary: this.isObjectivePrimary(mapHex.objective.type),
        pointValue: this.getObjectivePointValue(mapHex.objective.type),
        description: this.getObjectiveDescription(mapHex.objective.type),
      };

      objectives.push(objectiveStatus);

      // Add points to controlling player
      if (mapHex.objective.controlledBy === assaultPlayer?.id) {
        assaultPoints += objectiveStatus.pointValue;
      } else if (mapHex.objective.controlledBy === defenderPlayer?.id) {
        defenderPoints += objectiveStatus.pointValue;
      } else {
        neutralObjectives++;
      }
    }

    const totalObjectives = objectives.length;
    const maxPossiblePoints = objectives.reduce((sum, obj) => sum + obj.pointValue, 0);

    return {
      assaultPoints,
      defenderPoints,
      neutralObjectives,
      totalObjectives,
      objectives,
      assaultProgress:
        maxPossiblePoints > 0
          ? (assaultPoints / maxPossiblePoints) * SCORING_MULTIPLIERS.PERCENTAGE_SCALE
          : 0,
      defenderProgress:
        maxPossiblePoints > 0
          ? (defenderPoints / maxPossiblePoints) * SCORING_MULTIPLIERS.PERCENTAGE_SCALE
          : 0,
    };
  }

  /**
   * Check if an objective is primary (critical for victory)
   */
  private isObjectivePrimary(type: ObjectiveType): boolean {
    switch (type) {
      case ObjectiveType.PORT:
      case ObjectiveType.AIRFIELD:
        return true;
      case ObjectiveType.COMMS_HUB:
      case ObjectiveType.CIVIC_CENTER:
      case ObjectiveType.HIGH_VALUE_TARGET:
        return false;
      default:
        return false;
    }
  }

  /**
   * Get point value for an objective type
   */
  private getObjectivePointValue(type: ObjectiveType): number {
    switch (type) {
      case ObjectiveType.PORT:
        return OBJECTIVE_POINT_VALUES.PORT;
      case ObjectiveType.AIRFIELD:
        return OBJECTIVE_POINT_VALUES.AIRFIELD;
      case ObjectiveType.COMMS_HUB:
        return OBJECTIVE_POINT_VALUES.COMMS_HUB;
      case ObjectiveType.CIVIC_CENTER:
        return OBJECTIVE_POINT_VALUES.CIVIC_CENTER;
      case ObjectiveType.HIGH_VALUE_TARGET:
        return OBJECTIVE_POINT_VALUES.HIGH_VALUE_TARGET;
      default:
        return OBJECTIVE_POINT_VALUES.DEFAULT;
    }
  }

  /**
   * Get description for an objective type
   */
  private getObjectiveDescription(type: ObjectiveType): string {
    switch (type) {
      case ObjectiveType.PORT:
        return 'Strategic Port - Critical for supply lines';
      case ObjectiveType.AIRFIELD:
        return 'Airfield - Essential for air operations';
      case ObjectiveType.COMMS_HUB:
        return 'Communications Hub - Command and control center';
      case ObjectiveType.CIVIC_CENTER:
        return 'Civic Center - Administrative control point';
      case ObjectiveType.HIGH_VALUE_TARGET:
        return 'High Value Target - Strategic asset';
      default:
        return 'Unknown objective';
    }
  }

  /**
   * Calculate player score for victory determination
   */
  private calculatePlayerScore(player: Player): number {
    let score = 0;

    // Points for surviving units
    score += player.getLivingUnits().length * SCORING_MULTIPLIERS.UNIT_POINTS;

    // Points for command points remaining
    score += player.commandPoints * SCORING_MULTIPLIERS.COMMAND_POINTS;

    // Add objective control scoring
    const objectiveControl = this.calculateObjectiveControl();
    if (player.side === PlayerSide.Assault) {
      score += objectiveControl.assaultPoints;
    } else {
      score += objectiveControl.defenderPoints;
    }

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
    const waspUnit = this.getUSS_WaspUnit();
    if (!waspUnit) {
      this.showMessage('USS Wasp not found or not controlled by current player', 'error');
      return;
    }

    // Get units aboard USS Wasp
    const aboardUnits = waspUnit.state.cargo;
    if (aboardUnits.length === 0) {
      this.showMessage('No units aboard USS Wasp to launch', 'info');
      return;
    }

    // Filter launchable units
    const launchableUnits = aboardUnits.filter(unit => {
      return unit.hasCategory(UnitCategory.AIRCRAFT) || 
             unit.hasCategory(UnitCategory.HELICOPTER) ||
             unit.type === UnitType.LCAC || 
             unit.type === UnitType.AAV_7;
    });

    if (launchableUnits.length === 0) {
      this.showMessage('No launchable units aboard USS Wasp', 'info');
      return;
    }

    // Create and show launch dialog
    this.createWaspLaunchDialog(launchableUnits);
  }

  public showWaspRecoveryOptions(): void {
    const waspUnit = this.getUSS_WaspUnit();
    if (!waspUnit) {
      this.showMessage('USS Wasp not found or not controlled by current player', 'error');
      return;
    }

    // Get nearby units eligible for recovery
    const nearbyUnits = this.getNearbyRecoverableUnits(waspUnit);
    if (nearbyUnits.length === 0) {
      this.showMessage('No recoverable units near USS Wasp', 'info');
      return;
    }

    // Create and show recovery dialog
    this.createWaspRecoveryDialog(nearbyUnits);
  }

  /**
   * Get USS Wasp unit controlled by current player
   */
  private getUSS_WaspUnit(): Unit | null {
    const currentPlayer = this.gameState.getActivePlayer();
    if (!currentPlayer) {
      return null;
    }

    const units = currentPlayer.getLivingUnits();
    return units.find(unit => unit.type === UnitType.USS_WASP) ?? null;
  }

  /**
   * Get units near USS Wasp that can be recovered
   */
  private getNearbyRecoverableUnits(waspUnit: Unit): Unit[] {
    const allUnits = this.gameState.getAllUnits();
    const waspPosition = new Hex(waspUnit.state.position.q, waspUnit.state.position.r, waspUnit.state.position.s);
    
    return allUnits.filter(unit => {
      // Must be same side as USS Wasp
      if (unit.side !== waspUnit.side) {
        return false;
      }
      
      // Must not be the USS Wasp itself
      if (unit.id === waspUnit.id) {
        return false;
      }
      
      // Must not already be aboard USS Wasp
      if (waspUnit.state.cargo.some(cargoUnit => cargoUnit.id === unit.id)) {
        return false;
      }
      
      // Must be a recoverable unit type
      const isRecoverable = unit.hasCategory(UnitCategory.AIRCRAFT) || 
                           unit.hasCategory(UnitCategory.HELICOPTER) ||
                           unit.type === UnitType.LCAC || 
                           unit.type === UnitType.AAV_7;
      
      if (!isRecoverable) {
        return false;
      }
      
      // Must be within recovery range (adjacent)
      const unitPosition = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s);
      const distance = waspPosition.distanceTo(unitPosition);
      
      return distance <= 1;
    });
  }

  /**
   * Create and show USS Wasp launch dialog
   */
  private createWaspLaunchDialog(launchableUnits: Unit[]): void {
    const dialog = document.createElement('div');
    dialog.className = 'wasp-launch-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>USS Wasp Launch Operations</h3>
        <p>Select units to launch (${launchableUnits.length} available):</p>
        <div class="unit-selection">
          ${launchableUnits.map(unit => `
            <div class="unit-item" data-unit-id="${unit.id}">
              <input type="checkbox" id="launch-${unit.id}" />
              <label for="launch-${unit.id}">
                <strong>${unit.type}</strong>
                <span class="unit-details">${unit.id}</span>
                <span class="unit-category">${this.getUnitCategoryDisplay(unit)}</span>
              </label>
            </div>
          `).join('')}
        </div>
        <div class="dialog-buttons">
          <button id="execute-launch">Launch Selected</button>
          <button id="cancel-launch">Cancel</button>
        </div>
      </div>
    `;

    // Add dialog styles
    this.addWaspDialogStyles();

    // Handle dialog events
    dialog.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      if (target.id === 'execute-launch') {
        const selectedUnits = this.getSelectedUnitsFromDialog(dialog, 'launch');
        if (selectedUnits.length > 0) {
          this.executeLaunchOperation(selectedUnits);
        } else {
          this.showMessage('No units selected for launch', 'error');
        }
        document.body.removeChild(dialog);
      } else if (target.id === 'cancel-launch') {
        document.body.removeChild(dialog);
      }
    });

    document.body.appendChild(dialog);
  }

  /**
   * Create and show USS Wasp recovery dialog
   */
  private createWaspRecoveryDialog(recoverableUnits: Unit[]): void {
    const dialog = document.createElement('div');
    dialog.className = 'wasp-recovery-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>USS Wasp Recovery Operations</h3>
        <p>Select units to recover (${recoverableUnits.length} in range):</p>
        <div class="unit-selection">
          ${recoverableUnits.map(unit => `
            <div class="unit-item" data-unit-id="${unit.id}">
              <input type="checkbox" id="recover-${unit.id}" />
              <label for="recover-${unit.id}">
                <strong>${unit.type}</strong>
                <span class="unit-details">${unit.id}</span>
                <span class="unit-category">${this.getUnitCategoryDisplay(unit)}</span>
                <span class="unit-health">HP: ${unit.state.currentHP}/${unit.stats.hp}</span>
              </label>
            </div>
          `).join('')}
        </div>
        <div class="dialog-buttons">
          <button id="execute-recovery">Recover Selected</button>
          <button id="cancel-recovery">Cancel</button>
        </div>
      </div>
    `;

    // Handle dialog events
    dialog.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      if (target.id === 'execute-recovery') {
        const selectedUnits = this.getSelectedUnitsFromDialog(dialog, 'recover');
        if (selectedUnits.length > 0) {
          this.executeRecoveryOperation(selectedUnits);
        } else {
          this.showMessage('No units selected for recovery', 'error');
        }
        document.body.removeChild(dialog);
      } else if (target.id === 'cancel-recovery') {
        document.body.removeChild(dialog);
      }
    });

    document.body.appendChild(dialog);
  }

  /**
   * Get display string for unit category
   */
  private getUnitCategoryDisplay(unit: Unit): string {
    if (unit.hasCategory(UnitCategory.AIRCRAFT)) {
      return 'Aircraft';
    } else if (unit.hasCategory(UnitCategory.HELICOPTER)) {
      return 'Helicopter';
    } else if (unit.type === UnitType.LCAC) {
      return 'Landing Craft';
    } else if (unit.type === UnitType.AAV_7) {
      return 'Amphibious Vehicle';
    }
    return 'Unknown';
  }

  /**
   * Get selected units from dialog checkboxes
   */
  private getSelectedUnitsFromDialog(dialog: HTMLElement, operation: 'launch' | 'recover'): Unit[] {
    const checkboxes = dialog.querySelectorAll(`input[id^="${operation}-"]:checked`);
    const selectedUnits: Unit[] = [];

    checkboxes.forEach(checkbox => {
      const unitId = (checkbox as HTMLInputElement).id.replace(`${operation}-`, '');
      const unit = this.gameState.getUnit(unitId);
      if (unit) {
        selectedUnits.push(unit);
      }
    });

    return selectedUnits;
  }

  /**
   * Execute launch operation
   */
  private executeLaunchOperation(units: Unit[]): void {
    const action = {
      type: ActionType.LAUNCH_FROM_WASP,
      playerId: this.gameState.getActivePlayer()?.id ?? '',
      unitId: this.getUSS_WaspUnit()?.id ?? '',
      data: { unitIds: units.map(u => u.id) }
    };

    const result = this.gameEngine.executeAction(action);
    if (result.success) {
      this.showMessage(`✅ ${result.message}`, 'success');
      this.updateWaspDisplay();
    } else {
      this.showMessage(`❌ ${result.message}`, 'error');
    }
  }

  /**
   * Execute recovery operation
   */
  private executeRecoveryOperation(units: Unit[]): void {
    const action = {
      type: ActionType.RECOVER_TO_WASP,
      playerId: this.gameState.getActivePlayer()?.id ?? '',
      unitId: this.getUSS_WaspUnit()?.id ?? '',
      data: { unitIds: units.map(u => u.id) }
    };

    const result = this.gameEngine.executeAction(action);
    if (result.success) {
      this.showMessage(`✅ ${result.message}`, 'success');
      this.updateWaspDisplay();
    } else {
      this.showMessage(`❌ ${result.message}`, 'error');
    }
  }

  /**
   * Add CSS styles for USS Wasp dialogs
   */
  private addWaspDialogStyles(): void {
    if (document.getElementById('wasp-dialog-styles')) {
      return; // Styles already added
    }

    const style = document.createElement('style');
    style.id = 'wasp-dialog-styles';
    style.textContent = `
      .wasp-launch-dialog, .wasp-recovery-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .wasp-launch-dialog .dialog-content, .wasp-recovery-dialog .dialog-content {
        background: #2a2a2a;
        border: 2px solid #444;
        border-radius: 8px;
        padding: 20px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        color: #fff;
      }

      .wasp-launch-dialog h3, .wasp-recovery-dialog h3 {
        margin-top: 0;
        color: #4a9eff;
        border-bottom: 1px solid #444;
        padding-bottom: 10px;
      }

      .unit-selection {
        margin: 15px 0;
        max-height: 300px;
        overflow-y: auto;
      }

      .unit-item {
        margin: 8px 0;
        padding: 8px;
        border: 1px solid #444;
        border-radius: 4px;
        background: #333;
      }

      .unit-item:hover {
        background: #3a3a3a;
      }

      .unit-item label {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        width: 100%;
      }

      .unit-item input[type="checkbox"] {
        margin: 0;
      }

      .unit-details {
        color: #aaa;
        font-size: 0.9em;
      }

      .unit-category, .unit-health {
        color: #6a9eff;
        font-size: 0.8em;
        margin-left: auto;
      }

      .dialog-buttons {
        margin-top: 20px;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }

      .dialog-buttons button {
        padding: 8px 16px;
        border: 1px solid #444;
        border-radius: 4px;
        background: #4a4a4a;
        color: #fff;
        cursor: pointer;
      }

      .dialog-buttons button:hover {
        background: #5a5a5a;
      }

      .dialog-buttons button:first-child {
        background: #4a9eff;
      }

      .dialog-buttons button:first-child:hover {
        background: #5aafff;
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Secure objective with selected unit
   */
  public secureObjective(): void {
    if (!this.selectedUnit) {
      this.showMessage('No unit selected', 'error');
      return;
    }

    const action = {
      type: ActionType.SECURE_OBJECTIVE,
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

  /**
   * Get capacity based on operational status
   */
  private getCapacityForStatus(status: WaspOperationalLevel): number {
    switch (status) {
      case WaspOperationalLevel.OPERATIONAL:
        return GAME_CONSTANTS.WASP_CAPACITY;
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
    const validationResult = this.validateFortificationPlacement(
      hex,
      this.selectedFortificationType
    );
    if (!validationResult.valid) {
      this.showMessage(`Cannot place fortification: ${validationResult.reason}`, 'error');
      return false;
    }

    // Create fortification
    const fortification: Fortification = this.createFortification(
      hex,
      this.selectedFortificationType
    );

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
          forbidden: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER],
        };
      case FortificationType.MINEFIELD:
        return {
          forbidden: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER, TerrainType.MOUNTAINS],
        };
      case FortificationType.TRENCH:
        return {
          forbidden: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER, TerrainType.MOUNTAINS],
          preferred: [TerrainType.CLEAR, TerrainType.HILLS],
        };
      case FortificationType.BARRICADE:
        return {
          forbidden: [TerrainType.DEEP_WATER, TerrainType.SHALLOW_WATER],
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
      blocksLOS: stats.blocksLOS,
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
    if (
      this.gameState.phase !== TurnPhase.DEPLOYMENT &&
      this.uiMode === UIMode.FORTIFICATION_PLACEMENT
    ) {
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

  /**
   * Show map editor for section selection and arrangement
   */
  public showMapEditor(): void {
    // Create map editor container
    const editorContainer = document.createElement('div');
    editorContainer.id = 'map-editor-container';
    editorContainer.style.position = 'fixed';
    editorContainer.style.top = '0';
    editorContainer.style.left = '0';
    editorContainer.style.width = '100%';
    editorContainer.style.height = '100%';
    editorContainer.style.zIndex = '1000';
    editorContainer.style.background = 'rgba(0, 0, 0, 0.9)';

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '× Close Map Editor';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.zIndex = '1001';
    closeButton.style.background = '#e94560';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.padding = '10px 15px';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = (): void => this.hideMapEditor();

    editorContainer.appendChild(closeButton);

    // Create map editor
    this.mapEditor = new MapEditor({
      containerElement: editorContainer,
      mapDimensions: this.gameState.map.getDimensions(),
      onMapChange: (newMap): void => {
        this.onMapEditorMapChanged(newMap);
      },
      onConfigurationChange: (config): void => {
        this.onMapEditorConfigurationChanged(config);
      },
    });

    // Add to document
    document.body.appendChild(editorContainer);
    this.uiMode = UIMode.MAP_EDITOR;
    this.showMessage('Map editor opened. Design your battlefield!', 'info');
  }

  /**
   * Hide map editor
   */
  public hideMapEditor(): void {
    const editorContainer = document.getElementById('map-editor-container');
    if (editorContainer) {
      document.body.removeChild(editorContainer);
    }
    this.mapEditor = null;
    this.uiMode = UIMode.NORMAL;
    this.showMessage('Map editor closed', 'info');
  }

  /**
   * Handle map change from editor
   */
  private onMapEditorMapChanged(_newMap: import('../core/game/Map').GameMap): void {
    // Update the game state with the new map
    // Note: This would require extending GameState to support map replacement
    this.showMessage('Map updated from editor', 'success');

    // Update displays
    this.updateGameStatusDisplay();
    this.updateObjectiveControlDisplay();

    // Note: Map rendering would need to be handled by the main renderer
    // The MapRenderer is a helper class, not the main renderer
  }

  /**
   * Handle configuration change from editor
   */
  private onMapEditorConfigurationChanged(
    config: import('../core/game/MapSection').MapConfiguration
  ): void {
    this.showMessage(`Configuration "${config.name}" selected`, 'info');
  }

  /**
   * Check if in map editor mode
   */
  public isInMapEditorMode(): boolean {
    return this.uiMode === UIMode.MAP_EDITOR;
  }

  /**
   * Get current map editor instance
   */
  public getMapEditor(): MapEditor | null {
    return this.mapEditor;
  }
}
