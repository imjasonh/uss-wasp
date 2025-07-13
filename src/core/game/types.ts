/**
 * Core type definitions for the game
 */


/**
 * Player sides
 */
export enum PlayerSide {
  Assault = 'assault',
  Defender = 'defender',
}

/**
 * Unit types for both sides
 */
export enum UnitType {
  // Assault units
  USS_WASP = 'uss_wasp',
  HARRIER = 'harrier',
  OSPREY = 'osprey',
  SUPER_STALLION = 'super_stallion',
  SUPER_COBRA = 'super_cobra',
  LCAC = 'lcac',
  LCU = 'lcu',
  AAV_7 = 'aav_7',
  MARINE_SQUAD = 'marine_squad',
  MARSOC = 'marsoc',
  HUMVEE = 'humvee',
  
  // Defender units
  INFANTRY_SQUAD = 'infantry_squad',
  ATGM_TEAM = 'atgm_team',
  AA_TEAM = 'aa_team',
  MORTAR_TEAM = 'mortar_team',
  TECHNICAL = 'technical',
  MILITIA_SQUAD = 'militia_squad',
  LONG_RANGE_ARTILLERY = 'long_range_artillery',
  ARTILLERY = 'artillery',
  SAM_SITE = 'sam_site',
}

/**
 * Unit categories for special rules
 */
export enum UnitCategory {
  SHIP = 'ship',
  AIRCRAFT = 'aircraft',
  HELICOPTER = 'helicopter',
  GROUND = 'ground',
  VEHICLE = 'vehicle',
  AMPHIBIOUS = 'amphibious',
  INFANTRY = 'infantry',
  ARTILLERY = 'artillery',
}

/**
 * Terrain types
 */
export enum TerrainType {
  DEEP_WATER = 'deep_water',
  SHALLOW_WATER = 'shallow_water',
  BEACH = 'beach',
  CLEAR = 'clear',
  LIGHT_WOODS = 'light_woods',
  HEAVY_WOODS = 'heavy_woods',
  URBAN = 'urban',
  HILLS = 'hills',
  MOUNTAINS = 'mountains',
}

/**
 * Terrain movement and cover properties
 */
export interface TerrainProperties {
  readonly movementCost: number;
  readonly coverBonus: number; // DEF bonus for units in this terrain
  readonly blocksLOS: boolean;
  readonly canLandAircraft: boolean;
  readonly canDeployLCAC: boolean;
}

/**
 * Objective types
 */
export enum ObjectiveType {
  PORT = 'port',
  AIRFIELD = 'airfield',
  COMMS_HUB = 'comms_hub',
  CIVIC_CENTER = 'civic_center',
  HIGH_VALUE_TARGET = 'hvt',
}

/**
 * Turn phases
 */
export enum TurnPhase {
  EVENT = 'event',
  COMMAND = 'command',
  DEPLOYMENT = 'deployment',
  MOVEMENT = 'movement',
  ACTION = 'action',
  END = 'end',
}

/**
 * Unit status effects
 */
export enum StatusEffect {
  SUPPRESSED = 'suppressed',
  PINNED = 'pinned',
  HIDDEN = 'hidden',
  DUMMY = 'dummy',
}

/**
 * Victory conditions
 */
export enum VictoryCondition {
  PRIMARY_OBJECTIVES = 'primary_objectives',
  DEFENDER_COLLAPSE = 'defender_collapse',
  ASSAULT_STALLED = 'assault_stalled',
  WASP_DISABLED = 'wasp_disabled',
  ASSAULT_ANNIHILATION = 'assault_annihilation',
}

/**
 * Game actions that units can perform
 */
export enum ActionType {
  MOVE = 'move',
  ATTACK = 'attack',
  LOAD = 'load',
  UNLOAD = 'unload',
  SPECIAL_ABILITY = 'special_ability',
  SECURE_OBJECTIVE = 'secure_objective',
  REVEAL = 'reveal',
  LAUNCH_FROM_WASP = 'launch_from_wasp',
  RECOVER_TO_WASP = 'recover_to_wasp',
}

/**
 * Wasp system status
 */
export enum WaspSystemStatus {
  OPERATIONAL = 'operational',
  LIMITED = 'limited',
  DAMAGED = 'damaged',
  OFFLINE = 'offline',
}

/**
 * Dice roll result
 */
export interface DiceRoll {
  readonly dice: number[];
  readonly total: number;
  readonly modifier: number;
  readonly finalResult: number;
}