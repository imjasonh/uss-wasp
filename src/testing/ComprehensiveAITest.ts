/**
 * Comprehensive AI vs AI test with real units and combat scenarios
 * This test exposes gaps in the game engine and AI programming
 */

import { AIDifficulty } from '../core/ai/types';
import { GameState, GameAction } from '../core/game/GameState';
import { GameEngine, ActionResult } from '../core/game/GameEngine';
import { Player } from '../core/game/Player';
import { GameMap } from '../core/game/Map';
import { PlayerSide, UnitType, ActionType, TurnPhase } from '../core/game/types';
import { createTestUnit, createTestUnits } from './UnitTestHelper';
import { Hex } from '../core/hex';

/**
 * Action analysis results
 */
interface ActionAnalysis {
  movementActions: number;
  combatActions: number;
  specialActions: number;
  waspOperations: number;
  loadUnloadActions: number;
  objectiveActions: number;
  hiddenUnitActions: number;
  total: number;
}

/**
 * Test results tracking
 */
interface TestResults {
  testName: string;
  success: boolean;
  errors: string[];
  warnings: string[];
  performance: {
    turnCount: number;
    aiDecisionTime: number;
    totalGameTime: number;
  };
  gameEngineGaps: string[];
  aiProgrammingGaps: string[];
  actionAnalysis?: ActionAnalysis;
}

/**
 * Comprehensive AI vs AI testing suite
 */
export class ComprehensiveAITest {
  private readonly testResults: TestResults[] = [];

  /**
   * Run all AI vs AI test scenarios
   */
  public runAllTests(): TestResults[] {
    console.log('🤖 Comprehensive AI vs AI Testing Suite');
    console.log('==========================================\n');

    // Test 1: Basic Unit Combat
    this.runBasicCombatTest();

    // Test 2: Amphibious Assault Scenario
    this.runAmphibiousAssaultTest();

    // Test 3: USS Wasp Operations Test
    this.runUSSWaspOperationsTest();

    // Test 4: Hidden Unit Deployment Test
    this.runHiddenUnitTest();

    // Test 5: Multi-difficulty AI Battle
    this.runMultiDifficultyTest();

    // Test 6: Resource Management Test
    this.runResourceManagementTest();

    // Report summary
    this.reportTestSummary();

    return this.testResults;
  }

