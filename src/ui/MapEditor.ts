/**
 * Map editor UI component for selecting and arranging map sections
 */

import { GameMap } from '../core/game/Map';
import { MapBuilder } from '../core/game/MapBuilder';
import {
  MapSection,
  MapSectionLibrary,
  MapConfiguration,
  PlacedMapSection,
  SectionRotation,
  MapSectionType,
} from '../core/game/MapSection';
import { HexCoordinate } from '../core/hex';

/**
 * Map editor configuration
 */
export interface MapEditorConfig {
  readonly containerElement: HTMLElement;
  readonly mapDimensions: { width: number; height: number };
  readonly onMapChange?: (map: GameMap) => void;
  readonly onConfigurationChange?: (config: MapConfiguration) => void;
}

/**
 * Map editor state
 */
interface MapEditorState {
  selectedSection: MapSection | null;
  selectedRotation: SectionRotation;
  currentConfiguration: MapConfiguration | null;
  placedSections: PlacedMapSection[];
  previewMode: boolean;
  isDragging: boolean;
}

/**
 * Map editor UI component
 */
export class MapEditor {
  private readonly config: MapEditorConfig;
  private readonly library: MapSectionLibrary;
  private readonly state: MapEditorState;
  private readonly elements: {
    container: HTMLElement;
    sectionPalette: HTMLElement;
    mapCanvas: HTMLElement;
    controls: HTMLElement;
    configurationPanel: HTMLElement;
  };

  public constructor(config: MapEditorConfig) {
    this.config = config;
    this.library = new MapSectionLibrary();
    this.state = {
      selectedSection: null,
      selectedRotation: SectionRotation.NONE,
      currentConfiguration: null,
      placedSections: [],
      previewMode: false,
      isDragging: false,
    };

    this.elements = {
      container: config.containerElement,
      sectionPalette: document.createElement('div'),
      mapCanvas: document.createElement('div'),
      controls: document.createElement('div'),
      configurationPanel: document.createElement('div'),
    };

    this.initializeUI();
    this.bindEvents();
  }

  /**
   * Initialize the UI components
   */
  private initializeUI(): void {
    // Set up container
    this.elements.container.className = 'map-editor';
    this.elements.container.innerHTML = '';

    // Create main layout
    this.elements.container.appendChild(this.createSectionPalette());
    this.elements.container.appendChild(this.createMapCanvas());
    this.elements.container.appendChild(this.createControls());
    this.elements.container.appendChild(this.createConfigurationPanel());

    // Add CSS classes
    this.addEditorStyles();
  }

  /**
   * Create section palette UI
   */
  private createSectionPalette(): HTMLElement {
    this.elements.sectionPalette.className = 'section-palette';
    this.elements.sectionPalette.innerHTML = `
      <h3>Map Sections</h3>
      <div class="section-categories">
        ${this.createSectionCategories()}
      </div>
      <div class="section-list">
        ${this.createSectionList()}
      </div>
      <div class="rotation-controls">
        <h4>Rotation</h4>
        ${this.createRotationControls()}
      </div>
    `;

    return this.elements.sectionPalette;
  }

  /**
   * Create section categories
   */
  private createSectionCategories(): string {
    const categories = Object.values(MapSectionType);
    return categories
      .map(
        category => `
      <button class="category-btn" data-category="${category}">
        ${category.replace('_', ' ').toUpperCase()}
      </button>
    `
      )
      .join('');
  }

  /**
   * Create section list
   */
  private createSectionList(): string {
    const sections = this.library.getAllSections();
    return sections
      .map(
        section => `
      <div class="section-item" data-section-id="${section.id}">
        <div class="section-preview">
          ${this.createSectionPreview(section)}
        </div>
        <div class="section-info">
          <h4>${section.name}</h4>
          <p>${section.description}</p>
          <div class="section-metadata">
            <span class="difficulty ${section.metadata.difficulty}">${section.metadata.difficulty}</span>
            <span class="type">${section.type.replace('_', ' ')}</span>
          </div>
        </div>
      </div>
    `
      )
      .join('');
  }

