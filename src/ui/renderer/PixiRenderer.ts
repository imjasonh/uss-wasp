/**
 * Pixi.js rendering engine for the game
 */

import * as PIXI from 'pixi.js';
import { Hex } from '../../core/hex';
import { HexLayout, POINTY_TOP_ORIENTATION, Point } from '../../core/hex/HexLayout';
import { GameState } from '../../core/game';

export interface RendererConfig {
  width: number;
  height: number;
  hexSize: number;
  backgroundColor: number;
}

/**
 * Main renderer class using Pixi.js
 */
export class PixiRenderer {
  private app: PIXI.Application;
  private hexLayout: HexLayout;
  private mapContainer: PIXI.Container;
  private unitContainer: PIXI.Container;
  private uiContainer: PIXI.Container;
  private selectedHex?: Hex;
  
  constructor(container: HTMLElement, config: RendererConfig) {
    // Initialize Pixi application
    this.app = new PIXI.Application({
      width: config.width,
      height: config.height,
      backgroundColor: config.backgroundColor,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.view as HTMLCanvasElement);

    // Set up hex layout
    this.hexLayout = new HexLayout(
      POINTY_TOP_ORIENTATION,
      { width: config.hexSize, height: config.hexSize },
      { x: config.width / 2, y: config.height / 2 }
    );

    // Create main containers
    this.mapContainer = new PIXI.Container();
    this.unitContainer = new PIXI.Container();
    this.uiContainer = new PIXI.Container();

    this.app.stage.addChild(this.mapContainer);
    this.app.stage.addChild(this.unitContainer);
    this.app.stage.addChild(this.uiContainer);

    // Make containers interactive
    this.app.stage.interactive = true;
    this.app.stage.hitArea = new PIXI.Rectangle(0, 0, config.width, config.height);

    // Set up camera controls
    this.setupCameraControls();
  }

  /**
   * Set up camera controls (pan and zoom)
   */
  private setupCameraControls(): void {
    let isDragging = false;
    let lastPosition = { x: 0, y: 0 };

    this.app.stage.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
      isDragging = true;
      lastPosition = { x: event.globalX, y: event.globalY };
    });

    this.app.stage.on('pointermove', (event: PIXI.FederatedPointerEvent) => {
      if (isDragging) {
        const deltaX = event.globalX - lastPosition.x;
        const deltaY = event.globalY - lastPosition.y;

        this.mapContainer.x += deltaX;
        this.mapContainer.y += deltaY;
        this.unitContainer.x += deltaX;
        this.unitContainer.y += deltaY;

        lastPosition = { x: event.globalX, y: event.globalY };
      }
    });

    this.app.stage.on('pointerup', () => {
      isDragging = false;
    });

    this.app.stage.on('pointerupoutside', () => {
      isDragging = false;
    });

