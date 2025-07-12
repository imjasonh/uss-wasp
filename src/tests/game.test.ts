/**
 * Tests for core game systems
 */

import { Hex } from '../core/hex';
import { Unit } from '../core/game/Unit';
import { Player } from '../core/game/Player';
import { GameState } from '../core/game/GameState';
import { GameMap } from '../core/game/Map';
import { CombatSystem } from '../core/game/Combat';
import { 
  UnitType, 
  PlayerSide, 
  TurnPhase,
  TerrainType,
  ObjectiveType,
  ActionType,
  WaspSystemStatus 
} from '../core/game/types';
import { UNIT_DEFINITIONS } from '../core/units/UnitDefinitions';

describe('Unit', () => {
  let unit: Unit;

  beforeEach(() => {
    const position = new Hex(0, 0, 0);
    const template = UNIT_DEFINITIONS[UnitType.MARINE_SQUAD];
    unit = new Unit(
      'test-unit',
      template.type,
      template.side,
      template.stats,
      template.categories,
      template.specialAbilities,
      position
    );
  });

  describe('creation', () => {
    it('should create unit with correct initial state', () => {
      expect(unit.id).toBe('test-unit');
      expect(unit.type).toBe(UnitType.MARINE_SQUAD);
      expect(unit.side).toBe(PlayerSide.Assault);
      expect(unit.isAlive()).toBe(true);
      expect(unit.state.currentHP).toBe(unit.stats.hp);
    });
  });

  describe('damage and suppression', () => {
    it('should take damage correctly', () => {
      const initialHP = unit.state.currentHP;
      unit.takeDamage(1);
      expect(unit.state.currentHP).toBe(initialHP - 1);
      expect(unit.state.suppressionTokens).toBe(1);
      expect(unit.isSuppressed()).toBe(true);
    });

    it('should be destroyed when HP reaches 0', () => {
      unit.takeDamage(unit.stats.hp);
      expect(unit.isDestroyed()).toBe(true);
      expect(unit.isAlive()).toBe(false);
    });

    it('should become pinned with 2 suppression tokens', () => {
      // Give unit more HP so it survives multiple hits
      unit.state.currentHP = 4;
      unit.takeDamage(1);
      expect(unit.state.suppressionTokens).toBe(1);
      unit.takeDamage(1);
      expect(unit.state.suppressionTokens).toBe(2);
      expect(unit.isPinned()).toBe(true);
      expect(unit.canAct()).toBe(false);
    });
  });

  describe('movement and actions', () => {
    it('should track movement and action state', () => {
      expect(unit.canMove()).toBe(true);
      expect(unit.canAct()).toBe(true);

      unit.moveTo(new Hex(1, 0, -1));
      expect(unit.state.hasMoved).toBe(true);

      unit.state.hasActed = true;
      expect(unit.canAct()).toBe(false);
    });

    it('should reset turn state', () => {
      unit.state.hasMoved = true;
      unit.state.hasActed = true;
      
      unit.resetTurnState();
      
      expect(unit.state.hasMoved).toBe(false);
      expect(unit.state.hasActed).toBe(false);
    });
  });

  describe('cargo handling', () => {
    it('should handle cargo for transport units', () => {
      const osprey = new Unit(
        'osprey-1',
        UnitType.OSPREY,
        PlayerSide.Assault,
        UNIT_DEFINITIONS[UnitType.OSPREY].stats,
        UNIT_DEFINITIONS[UnitType.OSPREY].categories,
        UNIT_DEFINITIONS[UnitType.OSPREY].specialAbilities,
        new Hex(0, 0, 0)
      );

      expect(osprey.getCargoCapacity()).toBe(2);
      expect(osprey.loadCargo(unit)).toBe(true);
      expect(osprey.state.cargo.length).toBe(1);
    });
  });
});

