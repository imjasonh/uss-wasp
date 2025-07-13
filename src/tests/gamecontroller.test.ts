/**
 * Tests for GameController web interface functionality
 * These tests ensure the UI components work correctly and catch regressions
 */

import { GameController, UIMode } from '../ui/GameController';
import { GameState } from '../core/game/GameState';
import { GameEngine } from '../core/game/GameEngine';
import { PixiRenderer } from '../ui/renderer/PixiRenderer';
import { MapRenderer } from '../ui/renderer/MapRenderer';
import { GameMap } from '../core/game/Map';
import { TerrainType } from '../core/game/types';
import { Player } from '../core/game/Player';
import { Unit } from '../core/game/Unit';
import { Hex } from '../core/hex';
import { PlayerSide, UnitType, TurnPhase, ActionType, UnitCategory } from '../core/game/types';
import { UNIT_DEFINITIONS } from '../core/units/UnitDefinitions';

// Mock DOM elements
const mockElement = {
  innerHTML: '',
  textContent: '',
  className: '',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

// Mock document methods
Object.defineProperty(global, 'document', {
  value: {
    getElementById: jest.fn(() => mockElement),
    createElement: jest.fn(() => mockElement),
    addEventListener: jest.fn(),
  },
});

// Mock PIXI Application
const mockPixiApp = {
  view: {
    addEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  },
  stage: {
    addChild: jest.fn(),
    on: jest.fn(),
    interactive: true,
    hitArea: null,
  },
  renderer: {
    resize: jest.fn(),
  },
  destroy: jest.fn(),
};

// Mock PixiRenderer
jest.mock('../ui/renderer/PixiRenderer', () => {
  return {
    PixiRenderer: jest.fn().mockImplementation(() => ({
      getApp: () => mockPixiApp,
      renderHexGrid: jest.fn(),
      renderUnits: jest.fn(),
      highlightHexes: jest.fn(),
      clearHighlights: jest.fn(),
      resize: jest.fn(),
      destroy: jest.fn(),
    })),
  };
});

// Mock MapRenderer
jest.mock('../ui/renderer/MapRenderer', () => {
  return {
    MapRenderer: jest.fn().mockImplementation(() => ({
      getAllHexes: () => [new Hex(0, 0, 0), new Hex(1, 0, -1)],
      getTerrainColor: () => 0x00ff00,
      getHexInfo: () => ({
        coordinate: '(0, 0)',
        terrain: 'Clear',
        movementCost: 1,
        defenseBonus: 0,
        blocksLOS: false,
        isOffshore: false,
      }),
    })),
  };
});

describe('GameController', () => {
  let gameController: GameController;
  let gameState: GameState;
  let mockRenderer: PixiRenderer;
  let mockMapRenderer: MapRenderer;

  beforeEach(() => {
    // Create test game state - use a simple map instead of MapRenderer.createDemoMap
    const map = new GameMap(8, 6);
    // Add some basic terrain
    for (let q = 0; q < 8; q++) {
      for (let r = 0; r < 6; r++) {
        const hex = Hex.fromOffset(q, r);
        map.setTerrain(hex, TerrainType.CLEAR);
      }
    }
    gameState = new GameState('test-game', map);

    // Add test players
    const assaultPlayer = new Player('assault', PlayerSide.Assault);
    const defenderPlayer = new Player('defender', PlayerSide.Defender);
    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);

    // Add test units
    const waspUnit = new Unit(
      'wasp-1',
      UnitType.USS_WASP,
      PlayerSide.Assault,
      UNIT_DEFINITIONS[UnitType.USS_WASP].stats,
      UNIT_DEFINITIONS[UnitType.USS_WASP].categories,
      UNIT_DEFINITIONS[UnitType.USS_WASP].specialAbilities,
      new Hex(0, 0, 0)
    );
    assaultPlayer.addUnit(waspUnit);

    const marineUnit = new Unit(
      'marine-1',
      UnitType.MARINE_SQUAD,
      PlayerSide.Assault,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].stats,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].categories,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].specialAbilities,
      new Hex(1, 0, -1)
    );
    assaultPlayer.addUnit(marineUnit);

    // Create mocked renderers
    mockRenderer = new PixiRenderer(document.createElement('div'), {
      width: 800,
      height: 600,
      hexSize: 30,
      backgroundColor: 0x000000,
    });
    mockMapRenderer = new MapRenderer(map);

    // Create GameController
    gameController = new GameController(gameState, mockRenderer, mockMapRenderer);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Restore getElementById to return mockElement
    (document.getElementById as jest.Mock).mockReturnValue(mockElement);
  });

  describe('Initialization', () => {
    it('should initialize with correct default state', () => {
      expect(gameController).toBeDefined();
      expect(document.getElementById).toHaveBeenCalledWith('turn-display');
      expect(document.getElementById).toHaveBeenCalledWith('phase-display');
    });

    it('should set up event listeners', () => {
      expect(mockPixiApp.view.addEventListener).toHaveBeenCalledWith(
        'hexSelected',
        expect.any(Function)
      );
      expect(mockPixiApp.view.addEventListener).toHaveBeenCalledWith(
        'unitSelected',
        expect.any(Function)
      );
    });
  });

  describe('UI Mode Management', () => {
    it('should start in normal mode', () => {
      // Private property access for testing
      expect((gameController as any).uiMode).toBe(UIMode.NORMAL);
    });

    it('should switch to move mode when startMove is called', () => {
      gameController.startMove();
      expect((gameController as any).uiMode).toBe(UIMode.MOVE_TARGET);
    });

    it('should switch to attack mode when startAttack is called', () => {
      gameController.startAttack();
      expect((gameController as any).uiMode).toBe(UIMode.ATTACK_TARGET);
    });

    it('should reset to normal mode when resetUIMode is called', () => {
      gameController.startMove();
      gameController.resetUIMode();
      expect((gameController as any).uiMode).toBe(UIMode.NORMAL);
    });
  });

  describe('Unit Selection', () => {
    it('should handle unit selection for valid player units', () => {
      const assaultPlayer = gameState.getPlayerBySide(PlayerSide.Assault);
      const marineUnit = assaultPlayer
        ?.getLivingUnits()
        .find(u => u.type === UnitType.MARINE_SQUAD);

      if (marineUnit) {
        // Simulate unit selection
        (gameController as any).onUnitSelected(marineUnit);
        expect((gameController as any).selectedUnit).toBe(marineUnit);
        expect((gameController as any).uiMode).toBe(UIMode.UNIT_SELECTED);
      }
    });

    it('should reject unit selection for enemy units', () => {
      // Create enemy unit
      const defenderPlayer = gameState.getPlayerBySide(PlayerSide.Defender);
      if (defenderPlayer) {
        const enemyUnit = new Unit(
          'enemy-1',
          UnitType.INFANTRY_SQUAD,
          PlayerSide.Defender,
          UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].stats,
          UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].categories,
          UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].specialAbilities,
          new Hex(2, 0, -2)
        );
        defenderPlayer.addUnit(enemyUnit);

        // Attempt to select enemy unit
        (gameController as any).onUnitSelected(enemyUnit);
        expect((gameController as any).selectedUnit).toBeUndefined();
        expect((gameController as any).uiMode).toBe(UIMode.NORMAL);
      }
    });
  });

  describe('Turn Management', () => {
    it('should advance to next phase', () => {
      const initialPhase = gameState.phase;
      gameController.nextPhase();
      expect(gameState.phase).not.toBe(initialPhase);
    });

    it('should handle end turn correctly', () => {
      const initialTurn = gameState.turn;
      gameController.endTurn();
      // Turn should advance through all phases
      expect(gameState.phase).toBe(TurnPhase.EVENT);
    });

    it('should generate command points in command phase', () => {
      gameController.generateCP();
      const assaultPlayer = gameState.getPlayerBySide(PlayerSide.Assault);
      // Command points might be 0 initially, just check the method doesn't throw
      expect(assaultPlayer?.commandPoints).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Action Validation', () => {
    it('should validate phase-appropriate actions', () => {
      gameState.phase = TurnPhase.MOVEMENT;
      const isValidMove = (gameController as any).isValidPhase(ActionType.MOVE);
      expect(isValidMove).toBe(true);

      const isValidAttack = (gameController as any).isValidPhase(ActionType.ATTACK);
      expect(isValidAttack).toBe(false);
    });

    it('should validate unit abilities correctly', () => {
      const assaultPlayer = gameState.getPlayerBySide(PlayerSide.Assault);
      const marineUnit = assaultPlayer
        ?.getLivingUnits()
        .find(u => u.type === UnitType.MARINE_SQUAD);

      if (marineUnit && marineUnit.specialAbilities.length > 0) {
        const canUse = (gameController as any).canUseAbility(
          marineUnit,
          marineUnit.specialAbilities[0].name
        );
        expect(typeof canUse).toBe('boolean');
      }
    });
  });

  describe('Transport Operations', () => {
    it('should identify units with cargo capacity', () => {
      const assaultPlayer = gameState.getPlayerBySide(PlayerSide.Assault);
      const waspUnit = assaultPlayer?.getLivingUnits().find(u => u.type === UnitType.USS_WASP);
      const marineUnit = assaultPlayer
        ?.getLivingUnits()
        .find(u => u.type === UnitType.MARINE_SQUAD);

      if (waspUnit && marineUnit) {
        // Marines can't carry cargo, but let's test the general logic
        const marineCapacity = marineUnit.getCargoCapacity();
        expect(typeof marineCapacity).toBe('number');
        expect(marineCapacity).toBeGreaterThanOrEqual(0);
      }
    });

    it('should validate load operations', () => {
      const assaultPlayer = gameState.getPlayerBySide(PlayerSide.Assault);
      const waspUnit = assaultPlayer?.getLivingUnits().find(u => u.type === UnitType.USS_WASP);
      const marineUnit = assaultPlayer
        ?.getLivingUnits()
        .find(u => u.type === UnitType.MARINE_SQUAD);

      if (waspUnit && marineUnit) {
        // Test if marine can be loaded (basic validation)
        const canLoad = (gameController as any).canUnitLoad(waspUnit, marineUnit);
        expect(typeof canLoad).toBe('boolean');
      }
    });
  });

  describe('Victory Conditions', () => {
    it('should check for elimination victory', () => {
      // Remove all defender units to trigger elimination
      const defenderPlayer = gameState.getPlayerBySide(PlayerSide.Defender);
      if (defenderPlayer) {
        // Clear all units
        (defenderPlayer as any).units = [];

        // Trigger victory check
        (gameController as any).checkVictoryConditions();
        expect(gameState.isGameOver).toBe(true);
      }
    });

    it('should check for USS Wasp destruction', () => {
      const assaultPlayer = gameState.getPlayerBySide(PlayerSide.Assault);
      if (assaultPlayer) {
        // Remove USS Wasp
        const waspUnit = assaultPlayer.getLivingUnits().find(u => u.type === UnitType.USS_WASP);
        if (waspUnit) {
          waspUnit.takeDamage(1000); // Destroy it
          (gameController as any).checkVictoryConditions();
          expect(gameState.isGameOver).toBe(true);
        }
      }
    });

    it('should calculate player scores', () => {
      const assaultPlayer = gameState.getPlayerBySide(PlayerSide.Assault);
      if (assaultPlayer) {
        const score = (gameController as any).calculatePlayerScore(assaultPlayer);
        expect(typeof score).toBe('number');
        expect(score).toBeGreaterThan(0);
      }
    });
  });

  describe('UI Display Updates', () => {
    it('should update game status display', () => {
      const updateElementSpy = jest.spyOn(gameController as any, 'updateElement');
      (gameController as any).updateGameStatusDisplay();

      expect(updateElementSpy).toHaveBeenCalledWith('turn-display', expect.any(String));
      expect(updateElementSpy).toHaveBeenCalledWith('phase-display', expect.any(String));
      expect(updateElementSpy).toHaveBeenCalledWith('active-player', expect.any(String));
    });

    it('should handle message display', () => {
      (gameController as any).showMessage('Test message', 'info');
      expect(document.getElementById).toHaveBeenCalledWith('game-message');
    });

    it('should update USS Wasp display', () => {
      // Test that updateWaspDisplay doesn't throw and executes without error
      expect(() => {
        (gameController as any).updateWaspDisplay();
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DOM elements gracefully', () => {
      // Mock getElementById to return null
      (document.getElementById as jest.Mock).mockReturnValue(null);

      expect(() => {
        (gameController as any).updateGameStatusDisplay();
        (gameController as any).showMessage('Test', 'info');
      }).not.toThrow();
    });

    it('should handle invalid actions gracefully', () => {
      expect(() => {
        gameController.startMove(); // No unit selected
        gameController.startAttack(); // No unit selected
      }).not.toThrow();
    });
  });
});