  /**
   * Create rotation controls
   */
  private createRotationControls(): string {
    const rotations = [
      { value: SectionRotation.NONE, label: '0°' },
      { value: SectionRotation.CLOCKWISE_60, label: '60°' },
      { value: SectionRotation.CLOCKWISE_120, label: '120°' },
      { value: SectionRotation.CLOCKWISE_180, label: '180°' },
      { value: SectionRotation.CLOCKWISE_240, label: '240°' },
      { value: SectionRotation.CLOCKWISE_300, label: '300°' },
    ];

    return rotations
      .map(
        rotation => `
      <button class="rotation-btn" data-rotation="${rotation.value}">
        ${rotation.label}
      </button>
    `
      )
      .join('');
  }

  /**
   * Create map canvas
   */
  private createMapCanvas(): HTMLElement {
    this.elements.mapCanvas.className = 'map-canvas';
    this.elements.mapCanvas.innerHTML = `
      <div class="map-grid">
        ${this.createMapGrid()}
      </div>
      <div class="map-overlay">
        <!-- Section previews and placement indicators -->
      </div>
    `;

    return this.elements.mapCanvas;
  }

  /**
   * Create map grid
   */
  private createMapGrid(): string {
    const { width, height } = this.config.mapDimensions;
    let gridHTML = '';

    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        gridHTML += `
          <div class="hex-cell" data-q="${q}" data-r="${r}">
            <div class="hex-shape"></div>
          </div>
        `;
      }
    }

    return gridHTML;
  }

  /**
   * Create controls panel
   */
  private createControls(): HTMLElement {
    this.elements.controls.className = 'editor-controls';
    this.elements.controls.innerHTML = `
      <div class="control-group">
        <button id="clear-map">Clear Map</button>
        <button id="save-config">Save Configuration</button>
        <button id="load-config">Load Configuration</button>
      </div>
      <div class="control-group">
        <button id="preview-mode">Preview Mode</button>
        <button id="validate-config">Validate</button>
        <button id="build-map">Build Map</button>
      </div>
    `;

    return this.elements.controls;
  }

  /**
   * Create configuration panel
   */
  private createConfigurationPanel(): HTMLElement {
    this.elements.configurationPanel.className = 'configuration-panel';
    this.elements.configurationPanel.innerHTML = `
      <h3>Configuration</h3>
      <div class="config-info">
        <div class="config-field">
          <label>Name:</label>
          <input type="text" id="config-name" placeholder="Enter configuration name">
        </div>
        <div class="config-field">
          <label>Description:</label>
          <textarea id="config-description" placeholder="Enter description"></textarea>
        </div>
        <div class="config-field">
          <label>Difficulty:</label>
          <select id="config-difficulty">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
      <div class="placed-sections">
        <h4>Placed Sections</h4>
        <div id="placed-sections-list">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;

    return this.elements.configurationPanel;
  }

  /**
   * Create section preview
   */
  private createSectionPreview(section: MapSection): string {
    // Create a simplified visual representation of the section
    const { width, height } = section.dimensions;
    let previewHTML = '<div class="section-preview-grid">';

    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const sectionHex = section.hexes.find(hex => hex.offset.q === q && hex.offset.r === r);
        const terrainClass = sectionHex ? `terrain-${sectionHex.terrain}` : 'terrain-empty';
        previewHTML += `<div class="preview-hex ${terrainClass}"></div>`;
      }
    }

    previewHTML += '</div>';
    return previewHTML;
  }

  /**
   * Bind event handlers
   */
  private bindEvents(): void {
    // Section selection
    this.elements.sectionPalette.addEventListener('click', e => {
      const target = e.target as HTMLElement;

      if (target.classList.contains('category-btn')) {
        this.filterSectionsByCategory(target.dataset.category as MapSectionType);
      } else if (target.closest('.section-item')) {
        const sectionId = target.closest('.section-item')?.getAttribute('data-section-id');
        if (sectionId) {
          this.selectSection(sectionId);
        }
      } else if (target.classList.contains('rotation-btn')) {
        const rotation = parseInt(target.dataset.rotation ?? '0') as SectionRotation;
        this.setRotation(rotation);
      }
    });

    // Map canvas interactions
    this.elements.mapCanvas.addEventListener('click', e => {
      const target = e.target as HTMLElement;
      const hexCell = target.closest('.hex-cell') as HTMLElement;

      if (hexCell && this.state.selectedSection) {
        const q = parseInt(hexCell.dataset.q ?? '0');
        const r = parseInt(hexCell.dataset.r ?? '0');
        this.placeSectionAt({ q, r, s: -(q + r) });
      }
    });

    this.elements.mapCanvas.addEventListener('mousemove', e => {
      if (this.state.selectedSection && this.state.previewMode) {
        const target = e.target as HTMLElement;
        const hexCell = target.closest('.hex-cell') as HTMLElement;

        if (hexCell) {
          const q = parseInt(hexCell.dataset.q ?? '0');
          const r = parseInt(hexCell.dataset.r ?? '0');
          this.showSectionPreview({ q, r, s: -(q + r) });
        }
      }
    });

    // Controls
    this.elements.controls.addEventListener('click', e => {
      const target = e.target as HTMLElement;

      switch (target.id) {
        case 'clear-map':
          this.clearMap();
          break;
        case 'save-config':
          this.saveConfiguration();
          break;
        case 'load-config':
          this.loadConfiguration();
          break;
        case 'preview-mode':
          this.togglePreviewMode();
          break;
        case 'validate-config':
          this.validateConfiguration();
          break;
        case 'build-map':
          this.buildMap();
          break;
        default:
          // No action needed for other elements
          break;
      }
    });
  }

  /**
   * Filter sections by category
   */
  private filterSectionsByCategory(category: MapSectionType): void {
    const sections = this.library.getSectionsByType(category);
    // Update section list display
    this.updateSectionList(sections);
  }

  /**
   * Update section list display
   */
  private updateSectionList(sections: MapSection[]): void {
    const sectionList = this.elements.sectionPalette.querySelector('.section-list');
    if (sectionList) {
      sectionList.innerHTML = sections
        .map(
          section => `
        <div class="section-item" data-section-id="${section.id}">
          <div class="section-preview">
            ${this.createSectionPreview(section)}
          </div>
          <div class="section-info">
            <h4>${section.name}</h4>
            <p>${section.description}</p>
            <div class="section-metadata">
              <span class="difficulty ${section.metadata.difficulty}">${section.metadata.difficulty}</span>
              <span class="type">${section.type.replace('_', ' ')}</span>
            </div>
          </div>
        </div>
      `
        )
        .join('');
    }
  }

  /**
   * Select a section
   */
  private selectSection(sectionId: string): void {
    const section = this.library.getSection(sectionId);
    if (section) {
      this.state.selectedSection = section;
      this.updateSelectionHighlight();
    }
  }

  /**
   * Set rotation
   */
  private setRotation(rotation: SectionRotation): void {
    this.state.selectedRotation = rotation;
    this.updateRotationHighlight();
  }

  /**
   * Place section at position
   */
  private placeSectionAt(position: HexCoordinate): void {
    if (!this.state.selectedSection) {
      return;
    }

    const placedSection: PlacedMapSection = {
      section: this.state.selectedSection,
      position,
      rotation: this.state.selectedRotation,
    };

    this.state.placedSections.push(placedSection);
    this.updateMapDisplay();
    this.updatePlacedSectionsList();
  }

  /**
   * Show section preview
   */
  private showSectionPreview(position: HexCoordinate): void {
    if (!this.state.selectedSection) {
      return;
    }

    const preview = MapBuilder.previewSectionPlacement(
      this.state.selectedSection,
      position,
      this.state.selectedRotation,
      this.config.mapDimensions
    );

    this.updatePreviewDisplay(preview);
  }

  /**
   * Clear map
   */
  private clearMap(): void {
    this.state.placedSections = [];
    this.updateMapDisplay();
    this.updatePlacedSectionsList();
  }

  /**
   * Save configuration
   */
  private saveConfiguration(): void {
    const nameInput = this.elements.configurationPanel.querySelector(
      '#config-name'
    ) as HTMLInputElement;
    const descriptionInput = this.elements.configurationPanel.querySelector(
      '#config-description'
    ) as HTMLTextAreaElement;
    const difficultySelect = this.elements.configurationPanel.querySelector(
      '#config-difficulty'
    ) as HTMLSelectElement;

    if (!nameInput.value.trim()) {
      alert('Please enter a configuration name');
      return;
    }

    const config: MapConfiguration = {
      id: `custom_${Date.now()}`,
      name: nameInput.value.trim(),
      description: descriptionInput.value.trim(),
      dimensions: this.config.mapDimensions,
      sections: [...this.state.placedSections],
      metadata: {
        difficulty: difficultySelect.value as 'easy' | 'medium' | 'hard',
        recommendedPlayers: 2,
        estimatedDuration: 60,
      },
    };

    this.library.addConfiguration(config);
    this.state.currentConfiguration = config;

    if (this.config.onConfigurationChange) {
      this.config.onConfigurationChange(config);
    }

    alert('Configuration saved successfully!');
  }

  /**
   * Load configuration
   */
  private loadConfiguration(): void {
    const configurations = this.library.getAllConfigurations();

    // Create selection dialog
    const dialog = this.createConfigurationDialog(configurations);
    document.body.appendChild(dialog);
  }

  /**
   * Toggle preview mode
   */
  private togglePreviewMode(): void {
    this.state.previewMode = !this.state.previewMode;
    this.updatePreviewModeButton();
  }

  /**
   * Validate configuration
   */
  private validateConfiguration(): void {
    if (this.state.placedSections.length === 0) {
      alert('No sections placed');
      return;
    }

    const config: MapConfiguration = {
      id: 'temp',
      name: 'Temp',
      description: 'Temp',
      dimensions: this.config.mapDimensions,
      sections: this.state.placedSections,
      metadata: { difficulty: 'medium', recommendedPlayers: 2, estimatedDuration: 60 },
    };

    const validation = MapBuilder.validateConfiguration(config);

    if (validation.valid) {
      alert('Configuration is valid!');
    } else {
      alert(`Configuration has errors:\n${validation.errors.join('\n')}`);
    }
  }

  /**
   * Build map
   */
  private buildMap(): void {
    if (this.state.placedSections.length === 0) {
      alert('No sections placed');
      return;
    }

    const config: MapConfiguration = {
      id: 'temp',
      name: 'Temp',
      description: 'Temp',
      dimensions: this.config.mapDimensions,
      sections: this.state.placedSections,
      metadata: { difficulty: 'medium', recommendedPlayers: 2, estimatedDuration: 60 },
    };

    const result = MapBuilder.buildFromConfiguration(config);

    if (result.success && result.map) {
      if (this.config.onMapChange) {
        this.config.onMapChange(result.map);
      }
      alert('Map built successfully!');
    } else {
      alert(`Failed to build map:\n${result.errors.join('\n')}`);
    }
  }

  /**
   * Update selection highlight
   */
  private updateSelectionHighlight(): void {
    // Update UI to show selected section
    const sectionItems = this.elements.sectionPalette.querySelectorAll('.section-item');
    sectionItems.forEach(item => {
      item.classList.remove('selected');
      if (item.getAttribute('data-section-id') === this.state.selectedSection?.id) {
        item.classList.add('selected');
      }
    });
  }

  /**
   * Update rotation highlight
   */
  private updateRotationHighlight(): void {
    // Update UI to show selected rotation
    const rotationBtns = this.elements.sectionPalette.querySelectorAll('.rotation-btn');
    rotationBtns.forEach(btn => {
      btn.classList.remove('selected');
      if (
        parseInt(btn.getAttribute('data-rotation') ?? '0') === Number(this.state.selectedRotation)
      ) {
        btn.classList.add('selected');
      }
    });
  }

  /**
   * Update map display
   */
  private updateMapDisplay(): void {
    // Clear current display
    const hexCells = this.elements.mapCanvas.querySelectorAll('.hex-cell');
    hexCells.forEach(cell => {
      cell.className = 'hex-cell';
    });

    // Apply placed sections
    for (const placedSection of this.state.placedSections) {
      const preview = MapBuilder.previewSectionPlacement(
        placedSection.section,
        placedSection.position,
        placedSection.rotation,
        this.config.mapDimensions
      );

      for (const { hex, terrain } of preview.hexes) {
        const cell = this.elements.mapCanvas.querySelector(
          `.hex-cell[data-q="${hex.q}"][data-r="${hex.r}"]`
        );
        if (cell) {
          cell.classList.add(`terrain-${terrain}`);
        }
      }
    }
  }

  /**
   * Update preview display
   */
  private updatePreviewDisplay(
    preview: ReturnType<typeof MapBuilder.previewSectionPlacement>
  ): void {
    // Clear previous preview
    const previewCells = this.elements.mapCanvas.querySelectorAll('.preview');
    previewCells.forEach(cell => cell.classList.remove('preview'));

    // Show new preview
    for (const { hex } of preview.hexes) {
      const cell = this.elements.mapCanvas.querySelector(
        `.hex-cell[data-q="${hex.q}"][data-r="${hex.r}"]`
      );
      if (cell) {
        cell.classList.add('preview');
      }
    }
  }

  /**
   * Update placed sections list
   */
  private updatePlacedSectionsList(): void {
    const listContainer = this.elements.configurationPanel.querySelector('#placed-sections-list');
    if (listContainer) {
      listContainer.innerHTML = this.state.placedSections
        .map(
          (placedSection, index) => `
        <div class="placed-section-item">
          <span>${placedSection.section.name}</span>
          <span>(${placedSection.position.q}, ${placedSection.position.r})</span>
          <span>${placedSection.rotation}°</span>
          <button class="remove-btn" data-index="${index}">Remove</button>
        </div>
      `
        )
        .join('');

      // Bind remove buttons
      listContainer.addEventListener('click', e => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('remove-btn')) {
          const index = parseInt(target.dataset.index ?? '0');
          this.state.placedSections.splice(index, 1);
          this.updateMapDisplay();
          this.updatePlacedSectionsList();
        }
      });
    }
  }

  /**
   * Update preview mode button
   */
  private updatePreviewModeButton(): void {
    const button = this.elements.controls.querySelector('#preview-mode');
    if (button) {
      button.textContent = this.state.previewMode ? 'Exit Preview' : 'Preview Mode';
      button.classList.toggle('active', this.state.previewMode);
    }
  }

  /**
   * Create configuration dialog
   */
  private createConfigurationDialog(configurations: MapConfiguration[]): HTMLElement {
    const dialog = document.createElement('div');
    dialog.className = 'configuration-dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Load Configuration</h3>
        <div class="configuration-list">
          ${configurations
            .map(
              config => `
            <div class="config-item" data-config-id="${config.id}">
              <h4>${config.name}</h4>
              <p>${config.description}</p>
              <div class="config-meta">
                <span>Difficulty: ${config.metadata.difficulty}</span>
                <span>Sections: ${config.sections.length}</span>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
        <div class="dialog-buttons">
          <button id="load-selected">Load</button>
          <button id="cancel-load">Cancel</button>
        </div>
      </div>
    `;

    // Handle dialog events
    dialog.addEventListener('click', e => {
      const target = e.target as HTMLElement;

      if (target.id === 'load-selected') {
        const selected = dialog.querySelector('.config-item.selected');
        if (selected) {
          const configId = selected.getAttribute('data-config-id');
          if (configId) {
            this.loadConfigurationById(configId);
          }
        }
        document.body.removeChild(dialog);
      } else if (target.id === 'cancel-load') {
        document.body.removeChild(dialog);
      } else if (target.closest('.config-item')) {
        // Select configuration
        const configItems = dialog.querySelectorAll('.config-item');
        configItems.forEach(item => item.classList.remove('selected'));
        target.closest('.config-item')?.classList.add('selected');
      }
    });

    return dialog;
  }

  /**
   * Load configuration by ID
   */
  private loadConfigurationById(configId: string): void {
    const config = this.library.getConfiguration(configId);
    if (config) {
      this.state.currentConfiguration = config;
      this.state.placedSections = [...config.sections];

      // Update UI
      (this.elements.configurationPanel.querySelector('#config-name') as HTMLInputElement).value =
        config.name;
      (
        this.elements.configurationPanel.querySelector('#config-description') as HTMLTextAreaElement
      ).value = config.description;
      (
        this.elements.configurationPanel.querySelector('#config-difficulty') as HTMLSelectElement
      ).value = config.metadata.difficulty;

      this.updateMapDisplay();
      this.updatePlacedSectionsList();

      if (this.config.onConfigurationChange) {
        this.config.onConfigurationChange(config);
      }
    }
  }

  /**
   * Add editor styles
   */
  private addEditorStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .map-editor {
        display: grid;
        grid-template-areas: 
          "palette canvas controls"
          "palette canvas config";
        grid-template-columns: 300px 1fr 300px;
        grid-template-rows: auto 1fr;
        gap: 10px;
        padding: 10px;
        height: 100vh;
        background: #1a1a2e;
        color: #ffffff;
      }

      .section-palette {
        grid-area: palette;
        background: #16213e;
        border: 1px solid #0f3460;
        border-radius: 8px;
        padding: 15px;
        overflow-y: auto;
      }

      .map-canvas {
        grid-area: canvas;
        background: #0f3460;
        border: 1px solid #0f3460;
        border-radius: 8px;
        position: relative;
        overflow: auto;
      }

      .editor-controls {
        grid-area: controls;
        background: #16213e;
        border: 1px solid #0f3460;
        border-radius: 8px;
        padding: 15px;
      }

      .configuration-panel {
        grid-area: config;
        background: #16213e;
        border: 1px solid #0f3460;
        border-radius: 8px;
        padding: 15px;
        overflow-y: auto;
      }

      .section-item {
        border: 1px solid #0f3460;
        border-radius: 6px;
        padding: 10px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .section-item:hover {
        background: rgba(15, 52, 96, 0.3);
      }

      .section-item.selected {
        border-color: #e94560;
        background: rgba(233, 69, 96, 0.1);
      }

      .section-preview-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1px;
        margin-bottom: 8px;
      }

      .preview-hex {
        width: 12px;
        height: 12px;
        border-radius: 2px;
      }

      .terrain-deep_water { background: #1e3a8a; }
      .terrain-shallow_water { background: #3b82f6; }
      .terrain-beach { background: #fbbf24; }
      .terrain-clear { background: #10b981; }
      .terrain-light_woods { background: #16a34a; }
      .terrain-heavy_woods { background: #15803d; }
      .terrain-urban { background: #6b7280; }
      .terrain-hills { background: #92400e; }
      .terrain-mountains { background: #78716c; }
      .terrain-empty { background: #374151; }

      .map-grid {
        display: grid;
        grid-template-columns: repeat(var(--map-width, 8), 1fr);
        gap: 2px;
        padding: 20px;
      }

      .hex-cell {
        width: 30px;
        height: 30px;
        position: relative;
        cursor: pointer;
      }

      .hex-shape {
        width: 100%;
        height: 100%;
        background: #374151;
        clip-path: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
        transition: background 0.2s;
      }

      .hex-cell:hover .hex-shape {
        background: #4b5563;
      }

      .hex-cell.preview .hex-shape {
        background: rgba(233, 69, 96, 0.5);
      }

      .category-btn, .rotation-btn {
        background: #e94560;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin: 2px;
        font-size: 12px;
      }

      .category-btn:hover, .rotation-btn:hover {
        background: #d63447;
      }

      .category-btn.selected, .rotation-btn.selected {
        background: #0f3460;
      }

      .control-group {
        margin-bottom: 15px;
      }

      .control-group button {
        background: #e94560;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        margin: 2px;
        font-size: 14px;
      }

      .control-group button:hover {
        background: #d63447;
      }

      .control-group button.active {
        background: #0f3460;
      }

      .config-field {
        margin-bottom: 12px;
      }

      .config-field label {
        display: block;
        margin-bottom: 4px;
        font-weight: bold;
      }

      .config-field input,
      .config-field textarea,
      .config-field select {
        width: 100%;
        padding: 6px;
        border: 1px solid #0f3460;
        border-radius: 4px;
        background: #1a1a2e;
        color: #ffffff;
      }

      .placed-section-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px;
        border: 1px solid #0f3460;
        border-radius: 4px;
        margin-bottom: 6px;
      }

      .remove-btn {
        background: #dc2626;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
      }

      .remove-btn:hover {
        background: #b91c1c;
      }

      .difficulty.easy { color: #10b981; }
      .difficulty.medium { color: #f59e0b; }
      .difficulty.hard { color: #dc2626; }

      .configuration-dialog {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .dialog-content {
        background: #16213e;
        border: 1px solid #0f3460;
        border-radius: 8px;
        padding: 20px;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
      }

      .config-item {
        border: 1px solid #0f3460;
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .config-item:hover {
        background: rgba(15, 52, 96, 0.3);
      }

      .config-item.selected {
        border-color: #e94560;
        background: rgba(233, 69, 96, 0.1);
      }

      .dialog-buttons {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
      }

      .dialog-buttons button {
        background: #e94560;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      }

      .dialog-buttons button:hover {
        background: #d63447;
      }
    `;
    document.head.appendChild(style);

    // Set CSS custom property for map width
    this.elements.mapCanvas.style.setProperty(
      '--map-width',
      this.config.mapDimensions.width.toString()
    );
  }

  /**
   * Get current configuration
   */
  public getCurrentConfiguration(): MapConfiguration | null {
    return this.state.currentConfiguration;
  }

  /**
   * Get placed sections
   */
  public getPlacedSections(): PlacedMapSection[] {
    return [...this.state.placedSections];
  }
}