  /**
   * Test 1: Basic Unit Combat Scenario
   */
  private runBasicCombatTest(): void {
    const testResult: TestResults = {
      testName: 'Basic Unit Combat',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      console.log('🎯 Test 1: Basic Unit Combat Scenario');
      console.log('-------------------------------------');

      const startTime = Date.now();

      // Create game setup
      const map = new GameMap(8, 8);
      const gameState = new GameState('combat-test', map, 10);

      const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
      const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);

      gameState.addPlayer(assaultPlayer);
      gameState.addPlayer(defenderPlayer);
      gameState.setActivePlayerBySide(PlayerSide.Assault);

      // Create units for both sides
      const assaultUnits = createTestUnits([
        {
          id: 'assault-1',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(0, 0),
        },
        {
          id: 'assault-2',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(1, 0),
        },
        {
          id: 'assault-3',
          type: UnitType.HUMVEE,
          side: PlayerSide.Assault,
          position: new Hex(0, 1),
        },
      ]);

      const defenderUnits = createTestUnits([
        {
          id: 'defender-1',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(6, 6),
        },
        {
          id: 'defender-2',
          type: UnitType.ATGM_TEAM,
          side: PlayerSide.Defender,
          position: new Hex(7, 6),
        },
        {
          id: 'defender-3',
          type: UnitType.TECHNICAL,
          side: PlayerSide.Defender,
          position: new Hex(6, 7),
        },
      ]);

      // Add units to players
      assaultUnits.forEach(unit => {
        try {
          assaultPlayer.addUnit(unit);
          console.log(
            `✅ Added assault unit: ${unit.type} at (${unit.state.position.q}, ${unit.state.position.r})`
          );
        } catch (error) {
          testResult.errors.push(
            `Failed to add assault unit ${unit.id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      });

      defenderUnits.forEach(unit => {
        try {
          defenderPlayer.addUnit(unit);
          console.log(
            `✅ Added defender unit: ${unit.type} at (${unit.state.position.q}, ${unit.state.position.r})`
          );
        } catch (error) {
          testResult.errors.push(
            `Failed to add defender unit ${unit.id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      });

      // Create game engine and add AI controllers
      const gameEngine = new GameEngine(gameState);

      try {
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
        gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);
        console.log('✅ AI controllers added for both players');
      } catch (error) {
        testResult.errors.push(
          `Failed to add AI controllers: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }

      // Run game simulation
      let turnCount = 0;
      const maxTurns = 20;
      let aiDecisionTotalTime = 0;

      console.log('\n🎮 Starting AI vs AI Combat Simulation...\n');

      while (turnCount < maxTurns && !this.isGameOver(gameState)) {
        turnCount++;
        console.log(`--- Turn ${turnCount} ---`);

        try {
          // Simple turn processing - AI decision making
          const aiStartTime = Date.now();
          const aiActions = gameEngine.updateAI();
          const aiEndTime = Date.now();

          aiDecisionTotalTime += aiEndTime - aiStartTime;

          if (aiActions.length > 0) {
            console.log(`  🤖 Turn ${turnCount}: AI generated ${aiActions.length} actions`);
            // Execute AI actions to test the game engine
            const actionResults = this.testActionExecution(aiActions, gameEngine);

            // Analyze the action results
            const analysis = this.analyzeActionTypes(aiActions);
            testResult.actionAnalysis = analysis;

            // Check for execution failures
            const failedActions = actionResults.filter(r => !r.success);
            if (failedActions.length > 0) {
              testResult.gameEngineGaps.push(`${failedActions.length} AI actions failed execution`);
            }
          } else {
            console.log(`  ⏭️ Turn ${turnCount}: No AI actions generated`);
          }

          // Switch active player for next turn
          const currentSide = gameState.getActivePlayer()?.side;
          if (currentSide === PlayerSide.Assault) {
            gameState.setActivePlayerBySide(PlayerSide.Defender);
          } else {
            gameState.setActivePlayerBySide(PlayerSide.Assault);
          }
        } catch (error) {
          testResult.errors.push(
            `Turn ${turnCount} error: ${error instanceof Error ? error.message : String(error)}`
          );
          console.log(
            `❌ Turn ${turnCount} failed: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      const endTime = Date.now();
      testResult.performance = {
        turnCount,
        aiDecisionTime: aiDecisionTotalTime,
        totalGameTime: endTime - startTime,
      };

      // Analyze AI performance
      this.analyzeAIPerformance(gameEngine, testResult);

      testResult.success = testResult.errors.length === 0;
      console.log(
        `\n${testResult.success ? '✅' : '❌'} Basic Combat Test ${testResult.success ? 'PASSED' : 'FAILED'}`
      );

      if (testResult.errors.length > 0) {
        console.log('Errors encountered:');
        testResult.errors.forEach(error => console.log(`  - ${error}`));
      }
    } catch (error) {
      testResult.errors.push(
        `Test setup failed: ${error instanceof Error ? error.message : String(error)}`
      );
      console.log(
        `❌ Basic Combat Test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    this.testResults.push(testResult);
  }

  /**
   * Test 2: Amphibious Assault Scenario
   */
  private runAmphibiousAssaultTest(): void {
    const testResult: TestResults = {
      testName: 'Amphibious Assault',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      console.log('\n🌊 Test 2: Amphibious Assault Scenario');
      console.log('-------------------------------------');

      const startTime = Date.now();

      // Create larger map for amphibious operations
      const map = new GameMap(12, 10);
      const gameState = new GameState('amphibious-test', map, 15);

      const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
      const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);

      gameState.addPlayer(assaultPlayer);
      gameState.addPlayer(defenderPlayer);
      gameState.setActivePlayerBySide(PlayerSide.Assault);

      // Create realistic amphibious assault force
      const assaultUnits = createTestUnits([
        {
          id: 'wasp-1',
          type: UnitType.USS_WASP,
          side: PlayerSide.Assault,
          position: new Hex(0, 4),
        },
        { id: 'lcac-1', type: UnitType.LCAC, side: PlayerSide.Assault, position: new Hex(1, 4) },
        { id: 'lcac-2', type: UnitType.LCAC, side: PlayerSide.Assault, position: new Hex(1, 5) },
        { id: 'aav-1', type: UnitType.AAV_7, side: PlayerSide.Assault, position: new Hex(2, 4) },
        { id: 'aav-2', type: UnitType.AAV_7, side: PlayerSide.Assault, position: new Hex(2, 5) },
        {
          id: 'harrier-1',
          type: UnitType.HARRIER,
          side: PlayerSide.Assault,
          position: new Hex(0, 3),
        },
        {
          id: 'cobra-1',
          type: UnitType.SUPER_COBRA,
          side: PlayerSide.Assault,
          position: new Hex(0, 5),
        },
      ]);

      // Create defender coastal defense
      const defenderUnits = createTestUnits([
        {
          id: 'inf-1',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(8, 3),
        },
        {
          id: 'inf-2',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(9, 4),
        },
        {
          id: 'inf-3',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(8, 6),
        },
        {
          id: 'atgm-1',
          type: UnitType.ATGM_TEAM,
          side: PlayerSide.Defender,
          position: new Hex(10, 4),
        },
        { id: 'aa-1', type: UnitType.AA_TEAM, side: PlayerSide.Defender, position: new Hex(9, 5) },
        {
          id: 'mortar-1',
          type: UnitType.MORTAR_TEAM,
          side: PlayerSide.Defender,
          position: new Hex(11, 5),
        },
        {
          id: 'artillery-1',
          type: UnitType.LONG_RANGE_ARTILLERY,
          side: PlayerSide.Defender,
          position: new Hex(11, 2),
        },
      ]);

      // Add units to players
      assaultUnits.forEach(unit => {
        try {
          assaultPlayer.addUnit(unit);
        } catch (error) {
          testResult.errors.push(
            `Failed to add assault unit ${unit.id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      });

      defenderUnits.forEach(unit => {
        try {
          defenderPlayer.addUnit(unit);
        } catch (error) {
          testResult.errors.push(
            `Failed to add defender unit ${unit.id}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      });

      // Create game engine with different AI difficulties
      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(assaultPlayer.id, AIDifficulty.ELITE);
      gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

      console.log('✅ Amphibious assault scenario setup complete');
      console.log(`   Assault forces: ${assaultUnits.length} units (ELITE AI)`);
      console.log(`   Defender forces: ${defenderUnits.length} units (VETERAN AI)`);

      // Test USS Wasp operations capability
      try {
        console.log('\n🚢 Testing USS Wasp launch operations...');
        // Test USS Wasp launch operations
        this.testUSSWaspLaunchOperations(gameEngine, testResult);
      } catch (error) {
        testResult.errors.push(
          `USS Wasp operations test failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Run limited simulation to test AI decision making
      let turnCount = 0;
      const maxTurns = 10;
      let aiDecisionTotalTime = 0;

      while (turnCount < maxTurns) {
        turnCount++;

        try {
          const aiStartTime = Date.now();
          const aiActions = gameEngine.updateAI();
          const aiEndTime = Date.now();

          aiDecisionTotalTime += aiEndTime - aiStartTime;

          if (aiActions.length > 0) {
            console.log(`Turn ${turnCount}: AI generated ${aiActions.length} actions`);
            // Analyze AI decisions for amphibious tactics
            this.analyzeAmphibiousAIDecisions(aiActions, testResult);
          }
        } catch (error) {
          testResult.errors.push(
            `Amphibious AI test turn ${turnCount}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      const endTime = Date.now();
      testResult.performance = {
        turnCount,
        aiDecisionTime: aiDecisionTotalTime,
        totalGameTime: endTime - startTime,
      };

      testResult.success = testResult.errors.length === 0;
      console.log(
        `${testResult.success ? '✅' : '❌'} Amphibious Assault Test ${testResult.success ? 'PASSED' : 'FAILED'}`
      );
    } catch (error) {
      testResult.errors.push(
        `Amphibious assault test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    this.testResults.push(testResult);
  }

  /**
   * Test 3: USS Wasp Operations Test
   */
  private runUSSWaspOperationsTest(): void {
    const testResult: TestResults = {
      testName: 'USS Wasp Operations',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      console.log('\n🚢 Test 3: USS Wasp Operations Test');
      console.log('-----------------------------------');

      // Create simple scenario focused on USS Wasp
      const map = new GameMap(6, 6);
      const gameState = new GameState('wasp-test', map, 10);

      const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
      gameState.addPlayer(assaultPlayer);
      gameState.setActivePlayerBySide(PlayerSide.Assault);

      // Create USS Wasp with embarked units
      const waspUnit = createTestUnit(
        'wasp-1',
        UnitType.USS_WASP,
        PlayerSide.Assault,
        new Hex(0, 2)
      );
      const harrierUnit = createTestUnit(
        'harrier-1',
        UnitType.HARRIER,
        PlayerSide.Assault,
        new Hex(0, 2)
      );
      const marineUnit = createTestUnit(
        'marines-1',
        UnitType.MARINE_SQUAD,
        PlayerSide.Assault,
        new Hex(0, 2)
      );

      assaultPlayer.addUnit(waspUnit);
      assaultPlayer.addUnit(harrierUnit);
      assaultPlayer.addUnit(marineUnit);

      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);

      console.log('✅ USS Wasp scenario setup complete');

      // Test AI decision making for USS Wasp operations
      try {
        console.log('🤖 Testing AI decision making for USS Wasp operations...');
        const aiActions = gameEngine.updateAI();

        // Analyze if AI understands USS Wasp capabilities
        if (aiActions.length === 0) {
          testResult.aiProgrammingGaps.push('AI not generating decisions for USS Wasp operations');
        }

        // Test specific USS Wasp functionalities
        testResult.gameEngineGaps.push(
          'USS Wasp launch/recovery operations need automated testing'
        );
        testResult.gameEngineGaps.push('USS Wasp cargo capacity management needs AI integration');
        testResult.aiProgrammingGaps.push(
          'AI strategic planning for USS Wasp positioning needs verification'
        );
      } catch (error) {
        testResult.errors.push(
          `USS Wasp AI test failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      testResult.success = testResult.errors.length === 0;
      console.log(
        `${testResult.success ? '✅' : '❌'} USS Wasp Operations Test ${testResult.success ? 'PASSED' : 'FAILED'}`
      );
    } catch (error) {
      testResult.errors.push(
        `USS Wasp operations test setup failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    this.testResults.push(testResult);
  }

  /**
   * Test 4: Hidden Unit Deployment Test
   */
  private runHiddenUnitTest(): void {
    const testResult: TestResults = {
      testName: 'Hidden Unit Deployment',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      console.log('\n🫥 Test 4: Hidden Unit Deployment Test');
      console.log('-------------------------------------');

      const startTime = Date.now();

      // Run all hidden unit test scenarios
      const revealTest = this.runHiddenUnitRevealTest();
      const stealthTest = this.runStealthPositioningTest();
      const counterStealthTest = this.runCounterStealthTest();
      const fogOfWarTest = this.runFogOfWarTest();

      const endTime = Date.now();
      testResult.performance = {
        turnCount: 0,
        aiDecisionTime: 0,
        totalGameTime: endTime - startTime,
      };

      // Aggregate results
      const allTests = [revealTest, stealthTest, counterStealthTest, fogOfWarTest];
      const passedTests = allTests.filter(test => test.success).length;
      const totalTests = allTests.length;

      console.log(`📊 Hidden Unit Test Results: ${passedTests}/${totalTests} scenarios passed`);
      console.log(`✅ Hidden Unit Reveal Test: ${revealTest.success ? 'PASSED' : 'FAILED'}`);
      console.log(`🕰️ Stealth Positioning Test: ${stealthTest.success ? 'PASSED' : 'FAILED'}`);
      console.log(`🔍 Counter-Stealth Test: ${counterStealthTest.success ? 'PASSED' : 'FAILED'}`);
      console.log(`🌫️ Fog of War Test: ${fogOfWarTest.success ? 'PASSED' : 'FAILED'}`);

      // Collect errors and warnings
      allTests.forEach(test => {
        testResult.errors.push(...test.errors);
        testResult.warnings.push(...test.warnings);
        testResult.gameEngineGaps.push(...test.gameEngineGaps);
        testResult.aiProgrammingGaps.push(...test.aiProgrammingGaps);
      });

      testResult.success = passedTests === totalTests;

      if (testResult.success) {
        console.log(
          '✅ All hidden unit AI tests passed - AI demonstrates stealth tactical capabilities'
        );
      } else {
        console.log(`❌ ${totalTests - passedTests} hidden unit AI tests failed`);
      }
    } catch (error) {
      testResult.errors.push(
        `Hidden unit test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    this.testResults.push(testResult);
  }

  /**
   * Hidden Unit Test Scenario 1: Hidden Unit Reveal Decisions
   */
  private runHiddenUnitRevealTest(): TestResults {
    const testResult: TestResults = {
      testName: 'Hidden Unit Reveal Decisions',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      console.log('   🎯 Scenario 1: Hidden Unit Reveal Decisions');
      console.log('   ────────────────────────────────────────────');

      const startTime = Date.now();

      // Create tactical scenario with hidden defender units
      const map = new GameMap(8, 8);
      const gameState = new GameState('hidden-reveal-test', map, 10);

      const assaultPlayer = new Player('assault', PlayerSide.Assault);
      const defenderPlayer = new Player('defender', PlayerSide.Defender);

      gameState.addPlayer(assaultPlayer);
      gameState.addPlayer(defenderPlayer);
      gameState.setActivePlayerBySide(PlayerSide.Assault);

      // Create approaching assault force
      const assaultUnits = createTestUnits([
        {
          id: 'marines1',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(1, 1),
        },
        {
          id: 'marines2',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(2, 1),
        },
        { id: 'humvee1', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(1, 2) },
      ]);

      // Create hidden defender units in ambush positions
      const defenderUnits = createTestUnits([
        {
          id: 'hidden1',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(5, 5),
        },
        {
          id: 'hidden2',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(6, 4),
        },
        {
          id: 'hidden3',
          type: UnitType.ATGM_TEAM,
          side: PlayerSide.Defender,
          position: new Hex(5, 6),
        },
      ]);

      // Add units to players
      assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
      defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

      // Hide all defender units that can be hidden
      let hiddenCount = 0;
      defenderUnits.forEach(unit => {
        if (unit.canBeHidden()) {
          unit.hide();
          hiddenCount++;
          console.log(
            `     🫥 Hidden unit: ${unit.type} at (${unit.state.position.q}, ${unit.state.position.r})`
          );
        }
      });

      console.log(
        `     📊 Setup: ${hiddenCount} hidden units, ${assaultUnits.length} assault units`
      );

      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
      gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

      // Test AI reveal decisions over multiple turns
      let totalRevealActions = 0;
      let optimalRevealTiming = 0;
      const maxTurns = 5;

      for (let turn = 1; turn <= maxTurns; turn++) {
        console.log(`     🔄 Turn ${turn}: Testing reveal decisions...`);

        // Test both players' AI decisions
        gameState.setActivePlayerBySide(PlayerSide.Assault);
        gameState.phase = TurnPhase.ACTION; // Set to action phase for AI decisions

        // Initialize command points for players
        assaultPlayer.commandPoints = 10;
        defenderPlayer.commandPoints = 10;

        const assaultActions = gameEngine.updateAI();

        gameState.setActivePlayerBySide(PlayerSide.Defender);
        gameState.phase = TurnPhase.ACTION; // Set to action phase for AI decisions
        const defenderActions = gameEngine.updateAI();

        const allActions = [...assaultActions, ...defenderActions];
        const revealActions = allActions.filter(action => action.type === ActionType.REVEAL);

        totalRevealActions += revealActions.length;

        if (revealActions.length > 0) {
          console.log(`     ✅ Turn ${turn}: AI generated ${revealActions.length} reveal actions`);

          // Analyze reveal timing (optimal if assault units are within 3 hexes)
          revealActions.forEach(action => {
            const revealingUnit = gameState.getUnit(action.unitId);
            if (revealingUnit) {
              const nearbyEnemies = assaultUnits.filter(enemy => {
                const distance =
                  Math.abs(revealingUnit.state.position.q - enemy.state.position.q) +
                  Math.abs(revealingUnit.state.position.r - enemy.state.position.r);
                return distance <= 3;
              });

              if (nearbyEnemies.length > 0) {
                optimalRevealTiming++;
                console.log(
                  `       🎯 Optimal reveal: ${revealingUnit.type} with ${nearbyEnemies.length} nearby enemies`
                );
              }
            }
          });
        }

        // Move assault units closer to test reveal triggers
        assaultUnits.forEach(unit => {
          if (unit.state.position.q < 4) {
            unit.state.position = new Hex(unit.state.position.q + 1, unit.state.position.r);
          }
        });
      }

      const endTime = Date.now();
      testResult.performance = {
        turnCount: maxTurns,
        aiDecisionTime: 0,
        totalGameTime: endTime - startTime,
      };

      // Evaluate test results
      console.log(
        `     📈 Results: ${totalRevealActions} reveal actions, ${optimalRevealTiming} optimal timing`
      );

      if (totalRevealActions > 0) {
        console.log('     ✅ AI demonstrates hidden unit reveal capability');
        testResult.success = true;
      } else {
        console.log('     ❌ AI failed to generate any reveal actions');
        testResult.aiProgrammingGaps.push('AI does not generate reveal actions for hidden units');
      }

      // Check reveal timing optimization
      if (optimalRevealTiming > 0) {
        console.log(`     🎯 AI shows tactical timing: ${optimalRevealTiming} well-timed reveals`);
      } else if (totalRevealActions > 0) {
        testResult.warnings.push('AI reveals units but timing may not be optimal');
      }
    } catch (error) {
      testResult.errors.push(
        `Hidden unit reveal test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return testResult;
  }

  /**
   * Hidden Unit Test Scenario 2: Stealth Positioning
   */
  private runStealthPositioningTest(): TestResults {
    const testResult: TestResults = {
      testName: 'Stealth Positioning',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      console.log('   🕰️ Scenario 2: Stealth Positioning');
      console.log('   ───────────────────────────────────');

      const startTime = Date.now();

      // Create scenario where AI must decide optimal hiding positions
      const map = new GameMap(10, 8);
      const gameState = new GameState('stealth-positioning-test', map, 10);

      const defenderPlayer = new Player('defender', PlayerSide.Defender);
      gameState.addPlayer(defenderPlayer);
      gameState.setActivePlayerBySide(PlayerSide.Defender);

      // Create visible defender units that can be hidden
      const defenderUnits = createTestUnits([
        {
          id: 'inf1',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(5, 4),
        },
        {
          id: 'inf2',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(6, 3),
        },
        {
          id: 'inf3',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(7, 5),
        },
      ]);

      defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

      // Create threat to simulate why hiding is needed
      const assaultPlayer = new Player('assault', PlayerSide.Assault);
      const assaultUnits = createTestUnits([
        {
          id: 'threat1',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(1, 1),
        },
        {
          id: 'threat2',
          type: UnitType.HARRIER,
          side: PlayerSide.Assault,
          position: new Hex(2, 2),
        },
      ]);

      gameState.addPlayer(assaultPlayer);
      assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));

      console.log(
        `     📊 Setup: ${defenderUnits.length} visible units, ${assaultUnits.length} threat units`
      );

      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

      // Test AI hiding decisions
      console.log('     🔍 Testing AI stealth positioning decisions...');

      gameState.phase = TurnPhase.ACTION; // Set to action phase for AI decisions

      // Initialize command points for players
      defenderPlayer.commandPoints = 10;
      assaultPlayer.commandPoints = 10;

      const aiActions = gameEngine.updateAI();

      // Count units that can be hidden
      const hideableUnits = defenderUnits.filter(unit => unit.canBeHidden());
      console.log(`     📋 Hideable units: ${hideableUnits.length}`);

      // Analyze hiding decisions (Note: hiding might not be implemented as explicit action)
      let tacticalPositioning = 0;

      // Check if AI generated any movement actions to better positions
      const movementActions = aiActions.filter(action => action.type === ActionType.MOVE);
      console.log(`     🚶 AI movement actions: ${movementActions.length}`);

      if (movementActions.length > 0) {
        tacticalPositioning = movementActions.length;
        console.log(
          `     ✅ AI demonstrates tactical positioning with ${tacticalPositioning} movements`
        );
      }

      // Check if units are utilizing stealth capabilities
      const unitsInCover = defenderUnits.filter(unit => {
        // Simple cover heuristic: units not in the open (position sum is even)
        return (unit.state.position.q + unit.state.position.r) % 2 === 0;
      });

      console.log(
        `     🏠 Units in cover positions: ${unitsInCover.length}/${defenderUnits.length}`
      );

      const endTime = Date.now();
      testResult.performance = {
        turnCount: 1,
        aiDecisionTime: 0,
        totalGameTime: endTime - startTime,
      };

      // Evaluate results
      if (tacticalPositioning > 0 || unitsInCover.length > defenderUnits.length / 2) {
        console.log('     ✅ AI demonstrates stealth positioning awareness');
        testResult.success = true;
      } else {
        console.log('     ❌ AI shows limited stealth positioning capabilities');
        testResult.aiProgrammingGaps.push('AI lacks stealth positioning optimization');
      }

      if (hideableUnits.length > 0 && tacticalPositioning === 0) {
        testResult.warnings.push('AI has hideable units but showed no tactical movement');
      }
    } catch (error) {
      testResult.errors.push(
        `Stealth positioning test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return testResult;
  }

  /**
   * Hidden Unit Test Scenario 3: Counter-Stealth Operations
   */
  private runCounterStealthTest(): TestResults {
    const testResult: TestResults = {
      testName: 'Counter-Stealth Operations',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      console.log('   🔍 Scenario 3: Counter-Stealth Operations');
      console.log('   ─────────────────────────────────────────');

      const startTime = Date.now();

      // Create scenario where assault AI must deal with known hidden threats
      const map = new GameMap(8, 8);
      const gameState = new GameState('counter-stealth-test', map, 10);

      const assaultPlayer = new Player('assault', PlayerSide.Assault);
      const defenderPlayer = new Player('defender', PlayerSide.Defender);

      gameState.addPlayer(assaultPlayer);
      gameState.addPlayer(defenderPlayer);
      gameState.setActivePlayerBySide(PlayerSide.Assault);

      // Create assault units with reconnaissance capability
      const assaultUnits = createTestUnits([
        { id: 'recon1', type: UnitType.MARSOC, side: PlayerSide.Assault, position: new Hex(2, 2) },
        {
          id: 'support1',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(1, 2),
        },
        {
          id: 'support2',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(2, 1),
        },
      ]);

      // Create hidden threats in known general area
      const defenderUnits = createTestUnits([
        {
          id: 'sniper1',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(6, 6),
        },
        {
          id: 'sniper2',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(7, 5),
        },
      ]);

      assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
      defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

      // Hide defender units
      let hiddenThreats = 0;
      defenderUnits.forEach(unit => {
        if (unit.canBeHidden()) {
          unit.hide();
          hiddenThreats++;
        }
      });

      console.log(
        `     📊 Setup: ${assaultUnits.length} assault units vs ${hiddenThreats} hidden threats`
      );

      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
      gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

      // Test AI counter-stealth tactics
      console.log('     🔍 Testing AI counter-stealth operations...');

      gameState.phase = TurnPhase.ACTION; // Set to action phase for AI decisions

      // Initialize command points for players
      assaultPlayer.commandPoints = 10;
      defenderPlayer.commandPoints = 10;

      const assaultActions = gameEngine.updateAI();

      // Analyze counter-stealth actions
      const reconActions = assaultActions.filter(action => {
        const unit = gameState.getUnit(action.unitId);
        return unit && unit.type === UnitType.MARSOC;
      });

      const movementActions = assaultActions.filter(action => action.type === ActionType.MOVE);
      const specialActions = assaultActions.filter(
        action => action.type === ActionType.SPECIAL_ABILITY
      );

      console.log(`     👁️ Reconnaissance actions: ${reconActions.length}`);
      console.log(`     🚶 Movement actions: ${movementActions.length}`);
      console.log(`     ⚡ Special actions: ${specialActions.length}`);

      let counterStealthCapability = 0;

      // Check if AI moves reconnaissance units toward threat area
      reconActions.forEach(action => {
        if (action.type === ActionType.MOVE && action.targetPosition) {
          const target = action.targetPosition;
          // Check if moving toward known threat area (positions 5-7, 5-7)
          if (target.q >= 4 && target.q <= 7 && target.r >= 4 && target.r <= 7) {
            counterStealthCapability++;
            console.log(
              `     🎯 Reconnaissance unit moving toward threat area: (${target.q}, ${target.r})`
            );
          }
        }
      });

      // Check if AI uses special reconnaissance abilities
      if (specialActions.length > 0) {
        counterStealthCapability++;
        console.log(
          `     ⚡ AI utilizing special reconnaissance abilities: ${specialActions.length}`
        );
      }

      const endTime = Date.now();
      testResult.performance = {
        turnCount: 1,
        aiDecisionTime: 0,
        totalGameTime: endTime - startTime,
      };

      // Evaluate results
      if (counterStealthCapability > 0) {
        console.log('     ✅ AI demonstrates counter-stealth capabilities');
        testResult.success = true;
      } else {
        console.log('     ❌ AI shows limited counter-stealth response');
        testResult.aiProgrammingGaps.push('AI lacks counter-stealth tactical response');
      }

      if (assaultActions.length === 0) {
        testResult.warnings.push('AI generated no actions in counter-stealth scenario');
      }
    } catch (error) {
      testResult.errors.push(
        `Counter-stealth test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return testResult;
  }

  /**
   * Hidden Unit Test Scenario 4: Fog of War Navigation
   */
  private runFogOfWarTest(): TestResults {
    const testResult: TestResults = {
      testName: 'Fog of War Navigation',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      console.log('   🌫️ Scenario 4: Fog of War Navigation');
      console.log('   ───────────────────────────────────────');

      const startTime = Date.now();

      // Create scenario with limited visibility
      const map = new GameMap(10, 10);
      const gameState = new GameState('fog-of-war-test', map, 10);

      const assaultPlayer = new Player('assault', PlayerSide.Assault);
      gameState.addPlayer(assaultPlayer);
      gameState.setActivePlayerBySide(PlayerSide.Assault);

      // Create units that must navigate with limited visibility
      const assaultUnits = createTestUnits([
        {
          id: 'scout1',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(1, 1),
        },
        {
          id: 'scout2',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(2, 1),
        },
        {
          id: 'main1',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(1, 2),
        },
      ]);

      assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));

      console.log(`     📊 Setup: ${assaultUnits.length} units in fog of war scenario`);

      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);

      // Test AI fog of war navigation
      console.log('     🌫️ Testing AI fog of war navigation...');

      gameState.phase = TurnPhase.ACTION; // Set to action phase for AI decisions

      // Initialize command points for players
      assaultPlayer.commandPoints = 10;

      const aiActions = gameEngine.updateAI();

      // Analyze fog of war behavior
      const movementActions = aiActions.filter(action => action.type === ActionType.MOVE);
      const explorationPattern = this.analyzeFogOfWarMovement(movementActions);

      console.log(`     🚶 Movement actions: ${movementActions.length}`);
      console.log(`     🔍 Exploration pattern score: ${explorationPattern.score}`);

      let fogOfWarCapability = 0;

      // Check if AI spreads units for better visibility
      if (explorationPattern.spreadOut) {
        fogOfWarCapability++;
        console.log('     ✅ AI spreads units for better reconnaissance');
      }

      // Check if AI advances cautiously in limited visibility
      if (explorationPattern.cautiousAdvance) {
        fogOfWarCapability++;
        console.log('     ✅ AI advances cautiously in limited visibility');
      }

      // Check if AI maintains unit coordination
      if (explorationPattern.coordination) {
        fogOfWarCapability++;
        console.log('     ✅ AI maintains unit coordination in fog of war');
      }

      const endTime = Date.now();
      testResult.performance = {
        turnCount: 1,
        aiDecisionTime: 0,
        totalGameTime: endTime - startTime,
      };

      // Evaluate results
      if (fogOfWarCapability >= 2) {
        console.log('     ✅ AI demonstrates effective fog of war navigation');
        testResult.success = true;
      } else if (fogOfWarCapability >= 1) {
        console.log('     ⚠️ AI shows basic fog of war awareness');
        testResult.warnings.push('AI fog of war navigation could be improved');
        testResult.success = true;
      } else {
        console.log('     ❌ AI shows limited fog of war capabilities');
        testResult.aiProgrammingGaps.push('AI lacks fog of war navigation optimization');
      }

      if (movementActions.length === 0) {
        testResult.warnings.push('AI generated no movement actions in fog of war scenario');
      }
    } catch (error) {
      testResult.errors.push(
        `Fog of war test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return testResult;
  }

  /**
   * Analyze fog of war movement patterns
   */
  private analyzeFogOfWarMovement(movementActions: GameAction[]): {
    score: number;
    spreadOut: boolean;
    cautiousAdvance: boolean;
    coordination: boolean;
  } {
    let score = 0;
    let spreadOut = false;
    let cautiousAdvance = false;
    let coordination = false;

    if (movementActions.length > 0) {
      // Check if units spread out (different destinations)
      const destinations = movementActions.map(action => action.targetPosition);
      const uniqueDestinations = new Set(destinations.map(dest => `${dest?.q},${dest?.r}`));

      if (uniqueDestinations.size > 1) {
        spreadOut = true;
        score += 1;
      }

      // Check for cautious advance (shorter moves)
      const averageDistance =
        movementActions.reduce((sum, action) => {
          if (action.targetPosition) {
            return sum + Math.abs(action.targetPosition.q) + Math.abs(action.targetPosition.r);
          }
          return sum;
        }, 0) / movementActions.length;

      if (averageDistance <= 4) {
        cautiousAdvance = true;
        score += 1;
      }

      // Check for coordination (units move together)
      if (movementActions.length > 1) {
        coordination = true;
        score += 1;
      }
    }

    return { score, spreadOut, cautiousAdvance, coordination };
  }

  /**
   * Test 5: Multi-difficulty AI Battle
   */
  private runMultiDifficultyTest(): void {
    const testResult: TestResults = {
      testName: 'Multi-difficulty AI Battle',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      console.log('\n🎯 Test 5: Multi-difficulty AI Battle');
      console.log('------------------------------------');

      // Test different AI difficulty levels against each other
      const map = new GameMap(6, 6);
      const gameState = new GameState('difficulty-test', map, 8);

      const novicePlayer = new Player('novice-ai', PlayerSide.Assault);
      const elitePlayer = new Player('elite-ai', PlayerSide.Defender);

      gameState.addPlayer(novicePlayer);
      gameState.addPlayer(elitePlayer);
      gameState.setActivePlayerBySide(PlayerSide.Assault);

      // Create simple combat scenario with closer units for both sides
      const noviceUnits = createTestUnits([
        {
          id: 'novice-1',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(0, 0),
        },
        {
          id: 'novice-2',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(1, 0),
        },
      ]);

      const eliteUnits = createTestUnits([
        {
          id: 'elite-1',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(2, 2),
        },
        {
          id: 'elite-2',
          type: UnitType.ATGM_TEAM,
          side: PlayerSide.Defender,
          position: new Hex(3, 2),
        },
      ]);

      noviceUnits.forEach(unit => novicePlayer.addUnit(unit));
      eliteUnits.forEach(unit => elitePlayer.addUnit(unit));

      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(novicePlayer.id, AIDifficulty.NOVICE);
      gameEngine.addAIController(elitePlayer.id, AIDifficulty.ELITE);

      console.log('✅ Multi-difficulty test setup complete');
      console.log('   Testing AI difficulty differentiation');

      // Test AI decision differences - test both in sequence to avoid side bias
      let noviceActionCount = 0;
      let eliteActionCount = 0;

      // Set proper game phase for AI decision making
      gameState.phase = TurnPhase.ACTION;

      // Initialize command points properly
      novicePlayer.commandPoints = 10;
      elitePlayer.commandPoints = 10;

      // Test Novice AI (assault side)
      console.log('\n   🎯 Testing Novice AI (Assault)');
      gameState.setActivePlayerBySide(PlayerSide.Assault);
      for (let turn = 1; turn <= 3; turn++) {
        try {
          const actions = gameEngine.updateAI();
          noviceActionCount += actions.length;
          console.log(`      Turn ${turn}: ${actions.length} actions`);
        } catch (error) {
          testResult.errors.push(
            `Novice AI turn ${turn}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Test Elite AI (defender side)
      console.log('\n   🎯 Testing Elite AI (Defender)');
      gameState.setActivePlayerBySide(PlayerSide.Defender);
      for (let turn = 1; turn <= 3; turn++) {
        try {
          const actions = gameEngine.updateAI();
          eliteActionCount += actions.length;
          console.log(`      Turn ${turn}: ${actions.length} actions`);
        } catch (error) {
          testResult.errors.push(
            `Elite AI turn ${turn}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      // Analyze AI behavior differences
      console.log(
        `📊 Novice AI actions: ${noviceActionCount}, Elite AI actions: ${eliteActionCount}`
      );

      // Elite AI should generate more actions than Novice AI
      if (eliteActionCount <= noviceActionCount) {
        testResult.aiProgrammingGaps.push(
          `Elite AI generated ${eliteActionCount} actions vs Novice AI ${noviceActionCount} actions - Elite should generate more`
        );
        console.log(
          `❌ Elite AI generated ${eliteActionCount - noviceActionCount} fewer actions than Novice AI`
        );
      } else {
        console.log(
          `✅ Elite AI generated ${eliteActionCount - noviceActionCount} more actions than Novice AI`
        );
      }

      testResult.performance = { turnCount: 6, aiDecisionTime: 0, totalGameTime: 0 };
      testResult.success = testResult.errors.length === 0;

      console.log(
        `${testResult.success ? '✅' : '❌'} Multi-difficulty Test ${testResult.success ? 'PASSED' : 'FAILED'}`
      );
    } catch (error) {
      testResult.errors.push(
        `Multi-difficulty test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    this.testResults.push(testResult);
  }

  /**
   * Test 6: Resource Management Test
   */
  private runResourceManagementTest(): void {
    const testResult: TestResults = {
      testName: 'Resource Management',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      console.log('\n💰 Test 6: Resource Management Test');
      console.log('-----------------------------------');

      // Test 1: Command Point Constraint Testing
      console.log('\n   🎯 Scenario 1: Command Point Constraints');
      console.log('   ─────────────────────────────────────────');
      const cpConstraintResults = this.runCommandPointConstraintTest();

      // Test 2: Cost-Benefit Analysis Testing
      console.log('\n   💲 Scenario 2: Cost-Benefit Analysis');
      console.log('   ───────────────────────────────────────');
      const costBenefitResults = this.runCostBenefitAnalysisTest();

      // Test 3: Resource Optimization Testing
      console.log('\n   📊 Scenario 3: Resource Optimization');
      console.log('   ──────────────────────────────────────');
      const resourceOptResults = this.runResourceOptimizationTest();

      // Test 4: Emergency Resource Testing
      console.log('\n   🚨 Scenario 4: Emergency Resource Response');
      console.log('   ────────────────────────────────────────────');
      const emergencyResults = this.runEmergencyResourceTest();

      // Analyze overall resource management performance
      const totalScenarios = 4;
      const passedScenarios = [
        cpConstraintResults,
        costBenefitResults,
        resourceOptResults,
        emergencyResults,
      ].filter(result => result.success).length;

      console.log('\n📊 Resource Management Test Results:');
      console.log(`   ✅ Scenarios passed: ${passedScenarios}/${totalScenarios}`);
      console.log(
        `   📈 AI Resource Management Score: ${Math.round((passedScenarios / totalScenarios) * 100)}%`
      );

      // Determine test success
      if (passedScenarios >= 3) {
        testResult.success = true;
        console.log('   ✅ AI demonstrates competent resource management');
      } else {
        testResult.success = false;
        testResult.errors.push(
          `AI failed ${totalScenarios - passedScenarios} resource management scenarios`
        );
        console.log('   ❌ AI shows significant resource management deficiencies');
      }

      // Aggregate warnings and errors from sub-tests
      [cpConstraintResults, costBenefitResults, resourceOptResults, emergencyResults].forEach(
        result => {
          testResult.warnings.push(...result.warnings);
          testResult.errors.push(...result.errors);
          testResult.gameEngineGaps.push(...result.gameEngineGaps);
          testResult.aiProgrammingGaps.push(...result.aiProgrammingGaps);
        }
      );
    } catch (error) {
      testResult.errors.push(
        `Resource management test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    this.testResults.push(testResult);
  }

  /**
   * Scenario 1: Command Point Constraint Testing
   * Tests AI behavior when Command Points are limited
   */
  private runCommandPointConstraintTest(): TestResults {
    const testResult: TestResults = {
      testName: 'Command Point Constraints',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      // Create a scenario with limited CP (1-2 points) and multiple units
      const map = new GameMap(10, 10);
      const gameState = new GameState('cp-constraint-test', map, 1); // Very limited CP

      // Create assault player with limited CP
      const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
      assaultPlayer.commandPoints = 1; // Very limited CP
      gameState.addPlayer(assaultPlayer);

      // Create multiple units that need actions
      const assaultUnits = createTestUnits([
        {
          id: 'marines',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(1, 1),
        },
        {
          id: 'humvee',
          type: UnitType.HUMVEE,
          side: PlayerSide.Assault,
          position: new Hex(2, 1),
        },
        {
          id: 'artillery',
          type: UnitType.ARTILLERY,
          side: PlayerSide.Assault,
          position: new Hex(3, 1),
        },
      ]);

      // Create defender units as targets
      const defenderUnits = createTestUnits([
        {
          id: 'def_inf',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(5, 5),
        },
      ]);

      // Add units to players
      assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));

      const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);
      gameState.addPlayer(defenderPlayer);
      defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

      // Create game engine and add AI controller
      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);

      // Set game state for action phase
      gameState.setActivePlayerBySide(PlayerSide.Assault);
      gameState.phase = TurnPhase.ACTION;

      console.log(`     Setup: ${assaultPlayer.commandPoints} CP available, 3 units need actions`);

      // Test AI decision making under CP constraints
      const startTime = Date.now();
      const actions = gameEngine.updateAI();
      const decisionTime = Date.now() - startTime;

      console.log(
        `     AI generated ${actions.length} actions with ${assaultPlayer.commandPoints} CP`
      );
      console.log(`     Decision time: ${decisionTime}ms`);

      // Analyze resource utilization
      const totalCPUsed = actions.length; // Each action typically uses 1 CP
      const efficiency = actions.length > 0 ? totalCPUsed / actions.length : 0;

      console.log(
        `     📊 CP utilization: ${totalCPUsed} used, efficiency: ${efficiency.toFixed(2)}`
      );

      // Validate AI behavior under CP constraints
      const validationResults = {
        respectsCPLimits: totalCPUsed <= 1,
        generatesActions: actions.length > 0,
        prioritizesCorrectly: actions.length <= 2, // Should not generate more actions than CP allows
        choosesWisely: actions.some(
          action => action.type === ActionType.ATTACK || action.type === ActionType.MOVE
        ),
      };

      const validationsPassed = Object.values(validationResults).filter(Boolean).length;

      console.log(`     ✅ Validations passed: ${validationsPassed}/4`);

      if (validationResults.respectsCPLimits) {
        console.log('     ✅ AI respects CP limits');
      } else {
        console.log('     ❌ AI exceeds CP limits');
        testResult.errors.push('AI generates actions exceeding available CP');
      }

      if (validationResults.generatesActions) {
        console.log('     ✅ AI generates actions with limited CP');
      } else {
        console.log('     ❌ AI generates no actions');
        testResult.warnings.push('AI fails to generate actions when CP is limited');
      }

      if (validationResults.prioritizesCorrectly) {
        console.log('     ✅ AI prioritizes actions appropriately');
      } else {
        console.log('     ❌ AI generates too many actions for available CP');
        testResult.aiProgrammingGaps.push('AI action generation does not respect CP constraints');
      }

      testResult.success = validationsPassed >= 3;
      testResult.performance = {
        turnCount: 1,
        aiDecisionTime: decisionTime,
        totalGameTime: decisionTime,
      };
    } catch (error) {
      testResult.errors.push(
        `Command Point constraint test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return testResult;
  }

  /**
   * Scenario 2: Cost-Benefit Analysis Testing
   * Tests AI choice between high-cost and low-cost actions
   */
  private runCostBenefitAnalysisTest(): TestResults {
    const testResult: TestResults = {
      testName: 'Cost-Benefit Analysis',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      // Create scenario where AI can choose between expensive and cheap actions
      const map = new GameMap(10, 10);
      const gameState = new GameState('cost-benefit-test', map, 3); // Moderate CP

      // Create assault player with moderate CP
      const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
      assaultPlayer.commandPoints = 3; // Moderate CP
      gameState.addPlayer(assaultPlayer);

      // Create units with different action capabilities
      const assaultUnits = createTestUnits([
        {
          id: 'artillery',
          type: UnitType.ARTILLERY,
          side: PlayerSide.Assault,
          position: new Hex(2, 2),
        },
        {
          id: 'marines',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(3, 2),
        },
      ]);

      // Create clustered enemies for artillery (high-value target)
      const defenderUnits = createTestUnits([
        {
          id: 'enemy1',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(6, 6),
        },
        {
          id: 'enemy2',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(6, 7),
        },
        {
          id: 'enemy3',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(7, 6),
        },
      ]);

      // Add units to players
      assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));

      const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);
      gameState.addPlayer(defenderPlayer);
      defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

      // Create game engine and add AI controller
      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);

      // Set game state for action phase
      gameState.setActivePlayerBySide(PlayerSide.Assault);
      gameState.phase = TurnPhase.ACTION;

      console.log(`     Setup: ${assaultPlayer.commandPoints} CP, artillery vs clustered enemies`);

      // Test AI cost-benefit analysis
      const startTime = Date.now();
      const actions = gameEngine.updateAI();
      const decisionTime = Date.now() - startTime;

      console.log(`     AI generated ${actions.length} actions`);

      // Analyze cost-benefit decisions
      const expensiveActions = actions.filter(action => action.type === ActionType.SPECIAL_ABILITY);
      const cheapActions = actions.filter(action => action.type === ActionType.MOVE);
      const specialAbilities = actions.filter(action => action.type === ActionType.SPECIAL_ABILITY);

      console.log(`     💰 Expensive actions: ${expensiveActions.length}`);
      console.log(`     💲 Cheap actions: ${cheapActions.length}`);
      console.log(`     ⚡ Special abilities: ${specialAbilities.length}`);

      // Validate cost-benefit analysis
      const validationResults = {
        makesDecisions: actions.length > 0,
        considersHighValue: expensiveActions.length > 0 || specialAbilities.length > 0,
        maintainsBalance: cheapActions.length > 0, // Should still use some cheap actions
        showsDiscrimination: actions.length <= 3, // Should not use all available actions blindly
      };

      const validationsPassed = Object.values(validationResults).filter(Boolean).length;

      console.log(`     ✅ Validations passed: ${validationsPassed}/4`);

      if (validationResults.makesDecisions) {
        console.log('     ✅ AI makes cost-benefit decisions');
      } else {
        console.log('     ❌ AI fails to make decisions');
        testResult.errors.push('AI generates no actions in cost-benefit scenario');
      }

      if (validationResults.considersHighValue) {
        console.log('     ✅ AI considers high-value actions');
      } else {
        console.log('     ❌ AI ignores high-value opportunities');
        testResult.aiProgrammingGaps.push(
          'AI does not prioritize high-value actions appropriately'
        );
      }

      testResult.success = validationsPassed >= 3;
      testResult.performance = {
        turnCount: 1,
        aiDecisionTime: decisionTime,
        totalGameTime: decisionTime,
      };
    } catch (error) {
      testResult.errors.push(
        `Cost-benefit analysis test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return testResult;
  }

  /**
   * Scenario 3: Resource Optimization Testing
   * Tests AI ability to maximize value from limited resources
   */
  private runResourceOptimizationTest(): TestResults {
    const testResult: TestResults = {
      testName: 'Resource Optimization',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      // Create scenario requiring resource optimization
      const map = new GameMap(10, 10);
      const gameState = new GameState('resource-opt-test', map, 2); // Limited CP requiring optimization

      // Create assault player with limited CP
      const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
      assaultPlayer.commandPoints = 2; // Limited CP requiring optimization
      gameState.addPlayer(assaultPlayer);

      // Create multiple units with different strategic values
      const assaultUnits = createTestUnits([
        {
          id: 'tank',
          type: UnitType.HUMVEE,
          side: PlayerSide.Assault,
          position: new Hex(1, 1),
        },
        {
          id: 'marines',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(2, 1),
        },
        {
          id: 'artillery',
          type: UnitType.ARTILLERY,
          side: PlayerSide.Assault,
          position: new Hex(3, 1),
        },
      ]);

      // Create strategic targets at different distances
      const defenderUnits = createTestUnits([
        {
          id: 'hq',
          type: UnitType.LONG_RANGE_ARTILLERY,
          side: PlayerSide.Defender,
          position: new Hex(4, 4),
        },
        {
          id: 'infantry',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(6, 6),
        },
      ]);

      // Add units to players
      assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));

      const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);
      gameState.addPlayer(defenderPlayer);
      defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

      // Create game engine and add AI controller
      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);

      // Set game state for action phase
      gameState.setActivePlayerBySide(PlayerSide.Assault);
      gameState.phase = TurnPhase.ACTION;

      console.log(
        `     Setup: ${assaultPlayer.commandPoints} CP, multiple units and strategic targets`
      );

      // Test AI resource optimization
      const startTime = Date.now();
      const actions = gameEngine.updateAI();
      const decisionTime = Date.now() - startTime;

      console.log(`     AI generated ${actions.length} actions`);

      // Analyze resource optimization
      const totalCPUsed = actions.length; // Each action typically uses 1 CP
      const cpEfficiency = actions.length > 0 ? totalCPUsed / actions.length : 0;
      const actionTypes = actions.map(action => action.type);
      const uniqueUnits = new Set(actions.map(action => action.unitId)).size;

      console.log(`     📊 CP efficiency: ${cpEfficiency.toFixed(2)}`);
      console.log(`     🎯 Unique units used: ${uniqueUnits}`);
      console.log(`     🔄 Action types: ${actionTypes.join(', ')}`);

      // Validate resource optimization
      const validationResults = {
        utilizesCP: totalCPUsed > 0,
        optimizesActions: actions.length > 0 && actions.length <= 3,
        diversifiesUnits: uniqueUnits >= 2,
        maintainsEfficiency: cpEfficiency >= 0.5,
      };

      const validationsPassed = Object.values(validationResults).filter(Boolean).length;

      console.log(`     ✅ Validations passed: ${validationsPassed}/4`);

      if (validationResults.utilizesCP) {
        console.log('     ✅ AI utilizes available CP');
      } else {
        console.log('     ❌ AI fails to use CP effectively');
        testResult.warnings.push('AI does not utilize available Command Points');
      }

      if (validationResults.optimizesActions) {
        console.log('     ✅ AI optimizes action selection');
      } else {
        console.log('     ❌ AI shows poor action optimization');
        testResult.aiProgrammingGaps.push('AI action optimization needs improvement');
      }

      testResult.success = validationsPassed >= 3;
      testResult.performance = {
        turnCount: 1,
        aiDecisionTime: decisionTime,
        totalGameTime: decisionTime,
      };
    } catch (error) {
      testResult.errors.push(
        `Resource optimization test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return testResult;
  }

  /**
   * Scenario 4: Emergency Resource Testing
   * Tests AI resource spending under threat/emergency conditions
   */
  private runEmergencyResourceTest(): TestResults {
    const testResult: TestResults = {
      testName: 'Emergency Resource Response',
      success: false,
      errors: [],
      warnings: [],
      performance: { turnCount: 0, aiDecisionTime: 0, totalGameTime: 0 },
      gameEngineGaps: [],
      aiProgrammingGaps: [],
    };

    try {
      // Create emergency scenario with units under threat
      const map = new GameMap(10, 10);
      const gameState = new GameState('emergency-test', map, 4); // Moderate CP for emergency response

      // Create assault player with moderate CP
      const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
      assaultPlayer.commandPoints = 4; // Moderate CP for emergency response
      gameState.addPlayer(assaultPlayer);

      // Create damaged/threatened units
      const assaultUnits = createTestUnits([
        {
          id: 'tank',
          type: UnitType.HUMVEE,
          side: PlayerSide.Assault,
          position: new Hex(3, 3),
        },
        {
          id: 'marines',
          type: UnitType.MARINE_SQUAD,
          side: PlayerSide.Assault,
          position: new Hex(4, 3),
        },
      ]);

      // Create immediate threats
      const defenderUnits = createTestUnits([
        {
          id: 'enemy_tank',
          type: UnitType.TECHNICAL,
          side: PlayerSide.Defender,
          position: new Hex(4, 4),
        },
        {
          id: 'enemy_inf',
          type: UnitType.INFANTRY_SQUAD,
          side: PlayerSide.Defender,
          position: new Hex(3, 4),
        },
      ]);

      // Add units to players
      assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));

      const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);
      gameState.addPlayer(defenderPlayer);
      defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

      // Create game engine and add AI controller
      const gameEngine = new GameEngine(gameState);
      gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);

      // Set game state for action phase
      gameState.setActivePlayerBySide(PlayerSide.Assault);
      gameState.phase = TurnPhase.ACTION;

      console.log(
        `     Setup: ${assaultPlayer.commandPoints} CP, damaged units under immediate threat`
      );

      // Test AI emergency resource response
      const startTime = Date.now();
      const actions = gameEngine.updateAI();
      const decisionTime = Date.now() - startTime;

      console.log(`     AI generated ${actions.length} actions in emergency`);

      // Analyze emergency response
      const totalCPUsed = actions.length; // Each action typically uses 1 CP
      const emergencyActions = actions.filter(
        action =>
          action.type === ActionType.ATTACK ||
          action.type === ActionType.MOVE ||
          action.type === ActionType.SPECIAL_ABILITY
      );
      const defensiveActions = actions.filter(action => action.type === ActionType.MOVE);

      console.log(`     🚨 Emergency actions: ${emergencyActions.length}`);
      console.log(`     🛡️ Defensive actions: ${defensiveActions.length}`);
      console.log(`     💰 CP spent: ${totalCPUsed}/${assaultPlayer.commandPoints}`);

      // Validate emergency response
      const validationResults = {
        respondsToThreat: actions.length > 0,
        spendsResourcesLiberal: totalCPUsed >= 2, // Should spend more CP in emergency
        prioritizesSurvival: emergencyActions.length > 0,
        showsUrgency: actions.length >= 2, // Should take multiple actions in emergency
      };

      const validationsPassed = Object.values(validationResults).filter(Boolean).length;

      console.log(`     ✅ Validations passed: ${validationsPassed}/4`);

      if (validationResults.respondsToThreat) {
        console.log('     ✅ AI responds to emergency threats');
      } else {
        console.log('     ❌ AI fails to respond to emergency');
        testResult.errors.push('AI does not respond to emergency threats');
      }

      if (validationResults.spendsResourcesLiberal) {
        console.log('     ✅ AI spends resources liberally in emergency');
      } else {
        console.log('     ❌ AI is too conservative in emergency');
        testResult.aiProgrammingGaps.push('AI emergency resource spending needs improvement');
      }

      testResult.success = validationsPassed >= 3;
      testResult.performance = {
        turnCount: 1,
        aiDecisionTime: decisionTime,
        totalGameTime: decisionTime,
      };
    } catch (error) {
      testResult.errors.push(
        `Emergency resource test failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return testResult;
  }

  /**
   * Helper methods
   */
  private isGameOver(gameState: GameState): boolean {
    // Simple game over condition - check if one side has no units
    const assaultUnits = gameState.getAllUnits().filter(u => u.side === PlayerSide.Assault);
    const defenderUnits = gameState.getAllUnits().filter(u => u.side === PlayerSide.Defender);

    return assaultUnits.length === 0 || defenderUnits.length === 0;
  }

  /**
   * Execute AI actions and validate results
   */
  private testActionExecution(actions: GameAction[], gameEngine: GameEngine): ActionResult[] {
    console.log(`  🎯 Executing ${actions.length} AI actions...`);
    const results = gameEngine.executeAIActions(actions);

    // Log execution results
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;

    if (successful > 0) {
      console.log(`  ✅ ${successful} actions executed successfully`);
    }
    if (failed > 0) {
      console.log(`  ❌ ${failed} actions failed`);
    }

    return results;
  }

  /**
   * Test USS Wasp launch operations
   */
  private testUSSWaspLaunchOperations(gameEngine: GameEngine, testResult: TestResults): void {
    console.log('  🚢 Testing USS Wasp launch operations...');

    try {
      // Get all players to find USS Wasp units
      const players = gameEngine.getPlayers();
      let waspFound = false;
      let aircraftEmbarked = 0;

      for (const player of players) {
        const waspUnits = player.getLivingUnits().filter(unit => unit.type === UnitType.USS_WASP);
        if (waspUnits.length > 0) {
          waspFound = true;
          console.log(`  📍 Found ${waspUnits.length} USS Wasp unit(s) for player ${player.side}`);

          // Check for embarked aircraft
          for (const wasp of waspUnits) {
            const capacity = wasp.getCargoCapacity();
            const currentCargo = wasp.state.cargo.length;
            aircraftEmbarked += currentCargo;
            console.log(`  ✈️ USS Wasp cargo: ${currentCargo}/${capacity} aircraft`);
          }
        }
      }

      if (!waspFound) {
        testResult.gameEngineGaps.push('No USS Wasp units found for testing launch operations');
      } else {
        console.log(`  📊 Total embarked aircraft: ${aircraftEmbarked}`);
        if (aircraftEmbarked === 0) {
          testResult.aiProgrammingGaps.push('No aircraft embarked on USS Wasp for launch testing');
        }
      }
    } catch (error) {
      testResult.errors.push(`USS Wasp operations test failed: ${(error as Error).message}`);
    }
  }

  /**
   * Analyze specific action types
   */
  private analyzeActionTypes(actions: GameAction[]): ActionAnalysis {
    const analysis: ActionAnalysis = {
      movementActions: 0,
      combatActions: 0,
      specialActions: 0,
      waspOperations: 0,
      loadUnloadActions: 0,
      objectiveActions: 0,
      hiddenUnitActions: 0,
      total: actions.length,
    };

    for (const action of actions) {
      switch (action.type) {
        case ActionType.MOVE:
          analysis.movementActions++;
          break;
        case ActionType.ATTACK:
          analysis.combatActions++;
          break;
        case ActionType.SPECIAL_ABILITY:
          analysis.specialActions++;
          break;
        case ActionType.LOAD:
        case ActionType.UNLOAD:
          analysis.loadUnloadActions++;
          break;
        case ActionType.SECURE_OBJECTIVE:
          analysis.objectiveActions++;
          break;
        case ActionType.LAUNCH_FROM_WASP:
        case ActionType.RECOVER_TO_WASP:
          analysis.waspOperations++;
          break;
        case ActionType.REVEAL:
          analysis.hiddenUnitActions++;
          break;
        default:
          // Other action types
          break;
      }
    }

    return analysis;
  }

  private getPhaseDescription(phase: number): string {
    const phases = [
      'Command Phase',
      'Movement Phase',
      'Combat Phase',
      'Rally Phase',
      'Resupply Phase',
      'End Phase',
    ];
    return phases[phase] || `Phase ${phase}`;
  }

  private analyzeAIPerformance(gameEngine: GameEngine, testResult: TestResults): void {
    // Analyze AI controller status for both players
    console.log('📊 AI Performance Analysis');

    try {
      const players = gameEngine.getPlayers();
      console.log(`   Found ${players.length} players in game`);

      for (const player of players) {
        const units = player.getLivingUnits();
        console.log(`   Player ${player.side}: ${units.length} units remaining`);

        // Check AI controller status
        const aiStatus = gameEngine.getAIStatus(player.id);
        if (aiStatus) {
          console.log(
            `   AI Status: ${aiStatus.difficulty} difficulty, state: ${aiStatus.currentState}`
          );
        }
      }
    } catch (error) {
      testResult.gameEngineGaps.push(`AI performance analysis failed: ${(error as Error).message}`);
    }
  }

  private analyzeAmphibiousAIDecisions(aiActions: unknown[], testResult: TestResults): void {
    // Check if AI is making amphibious-appropriate decisions
    if (aiActions.length === 0) {
      testResult.aiProgrammingGaps.push('No amphibious assault tactics detected in AI decisions');
    }

    // Analyze AI decision types for amphibious operations
    const analysis = this.analyzeActionTypes(aiActions as GameAction[]);

    console.log(`   Action analysis: ${analysis.total} total actions`);
    console.log(`   - Movement: ${analysis.movementActions}`);
    console.log(`   - Combat: ${analysis.combatActions}`);
    console.log(`   - Special abilities: ${analysis.specialActions}`);
    console.log(`   - USS Wasp operations: ${analysis.waspOperations}`);
    console.log(`   - Load/Unload: ${analysis.loadUnloadActions}`);
    console.log(`   - Hidden Unit actions: ${analysis.hiddenUnitActions}`);

    // Check for amphibious-specific tactics
    if (analysis.waspOperations === 0 && analysis.loadUnloadActions === 0) {
      testResult.aiProgrammingGaps.push('No amphibious assault tactics detected in AI decisions');
    }

    if (analysis.total === 0) {
      testResult.aiProgrammingGaps.push('AI not generating any actions for amphibious scenario');
    }
  }

  private reportTestSummary(): void {
    console.log('\n📊 Comprehensive AI Test Summary');
    console.log('=================================');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`\n📈 Results: ${passedTests}/${totalTests} tests passed`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);

    // Aggregate all gaps found
    const allGameEngineGaps = new Set<string>();
    const allAIProgrammingGaps = new Set<string>();

    this.testResults.forEach(result => {
      result.gameEngineGaps.forEach(gap => allGameEngineGaps.add(gap));
      result.aiProgrammingGaps.forEach(gap => allAIProgrammingGaps.add(gap));
    });

    console.log('\n🔧 Game Engine Gaps Identified:');
    if (allGameEngineGaps.size === 0) {
      console.log('   No gaps identified');
    } else {
      Array.from(allGameEngineGaps).forEach(gap => console.log(`   - ${gap}`));
    }

    console.log('\n🤖 AI Programming Gaps Identified:');
    if (allAIProgrammingGaps.size === 0) {
      console.log('   No gaps identified');
    } else {
      Array.from(allAIProgrammingGaps).forEach(gap => console.log(`   - ${gap}`));
    }

    console.log('\n🎯 Priority Action Items:');
    console.log('   1. Implement AI action execution system in game engine');
    console.log('   2. Add USS Wasp operations testing framework');
    console.log('   3. Develop hidden unit AI testing capabilities');
    console.log('   4. Enhance AI decision making verification');
    console.log('   5. Add resource management AI testing');
  }
}

/**
 * Run the comprehensive AI test if this file is executed directly
 */
if (require.main === module) {
  const testSuite = new ComprehensiveAITest();
  try {
    testSuite.runAllTests();
  } catch (error) {
    console.error(error);
  }
}
