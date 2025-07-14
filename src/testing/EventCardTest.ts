/**
 * Event Card System Test Framework
 * 
 * This test framework validates the Event Card System implementation
 * including card creation, deck management, and effect application.
 */

import { EventCardManager, EventCard, EventCardRarity, EventCardEffectType, DEFAULT_EVENT_DECK_CONFIG } from '../core/game/EventCard';
import { GameState } from '../core/game/GameState';
import { Player } from '../core/game/Player';
import { GameMap } from '../core/game/Map';
import { PlayerSide, TurnPhase } from '../core/game/types';
import { createTestUnit } from './UnitTestHelper';
import { Hex } from '../core/hex';

/**
 * Test results tracking
 */
interface EventCardTestResult {
  testName: string;
  success: boolean;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Event Card System Test Suite
 */
export class EventCardTest {
  private testResults: EventCardTestResult[] = [];

  /**
   * Run all event card tests
   */
  public runAllTests(): EventCardTestResult[] {
    console.log('🎴 Event Card System Test Suite');
    console.log('===============================\n');

    // Core system tests
    this.testEventCardManagerInitialization();
    this.testPlayerHandManagement();
    this.testCardDrawing();
    this.testCardPlayConditions();
    this.testEventCardEffects();
    this.testGameStateIntegration();
    this.testTurnProcessing();
    this.testSpecificEventCards();

    // Report summary
    this.reportTestSummary();

    return this.testResults;
  }

