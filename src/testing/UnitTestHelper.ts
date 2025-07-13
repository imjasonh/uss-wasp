/**
 * Helper functions for creating test units
 */

import { Unit, UnitStats, SpecialAbility } from '../core/game/Unit';
import { UnitType, UnitCategory, PlayerSide } from '../core/game/types';
import { HexCoordinate } from '../core/hex';

/**
 * Default stats for different unit types (simplified for testing)
 */
const DEFAULT_UNIT_STATS: Record<UnitType, UnitStats> = {
  [UnitType.USS_WASP]: { mv: 2, atk: 3, def: 3, hp: 20, sp: 50, pointCost: 500 },
  [UnitType.HARRIER]: { mv: 8, atk: 4, def: 5, hp: 2, sp: 3, pointCost: 80 },
  [UnitType.OSPREY]: { mv: 10, atk: 2, def: 5, hp: 3, sp: 5, pointCost: 100 },
  [UnitType.SUPER_STALLION]: { mv: 8, atk: 1, def: 5, hp: 4, sp: 8, pointCost: 120 },
  [UnitType.SUPER_COBRA]: { mv: 9, atk: 5, def: 5, hp: 2, sp: 4, pointCost: 90 },
  [UnitType.LCAC]: { mv: 6, atk: 1, def: 4, hp: 4, sp: 10, pointCost: 150 },
  [UnitType.LCU]: { mv: 4, atk: 1, def: 3, hp: 6, sp: 15, pointCost: 100 },
  [UnitType.AAV_7]: { mv: 4, atk: 2, def: 4, hp: 4, sp: 8, pointCost: 80 },
  [UnitType.MARINE_SQUAD]: { mv: 3, atk: 3, def: 5, hp: 3, pointCost: 40 },
  [UnitType.MARSOC]: { mv: 4, atk: 4, def: 5, hp: 2, pointCost: 60 },
  [UnitType.HUMVEE]: { mv: 6, atk: 2, def: 5, hp: 3, pointCost: 50 },
  [UnitType.INFANTRY_SQUAD]: { mv: 3, atk: 3, def: 5, hp: 3, pointCost: 30 },
  [UnitType.ATGM_TEAM]: { mv: 2, atk: 5, def: 6, hp: 2, pointCost: 50 },
  [UnitType.AA_TEAM]: { mv: 2, atk: 4, def: 6, hp: 2, pointCost: 40 },
  [UnitType.MORTAR_TEAM]: { mv: 2, atk: 3, def: 6, hp: 2, pointCost: 35 },
  [UnitType.TECHNICAL]: { mv: 5, atk: 3, def: 6, hp: 2, pointCost: 25 },
  [UnitType.MILITIA_SQUAD]: { mv: 3, atk: 2, def: 6, hp: 2, pointCost: 20 },
  [UnitType.LONG_RANGE_ARTILLERY]: { mv: 1, atk: 6, def: 6, hp: 3, pointCost: 80 },
  [UnitType.ARTILLERY]: { mv: 0, atk: 4, def: 3, hp: 4, sp: 6, pointCost: 35 },
  [UnitType.SAM_SITE]: { mv: 0, atk: 3, def: 2, hp: 3, sp: 4, pointCost: 25 },
};

/**
 * Default categories for unit types
 */
const DEFAULT_UNIT_CATEGORIES: Record<UnitType, UnitCategory[]> = {
  [UnitType.USS_WASP]: [UnitCategory.SHIP, UnitCategory.AMPHIBIOUS],
  [UnitType.HARRIER]: [UnitCategory.AIRCRAFT],
  [UnitType.OSPREY]: [UnitCategory.AIRCRAFT],
  [UnitType.SUPER_STALLION]: [UnitCategory.HELICOPTER],
  [UnitType.SUPER_COBRA]: [UnitCategory.HELICOPTER],
  [UnitType.LCAC]: [UnitCategory.AMPHIBIOUS, UnitCategory.VEHICLE],
  [UnitType.LCU]: [UnitCategory.AMPHIBIOUS, UnitCategory.VEHICLE],
  [UnitType.AAV_7]: [UnitCategory.AMPHIBIOUS, UnitCategory.VEHICLE],
  [UnitType.MARINE_SQUAD]: [UnitCategory.INFANTRY, UnitCategory.GROUND],
  [UnitType.MARSOC]: [UnitCategory.INFANTRY, UnitCategory.GROUND],
  [UnitType.HUMVEE]: [UnitCategory.VEHICLE, UnitCategory.GROUND],
  [UnitType.INFANTRY_SQUAD]: [UnitCategory.INFANTRY, UnitCategory.GROUND],
  [UnitType.ATGM_TEAM]: [UnitCategory.INFANTRY, UnitCategory.GROUND],
  [UnitType.AA_TEAM]: [UnitCategory.INFANTRY, UnitCategory.GROUND],
  [UnitType.MORTAR_TEAM]: [UnitCategory.INFANTRY, UnitCategory.ARTILLERY, UnitCategory.GROUND],
  [UnitType.TECHNICAL]: [UnitCategory.VEHICLE, UnitCategory.GROUND],
  [UnitType.MILITIA_SQUAD]: [UnitCategory.INFANTRY, UnitCategory.GROUND],
  [UnitType.LONG_RANGE_ARTILLERY]: [UnitCategory.ARTILLERY, UnitCategory.GROUND],
  [UnitType.ARTILLERY]: [UnitCategory.ARTILLERY, UnitCategory.GROUND],
  [UnitType.SAM_SITE]: [UnitCategory.ARTILLERY, UnitCategory.GROUND],
};

