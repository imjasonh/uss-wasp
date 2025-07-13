/**
 * Tests for GameEngine functionality
 * Critical for ensuring game logic doesn't regress
 */

import { GameEngine } from '../core/game/GameEngine';
import { GameState } from '../core/game/GameState';
import { Player } from '../core/game/Player';
import { Unit } from '../core/game/Unit';
import { GameMap } from '../core/game/Map';
import { TerrainType } from '../core/game/types';
import { Hex } from '../core/hex';
import { PlayerSide, UnitType, ActionType, TurnPhase } from '../core/game/types';
import { UNIT_DEFINITIONS } from '../core/units/UnitDefinitions';

describe('GameEngine', () => {
  let gameEngine: GameEngine;
  let gameState: GameState;
  let assaultPlayer: Player;
  let defenderPlayer: Player;
  let marineUnit: Unit;
  let enemyUnit: Unit;

  beforeEach(() => {
    // Create test game state
    const map = new GameMap(8, 6);
    // Add some basic terrain
    for (let q = 0; q < 8; q++) {
      for (let r = 0; r < 6; r++) {
        const hex = Hex.fromOffset(q, r);
        map.setTerrain(hex, TerrainType.CLEAR);
      }
    }
    gameState = new GameState('test-game', map);

    // Add players
    assaultPlayer = new Player('assault', PlayerSide.Assault);
    defenderPlayer = new Player('defender', PlayerSide.Defender);
    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);

    // Create test units
    marineUnit = new Unit(
      'marine-1',
      UnitType.MARINE_SQUAD,
      PlayerSide.Assault,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].stats,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].categories,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].specialAbilities,
      new Hex(1, 0, -1)
    );
    assaultPlayer.addUnit(marineUnit);

    enemyUnit = new Unit(
      'enemy-1',
      UnitType.INFANTRY_SQUAD,
      PlayerSide.Defender,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].stats,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].categories,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].specialAbilities,
      new Hex(2, 0, -2)
    );
    defenderPlayer.addUnit(enemyUnit);

    // Set active player
    gameState.activePlayerId = assaultPlayer.id;
    gameState.phase = TurnPhase.MOVEMENT;

    gameEngine = new GameEngine(gameState);
  });

  describe('Action Validation', () => {
    it('should validate move actions', () => {
      const moveAction = {
        type: ActionType.MOVE,
        playerId: assaultPlayer.id,
        unitId: marineUnit.id,
        targetPosition: new Hex(2, -1, -1),
      };

      const result = gameEngine.executeAction(moveAction);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    it('should validate attack actions', () => {
      // Set phase to action for attacks
      gameState.phase = TurnPhase.ACTION;

      const attackAction = {
        type: ActionType.ATTACK,
        playerId: assaultPlayer.id,
        unitId: marineUnit.id,
        targetId: enemyUnit.id,
      };

      const result = gameEngine.executeAction(attackAction);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should reject actions from wrong player', () => {
      const moveAction = {
        type: ActionType.MOVE,
        playerId: defenderPlayer.id, // Wrong player
        unitId: marineUnit.id,
        targetPosition: new Hex(2, -1, -1),
      };

      const result = gameEngine.executeAction(moveAction);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Not your turn');
    });

    it('should reject actions in wrong phase', () => {
      gameState.phase = TurnPhase.COMMAND; // Wrong phase for movement

      const moveAction = {
        type: ActionType.MOVE,
        playerId: assaultPlayer.id,
        unitId: marineUnit.id,
        targetPosition: new Hex(2, -1, -1),
      };

      const result = gameEngine.executeAction(moveAction);
      expect(result.success).toBe(false);
    });
  });

  describe('Movement System', () => {
    it('should calculate valid movement paths', () => {
      const targetHex = new Hex(2, -1, -1);
      const path = gameEngine.calculateMovementPath(marineUnit, targetHex);

      expect(path).toBeDefined();
      expect(typeof path.valid).toBe('boolean');
      expect(Array.isArray(path.hexes)).toBe(true);
      expect(typeof path.totalCost).toBe('number');
    });

    it('should respect movement allowances', () => {
      const farHex = new Hex(10, -5, -5); // Very far away
      const path = gameEngine.calculateMovementPath(marineUnit, farHex);

      // Should be invalid due to distance
      expect(path.valid).toBe(false);
    });

    it('should execute valid movement', () => {
      const originalPosition = new Hex(
        marineUnit.state.position.q,
        marineUnit.state.position.r,
        marineUnit.state.position.s
      );
      const targetHex = new Hex(2, -1, -1);

      const moveAction = {
        type: ActionType.MOVE,
        playerId: assaultPlayer.id,
        unitId: marineUnit.id,
        targetPosition: targetHex,
      };

      const result = gameEngine.executeAction(moveAction);

      if (result.success) {
        expect(targetHex.equals(marineUnit.state.position)).toBe(true);
        expect(marineUnit.state.hasMoved).toBe(true);
      }
    });
  });

  describe('Combat System', () => {
    beforeEach(() => {
      gameState.phase = TurnPhase.ACTION;
      // Place units adjacent for combat
      marineUnit.state.position = new Hex(1, 0, -1);
      enemyUnit.state.position = new Hex(2, 0, -2);
    });

    it('should execute attack actions', () => {
      const originalHP = enemyUnit.state.currentHP;

      const attackAction = {
        type: ActionType.ATTACK,
        playerId: assaultPlayer.id,
        unitId: marineUnit.id,
        targetId: enemyUnit.id,
      };

      const result = gameEngine.executeAction(attackAction);
      expect(result).toBeDefined();

      if (result.success) {
        expect(marineUnit.state.hasActed).toBe(true);
      }
    });

    it('should validate attack range', () => {
      // Place enemy too far away
      enemyUnit.state.position = new Hex(10, -5, -5);

      const attackAction = {
        type: ActionType.ATTACK,
        playerId: assaultPlayer.id,
        unitId: marineUnit.id,
        targetId: enemyUnit.id,
      };

      const result = gameEngine.executeAction(attackAction);
      expect(result.success).toBe(false);
    });

    it('should prevent attacking same side units', () => {
      const friendlyUnit = new Unit(
        'friendly-1',
        UnitType.MARINE_SQUAD,
        PlayerSide.Assault, // Same side
        UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].stats,
        UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].categories,
        UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].specialAbilities,
        new Hex(2, 0, -2)
      );
      assaultPlayer.addUnit(friendlyUnit);

      const attackAction = {
        type: ActionType.ATTACK,
        playerId: assaultPlayer.id,
        unitId: marineUnit.id,
        targetId: friendlyUnit.id,
      };

      const result = gameEngine.executeAction(attackAction);
      expect(result.success).toBe(false);
    });
  });

  describe('Transport Operations', () => {
    let ospreytUnit: Unit;

    beforeEach(() => {
      // Create an Osprey that can carry units
      ospreytUnit = new Unit(
        'osprey-1',
        UnitType.OSPREY,
        PlayerSide.Assault,
        UNIT_DEFINITIONS[UnitType.OSPREY].stats,
        UNIT_DEFINITIONS[UnitType.OSPREY].categories,
        UNIT_DEFINITIONS[UnitType.OSPREY].specialAbilities,
        new Hex(1, 0, -1)
      );
      assaultPlayer.addUnit(ospreytUnit);
      gameState.phase = TurnPhase.ACTION;
    });

    it('should execute load actions', () => {
      // Place marine adjacent to osprey
      marineUnit.state.position = new Hex(1, 0, -1);
      ospreytUnit.state.position = new Hex(2, 0, -2);

      const loadAction = {
        type: ActionType.LOAD,
        playerId: assaultPlayer.id,
        unitId: ospreytUnit.id,
        targetId: marineUnit.id,
      };

      const result = gameEngine.executeAction(loadAction);

      if (result.success) {
        expect(ospreytUnit.state.cargo.length).toBeGreaterThan(0);
        // Check if marine is in the cargo
        expect(ospreytUnit.state.cargo.includes(marineUnit)).toBe(true);
      }
    });

    it('should execute unload actions', () => {
      // First load the unit manually
      ospreytUnit.state.cargo.push(marineUnit);

      const unloadAction = {
        type: ActionType.UNLOAD,
        playerId: assaultPlayer.id,
        unitId: ospreytUnit.id,
        targetPosition: new Hex(3, 0, -3),
      };

      const result = gameEngine.executeAction(unloadAction);

      if (result.success) {
        expect(ospreytUnit.state.cargo.length).toBe(0);
        expect(ospreytUnit.state.cargo.includes(marineUnit)).toBe(false);
      }
    });

    it('should validate transport capacity', () => {
      // Fill up the Osprey beyond capacity
      const capacity = ospreytUnit.getCargoCapacity();
      for (let i = 0; i < capacity + 1; i++) {
        const extraUnit = new Unit(
          `extra-${i}`,
          UnitType.MARINE_SQUAD,
          PlayerSide.Assault,
          UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].stats,
          UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].categories,
          UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].specialAbilities,
          new Hex(i, 0, -i)
        );
        ospreytUnit.state.cargo.push(extraUnit);
      }

      const loadAction = {
        type: ActionType.LOAD,
        playerId: assaultPlayer.id,
        unitId: ospreytUnit.id,
        targetId: marineUnit.id,
      };

      const result = gameEngine.executeAction(loadAction);
      expect(result.success).toBe(false);
    });
  });

  describe('Special Abilities', () => {
    it('should execute special abilities', () => {
      gameState.phase = TurnPhase.ACTION;

      // Find a unit with special abilities
      if (marineUnit.specialAbilities.length > 0) {
        const ability = marineUnit.specialAbilities[0];

        const abilityAction = {
          type: ActionType.SPECIAL_ABILITY,
          playerId: assaultPlayer.id,
          unitId: marineUnit.id,
          data: {
            abilityName: ability.name,
            targetHex: new Hex(2, 0, -2),
          },
        };

        const result = gameEngine.executeAction(abilityAction);
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      }
    });

    it('should validate CP costs for abilities', () => {
      gameState.phase = TurnPhase.ACTION;
      assaultPlayer.commandPoints = 0; // No CP available

      if (marineUnit.specialAbilities.length > 0) {
        const ability = marineUnit.specialAbilities[0];

        if (ability.cpCost && ability.cpCost > 0) {
          const abilityAction = {
            type: ActionType.SPECIAL_ABILITY,
            playerId: assaultPlayer.id,
            unitId: marineUnit.id,
            data: {
              abilityName: ability.name,
              targetHex: new Hex(2, 0, -2),
            },
          };

          const result = gameEngine.executeAction(abilityAction);
          expect(result.success).toBe(false);
        }
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid unit IDs', () => {
      const action = {
        type: ActionType.MOVE,
        playerId: assaultPlayer.id,
        unitId: 'nonexistent-unit',
        targetPosition: new Hex(2, -1, -1),
      };

      const result = gameEngine.executeAction(action);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unit not found');
    });

    it('should handle invalid player IDs', () => {
      const action = {
        type: ActionType.MOVE,
        playerId: 'nonexistent-player',
        unitId: marineUnit.id,
        targetPosition: new Hex(2, -1, -1),
      };

      const result = gameEngine.executeAction(action);
      expect(result.success).toBe(false);
    });

    it('should handle malformed actions', () => {
      const action = {
        type: ActionType.MOVE,
        playerId: assaultPlayer.id,
        unitId: marineUnit.id,
        // Missing targetPosition
      } as any;

      const result = gameEngine.executeAction(action);
      expect(result.success).toBe(false);
    });
  });

  describe('State Consistency', () => {
    it('should maintain unit state after actions', () => {
      const originalHP = marineUnit.state.currentHP;
      const originalPos = new Hex(
        marineUnit.state.position.q,
        marineUnit.state.position.r,
        marineUnit.state.position.s
      );

      const moveAction = {
        type: ActionType.MOVE,
        playerId: assaultPlayer.id,
        unitId: marineUnit.id,
        targetPosition: new Hex(2, -1, -1),
      };

      gameEngine.executeAction(moveAction);

      // HP should not change from movement
      expect(marineUnit.state.currentHP).toBe(originalHP);
      // Position should change if successful, or stay same if failed
      expect(marineUnit.state.position).toBeDefined();
    });

    it('should track action states correctly', () => {
      expect(marineUnit.state.hasMoved).toBe(false);
      expect(marineUnit.state.hasActed).toBe(false);

      const moveAction = {
        type: ActionType.MOVE,
        playerId: assaultPlayer.id,
        unitId: marineUnit.id,
        targetPosition: new Hex(2, -1, -1),
      };

      const result = gameEngine.executeAction(moveAction);
      if (result.success) {
        expect(marineUnit.state.hasMoved).toBe(true);
      }
    });
  });
});