    // Zoom with mouse wheel
    (this.app.view as EventTarget).addEventListener('wheel', (event: Event) => {
      const wheelEvent = event as WheelEvent;
      wheelEvent.preventDefault();
      
      const scaleFactor = wheelEvent.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.5, Math.min(2.0, this.mapContainer.scale.x * scaleFactor));
      
      this.mapContainer.scale.set(newScale);
      this.unitContainer.scale.set(newScale);
    });
  }

  /**
   * Render a hex grid
   */
  renderHexGrid(hexes: Hex[], getTerrainColor: (hex: Hex) => number): void {
    this.mapContainer.removeChildren();

    for (const hex of hexes) {
      const hexGraphics = this.createHexGraphics(hex, getTerrainColor(hex));
      this.mapContainer.addChild(hexGraphics);
    }
  }

  /**
   * Create graphics for a single hex
   */
  private createHexGraphics(hex: Hex, fillColor: number): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    const corners = this.hexLayout.hexCorners(hex);
    
    // Draw hex fill
    graphics.beginFill(fillColor, 0.8);
    graphics.lineStyle(2, 0x333333, 1);
    
    if (corners.length > 0) {
      graphics.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        graphics.lineTo(corners[i].x, corners[i].y);
      }
      graphics.closePath();
    }
    
    graphics.endFill();

    // Add coordinate text for debugging
    const center = this.hexLayout.hexToPixel(hex);
    const text = new PIXI.Text(`${hex.q},${hex.r}`, {
      fontSize: 10,
      fill: 0xffffff,
      align: 'center',
    });
    text.anchor.set(0.5);
    text.x = center.x;
    text.y = center.y;
    graphics.addChild(text);

    // Make hex interactive
    graphics.interactive = true;
    graphics.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      this.selectHex(hex);
    });

    return graphics;
  }

  /**
   * Select a hex
   */
  selectHex(hex: Hex): void {
    this.selectedHex = hex;
    this.highlightSelectedHex();
    
    // Emit custom event for game logic
    const event = new CustomEvent('hexSelected', { detail: hex });
    this.app.view.dispatchEvent(event);
  }

  /**
   * Highlight the selected hex
   */
  private highlightSelectedHex(): void {
    // Remove previous highlight
    const existingHighlight = this.uiContainer.getChildByName('hexHighlight');
    if (existingHighlight) {
      this.uiContainer.removeChild(existingHighlight);
    }

    if (!this.selectedHex) return;

    // Create new highlight
    const highlight = new PIXI.Graphics();
    highlight.name = 'hexHighlight';
    
    const corners = this.hexLayout.hexCorners(this.selectedHex);
    highlight.lineStyle(4, 0xff0000, 1);
    
    if (corners.length > 0) {
      highlight.moveTo(corners[0].x, corners[0].y);
      for (let i = 1; i < corners.length; i++) {
        highlight.lineTo(corners[i].x, corners[i].y);
      }
      highlight.closePath();
    }

    this.uiContainer.addChild(highlight);
  }

  /**
   * Render units on the map
   */
  renderUnits(gameState: GameState): void {
    this.unitContainer.removeChildren();

    for (const player of gameState.getAllPlayers()) {
      for (const unit of player.getLivingUnits()) {
        const unitGraphics = this.createUnitGraphics(unit);
        this.unitContainer.addChild(unitGraphics);
      }
    }
  }

  /**
   * Create graphics for a unit
   */
  private createUnitGraphics(unit: any): PIXI.Graphics {
    const graphics = new PIXI.Graphics();
    const center = this.hexLayout.hexToPixel(unit.state.position);
    
    // Unit color based on side
    const color = unit.side === 'assault' ? 0x0099ff : 0xff3300;
    
    // Draw unit as a circle
    graphics.beginFill(color, 0.9);
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.drawCircle(center.x, center.y, 20);
    graphics.endFill();

    // Add unit type text
    const text = new PIXI.Text(this.getUnitSymbol(unit.type), {
      fontSize: 12,
      fill: 0xffffff,
      fontWeight: 'bold',
      align: 'center',
    });
    text.anchor.set(0.5);
    text.x = center.x;
    text.y = center.y;
    graphics.addChild(text);

    // Add HP indicator
    if (unit.state.currentHP < unit.stats.hp) {
      const hpBar = this.createHPBar(unit, center);
      graphics.addChild(hpBar);
    }

    // Make unit interactive
    graphics.interactive = true;
    graphics.on('pointerdown', (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      const unitEvent = new CustomEvent('unitSelected', { detail: unit });
      this.app.view.dispatchEvent(unitEvent);
    });

    return graphics;
  }

  /**
   * Get unit symbol for display
   */
  private getUnitSymbol(unitType: string): string {
    const symbols: Record<string, string> = {
      'uss_wasp': '🚢',
      'harrier': '✈️',
      'osprey': '🚁',
      'super_stallion': '🚁',
      'super_cobra': '🚁',
      'lcac': '🚤',
      'lcu': '🚤',
      'aav_7': '🚗',
      'marine_squad': '🪖',
      'marsoc': '⭐',
      'humvee': '🚗',
      'infantry_squad': '👤',
      'atgm_team': '🎯',
      'aa_team': '🔫',
      'mortar_team': '💥',
      'technical': '🚗',
      'militia_squad': '👤',
      'long_range_artillery': '🎯',
    };
    return symbols[unitType] || '?';
  }

  /**
   * Create HP bar for damaged units
   */
  private createHPBar(unit: any, center: Point): PIXI.Graphics {
    const hpBar = new PIXI.Graphics();
    const barWidth = 30;
    const barHeight = 4;
    const hpRatio = unit.state.currentHP / unit.stats.hp;
    
    // Background
    hpBar.beginFill(0x333333);
    hpBar.drawRect(center.x - barWidth/2, center.y + 25, barWidth, barHeight);
    hpBar.endFill();
    
    // HP fill
    const hpColor = hpRatio > 0.5 ? 0x00ff00 : hpRatio > 0.25 ? 0xffff00 : 0xff0000;
    hpBar.beginFill(hpColor);
    hpBar.drawRect(center.x - barWidth/2, center.y + 25, barWidth * hpRatio, barHeight);
    hpBar.endFill();
    
    return hpBar;
  }

  /**
   * Convert screen coordinates to hex coordinates
   */
  screenToHex(screenX: number, screenY: number): Hex {
    // Account for camera position and scale
    const worldX = (screenX - this.mapContainer.x) / this.mapContainer.scale.x;
    const worldY = (screenY - this.mapContainer.y) / this.mapContainer.scale.y;
    
    return this.hexLayout.pixelToHex({ x: worldX, y: worldY });
  }

  /**
   * Get the Pixi application
   */
  getApp(): PIXI.Application {
    return this.app;
  }

  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    this.app.renderer.resize(width, height);
  }

  /**
   * Highlight hexes with specified type
   */
  highlightHexes(hexes: Hex[], type: 'movement' | 'attack' | 'ability'): void {
    this.clearHighlights();

    const colors = {
      movement: 0x00ff00,
      attack: 0xff0000,
      ability: 0xffff00,
    };

    const color = colors[type];
    const alpha = 0.3;

    for (const hex of hexes) {
      const highlight = new PIXI.Graphics();
      highlight.name = `highlight_${type}`;
      
      const corners = this.hexLayout.hexCorners(hex);
      highlight.beginFill(color, alpha);
      highlight.lineStyle(2, color, 0.8);
      
      if (corners.length > 0) {
        highlight.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          highlight.lineTo(corners[i].x, corners[i].y);
        }
        highlight.closePath();
      }
      
      highlight.endFill();
      this.uiContainer.addChild(highlight);
    }
  }

  /**
   * Clear all highlights
   */
  clearHighlights(): void {
    const highlights = this.uiContainer.children.filter(child => 
      child.name && child.name.startsWith('highlight_')
    );
    
    for (const highlight of highlights) {
      this.uiContainer.removeChild(highlight);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.app.destroy(true, true);
  }
}