/**
 * Default special abilities (simplified for testing)
 */
const DEFAULT_SPECIAL_ABILITIES: Record<UnitType, SpecialAbility[]> = {
  [UnitType.USS_WASP]: [
    { name: 'Amphibious Command', description: 'Generates extra CP', cpCost: 0 },
    { name: 'Launch Operations', description: 'Deploy units', cpCost: 1 },
  ],
  [UnitType.HARRIER]: [{ name: 'VTOL', description: 'Vertical takeoff/landing', cpCost: 0 }],
  [UnitType.OSPREY]: [{ name: 'Tilt-rotor', description: 'Aircraft/helicopter hybrid', cpCost: 0 }],
  [UnitType.SUPER_STALLION]: [
    { name: 'Heavy Lift', description: 'Large cargo capacity', cpCost: 0 },
  ],
  [UnitType.SUPER_COBRA]: [
    { name: 'Close Air Support', description: 'Enhanced ground attack', cpCost: 1 },
  ],
  [UnitType.LCAC]: [{ name: 'Air Cushion', description: 'Over-the-beach capability', cpCost: 0 }],
  [UnitType.LCU]: [{ name: 'Utility Landing', description: 'Beach assault capability', cpCost: 0 }],
  [UnitType.AAV_7]: [
    { name: 'Amphibious Assault', description: 'Water-to-land movement', cpCost: 0 },
  ],
  [UnitType.MARINE_SQUAD]: [
    { name: 'Amphibious Training', description: 'Beach assault bonus', cpCost: 0 },
  ],
  [UnitType.MARSOC]: [
    { name: 'Special Operations', description: 'Enhanced reconnaissance', cpCost: 1 },
    { name: 'Direct Action', description: 'Stealth attacks', cpCost: 2 },
  ],
  [UnitType.HUMVEE]: [{ name: 'Mobility', description: 'Enhanced movement', cpCost: 0 }],
  [UnitType.INFANTRY_SQUAD]: [{ name: 'Entrench', description: 'Defensive bonus', cpCost: 1 }],
  [UnitType.ATGM_TEAM]: [{ name: 'Anti-Tank', description: 'Bonus vs vehicles', cpCost: 0 }],
  [UnitType.AA_TEAM]: [{ name: 'Anti-Aircraft', description: 'Bonus vs aircraft', cpCost: 0 }],
  [UnitType.MORTAR_TEAM]: [{ name: 'Indirect Fire', description: 'Ranged bombardment', cpCost: 1 }],
  [UnitType.TECHNICAL]: [{ name: 'Improvised', description: 'Low cost mobility', cpCost: 0 }],
  [UnitType.MILITIA_SQUAD]: [{ name: 'Local Knowledge', description: 'Terrain bonus', cpCost: 0 }],
  [UnitType.LONG_RANGE_ARTILLERY]: [
    { name: 'Heavy Bombardment', description: 'Long range fire support', cpCost: 2 },
  ],
  [UnitType.ARTILLERY]: [
    {
      name: 'Artillery Barrage',
      description: 'Target 3 adjacent hexes anywhere on map',
      cpCost: 2,
    },
  ],
  [UnitType.SAM_SITE]: [
    { name: 'SAM Strike', description: 'Target 1 Air Unit or USS Wasp anywhere on map', cpCost: 3 },
  ],
};

/**
 * Create a test unit with default stats
 */
export function createTestUnit(
  id: string,
  type: UnitType,
  side: PlayerSide,
  position: HexCoordinate,
  customStats?: Partial<UnitStats>,
  customAbilities?: SpecialAbility[]
): Unit {
  const stats = customStats
    ? { ...DEFAULT_UNIT_STATS[type], ...customStats }
    : DEFAULT_UNIT_STATS[type];

  const categories = DEFAULT_UNIT_CATEGORIES[type];
  const abilities = customAbilities || DEFAULT_SPECIAL_ABILITIES[type];

  return new Unit(id, type, side, stats, categories, abilities, position);
}

/**
 * Create multiple test units at once
 */
export function createTestUnits(
  unitConfigs: Array<{
    id: string;
    type: UnitType;
    side: PlayerSide;
    position: HexCoordinate;
    stats?: Partial<UnitStats>;
    abilities?: SpecialAbility[];
  }>
): Unit[] {
  return unitConfigs.map(config =>
    createTestUnit(
      config.id,
      config.type,
      config.side,
      config.position,
      config.stats,
      config.abilities
    )
  );
}
