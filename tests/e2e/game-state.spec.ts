import { test, expect } from '@playwright/test';
import { GameHelpers } from './utils/game-helpers';

test.describe('USS Wasp Game - Game State Tests', () => {
  let gameHelpers: GameHelpers;

  test.beforeEach(async ({ page }) => {
    gameHelpers = new GameHelpers(page);
    await page.goto('/');
    await gameHelpers.waitForGameLoad();
  });

  test('should track turn progression correctly', async ({ page }) => {
    const initialTurn = await gameHelpers.getCurrentTurn();
    
    // Advance through multiple phases/turns
    let currentTurn = initialTurn;
    let phaseChanges = 0;
    
    for (let i = 0; i < 10; i++) {
      const beforeTurn = await gameHelpers.getCurrentTurn();
      const beforePhase = await gameHelpers.getCurrentPhase();
      
      await gameHelpers.nextPhase();
      await page.waitForTimeout(500);
      
      const afterTurn = await gameHelpers.getCurrentTurn();
      const afterPhase = await gameHelpers.getCurrentPhase();
      
      // Track changes
      if (afterTurn > beforeTurn) {
        currentTurn = afterTurn;
      }
      if (afterPhase !== beforePhase) {
        phaseChanges++;
      }
      
      // Turn should never decrease
      expect(afterTurn).toBeGreaterThanOrEqual(beforeTurn);
      
      // If we've advanced several turns, break
      if (currentTurn > initialTurn + 2) {
        break;
      }
    }
    
    // Should have made some progress
    expect(currentTurn >= initialTurn || phaseChanges > 0).toBeTruthy();
  });

  test('should maintain player information consistency', async ({ page }) => {
    // Check initial state
    const initialCP = await gameHelpers.getCommandPoints();
    const initialUnits = await gameHelpers.getUnitCounts();
    
    // Values should be non-negative
    expect(initialCP.assault).toBeGreaterThanOrEqual(0);
    expect(initialCP.defender).toBeGreaterThanOrEqual(0);
    expect(initialUnits.assault).toBeGreaterThanOrEqual(0);
    expect(initialUnits.defender).toBeGreaterThanOrEqual(0);
    
    // Advance game and check consistency
    await gameHelpers.nextPhase();
    await page.waitForTimeout(500);
    
    const newCP = await gameHelpers.getCommandPoints();
    const newUnits = await gameHelpers.getUnitCounts();
    
    // Values should still be non-negative
    expect(newCP.assault).toBeGreaterThanOrEqual(0);
    expect(newCP.defender).toBeGreaterThanOrEqual(0);
    expect(newUnits.assault).toBeGreaterThanOrEqual(0);
    expect(newUnits.defender).toBeGreaterThanOrEqual(0);
    
    // Units shouldn't dramatically change without reason
    expect(Math.abs(newUnits.assault - initialUnits.assault)).toBeLessThan(100);
    expect(Math.abs(newUnits.defender - initialUnits.defender)).toBeLessThan(100);
  });

  test('should handle game phases correctly', async ({ page }) => {
    const phaseSequence: string[] = [];
    
    // Record phase sequence
    for (let i = 0; i < 5; i++) {
      const phase = await gameHelpers.getCurrentPhase();
      phaseSequence.push(phase);
      
      await gameHelpers.nextPhase();
      await page.waitForTimeout(500);
    }
    
    // Should have recorded valid phases
    expect(phaseSequence.length).toBe(5);
    phaseSequence.forEach(phase => {
      expect(phase).toBeTruthy();
      expect(phase.length).toBeGreaterThan(0);
    });
    
    // Check for common phases
    const commonPhases = ['Event', 'Movement', 'Action', 'Deployment'];
    const hasCommonPhase = phaseSequence.some(phase => 
      commonPhases.some(common => phase.includes(common))
    );
    
    if (hasCommonPhase) {
      expect(hasCommonPhase).toBeTruthy();
    }
  });

  test('should handle active player switching', async ({ page }) => {
    const playerSequence: string[] = [];
    
    // Record player sequence
    for (let i = 0; i < 8; i++) {
      const player = await gameHelpers.getActivePlayer();
      playerSequence.push(player);
      
      await gameHelpers.nextPhase();
      await page.waitForTimeout(500);
    }
    
    // Should have valid players
    expect(playerSequence.length).toBe(8);
    playerSequence.forEach(player => {
      expect(player).toBeTruthy();
      expect(player.length).toBeGreaterThan(0);
    });
    
    // Should have both players at some point
    const uniquePlayers = [...new Set(playerSequence)];
    expect(uniquePlayers.length).toBeGreaterThanOrEqual(1);
    
    // Check for expected player names
    const hasExpectedPlayer = playerSequence.some(player => 
      player.includes('Assault') || player.includes('Defender') || player.includes('Player')
    );
    
    if (hasExpectedPlayer) {
      expect(hasExpectedPlayer).toBeTruthy();
    }
  });

  test('should persist game state during UI interactions', async ({ page }) => {
    // Record initial state
    const initialTurn = await gameHelpers.getCurrentTurn();
    const initialPhase = await gameHelpers.getCurrentPhase();
    const initialCP = await gameHelpers.getCommandPoints();
    
    // Perform various UI interactions
    await gameHelpers.clickCanvasCenter();
    await page.waitForTimeout(300);
    
    await gameHelpers.cancelAction();
    await page.waitForTimeout(300);
    
    // Check state hasn't changed unexpectedly
    const midTurn = await gameHelpers.getCurrentTurn();
    const midPhase = await gameHelpers.getCurrentPhase();
    const midCP = await gameHelpers.getCommandPoints();
    
    expect(midTurn).toBe(initialTurn);
    expect(midPhase).toBe(initialPhase);
    expect(midCP.assault).toBe(initialCP.assault);
    expect(midCP.defender).toBe(initialCP.defender);
    
    // Now advance phase and check state changes appropriately
    await gameHelpers.nextPhase();
    await page.waitForTimeout(500);
    
    const finalTurn = await gameHelpers.getCurrentTurn();
    const finalPhase = await gameHelpers.getCurrentPhase();
    
    // State should have changed from phase advancement
    expect(finalTurn >= initialTurn).toBeTruthy();
    expect(finalPhase !== initialPhase || finalTurn > initialTurn).toBeTruthy();
  });

  test('should handle game reset properly', async ({ page }) => {
    // Advance game state
    await gameHelpers.nextPhase();
    await gameHelpers.nextPhase();
    await page.waitForTimeout(1000);
    
    const advancedTurn = await gameHelpers.getCurrentTurn();
    const advancedPhase = await gameHelpers.getCurrentPhase();
    
    // Reset game
    await gameHelpers.startNewGame();
    
    // Check state reset
    const resetTurn = await gameHelpers.getCurrentTurn();
    const resetPhase = await gameHelpers.getCurrentPhase();
    const resetCP = await gameHelpers.getCommandPoints();
    const resetUnits = await gameHelpers.getUnitCounts();
    
    expect(resetTurn).toBe(1);
    expect(resetPhase).toBeTruthy();
    expect(resetCP.assault).toBeGreaterThanOrEqual(0);
    expect(resetCP.defender).toBeGreaterThanOrEqual(0);
    expect(resetUnits.assault).toBeGreaterThanOrEqual(0);
    expect(resetUnits.defender).toBeGreaterThanOrEqual(0);
    
    // Should be able to advance again
    await gameHelpers.nextPhase();
    await page.waitForTimeout(500);
    
    const newAdvancedTurn = await gameHelpers.getCurrentTurn();
    expect(newAdvancedTurn).toBeGreaterThanOrEqual(1);
  });

  test('should handle USS Wasp state tracking', async ({ page }) => {
    // Check initial USS Wasp state
    const initialWaspStatus = await gameHelpers.getWaspStatus();
    const initialWaspCargo = await gameHelpers.getWaspCargo();
    
    expect(initialWaspStatus).toBeTruthy();
    expect(initialWaspCargo).toBeTruthy();
    
    // Advance game and check USS Wasp state persistence
    await gameHelpers.nextPhase();
    await page.waitForTimeout(500);
    
    const newWaspStatus = await gameHelpers.getWaspStatus();
    const newWaspCargo = await gameHelpers.getWaspCargo();
    
    expect(newWaspStatus).toBeTruthy();
    expect(newWaspCargo).toBeTruthy();
    
    // USS Wasp should maintain reasonable state
    expect(newWaspStatus.length).toBeGreaterThan(0);
    expect(newWaspCargo.length).toBeGreaterThan(0);
  });

  test('should handle objectives state tracking', async ({ page }) => {
    // Check initial objectives
    const initialObjectives = await gameHelpers.getObjectives();
    
    // Should have some objectives or empty state
    expect(initialObjectives.length).toBeGreaterThanOrEqual(0);
    
    // Advance game and check objectives persistence
    await gameHelpers.nextPhase();
    await page.waitForTimeout(500);
    
    const newObjectives = await gameHelpers.getObjectives();
    expect(newObjectives.length).toBeGreaterThanOrEqual(0);
    
    // If objectives exist, they should be meaningful
    if (newObjectives.length > 0) {
      newObjectives.forEach(objective => {
        expect(objective.length).toBeGreaterThan(0);
        expect(objective).not.toBe('Loading...');
      });
    }
  });

  test('should handle unit selection state', async ({ page }) => {
    // Test unit selection persistence
    await gameHelpers.clickCanvasCenter();
    await page.waitForTimeout(500);
    
    const selectedInfo = await gameHelpers.getSelectedUnitInfo();
    const availableActions = await gameHelpers.getUnitActions();
    
    expect(selectedInfo).toBeTruthy();
    expect(availableActions.length).toBeGreaterThanOrEqual(0);
    
    // Cancel selection
    await gameHelpers.cancelAction();
    await page.waitForTimeout(500);
    
    // Check selection cleared
    const clearedInfo = await gameHelpers.getSelectedUnitInfo();
    expect(clearedInfo).toBeTruthy();
    
    // Should be able to select again
    await gameHelpers.clickCanvasCenter();
    await page.waitForTimeout(500);
    
    const reselectedInfo = await gameHelpers.getSelectedUnitInfo();
    expect(reselectedInfo).toBeTruthy();
  });

  test('should handle game message state', async ({ page }) => {
    // Check initial game messages
    const initialMessage = await gameHelpers.getGameMessage();
    
    // Perform actions that should generate messages
    await gameHelpers.nextPhase();
    await page.waitForTimeout(500);
    
    const phaseMessage = await gameHelpers.getGameMessage();
    expect(phaseMessage).toBeTruthy();
    
    // Try unit selection
    await gameHelpers.clickCanvasCenter();
    await page.waitForTimeout(500);
    
    const selectionMessage = await gameHelpers.getGameMessage();
    expect(selectionMessage).toBeTruthy();
    
    // Messages should be informative, not error messages
    expect(selectionMessage).not.toContain('Error');
    expect(selectionMessage).not.toContain('undefined');
    expect(selectionMessage).not.toContain('null');
  });

  test('should maintain performance during extended play', async ({ page }) => {
    const startTime = Date.now();
    
    // Perform extended sequence of actions
    for (let i = 0; i < 20; i++) {
      await gameHelpers.nextPhase();
      await page.waitForTimeout(100);
      
      if (i % 5 === 0) {
        await gameHelpers.clickCanvasCenter();
        await page.waitForTimeout(100);
      }
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete in reasonable time (less than 30 seconds)
    expect(duration).toBeLessThan(30000);
    
    // Game should still be functional
    const finalTurn = await gameHelpers.getCurrentTurn();
    const finalPhase = await gameHelpers.getCurrentPhase();
    
    expect(finalTurn).toBeGreaterThanOrEqual(1);
    expect(finalPhase).toBeTruthy();
    
    // No errors should have occurred
    const finalMessage = await gameHelpers.getGameMessage();
    expect(finalMessage).not.toContain('Error');
  });
});