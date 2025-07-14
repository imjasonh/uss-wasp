/**
 * Fortification UI components for placement and management
 */

import { Hex } from '../../core/hex';
import { Fortification } from '../../core/game/Map';

/**
 * Fortification type definitions (matching backend)
 */
export enum FortificationType {
  BUNKER = 'bunker',
  MINEFIELD = 'minefield', 
  TRENCH = 'trench',
  BARRICADE = 'barricade'
}

/**
 * Fortification UI configuration
 */
export interface FortificationUIConfig {
  maxFortifications: number;
  fortificationLimits: Record<FortificationType, number>;
  placementPhases: string[];
}

/**
 * Fortification placement state
 */
export interface FortificationPlacementState {
  selectedType: FortificationType | null;
  placementMode: boolean;
  previewPosition: Hex | null;
  placedFortifications: Fortification[];
  remainingLimits: Record<FortificationType, number>;
}

/**
 * Fortification palette component for selecting fortification types
 */
export class FortificationPalette {
  private readonly container: HTMLElement;
  private readonly state: FortificationPlacementState;
  private readonly config: FortificationUIConfig;
  private readonly onTypeSelected: (type: FortificationType | null) => void;

  constructor(
    container: HTMLElement,
    config: FortificationUIConfig,
    onTypeSelected: (type: FortificationType | null) => void
  ) {
    this.container = container;
    this.config = config;
    this.onTypeSelected = onTypeSelected;
    this.state = {
      selectedType: null,
      placementMode: false,
      previewPosition: null,
      placedFortifications: [],
      remainingLimits: { ...config.fortificationLimits }
    };

    this.render();
  }

  /**
   * Render the fortification palette
   */
  private render(): void {
    this.container.innerHTML = '';
    this.container.className = 'fortification-palette';

    // Title
    const title = document.createElement('h3');
    title.textContent = 'Fortifications';
    title.className = 'palette-title';
    this.container.appendChild(title);

    // Fortification type buttons
    Object.values(FortificationType).forEach(type => {
      const button = this.createFortificationButton(type);
      this.container.appendChild(button);
    });

    // Clear selection button
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear Selection';
    clearButton.className = 'fortification-btn clear-btn';
    clearButton.onclick = () => this.selectType(null);
    this.container.appendChild(clearButton);

    // Instructions
    const instructions = document.createElement('div');
    instructions.className = 'placement-instructions';
    instructions.innerHTML = `
      <p><strong>Instructions:</strong></p>
      <ul>
        <li>Select a fortification type</li>
        <li>Click on map hex to place</li>
        <li>Right-click to cancel</li>
      </ul>
    `;
    this.container.appendChild(instructions);
  }

  /**
   * Create button for fortification type
   */
  private createFortificationButton(type: FortificationType): HTMLElement {
    const button = document.createElement('button');
    button.className = `fortification-btn ${type}-btn`;
    
    const remaining = this.state.remainingLimits[type];
    const isAvailable = remaining > 0;
    const isSelected = this.state.selectedType === type;

    button.innerHTML = `
      <div class="btn-content">
        <span class="fort-icon">${this.getFortificationIcon(type)}</span>
        <span class="fort-name">${this.getFortificationDisplayName(type)}</span>
        <span class="fort-count">${remaining} left</span>
        <div class="fort-stats">${this.getFortificationStats(type)}</div>
      </div>
    `;

    button.disabled = !isAvailable;
    if (isSelected) {
      button.classList.add('selected');
    }
    if (!isAvailable) {
      button.classList.add('disabled');
    }

    button.onclick = () => {
      if (isAvailable) {
        this.selectType(isSelected ? null : type);
      }
    };

    return button;
  }

  /**
   * Select fortification type
   */
  private selectType(type: FortificationType | null): void {
    this.state.selectedType = type;
    this.state.placementMode = type !== null;
    this.onTypeSelected(type);
    this.render(); // Re-render to update selection state
  }

  /**
   * Get display icon for fortification type
   */
  private getFortificationIcon(type: FortificationType): string {
    switch (type) {
      case FortificationType.BUNKER:
        return '🏗️';
      case FortificationType.MINEFIELD:
        return '💣';
      case FortificationType.TRENCH:
        return '🕳️';
      case FortificationType.BARRICADE:
        return '🚧';
      default:
        return '🔨';
    }
  }

  /**
   * Get display name for fortification type
   */
  private getFortificationDisplayName(type: FortificationType): string {
    switch (type) {
      case FortificationType.BUNKER:
        return 'Bunker';
      case FortificationType.MINEFIELD:
        return 'Minefield';
      case FortificationType.TRENCH:
        return 'Trench';
      case FortificationType.BARRICADE:
        return 'Barricade';
      default:
        return type;
    }
  }

  /**
   * Get stats description for fortification type
   */
  private getFortificationStats(type: FortificationType): string {
    const stats = this.getFortificationTypeStats(type);
    return `+${stats.defenseBonus} DEF, -${stats.movementPenalty} MV${stats.blocksLOS ? ', Blocks LOS' : ''}`;
  }

  /**
   * Get fortification type statistics
   */
  private getFortificationTypeStats(type: FortificationType): {
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
   * Update placement state after fortification placed
   */
  public fortificationPlaced(type: FortificationType): void {
    if (this.state.remainingLimits[type] > 0) {
      this.state.remainingLimits[type]--;
      if (this.state.remainingLimits[type] === 0 && this.state.selectedType === type) {
        this.selectType(null); // Auto-deselect if limit reached
      } else {
        this.render(); // Update count display
      }
    }
  }

  /**
   * Get current selected type
   */
  public getSelectedType(): FortificationType | null {
    return this.state.selectedType;
  }

  /**
   * Check if in placement mode
   */
  public isInPlacementMode(): boolean {
    return this.state.placementMode;
  }

  /**
   * Get current state
   */
  public getState(): FortificationPlacementState {
    return { ...this.state };
  }

  /**
   * Reset palette state
   */
  public reset(): void {
    this.state.selectedType = null;
    this.state.placementMode = false;
    this.state.previewPosition = null;
    this.state.placedFortifications = [];
    this.state.remainingLimits = { ...this.config.fortificationLimits };
    this.render();
  }
}

/**
 * Default fortification configuration for USS Wasp defender
 */
export const DEFAULT_FORTIFICATION_CONFIG: FortificationUIConfig = {
  maxFortifications: 8,
  fortificationLimits: {
    [FortificationType.BUNKER]: 2,
    [FortificationType.MINEFIELD]: 3,
    [FortificationType.TRENCH]: 2,
    [FortificationType.BARRICADE]: 1
  },
  placementPhases: ['deployment']
};