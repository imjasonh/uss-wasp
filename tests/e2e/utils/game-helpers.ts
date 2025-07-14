import { expect, Page } from '@playwright/test';

/**
 * Game testing utilities for USS Wasp UI tests
 */
export class GameHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for the game to load completely
   */
  async waitForGameLoad() {
    // Wait for the main game elements to be present
    await this.page.waitForSelector('#game-canvas', { timeout: 30000 });
    await this.page.waitForSelector('#sidebar', { timeout: 30000 });
    await this.page.waitForSelector('#controls', { timeout: 30000 });
    
    // Wait for any loading indicators to disappear
    await this.page.waitForFunction(() => {
      const loadingElements = document.querySelectorAll('.loading');
      return loadingElements.length === 0;
    }, { timeout: 30000 });
    
    // Wait for game initialization
    await this.page.waitForTimeout(2000);
  }

  /**
   * Get current turn number
   */
  async getCurrentTurn(): Promise<number> {
    const turnText = await this.page.locator('#turn-display').textContent();
    return parseInt(turnText || '1');
  }

  /**
   * Get current phase
   */
  async getCurrentPhase(): Promise<string> {
    const phaseText = await this.page.locator('#phase-display').textContent();
    return phaseText || 'Unknown';
  }

  /**
   * Get active player
   */
  async getActivePlayer(): Promise<string> {
    const playerText = await this.page.locator('#active-player').textContent();
    return playerText || 'Unknown';
  }

  /**
   * Start a new game
   */
  async startNewGame() {
    await this.page.click('#new-game-btn');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Click next phase button
   */
  async nextPhase() {
    await this.page.click('button:has-text("Next Phase")');
    await this.page.waitForTimeout(500);
  }

  /**
   * Click end turn button
   */
  async endTurn() {
    await this.page.click('button:has-text("End Turn")');
    await this.page.waitForTimeout(500);
  }

  /**
   * Get player command points
   */
  async getCommandPoints(): Promise<{ assault: number; defender: number }> {
    const assaultCP = await this.page.locator('#assault-cp').textContent();
    const defenderCP = await this.page.locator('#defender-cp').textContent();
    
    return {
      assault: parseInt(assaultCP || '0'),
      defender: parseInt(defenderCP || '0')
    };
  }

  /**
   * Get player unit counts
   */
  async getUnitCounts(): Promise<{ assault: number; defender: number }> {
    const assaultUnits = await this.page.locator('#assault-units').textContent();
    const defenderUnits = await this.page.locator('#defender-units').textContent();
    
    return {
      assault: parseInt(assaultUnits || '0'),
      defender: parseInt(defenderUnits || '0')
    };
  }

  /**
   * Get game message
   */
  async getGameMessage(): Promise<string> {
    const messageElement = this.page.locator('#game-message');
    return await messageElement.textContent() || '';
  }

  /**
   * Wait for game message to appear
   */
  async waitForGameMessage(expectedMessage?: string) {
    await this.page.waitForSelector('#game-message:not(:empty)', { timeout: 5000 });
    if (expectedMessage) {
      await expect(this.page.locator('#game-message')).toContainText(expectedMessage);
    }
  }

  /**
   * Click on hex at coordinates (approximate)
   */
  async clickHex(x: number, y: number) {
    const canvas = this.page.locator('#game-canvas');
    await canvas.click({ position: { x, y }, force: true });
    await this.page.waitForTimeout(300);
  }

  /**
   * Click on the center of the game canvas
   */
  async clickCanvasCenter() {
    const canvas = this.page.locator('#game-canvas');
    const bbox = await canvas.boundingBox();
    if (bbox) {
      // Click in the upper-right area to avoid controls at bottom-left
      await canvas.click({ 
        position: { 
          x: bbox.width * 0.7, 
          y: bbox.height * 0.3 
        },
        force: true
      });
    }
    await this.page.waitForTimeout(300);
  }

  /**
   * Get selected unit info
   */
  async getSelectedUnitInfo(): Promise<string> {
    const unitInfo = await this.page.locator('#unit-info').textContent();
    return unitInfo || 'No selection';
  }

  /**
   * Get available unit actions
   */
  async getUnitActions(): Promise<string[]> {
    const actions = await this.page.locator('#unit-actions button').allTextContents();
    return actions;
  }

  /**
   * Click unit action button
   */
  async clickUnitAction(actionName: string) {
    await this.page.click(`#unit-actions button:has-text("${actionName}")`);
    await this.page.waitForTimeout(300);
  }

  /**
   * Get USS Wasp status
   */
  async getWaspStatus(): Promise<string> {
    const status = await this.page.locator('#wasp-status').textContent();
    return status || 'No USS Wasp';
  }

  /**
   * Get USS Wasp cargo info
   */
  async getWaspCargo(): Promise<string> {
    const cargo = await this.page.locator('#wasp-cargo').textContent();
    return cargo || 'No units aboard';
  }

  /**
   * Click USS Wasp launch button
   */
  async clickWaspLaunch() {
    await this.page.click('button:has-text("Launch Units")');
    await this.page.waitForTimeout(500);
  }

  /**
   * Click USS Wasp recovery button
   */
  async clickWaspRecovery() {
    await this.page.click('button:has-text("Recover Units")');
    await this.page.waitForTimeout(500);
  }

  /**
   * Open map editor
   */
  async openMapEditor() {
    await this.page.click('button:has-text("Map Editor")');
    await this.page.waitForTimeout(1000);
  }

  /**
   * Cancel current action
   */
  async cancelAction() {
    await this.page.click('button:has-text("Cancel Action")');
    await this.page.waitForTimeout(300);
  }

  /**
   * Check if element is visible
   */
  async isElementVisible(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { timeout: 1000 });
      return await this.page.isVisible(selector);
    } catch {
      return false;
    }
  }

  /**
   * Check if button is enabled
   */
  async isButtonEnabled(selector: string): Promise<boolean> {
    const button = this.page.locator(selector);
    return !(await button.isDisabled());
  }

  /**
   * Get objectives list
   */
  async getObjectives(): Promise<string[]> {
    const objectives = await this.page.locator('#objectives-list .objective-item').allTextContents();
    return objectives;
  }

  /**
   * Take screenshot with timestamp
   */
  async takeScreenshot(name: string) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `tests/e2e/screenshots/${name}-${timestamp}.png`,
      fullPage: true 
    });
  }

  /**
   * Wait for animation to complete
   */
  async waitForAnimations() {
    await this.page.waitForTimeout(1000);
  }

  /**
   * Simulate multiple hex clicks in sequence
   */
  async clickHexSequence(coordinates: Array<{ x: number; y: number }>) {
    for (const coord of coordinates) {
      await this.clickHex(coord.x, coord.y);
      await this.page.waitForTimeout(300);
    }
  }

  /**
   * Wait for phase change
   */
  async waitForPhaseChange(expectedPhase: string) {
    await this.page.waitForFunction(
      (phase) => document.querySelector('#phase-display')?.textContent === phase,
      expectedPhase,
      { timeout: 10000 }
    );
  }

  /**
   * Wait for turn change
   */
  async waitForTurnChange(expectedTurn: number) {
    await this.page.waitForFunction(
      (turn) => document.querySelector('#turn-display')?.textContent === turn.toString(),
      expectedTurn,
      { timeout: 10000 }
    );
  }
}