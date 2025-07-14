import { test, expect } from '@playwright/test';
import { GameHelpers } from './utils/game-helpers';

test.describe('USS Wasp Game - Basic UI Tests', () => {
  let gameHelpers: GameHelpers;

  test.beforeEach(async ({ page }) => {
    gameHelpers = new GameHelpers(page);
    await page.goto('/');
    await gameHelpers.waitForGameLoad();
  });

  test('should load game interface correctly', async ({ page }) => {
    // Check main UI elements are present
    await expect(page.locator('#header h1')).toHaveText('USS Wasp (LHD-1)');
    await expect(page.locator('#header .subtitle')).toHaveText('Amphibious Assault Wargame');
    
    // Check game canvas
    await expect(page.locator('#game-canvas')).toBeVisible();
    
    // Check sidebar panels
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.panel:has-text("Game Status")')).toBeVisible();
    await expect(page.locator('.panel:has-text("Players")')).toBeVisible();
    await expect(page.locator('.panel:has-text("Selection Info")')).toBeVisible();
    await expect(page.locator('.panel:has-text("Unit Actions")')).toBeVisible();
    await expect(page.locator('.panel:has-text("Phase Actions")')).toBeVisible();
    
    // Check controls
    await expect(page.locator('#controls')).toBeVisible();
    await expect(page.locator('#new-game-btn')).toBeVisible();
  });

  test('should display initial game state', async ({ page }) => {
    // Check initial turn and phase
    const turn = await gameHelpers.getCurrentTurn();
    const phase = await gameHelpers.getCurrentPhase();
    const activePlayer = await gameHelpers.getActivePlayer();
    
    expect(turn).toBe(1);
    expect(phase).toBeTruthy();
    expect(activePlayer).toBeTruthy();
    
    // Check player info is displayed
    const commandPoints = await gameHelpers.getCommandPoints();
    const unitCounts = await gameHelpers.getUnitCounts();
    
    expect(commandPoints.assault).toBeGreaterThanOrEqual(0);
    expect(commandPoints.defender).toBeGreaterThanOrEqual(0);
    expect(unitCounts.assault).toBeGreaterThanOrEqual(0);
    expect(unitCounts.defender).toBeGreaterThanOrEqual(0);
  });

  test('should handle new game button', async ({ page }) => {
    await gameHelpers.startNewGame();
    
    // Verify game restarted
    await expect(page.locator('#turn-display')).toHaveText('1');
    
    // Check that game interface is responsive after reset
    await page.waitForTimeout(1000);
    const message = await gameHelpers.getGameMessage();
    expect(message).toBeDefined();
  });

  test('should display phase actions', async ({ page }) => {
    // Check phase action buttons are present
    await expect(page.locator('button:has-text("Next Phase")')).toBeVisible();
    await expect(page.locator('button:has-text("End Turn")')).toBeVisible();
    
    // Check buttons are clickable
    const nextPhaseEnabled = await gameHelpers.isButtonEnabled('button:has-text("Next Phase")');
    const endTurnEnabled = await gameHelpers.isButtonEnabled('button:has-text("End Turn")');
    
    expect(nextPhaseEnabled || endTurnEnabled).toBeTruthy();
  });

  test('should handle canvas interactions', async ({ page }) => {
    // Click on the game canvas
    await gameHelpers.clickCanvasCenter();
    
    // Check for any UI response (selection info, unit actions, etc.)
    await page.waitForTimeout(1000);
    
    // Verify no errors occurred
    const message = await gameHelpers.getGameMessage();
    expect(message).not.toContain('Error');
    expect(message).not.toContain('error');
  });

  test('should show unit selection info', async ({ page }) => {
    // Try to select a unit by clicking on the canvas
    await gameHelpers.clickCanvasCenter();
    await page.waitForTimeout(500);
    
    // Check unit info panel
    const unitInfo = await gameHelpers.getSelectedUnitInfo();
    expect(unitInfo).toBeTruthy();
    
    // If a unit is selected, check unit actions
    if (!unitInfo.includes('No selection')) {
      const actions = await gameHelpers.getUnitActions();
      expect(actions.length).toBeGreaterThan(0);
    }
  });

  test('should handle control buttons', async ({ page }) => {
    // Test map editor button
    await expect(page.locator('button:has-text("Map Editor")')).toBeVisible();
    
    // Test cancel action button
    await expect(page.locator('button:has-text("Cancel Action")')).toBeVisible();
    
    // Click cancel action to test it works
    await gameHelpers.cancelAction();
    
    // Should not cause errors
    const message = await gameHelpers.getGameMessage();
    expect(message).not.toContain('Error');
  });

  test('should display USS Wasp information', async ({ page }) => {
    // Check USS Wasp status panel
    await expect(page.locator('.panel:has-text("USS Wasp Status")')).toBeVisible();
    
    // Check USS Wasp operations panel
    await expect(page.locator('.panel:has-text("Launch Operations")')).toBeVisible();
    
    // Check USS Wasp cargo panel
    await expect(page.locator('.panel:has-text("Aboard USS Wasp")')).toBeVisible();
    
    // Get USS Wasp status
    const waspStatus = await gameHelpers.getWaspStatus();
    const waspCargo = await gameHelpers.getWaspCargo();
    
    expect(waspStatus).toBeTruthy();
    expect(waspCargo).toBeTruthy();
  });

  test('should show objectives information', async ({ page }) => {
    // Check objectives panel
    await expect(page.locator('.panel:has-text("Objectives")')).toBeVisible();
    
    // Get objectives info
    const objectives = await gameHelpers.getObjectives();
    expect(objectives.length).toBeGreaterThanOrEqual(0);
  });

  test('should handle responsive layout', async ({ page }) => {
    // Test different viewport sizes
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('#sidebar')).toBeVisible();
    
    await page.setViewportSize({ width: 800, height: 600 });
    await expect(page.locator('#game-canvas')).toBeVisible();
    
    // Check that layout adapts
    const sidebar = page.locator('#sidebar');
    const canvas = page.locator('#game-canvas');
    
    await expect(sidebar).toBeVisible();
    await expect(canvas).toBeVisible();
  });

  test('should not show JavaScript errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Interact with the game
    await gameHelpers.clickCanvasCenter();
    await gameHelpers.nextPhase();
    await page.waitForTimeout(1000);
    
    // Check for console errors
    const criticalErrors = consoleErrors.filter(error => 
      !error.includes('404') && // Ignore 404 errors
      !error.includes('favicon') && // Ignore favicon errors
      !error.includes('DevTools') // Ignore DevTools messages
    );
    
    if (criticalErrors.length > 0) {
      console.log('Console errors found:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBe(0);
  });
});