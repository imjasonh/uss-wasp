/**
 * Enhanced game controller with full rule implementation
 */

import { Hex } from '../core/hex';
import { GameState, Unit } from '../core/game';
import { GameEngine, ActionResult } from '../core/game/GameEngine';
import {
  ActionType,
  TurnPhase,
  PlayerSide,
  UnitType,
  UnitCategory,
  StatusEffect,
} from '../core/game/types';
import { PixiRenderer } from './renderer/PixiRenderer';
import { MapRenderer } from './renderer/MapRenderer';

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
}

/**
 * Enhanced game controller with full rules
 */
export class GameController {
  private gameEngine: GameEngine;
  private selectedUnit: Unit | undefined;
  private uiMode: UIMode = UIMode.NORMAL;
  private pendingAbility: string | undefined;
  private actionHistory: ActionResult[] = [];

  constructor(
    private gameState: GameState,
    private renderer: PixiRenderer,
    private mapRenderer: MapRenderer
  ) {
    this.gameEngine = new GameEngine(gameState);
    this.setupGameEventListeners();

    // Initialize displays
    this.updateGameStatusDisplay();
    this.updateWaspDisplay();
  }

  /**
   * Set up event listeners for game interactions
   */
  private setupGameEventListeners(): void {
    // Hex selection events
    (this.renderer.getApp().view as EventTarget).addEventListener('hexSelected', (event: any) => {
      const hex = event.detail as Hex;
      this.onHexSelected(hex);
    });

    // Unit selection events
    (this.renderer.getApp().view as EventTarget).addEventListener('unitSelected', (event: any) => {
      const unit = event.detail as Unit;
      this.onUnitSelected(unit);
    });
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
    if (!this.selectedUnit) return;

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
    if (!this.selectedUnit) return;

    const targets = this.gameState.getUnitsAt(targetHex);
    const transportableUnits = targets.filter(
      unit => unit.side === this.selectedUnit!.side && unit !== this.selectedUnit
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
    if (!this.selectedUnit) return;

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
    if (!this.selectedUnit) return;

    const targets = this.gameState.getUnitsAt(targetHex);
    const enemyTargets = targets.filter(unit => unit.side !== this.selectedUnit!.side);

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
    if (!this.selectedUnit || !this.pendingAbility) return;

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
    if (!assaultPlayer) return;

    const waspUnit = assaultPlayer.getLivingUnits().find(unit => unit.type === UnitType.USS_WASP);
    if (!waspUnit) {
      this.updateElement(
        'wasp-status',
        '<div class="info-item"><span class="info-label">No USS Wasp</span></div>'
      );
      return;
    }

    const waspStatus = this.gameState.getWaspStatus();
    if (!waspStatus) return;

    const statusClass = this.getStatusClass(waspStatus.flightDeck.status);
    const wellStatusClass = this.getStatusClass(waspStatus.wellDeck.status);
    const c2StatusClass = this.getStatusClass(waspStatus.c2.status);

    const statusHtml = `
      <div class="info-item">
        <span class="info-label">Structural:</span>
        <span class="info-value">${waspStatus.structuralIntegrity}/${waspUnit.stats.hp} HP</span>
      </div>
      <div class="info-item">
        <span class="info-label">Flight Deck:</span>
        <span class="info-value ${statusClass}">${waspStatus.flightDeck.status}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Well Deck:</span>
        <span class="info-value ${wellStatusClass}">${waspStatus.wellDeck.status}</span>
      </div>
      <div class="info-item">
        <span class="info-label">C2 System:</span>
        <span class="info-value ${c2StatusClass}">${waspStatus.c2.status}</span>
      </div>
    `;

    this.updateElement('wasp-status', statusHtml);

    // Update launch capacities
    this.updateElement(
      'flight-deck-capacity',
      `${waspStatus.flightDeck.launches}/${waspStatus.flightDeck.maxLaunches}`
    );
    this.updateElement(
      'well-deck-capacity',
      `${waspStatus.wellDeck.launches}/${waspStatus.wellDeck.maxLaunches}`
    );

    // Update cargo display
    this.updateWaspCargoDisplay(waspUnit);
  }

  /**
   * Get CSS status class for Wasp system status
   */
  private getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'operational':
        return 'status-operational';
      case 'limited':
        return 'status-limited';
      case 'damaged':
        return 'status-damaged';
      case 'offline':
        return 'status-offline';
      default:
        return '';
    }
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
        `Game Over! ${winnerPlayer ? winnerPlayer.side + ' wins!' : 'Player ' + winnerId + ' wins!'}`,
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
    if (!unit.canMove()) return;

    const validHexes: Hex[] = [];
    const movement = unit.getEffectiveMovement();
    const currentPos = new Hex(unit.state.position.q, unit.state.position.r, unit.state.position.s);

    // Check all hexes within movement range
    for (const hex of currentPos.range(movement)) {
      if (hex.equals(currentPos)) continue;

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
    if (!actionButtons) return;

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
    if (!phaseButtons) return;

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
    if (!ability) return false;

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
      if (hex.equals(currentPos)) continue;

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
    if (unit.getCargoCapacity() === 0) return;

    // Highlight adjacent hexes with friendly units that can be loaded
    for (const hex of currentPos.range(1)) {
      if (hex.equals(currentPos)) continue;

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
    if (transport.getCargoCapacity() === 0) return false;
    if (transport.state.cargo.length >= transport.getCargoCapacity()) return false;

    // Infantry can usually be loaded into any transport
    if (target.hasCategory(UnitCategory.INFANTRY)) return true;

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
    if (unit.state.cargo.length === 0) return;

    // Highlight adjacent hexes where units can be unloaded
    for (const hex of currentPos.range(1)) {
      if (hex.equals(currentPos)) continue;

      // Check if hex is valid for unloading (basic check - not deep water)
      const mapHex = this.gameState.map.getHex(hex);
      if (mapHex && mapHex.terrain !== 'deep_water') {
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

    if (unit.isHidden()) statuses.push('Hidden');
    if (unit.isSuppressed()) statuses.push('Suppressed');
    if (unit.isPinned()) statuses.push('Pinned');
    if (unit.state.hasMoved) statuses.push('Moved');
    if (unit.state.hasActed) statuses.push('Acted');

    return statuses.length > 0 ? statuses.join(', ') : 'Ready';
  }

  /**
   * Render the current game state
   */
  private render(): void {
    // Render map
    const hexes = this.mapRenderer.getAllHexes();
    this.renderer.renderHexGrid(hexes, hex => this.mapRenderer.getTerrainColor(hex));

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
    if (!this.selectedUnit) return;

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
    if (this.gameState.isGameOver) return;

    // Check various victory conditions
    const assaultPlayer = this.gameState.getPlayerBySide(PlayerSide.Assault);
    const defenderPlayer = this.gameState.getPlayerBySide(PlayerSide.Defender);

    if (!assaultPlayer || !defenderPlayer) return;

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
  private calculatePlayerScore(player: any): number {
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
    if (!this.selectedUnit) return;

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
}