describe('Player', () => {
  let player: Player;

  beforeEach(() => {
    player = new Player('test-player', PlayerSide.Assault);
  });

  describe('creation', () => {
    it('should create player with correct initial state', () => {
      expect(player.id).toBe('test-player');
      expect(player.side).toBe(PlayerSide.Assault);
      expect(player.commandPoints).toBe(0);
      expect(player.waspStatus).toBeDefined();
    });
  });

  describe('command points', () => {
    it('should generate command points for assault player', () => {
      player.generateCommandPoints();
      expect(player.commandPoints).toBe(3);
    });

    it('should generate reduced CP if Wasp C2 is damaged', () => {
      if (player.waspStatus) {
        player.waspStatus.c2Status = WaspSystemStatus.DAMAGED;
      }
      player.generateCommandPoints();
      expect(player.commandPoints).toBe(2);
    });

    it('should spend command points', () => {
      player.commandPoints = 5;
      expect(player.spendCommandPoints(3)).toBe(true);
      expect(player.commandPoints).toBe(2);
      expect(player.spendCommandPoints(5)).toBe(false);
    });
  });

  describe('units', () => {
    it('should add and manage units', () => {
      const unit = new Unit(
        'test-unit',
        UnitType.MARINE_SQUAD,
        PlayerSide.Assault,
        UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].stats,
        UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].categories,
        UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].specialAbilities,
        new Hex(0, 0, 0)
      );

      player.addUnit(unit);
      expect(player.getUnit('test-unit')).toBe(unit);
      expect(player.getLivingUnits().length).toBe(1);
    });
  });
});

describe('GameMap', () => {
  let map: GameMap;

  beforeEach(() => {
    map = GameMap.createTestMap();
  });

  describe('terrain', () => {
    it('should set and get terrain correctly', () => {
      const hex = new Hex(0, 0, 0);
      map.setTerrain(hex, TerrainType.URBAN);
      
      const mapHex = map.getHex(hex);
      expect(mapHex?.terrain).toBe(TerrainType.URBAN);
    });

    it('should calculate movement costs', () => {
      const clearHex = new Hex(0, 0, 0);
      const heavyWoodsHex = new Hex(1, 0, -1);
      
      map.setTerrain(heavyWoodsHex, TerrainType.HEAVY_WOODS);
      
      expect(map.getMovementCost(clearHex)).toBe(1);
      expect(map.getMovementCost(heavyWoodsHex)).toBe(3);
    });

    it('should provide defense bonuses', () => {
      const urbanHex = new Hex(0, 0, 0);
      map.setTerrain(urbanHex, TerrainType.URBAN);
      
      expect(map.getDefenseBonus(urbanHex)).toBe(2);
    });
  });

  describe('objectives', () => {
    it('should add and track objectives', () => {
      const hex = new Hex(0, 0, 0);
      map.addObjective(hex, ObjectiveType.PORT, 'test-port');
      
      const mapHex = map.getHex(hex);
      expect(mapHex?.objective?.type).toBe(ObjectiveType.PORT);
      expect(mapHex?.objective?.id).toBe('test-port');
    });
  });

  describe('offshore zone', () => {
    it('should identify offshore zone correctly', () => {
      const dimensions = map.getDimensions();
      const offshoreHex = new Hex(0, dimensions.height - 1, -(dimensions.height - 1));
      const landHex = new Hex(0, 0, 0);
      
      expect(map.isOffshoreZone(offshoreHex)).toBe(true);
      expect(map.isOffshoreZone(landHex)).toBe(false);
    });
  });
});