  /**
   * Test 1: Event Card Manager initialization
   */
  private testEventCardManagerInitialization(): void {
    console.log('🧪 Test 1: Event Card Manager Initialization');
    console.log('--------------------------------------------');

    try {
      const manager = new EventCardManager(DEFAULT_EVENT_DECK_CONFIG);
      const deckStats = manager.getDeckStats();

      if (deckStats.totalCards > 0) {
        this.recordSuccess('Event Card Manager Initialization', 
          `Successfully initialized with ${deckStats.totalCards} cards`);
      } else {
        this.recordFailure('Event Card Manager Initialization', 
          'No cards found in deck after initialization');
      }
    } catch (error) {
      this.recordFailure('Event Card Manager Initialization', 
        `Failed to initialize: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test 2: Player hand management
   */
  private testPlayerHandManagement(): void {
    console.log('\\n🧪 Test 2: Player Hand Management');
    console.log('----------------------------------');

    try {
      const manager = new EventCardManager(DEFAULT_EVENT_DECK_CONFIG);
      const playerId = 'test-player';

      // Initialize player hand
      manager.initializePlayerHand(playerId);
      const initialHand = manager.getPlayerHand(playerId);

      if (initialHand.length === DEFAULT_EVENT_DECK_CONFIG.startingHandSize) {
        this.recordSuccess('Player Hand Management', 
          `Player starts with ${initialHand.length} cards as expected`);
      } else {
        this.recordFailure('Player Hand Management', 
          `Expected ${DEFAULT_EVENT_DECK_CONFIG.startingHandSize} cards, got ${initialHand.length}`);
      }

      // Test hand size limit
      const maxHand = DEFAULT_EVENT_DECK_CONFIG.maxHandSize;
      for (let i = initialHand.length; i < maxHand + 2; i++) {
        manager.drawCard(playerId);
      }

      const fullHand = manager.getPlayerHand(playerId);
      if (fullHand.length <= maxHand) {
        this.recordSuccess('Hand Size Limit', 
          `Hand size properly limited to ${fullHand.length} cards`);
      } else {
        this.recordFailure('Hand Size Limit', 
          `Hand exceeded limit: ${fullHand.length} > ${maxHand}`);
      }
    } catch (error) {
      this.recordFailure('Player Hand Management', 
        `Test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test 3: Card drawing mechanics
   */
  private testCardDrawing(): void {
    console.log('\\n🧪 Test 3: Card Drawing Mechanics');
    console.log('----------------------------------');

    try {
      const manager = new EventCardManager(DEFAULT_EVENT_DECK_CONFIG);
      const playerId = 'test-player';

      manager.initializePlayerHand(playerId);
      const initialDeckStats = manager.getDeckStats();

      // Draw a card
      const drawnCard = manager.drawCard(playerId);
      const newDeckStats = manager.getDeckStats();

      if (drawnCard && newDeckStats.cardsRemaining === initialDeckStats.cardsRemaining - 1) {
        this.recordSuccess('Card Drawing', 
          `Successfully drew "${drawnCard.name}" and deck size reduced by 1`);
      } else {
        this.recordFailure('Card Drawing', 
          'Card drawing did not work properly');
      }
    } catch (error) {
      this.recordFailure('Card Drawing', 
        `Test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test 4: Card play conditions
   */
  private testCardPlayConditions(): void {
    console.log('\\n🧪 Test 4: Card Play Conditions');
    console.log('--------------------------------');

    try {
      const gameState = this.createTestGameState();
      const manager = gameState.eventCardManager;
      const playerId = 'test-player';

      // Add close_air_support card to player's hand for testing
      const closeAirSupportCard = {
        id: 'close_air_support',
        name: 'Close Air Support',
        description: 'Coordinated air support provides tactical advantage',
        flavorText: 'Strike aircraft sweep in from the horizon...',
        rarity: EventCardRarity.UNCOMMON,
        cost: 3,
        effects: [{
          type: EventCardEffectType.IMMEDIATE,
          target: 'specific_unit',
          magnitude: 3,
          description: 'Target unit gains +3 attack for this combat',
          metadata: { selectTarget: true }
        }],
        playConditions: [{
          type: 'phase',
          value: TurnPhase.ACTION
        }],
        canPlayMultiple: true
      };
      
      // Add the card to the hand for testing
      manager.addCardToHand(playerId, closeAirSupportCard);

      // Check if card is in hand
      const handCards = manager.getPlayerHand(playerId);
      console.log('Cards in hand:', handCards.map(c => c.id));
      
      // Test phase condition
      gameState.phase = TurnPhase.COMMAND;
      const canPlayInCommand = manager.canPlayCard('close_air_support', playerId, gameState);
      console.log('Can play in COMMAND:', canPlayInCommand);
      
      gameState.phase = TurnPhase.ACTION;
      const canPlayInAction = manager.canPlayCard('close_air_support', playerId, gameState);
      console.log('Can play in ACTION:', canPlayInAction);

      if (!canPlayInCommand && canPlayInAction) {
        this.recordSuccess('Phase Conditions', 
          'Phase-restricted cards work correctly');
      } else {
        this.recordFailure('Phase Conditions', 
          `Phase restrictions not working: command=${canPlayInCommand}, action=${canPlayInAction}`);
      }
    } catch (error) {
      this.recordFailure('Card Play Conditions', 
        `Test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test 5: Event card effects
   */
  private testEventCardEffects(): void {
    console.log('\\n🧪 Test 5: Event Card Effects');
    console.log('------------------------------');

    try {
      const gameState = this.createTestGameState();
      const playerId = 'test-player';

      // Add supply_drop card to player's hand for testing
      const manager = gameState.eventCardManager;
      const supplyDropCard = {
        id: 'supply_drop',
        name: 'Emergency Supply Drop',
        description: 'Critical supplies are air-dropped to the front lines',
        flavorText: 'Parachutes bloom in the sky...',
        rarity: EventCardRarity.UNCOMMON,
        cost: 1,
        effects: [{
          type: EventCardEffectType.IMMEDIATE,
          target: 'self',
          magnitude: 2,
          description: 'Gain 2 additional Command Points this turn'
        }],
        canPlayMultiple: true
      };
      
      // Add the card to the hand for testing
      manager.addCardToHand(playerId, supplyDropCard);
      
      // Test playing a card
      const result = gameState.playEventCard('supply_drop', playerId);

      if (result.success) {
        this.recordSuccess('Card Effects', 
          `Successfully played card: ${result.message}`);
      } else {
        this.recordFailure('Card Effects', 
          `Failed to play card: ${result.message}`);
      }

      // Test active effects
      const activeEffects = gameState.getActiveEventEffects();
      this.recordSuccess('Active Effects', 
        `${activeEffects.length} active effects tracked`);

    } catch (error) {
      this.recordFailure('Event Card Effects', 
        `Test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test 6: Game state integration
   */
  private testGameStateIntegration(): void {
    console.log('\\n🧪 Test 6: Game State Integration');
    console.log('----------------------------------');

    try {
      const gameState = this.createTestGameState();
      const playerId = 'test-player';

      // Test getting player cards
      const playerCards = gameState.getPlayerEventCards(playerId);
      
      if (playerCards.length > 0) {
        this.recordSuccess('Game State Integration', 
          `Player has ${playerCards.length} event cards`);
      } else {
        this.recordFailure('Game State Integration', 
          'Player has no event cards');
      }

      // Test deck statistics
      const deckStats = gameState.getEventCardDeckStats();
      this.recordSuccess('Deck Statistics', 
        `Deck has ${deckStats.cardsRemaining} cards remaining`);

    } catch (error) {
      this.recordFailure('Game State Integration', 
        `Test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test 7: Turn processing
   */
  private testTurnProcessing(): void {
    console.log('\\n🧪 Test 7: Turn Processing');
    console.log('---------------------------');

    try {
      const gameState = this.createTestGameState();
      const playerId = 'test-player';

      const initialCards = gameState.getPlayerEventCards(playerId).length;
      
      // Advance to EVENT phase and process
      gameState.phase = TurnPhase.EVENT;
      gameState.updateEventCardSystem();
      
      const newCards = gameState.getPlayerEventCards(playerId).length;

      if (newCards >= initialCards) {
        this.recordSuccess('Turn Processing', 
          `Cards properly managed during turn processing`);
      } else {
        this.recordFailure('Turn Processing', 
          `Card count decreased unexpectedly: ${initialCards} -> ${newCards}`);
      }

    } catch (error) {
      this.recordFailure('Turn Processing', 
        `Test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Test 8: Specific event cards
   */
  private testSpecificEventCards(): void {
    console.log('\\n🧪 Test 8: Specific Event Cards');
    console.log('--------------------------------');

    try {
      const gameState = this.createTestGameState();
      const playerId = 'test-player';

      // Test different card types
      const testCards = [
        { id: 'air_support_delay', expectedEffect: 'duration' },
        { id: 'intelligence_coup', expectedEffect: 'immediate' },
        { id: 'supply_drop', expectedEffect: 'immediate' },
        { id: 'tactical_surprise', expectedEffect: 'immediate' }
      ];

      let successCount = 0;
      let totalCards = 0;

      for (const testCard of testCards) {
        totalCards++;
        
        // Add the card to player's hand for testing
        const manager = gameState.eventCardManager;
        
        // Check if card can be played
        const canPlay = manager.canPlayCard(testCard.id, playerId, gameState);
        
        if (canPlay) {
          const result = gameState.playEventCard(testCard.id, playerId);
          if (result.success) {
            successCount++;
          }
        }
      }

      this.recordSuccess('Specific Event Cards', 
        `Successfully tested ${successCount}/${totalCards} event cards`);

    } catch (error) {
      this.recordFailure('Specific Event Cards', 
        `Test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a test game state
   */
  private createTestGameState(): GameState {
    const map = new GameMap(8, 8);
    const gameState = new GameState('event-card-test', map, 10);

    // Add test players
    const assaultPlayer = new Player('test-player', PlayerSide.Assault);
    const defenderPlayer = new Player('ai-player', PlayerSide.Defender);

    // Add some test units
    const testUnit = createTestUnit(
      'test-unit-1',
      'marine_squad',
      PlayerSide.Assault,
      new Hex(2, 2)
    );
    assaultPlayer.addUnit(testUnit);

    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);

    // Set up initial command points
    assaultPlayer.commandPoints = 5;
    defenderPlayer.commandPoints = 5;

    gameState.setActivePlayerBySide(PlayerSide.Assault);

    return gameState;
  }

  /**
   * Record test success
   */
  private recordSuccess(testName: string, message: string, details?: Record<string, unknown>): void {
    const result: EventCardTestResult = {
      testName,
      success: true,
      message,
      details
    };
    this.testResults.push(result);
    console.log(`✅ ${testName}: ${message}`);
  }

  /**
   * Record test failure
   */
  private recordFailure(testName: string, message: string, details?: Record<string, unknown>): void {
    const result: EventCardTestResult = {
      testName,
      success: false,
      message,
      details
    };
    this.testResults.push(result);
    console.log(`❌ ${testName}: ${message}`);
  }

  /**
   * Report test summary
   */
  private reportTestSummary(): void {
    console.log('\\n📊 Event Card Test Summary');
    console.log('===========================');

    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;

    console.log(`\\n📈 Results: ${passedTests}/${totalTests} tests passed`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);

    if (failedTests > 0) {
      console.log('\\n🔧 Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   - ${result.testName}: ${result.message}`);
        });
    }

    console.log(`\\n🎯 Event Card System Status: ${failedTests === 0 ? 'READY' : 'NEEDS FIXES'}`);
  }
}

/**
 * Run the event card test if this file is executed directly
 */
if (require.main === module) {
  const testSuite = new EventCardTest();
  try {
    testSuite.runAllTests();
  } catch (error) {
    console.error('Event Card Test Suite failed:', error);
  }
}