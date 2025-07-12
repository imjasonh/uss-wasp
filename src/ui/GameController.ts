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
  UnitCategory
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
      this.showMessage(result.message, 'success');
    } else {
      this.showMessage(result.message, 'error');
    }

    // Update game displays
    this.updateGameStatusDisplay();
    this.updateWaspDisplay();
  }

  /**
   * Show message to player
   */
  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // You could implement a toast notification system here
    const messageEl = document.getElementById('game-message');
    if (messageEl) {
      messageEl.textContent = message;
      messageEl.className = `message ${type}`;
      
      // Clear after 3 seconds
      setTimeout(() => {
        messageEl.textContent = '';
        messageEl.className = 'message';
      }, 3000);
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
        buttons.push(`<button onclick="gameController.useAbility('${ability.name}')">${ability.name}</button>`);
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
    buttons.push('<button onclick="gameController.toggleFogOfWar()" style="background: #666; font-size: 10px;">Toggle FOW</button>');

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
        return [ActionType.ATTACK, ActionType.LOAD, ActionType.UNLOAD, 
                ActionType.SPECIAL_ABILITY, ActionType.SECURE_OBJECTIVE,
                ActionType.REVEAL].includes(actionType);
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
        ${hexInfo.objective ? `
        <div class="info-item">
          <span class="info-label">Objective:</span>
          <span class="info-value">${hexInfo.objective.type}</span>
        </div>
        ` : ''}
        ${hexInfo.isOffshore ? `
        <div class="info-item">
          <span class="info-label">Special:</span>
          <span class="info-value">Offshore Zone</span>
        </div>
        ` : ''}
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
        ${unit.stats.sp ? `
        <div class="info-item">
          <span class="info-label">Supply:</span>
          <span class="info-value">${unit.state.currentSP}/${unit.stats.sp}</span>
        </div>
        ` : ''}
        ${unit.state.suppressionTokens > 0 ? `
        <div class="info-item">
          <span class="info-label">Suppression:</span>
          <span class="info-value">${unit.state.suppressionTokens}</span>
        </div>
        ` : ''}
        ${unit.state.cargo.length > 0 ? `
        <div class="info-item">
          <span class="info-label">Cargo:</span>
          <span class="info-value">${unit.state.cargo.length}/${unit.getCargoCapacity()}</span>
        </div>
        ` : ''}
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
   * Update game status display
   */
  public updateGameStatusDisplay(): void {
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
    this.updatePlayerStats();
  }

  /**
   * Update player statistics display
   */
  private updatePlayerStats(): void {
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

  /**
   * Render the current game state
   */
  private render(): void {
    // Render map
    const hexes = this.mapRenderer.getAllHexes();
    this.renderer.renderHexGrid(hexes, (hex) => this.mapRenderer.getTerrainColor(hex));

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
  }

  public startAttack(): void {
    this.uiMode = UIMode.ATTACK_TARGET;
    this.showMessage('Select target for attack', 'info');
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
    this.gameState.nextPhase();
    this.updateGameStatusDisplay();
    this.updateActionButtons();
    this.resetUIModeInternal();
    
    // Handle phase-specific logic
    if (this.gameState.phase === TurnPhase.COMMAND) {
      this.gameState.generateCommandPoints();
      this.updatePlayerStats();
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
    this.updatePlayerStats();
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

  public showWaspLaunchOptions(): void {
    if (!this.gameState.waspOperations) {
      this.showMessage('USS Wasp not available', 'error');
      return;
    }

    // Get units aboard Wasp that can be launched
    const aboardUnits = this.gameState.waspOperations.getAboardUnits();
    if (aboardUnits.length === 0) {
      this.showMessage('No units aboard USS Wasp to launch', 'error');
      return;
    }

    // Show launch selection interface
    this.showUnitSelectionModal(aboardUnits, 'Launch Units from USS Wasp', (selectedUnits) => {
      if (selectedUnits.length > 0) {
        this.executeLaunchFromWasp(selectedUnits);
      }
    });
  }

  public showWaspRecoveryOptions(): void {
    if (!this.gameState.waspOperations) {
      this.showMessage('USS Wasp not available', 'error');
      return;
    }

    // Get nearby units that can be recovered
    const recoverableUnits = this.getNearbyRecoverableUnits();
    if (recoverableUnits.length === 0) {
      this.showMessage('No units available for recovery', 'error');
      return;
    }

    // Show recovery selection interface
    this.showUnitSelectionModal(recoverableUnits, 'Recover Units to USS Wasp', (selectedUnits) => {
      if (selectedUnits.length > 0) {
        this.executeRecoveryToWasp(selectedUnits);
      }
    });
  }

  private showUnitSelectionModal(units: Unit[], title: string, onConfirm: (units: Unit[]) => void): void {
    // For now, use simple browser prompts - in a full game this would be a proper modal
    const unitOptions = units.map((unit, index) => `${index}: ${unit.type} (${unit.id})`).join('\n');
    const selection = prompt(`${title}\n\nAvailable units:\n${unitOptions}\n\nEnter unit numbers separated by commas (e.g., 0,1,2):`);
    
    if (selection) {
      const indices = selection.split(',').map(s => parseInt(s.trim())).filter(i => !isNaN(i) && i >= 0 && i < units.length);
      const selectedUnits = indices.map(i => units[i]);
      onConfirm(selectedUnits);
    }
  }

  private executeLaunchFromWasp(units: Unit[]): void {
    const action = {
      type: ActionType.LAUNCH_FROM_WASP,
      playerId: this.gameState.activePlayerId,
      unitId: '', // Not used for Wasp operations
      data: { unitIds: units.map(u => u.id) }
    };

    const result = this.gameEngine.executeAction(action);
    this.handleActionResult(result);
    
    if (result.success) {
      this.render();
      this.updateWaspDisplay();
    }
  }

  private executeRecoveryToWasp(units: Unit[]): void {
    const action = {
      type: ActionType.RECOVER_TO_WASP,
      playerId: this.gameState.activePlayerId,
      unitId: '', // Not used for Wasp operations
      data: { unitIds: units.map(u => u.id) }
    };

    const result = this.gameEngine.executeAction(action);
    this.handleActionResult(result);
    
    if (result.success) {
      this.render();
      this.updateWaspDisplay();
    }
  }

  private getNearbyRecoverableUnits(): Unit[] {
    if (!this.gameState.waspOperations) return [];

    const activePlayer = this.gameState.getActivePlayer();
    if (!activePlayer) return [];

    // Get USS Wasp position
    const waspUnit = this.gameState.waspOperations.getAboardUnits()[0]?.constructor === Unit ? 
      this.gameState.getAllUnits().find(u => u.type === UnitType.USS_WASP) : null;
    
    if (!waspUnit) return [];

    const waspPosition = new Hex(waspUnit.state.position.q, waspUnit.state.position.r, waspUnit.state.position.s);

    // Find units that can be recovered (adjacent aircraft/amphibious craft)
    return activePlayer.getLivingUnits().filter(unit => {
      if (unit.type === UnitType.USS_WASP) return false;
      
      const distance = waspPosition.distanceTo(unit.state.position);
      
      return distance <= 1 && (
        unit.hasCategory(UnitCategory.AIRCRAFT) ||
        unit.hasCategory(UnitCategory.HELICOPTER) ||
        unit.type === UnitType.LCAC ||
        unit.type === UnitType.AAV_7
      );
    });
  }

  private updateWaspDisplay(): void {
    if (!this.gameState.waspOperations) {
      // No Wasp available
      const waspStatusDiv = document.getElementById('wasp-status');
      if (waspStatusDiv) {
        waspStatusDiv.innerHTML = '<div class="info-item"><span class="info-label">No USS Wasp</span></div>';
      }
      
      const launchButtons = document.querySelectorAll('#wasp-launch-controls button');
      launchButtons.forEach(btn => (btn as HTMLButtonElement).disabled = true);
      
      return;
    }

    // Update Wasp status
    const status = this.gameState.waspOperations.getStatusSummary();
    this.updateWaspStatusDisplay(status);
    this.updateWaspCapacityDisplay();
    this.updateWaspCargoDisplay();
    this.updateWaspLaunchButtons();
  }

  private updateWaspStatusDisplay(status: any): void {
    const waspStatusDiv = document.getElementById('wasp-status');
    if (!waspStatusDiv) return;

    const getStatusClass = (level: string) => {
      switch (level) {
        case 'operational': return 'status-operational';
        case 'degraded': return 'status-degraded';
        case 'limited': return 'status-limited';
        case 'damaged': return 'status-damaged';
        case 'offline': return 'status-offline';
        default: return '';
      }
    };

    waspStatusDiv.innerHTML = `
      <div class="info-item">
        <span class="info-label">Structural:</span>
        <span class="info-value">${status.structuralIntegrity}/${status.maxStructuralIntegrity}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Flight Deck:</span>
        <span class="info-value ${getStatusClass(status.flightDeck)}">${status.flightDeck}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Well Deck:</span>
        <span class="info-value ${getStatusClass(status.wellDeck)}">${status.wellDeck}</span>
      </div>
      <div class="info-item">
        <span class="info-label">C2 System:</span>
        <span class="info-value ${getStatusClass(status.c2System)}">${status.c2System}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Defensive Ammo:</span>
        <span class="info-value">${status.defensiveAmmo}/${status.maxDefensiveAmmo}</span>
      </div>
    `;
  }

  private updateWaspCapacityDisplay(): void {
    if (!this.gameState.waspOperations) return;

    const flightDeckCapacity = this.gameState.waspOperations.getFlightDeckCapacity();
    const wellDeckCapacity = this.gameState.waspOperations.getWellDeckCapacity();

    const flightDeckDisplay = document.getElementById('flight-deck-capacity');
    const wellDeckDisplay = document.getElementById('well-deck-capacity');

    if (flightDeckDisplay) {
      flightDeckDisplay.textContent = `${flightDeckCapacity} aircraft`;
    }

    if (wellDeckDisplay) {
      wellDeckDisplay.textContent = `${wellDeckCapacity.lcac} LCAC / ${wellDeckCapacity.aav} AAV`;
    }
  }

  private updateWaspCargoDisplay(): void {
    if (!this.gameState.waspOperations) return;

    const aboardUnits = this.gameState.waspOperations.getAboardUnits();
    const waspCargoDiv = document.getElementById('wasp-cargo');
    
    if (!waspCargoDiv) return;

    if (aboardUnits.length === 0) {
      waspCargoDiv.innerHTML = '<div class="info-item"><span class="info-label">No units aboard</span></div>';
      return;
    }

    const unitCounts: Record<string, number> = {};
    aboardUnits.forEach(unit => {
      const typeName = unit.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
      unitCounts[typeName] = (unitCounts[typeName] || 0) + 1;
    });

    waspCargoDiv.innerHTML = Object.entries(unitCounts).map(([type, count]) => 
      `<div class="info-item">
        <span class="info-label">${type}:</span>
        <span class="info-value">${count}</span>
      </div>`
    ).join('');
  }

  private updateWaspLaunchButtons(): void {
    if (!this.gameState.waspOperations) return;

    const launchBtn = document.querySelector('#wasp-launch-controls button:nth-child(1)') as HTMLButtonElement;
    const recoverBtn = document.querySelector('#wasp-launch-controls button:nth-child(2)') as HTMLButtonElement;

    if (launchBtn) {
      const aboardUnits = this.gameState.waspOperations.getAboardUnits();
      launchBtn.disabled = aboardUnits.length === 0 || this.gameState.phase !== TurnPhase.DEPLOYMENT;
    }

    if (recoverBtn) {
      const recoverableUnits = this.getNearbyRecoverableUnits();
      recoverBtn.disabled = recoverableUnits.length === 0;
    }
  }
}