describe('GameState', () => {
  let gameState: GameState;
  let map: GameMap;

  beforeEach(() => {
    map = GameMap.createTestMap();
    gameState = new GameState('test-game', map);
    
    const assaultPlayer = new Player('assault', PlayerSide.Assault);
    const defenderPlayer = new Player('defender', PlayerSide.Defender);
    
    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);
  });

  describe('turn management', () => {
    it('should start at turn 1 in event phase', () => {
      expect(gameState.turn).toBe(1);
      expect(gameState.phase).toBe(TurnPhase.EVENT);
    });

    it('should advance phases correctly', () => {
      gameState.nextPhase();
      expect(gameState.phase).toBe(TurnPhase.COMMAND);
      
      gameState.nextPhase();
      expect(gameState.phase).toBe(TurnPhase.DEPLOYMENT);
    });

    it('should advance to next turn after end phase', () => {
      gameState.phase = TurnPhase.END;
      gameState.nextPhase();
      
      expect(gameState.turn).toBe(2);
      expect(gameState.phase).toBe(TurnPhase.EVENT);
    });
  });

  describe('action validation', () => {
    it('should validate actions correctly', () => {
      gameState.phase = TurnPhase.ACTION;
      
      const action = {
        type: ActionType.ATTACK,
        playerId: 'assault',
        unitId: 'test-unit',
      };

      // Should fail because unit doesn't exist
      let result = gameState.canPerformAction(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Unit not found');
    });

    it('should check phase validity', () => {
      gameState.phase = TurnPhase.EVENT;
      
      const action = {
        type: ActionType.ATTACK,
        playerId: 'assault',
        unitId: 'test-unit',
      };

      let result = gameState.canPerformAction(action);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not valid in event phase');
    });
  });

  describe('victory conditions', () => {
    it('should detect game over conditions', () => {
      // Mock a victory condition
      gameState.turn = gameState.maxTurns + 1;
      const victory = gameState.checkVictoryConditions();
      
      // Should check for time-based victory
      expect(victory).toBeDefined();
    });
  });
});

describe('CombatSystem', () => {
  let attacker: Unit;
  let defender: Unit;
  let gameState: GameState;

  beforeEach(() => {
    const map = GameMap.createTestMap();
    gameState = new GameState('test-game', map);
    
    attacker = new Unit(
      'attacker',
      UnitType.MARINE_SQUAD,
      PlayerSide.Assault,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].stats,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].categories,
      UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].specialAbilities,
      new Hex(0, 0, 0)
    );

    defender = new Unit(
      'defender',
      UnitType.INFANTRY_SQUAD,
      PlayerSide.Defender,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].stats,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].categories,
      UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].specialAbilities,
      new Hex(1, 0, -1)
    );
  });

  describe('attack validation', () => {
    it('should validate basic attack requirements', () => {
      const result = CombatSystem.canAttack(attacker, defender, gameState);
      expect(result.valid).toBe(true);
    });

    it('should prevent attacking friendly units', () => {
      // Create a new friendly unit instead of modifying readonly property
      const friendlyUnit = new Unit(
        'friendly',
        UnitType.MARINE_SQUAD,
        PlayerSide.Assault,
        UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].stats,
        UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].categories,
        UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].specialAbilities,
        new Hex(1, 0, -1)
      );
      
      const result = CombatSystem.canAttack(attacker, friendlyUnit, gameState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Cannot attack friendly units');
    });

    it('should prevent attacking destroyed units', () => {
      defender.takeDamage(defender.stats.hp);
      const result = CombatSystem.canAttack(attacker, defender, gameState);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Target is already destroyed');
    });
  });

  describe('combat resolution', () => {
    it('should resolve combat correctly', () => {
      const result = CombatSystem.resolveCombat(attacker, defender, gameState);
      
      expect(result.attacker).toBe(attacker);
      expect(result.defender).toBe(defender);
      expect(result.attackRoll).toBeDefined();
      expect(result.description).toBeDefined();
      expect(attacker.state.hasActed).toBe(true);
    });

    it('should apply terrain modifiers', () => {
      // Place defender in urban terrain for cover bonus
      gameState.map.setTerrain(defender.state.position, TerrainType.URBAN);
      
      const result = CombatSystem.resolveCombat(attacker, defender, gameState);
      expect(result.modifiers.terrainCover).toBe(2); // Urban gives +2 DEF
    });
  });
});