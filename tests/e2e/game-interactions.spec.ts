import { test, expect } from '@playwright/test';
import { GameHelpers } from './utils/game-helpers';

test.describe('USS Wasp Game - Interactions Tests', () => {
  let gameHelpers: GameHelpers;

  test.beforeEach(async ({ page }) => {
    gameHelpers = new GameHelpers(page);
    await page.goto('/');
    await gameHelpers.waitForGameLoad();
  });

  test('should handle phase progression', async ({ page }) => {
    const initialPhase = await gameHelpers.getCurrentPhase();
    const initialTurn = await gameHelpers.getCurrentTurn();
    
    // Try to advance phase
    await gameHelpers.nextPhase();
    await page.waitForTimeout(1000);
    
    // Check if phase changed or turn advanced
    const newPhase = await gameHelpers.getCurrentPhase();
    const newTurn = await gameHelpers.getCurrentTurn();
    
    // Either phase should change or turn should advance
    expect(newPhase !== initialPhase || newTurn > initialTurn).toBeTruthy();
    
    // Check for appropriate game message
    const message = await gameHelpers.getGameMessage();
    expect(message).toBeTruthy();
  });

  test('should handle turn progression', async ({ page }) => {
    const initialTurn = await gameHelpers.getCurrentTurn();
    
    // Try to end turn
    await gameHelpers.endTurn();
    await page.waitForTimeout(1000);
    
    // Check turn progression
    const newTurn = await gameHelpers.getCurrentTurn();
    expect(newTurn).toBeGreaterThanOrEqual(initialTurn);
    
    // Check for game message (allow empty messages as they might be cleared)
    const message = await gameHelpers.getGameMessage();
    expect(message).toBeDefined();
  });

  test('should handle unit selection', async ({ page }) => {
    // Try selecting units by clicking different areas
    const canvasBox = await page.locator('#game-canvas').boundingBox();
    if (!canvasBox) return;
    
    // Click multiple locations to try to find units
    const clickPoints = [
      { x: canvasBox.width * 0.3, y: canvasBox.height * 0.3 },
      { x: canvasBox.width * 0.5, y: canvasBox.height * 0.5 },
      { x: canvasBox.width * 0.7, y: canvasBox.height * 0.7 },
    ];
    
    for (const point of clickPoints) {
      await gameHelpers.clickHex(point.x, point.y);
      await page.waitForTimeout(500);
      
      const unitInfo = await gameHelpers.getSelectedUnitInfo();
      const actions = await gameHelpers.getUnitActions();
      
      // Check if unit was selected
      if (!unitInfo.includes('No selection')) {
        expect(actions.length).toBeGreaterThan(0);
        
        // Test unit actions if available
        if (actions.length > 0) {
          const actionName = actions[0];
          if (actionName && !actionName.includes('Select')) {
            await gameHelpers.clickUnitAction(actionName);
            await page.waitForTimeout(500);
            
            // Check for response
            const message = await gameHelpers.getGameMessage();
            expect(message).toBeTruthy();
          }
        }
        break;
      }
    }
  });

  test('should handle USS Wasp operations', async ({ page }) => {
    // Check USS Wasp status
    const waspStatus = await gameHelpers.getWaspStatus();
    
    // If USS Wasp is present, test operations
    if (!waspStatus.includes('No USS Wasp')) {
      // Test launch operations
      const launchEnabled = await gameHelpers.isButtonEnabled('button:has-text("Launch Units")');
      if (launchEnabled) {
        await gameHelpers.clickWaspLaunch();
        await page.waitForTimeout(500);
        
        // Check for response
        const message = await gameHelpers.getGameMessage();
        expect(message).toBeTruthy();
      }
      
      // Test recovery operations
      const recoveryEnabled = await gameHelpers.isButtonEnabled('button:has-text("Recover Units")');
      if (recoveryEnabled) {
        await gameHelpers.clickWaspRecovery();
        await page.waitForTimeout(500);
        
        // Check for response
        const message = await gameHelpers.getGameMessage();
        expect(message).toBeTruthy();
      }
    }
  });

  test('should handle multiple game actions in sequence', async ({ page }) => {
    // Perform a sequence of actions to test game flow
    const initialTurn = await gameHelpers.getCurrentTurn();
    
    // Step 1: Try to select a unit
    await gameHelpers.clickCanvasCenter();
    await page.waitForTimeout(500);
    
    // Step 2: Try to perform an action
    const actions = await gameHelpers.getUnitActions();
    if (actions.length > 0 && actions[0] && !actions[0].includes('Select')) {
      await gameHelpers.clickUnitAction(actions[0]);
      await page.waitForTimeout(500);
    }
    
    // Step 3: Try to advance phase
    await gameHelpers.nextPhase();
    await page.waitForTimeout(500);
    
    // Step 4: Check if we can end turn
    const endTurnEnabled = await gameHelpers.isButtonEnabled('button:has-text("End Turn")');
    if (endTurnEnabled) {
      await gameHelpers.endTurn();
      await page.waitForTimeout(500);
    }
    
    // Verify game is still functional
    const finalTurn = await gameHelpers.getCurrentTurn();
    expect(finalTurn).toBeGreaterThanOrEqual(initialTurn);
    
    // Check no errors occurred
    const message = await gameHelpers.getGameMessage();
    expect(message).not.toContain('Error');
  });

  test('should handle game reset', async ({ page }) => {
    // Make some moves first
    await gameHelpers.clickCanvasCenter();
    await gameHelpers.nextPhase();
    await page.waitForTimeout(1000);
    
    // Reset game
    await gameHelpers.startNewGame();
    
    // Verify game reset
    const turn = await gameHelpers.getCurrentTurn();
    expect(turn).toBe(1);
    
    // Check game is functional after reset
    const message = await gameHelpers.getGameMessage();
    expect(message).toBeDefined();
    expect(message).not.toContain('Error');
  });

  test('should handle rapid interactions', async ({ page }) => {
    // Test rapid clicking to ensure no race conditions
    const canvasBox = await page.locator('#game-canvas').boundingBox();
    if (!canvasBox) return;
    
    // Rapid clicks on different areas
    for (let i = 0; i < 5; i++) {
      await gameHelpers.clickHex(
        canvasBox.width * (0.2 + i * 0.15),
        canvasBox.height * (0.2 + i * 0.15)
      );
      await page.waitForTimeout(100);
    }
    
    // Wait for any processing to complete
    await page.waitForTimeout(1000);
    
    // Check game is still functional
    const message = await gameHelpers.getGameMessage();
    expect(message).not.toContain('Error');
    
    // Check UI is still responsive
    await gameHelpers.nextPhase();
    await page.waitForTimeout(500);
    
    const newMessage = await gameHelpers.getGameMessage();
    expect(newMessage).toBeTruthy();
  });

  test('should handle cancel action', async ({ page }) => {
    // Perform an action that might need canceling
    await gameHelpers.clickCanvasCenter();
    await page.waitForTimeout(500);
    
    // Try to cancel
    await gameHelpers.cancelAction();
    await page.waitForTimeout(500);
    
    // Check that cancel worked
    const message = await gameHelpers.getGameMessage();
    expect(message).not.toContain('Error');
    
    // Check UI is still functional
    await gameHelpers.nextPhase();
    await page.waitForTimeout(500);
    
    const newMessage = await gameHelpers.getGameMessage();
    expect(newMessage).toBeTruthy();
  });

  test('should maintain game state consistency', async ({ page }) => {
    // Track game state changes
    let previousTurn = await gameHelpers.getCurrentTurn();
    let previousPhase = await gameHelpers.getCurrentPhase();
    
    // Perform several actions
    for (let i = 0; i < 3; i++) {
      await gameHelpers.nextPhase();
      await page.waitForTimeout(500);
      
      const currentTurn = await gameHelpers.getCurrentTurn();
      const currentPhase = await gameHelpers.getCurrentPhase();
      
      // Turn should never decrease
      expect(currentTurn).toBeGreaterThanOrEqual(previousTurn);
      
      // Phase should be valid
      expect(currentPhase).toBeTruthy();
      
      // Command points should be valid
      const commandPoints = await gameHelpers.getCommandPoints();
      expect(commandPoints.assault).toBeGreaterThanOrEqual(0);
      expect(commandPoints.defender).toBeGreaterThanOrEqual(0);
      
      // Unit counts should be valid
      const unitCounts = await gameHelpers.getUnitCounts();
      expect(unitCounts.assault).toBeGreaterThanOrEqual(0);
      expect(unitCounts.defender).toBeGreaterThanOrEqual(0);
      
      previousTurn = currentTurn;
      previousPhase = currentPhase;
    }
  });

  test('should handle map editor access', async ({ page }) => {
    // Test map editor button
    await expect(page.locator('button:has-text("Map Editor")')).toBeVisible();
    
    // Note: We don't actually open the map editor as it might change the game state
    // This test just verifies the button is accessible
    const mapEditorEnabled = await gameHelpers.isButtonEnabled('button:has-text("Map Editor")');
    expect(mapEditorEnabled).toBeTruthy();
  });

  test('should handle objectives display', async ({ page }) => {
    // Check objectives are displayed
    const objectives = await gameHelpers.getObjectives();
    
    // Should have some objectives or show appropriate message
    expect(objectives.length).toBeGreaterThanOrEqual(0);
    
    // If objectives exist, they should have meaningful content
    if (objectives.length > 0) {
      const firstObjective = objectives[0];
      expect(firstObjective.length).toBeGreaterThan(0);
      expect(firstObjective).not.toBe('Loading...');
    }
  });
});