/**
 * Unit definitions with stats and abilities based on game rules
 */

import { 
  UnitType, 
  UnitCategory, 
  PlayerSide 
} from '../game/types';
import { UnitStats, SpecialAbility } from '../game/Unit';
import { Hex } from '../hex';

/**
 * Unit template for creating units
 */
export interface UnitTemplate {
  readonly type: UnitType;
  readonly side: PlayerSide;
  readonly stats: UnitStats;
  readonly categories: UnitCategory[];
  readonly specialAbilities: SpecialAbility[];
  readonly name: string;
  readonly description: string;
}

/**
 * Unit definitions based on the game rules
 * Note: Some stats are estimated since not all are specified in the rules
 */
export const UNIT_DEFINITIONS: Record<UnitType, UnitTemplate> = {
  // ASSAULT FORCE UNITS
  [UnitType.USS_WASP]: {
    type: UnitType.USS_WASP,
    side: PlayerSide.Assault,
    name: 'USS Wasp (LHD-1)',
    description: 'Amphibious assault ship and command center',
    stats: {
      mv: 1,
      atk: 2,  // Defensive armament
      def: 3,  // Well armored
      hp: 10,  // Structural integrity
      sp: 5,   // Limited defensive ammo
      pointCost: 0, // Free as per rules
    },
    categories: [UnitCategory.SHIP],
    specialAbilities: [
      {
        name: 'Flight Deck',
        description: 'Can launch/recover aircraft. Capacity depends on status.',
      },
      {
        name: 'Well Deck',
        description: 'Can launch/recover LCACs and AAVs. Capacity depends on status.',
      },
      {
        name: 'C2 Hub',
        description: 'Generates Command Points based on C2 status.',
      },
      {
        name: 'CIWS/RAM',
        description: 'Reactive defense: Roll 3 dice vs missiles/air strikes, 5+ negates hits.',
      },
      {
        name: 'Sea Sparrow',
        description: 'Active defense: Attack 1 air unit within 5 hexes, 2 ATK dice vs DEF 4.',
        cpCost: 0,
        usesPerTurn: 1,
      },
    ],
  },

  [UnitType.HARRIER]: {
    type: UnitType.HARRIER,
    side: PlayerSide.Assault,
    name: 'AV-8B Harrier II',
    description: 'V/STOL fighter-bomber',
    stats: {
      mv: 8,
      atk: 4,
      def: 5,  // Fast but lightly armored
      hp: 2,
      sp: 3,   // Limited ordnance
      pointCost: 45,
    },
    categories: [UnitCategory.AIRCRAFT],
    specialAbilities: [
      {
        name: 'V/STOL Landing',
        description: 'Can land in Clear or Light Woods hexes to embark/disembark Marines.',
      },
      {
        name: 'Close Air Support',
        description: '+1 ATK when attacking ground units in adjacent hex after moving.',
      },
    ],
  },

  [UnitType.OSPREY]: {
    type: UnitType.OSPREY,
    side: PlayerSide.Assault,
    name: 'MV-22 Osprey',
    description: 'Tiltrotor transport aircraft',
    stats: {
      mv: 10,
      atk: 1,  // Minimal defensive armament
      def: 5,
      hp: 3,
      sp: 2,
      pointCost: 35,
    },
    categories: [UnitCategory.AIRCRAFT],
    specialAbilities: [
      {
        name: 'Rapid Deployment Transport',
        description: 'Can carry 2 Marine Squads or 1 Humvee.',
      },
      {
        name: 'All-Terrain Landing',
        description: 'Ignores first 1 MP cost when entering difficult terrain.',
      },
    ],
  },

  [UnitType.SUPER_STALLION]: {
    type: UnitType.SUPER_STALLION,
    side: PlayerSide.Assault,
    name: 'CH-53 Super Stallion',
    description: 'Heavy lift helicopter',
    stats: {
      mv: 6,
      atk: 1,
      def: 5,
      hp: 4,
      sp: 2,
      pointCost: 40,
    },
    categories: [UnitCategory.HELICOPTER],
    specialAbilities: [
      {
        name: 'Heavy Lift Transport',
        description: 'Can carry 3 Marine Squads, or 1 Humvee and 1 Marine Squad.',
      },
      {
        name: 'Clear LZ Required',
        description: 'Requires Clear terrain for landing operations.',
      },
    ],
  },

  [UnitType.SUPER_COBRA]: {
    type: UnitType.SUPER_COBRA,
    side: PlayerSide.Assault,
    name: 'AH-1W Super Cobra',
    description: 'Attack helicopter',
    stats: {
      mv: 7,
      atk: 5,
      def: 5,
      hp: 2,
      sp: 4,
      pointCost: 38,
    },
    categories: [UnitCategory.HELICOPTER],
    specialAbilities: [
      {
        name: 'Tank Hunter',
        description: '+1 ATK when attacking vehicles.',
      },
      {
        name: 'Close Air Support',
        description: 'Can provide fire support for ground operations.',
      },
    ],
  },

  [UnitType.LCAC]: {
    type: UnitType.LCAC,
    side: PlayerSide.Assault,
    name: 'LCAC',
    description: 'Landing Craft Air Cushion',
    stats: {
      mv: 8,
      atk: 1,
      def: 4,
      hp: 3,
      pointCost: 30,
    },
    categories: [UnitCategory.AMPHIBIOUS, UnitCategory.VEHICLE],
    specialAbilities: [
      {
        name: 'High Speed Amphibious',
        description: 'Movement costs 1 MP for Beach, Shallow Water, and Deep Water hexes.',
      },
      {
        name: 'Heavy Transport',
        description: 'Can carry 2 AAVs or 3 Marine Squads or 1 Humvee and 1 AAV.',
      },
    ],
  },

  [UnitType.LCU]: {
    type: UnitType.LCU,
    side: PlayerSide.Assault,
    name: 'LCU',
    description: 'Landing Craft Utility',
    stats: {
      mv: 4,
      atk: 1,
      def: 4,
      hp: 4,
      pointCost: 25,
    },
    categories: [UnitCategory.AMPHIBIOUS, UnitCategory.VEHICLE],
    specialAbilities: [
      {
        name: 'Amphibious Transport',
        description: 'Can carry vehicles and supplies between ship and shore.',
      },
    ],
  },

  [UnitType.AAV_7]: {
    type: UnitType.AAV_7,
    side: PlayerSide.Assault,
    name: 'AAV-7',
    description: 'Amphibious Assault Vehicle',
    stats: {
      mv: 4,
      atk: 3,
      def: 4,
      hp: 3,
      pointCost: 20,
    },
    categories: [UnitCategory.AMPHIBIOUS, UnitCategory.VEHICLE],
    specialAbilities: [
      {
        name: 'Amphibious Assault Vehicle',
        description: 'Can move through Shallow Water (1MP) and Deep Water (2MP).',
      },
      {
        name: 'Marine Transport',
        description: 'Can carry 1 Marine Squad.',
      },
    ],
  },

  [UnitType.MARINE_SQUAD]: {
    type: UnitType.MARINE_SQUAD,
    side: PlayerSide.Assault,
    name: 'Marine Squad',
    description: 'Elite amphibious infantry',
    stats: {
      mv: 3,
      atk: 3,
      def: 4,
      hp: 2,
      pointCost: 15,
    },
    categories: [UnitCategory.INFANTRY, UnitCategory.GROUND],
    specialAbilities: [
      {
        name: 'Urban Specialists',
        description: '+1 ATK when attacking enemies in Urban hexes.',
      },
      {
        name: 'Breaching Charge',
        description: 'Can destroy Barricade or Trench marker in adjacent hex for 1 Action.',
      },
    ],
  },

  [UnitType.MARSOC]: {
    type: UnitType.MARSOC,
    side: PlayerSide.Assault,
    name: 'MARSOC Team',
    description: 'Marine Special Operations Command',
    stats: {
      mv: 4,
      atk: 4,
      def: 4,
      hp: 2,
      pointCost: 25,
    },
    categories: [UnitCategory.INFANTRY, UnitCategory.GROUND],
    specialAbilities: [
      {
        name: 'Infiltrate',
        description: 'Can be placed as Hidden Unit anywhere on map during setup.',
      },
      {
        name: 'Recon Specialists',
        description: 'When revealing, detects all hidden units within 2 hexes. +1 ATK vs just-revealed units.',
      },
    ],
  },

  [UnitType.HUMVEE]: {
    type: UnitType.HUMVEE,
    side: PlayerSide.Assault,
    name: 'Humvee',
    description: 'High Mobility Multipurpose Wheeled Vehicle',
    stats: {
      mv: 5,
      atk: 2,
      def: 4,
      hp: 2,
      pointCost: 12,
    },
    categories: [UnitCategory.VEHICLE, UnitCategory.GROUND],
    specialAbilities: [
      {
        name: 'Fast Reconnaissance',
        description: 'High mobility for scouting and rapid deployment.',
      },
    ],
  },

  // DEFENDER FORCE UNITS
  [UnitType.INFANTRY_SQUAD]: {
    type: UnitType.INFANTRY_SQUAD,
    side: PlayerSide.Defender,
    name: 'Infantry Squad',
    description: 'Regular infantry unit',
    stats: {
      mv: 3,
      atk: 2,
      def: 4,
      hp: 2,
      pointCost: 10,
    },
    categories: [UnitCategory.INFANTRY, UnitCategory.GROUND],
    specialAbilities: [
      {
        name: 'Defensive Position',
        description: 'Benefits from terrain cover and fortifications.',
      },
    ],
  },

  [UnitType.ATGM_TEAM]: {
    type: UnitType.ATGM_TEAM,
    side: PlayerSide.Defender,
    name: 'ATGM Team',
    description: 'Anti-Tank Guided Missile team',
    stats: {
      mv: 2,
      atk: 3,
      def: 4,
      hp: 1,
      sp: 3,
      pointCost: 18,
    },
    categories: [UnitCategory.INFANTRY, UnitCategory.GROUND],
    specialAbilities: [
      {
        name: 'Anti-Vehicle Specialist',
        description: '+2 ATK when targeting Vehicles (AAV, Humvee, Technical, Tank).',
      },
    ],
  },

  [UnitType.AA_TEAM]: {
    type: UnitType.AA_TEAM,
    side: PlayerSide.Defender,
    name: 'AA Gun/MANPADS Team',
    description: 'Anti-Aircraft team',
    stats: {
      mv: 2,
      atk: 3,
      def: 4,
      hp: 1,
      sp: 4,
      pointCost: 20,
    },
    categories: [UnitCategory.INFANTRY, UnitCategory.GROUND],
    specialAbilities: [
      {
        name: 'Anti-Air Focus',
        description: 'Can only attack Air Units. +2 ATK when attacking Helicopters.',
      },
    ],
  },

  [UnitType.MORTAR_TEAM]: {
    type: UnitType.MORTAR_TEAM,
    side: PlayerSide.Defender,
    name: 'Mortar Team',
    description: 'Indirect fire support',
    stats: {
      mv: 2,
      atk: 2,
      def: 4,
      hp: 1,
      sp: 5,
      pointCost: 16,
    },
    categories: [UnitCategory.ARTILLERY, UnitCategory.GROUND],
    specialAbilities: [
      {
        name: 'Indirect Fire',
        description: 'Can attack any hex within 5 hexes, ignoring LOS, but not adjacent hexes. Roll 1 less ATK die. Always places Suppression Token.',
      },
    ],
  },

  [UnitType.TECHNICAL]: {
    type: UnitType.TECHNICAL,
    side: PlayerSide.Defender,
    name: 'Technical',
    description: 'Armed pickup truck',
    stats: {
      mv: 5,
      atk: 2,
      def: 5,
      hp: 2,
      pointCost: 12,
    },
    categories: [UnitCategory.VEHICLE, UnitCategory.GROUND],
    specialAbilities: [
      {
        name: 'Fast Ambush',
        description: 'Can move full MA after attacking, if started hidden and revealed to attack.',
      },
    ],
  },

  [UnitType.MILITIA_SQUAD]: {
    type: UnitType.MILITIA_SQUAD,
    side: PlayerSide.Defender,
    name: 'Militia Squad',
    description: 'Irregular forces',
    stats: {
      mv: 3,
      atk: 1,
      def: 5,
      hp: 1,
      pointCost: 6,
    },
    categories: [UnitCategory.INFANTRY, UnitCategory.GROUND],
    specialAbilities: [
      {
        name: 'Local Knowledge',
        description: 'Benefits from knowledge of local terrain and hiding spots.',
      },
    ],
  },

  [UnitType.LONG_RANGE_ARTILLERY]: {
    type: UnitType.LONG_RANGE_ARTILLERY,
    side: PlayerSide.Defender,
    name: 'Long-Range Artillery/SAM Battery',
    description: 'Off-board artillery and surface-to-air missiles',
    stats: {
      mv: 0,  // Off-board, cannot move
      atk: 4,
      def: 2,  // Hard to target but vulnerable if found
      hp: 3,
      pointCost: 30,
    },
    categories: [UnitCategory.ARTILLERY],
    specialAbilities: [
      {
        name: 'Artillery Barrage',
        description: 'Target 3 adjacent hexes anywhere on map. 2 ATK dice vs all units, DEF 5 base, ignores cover. Costs 2 CP.',
        cpCost: 2,
      },
      {
        name: 'SAM Strike',
        description: 'Target 1 Air Unit or USS Wasp anywhere on map. 3 ATK dice. Costs 3 CP.',
        cpCost: 3,
      },
    ],
  },

  [UnitType.ARTILLERY]: {
    type: UnitType.ARTILLERY,
    side: PlayerSide.Defender,
    name: 'Artillery Battery',
    description: 'Heavy artillery position with long-range capability',
    stats: {
      mv: 0,  // Static emplacement
      atk: 4,
      def: 3,
      hp: 4,
      sp: 6,   // Ammunition supply
      pointCost: 35,
    },
    categories: [UnitCategory.ARTILLERY],
    specialAbilities: [
      {
        name: 'Artillery Barrage',
        description: 'Target 3 adjacent hexes anywhere on map. 2 ATK dice vs all units, DEF 5 base, ignores cover. Costs 2 CP.',
        cpCost: 2,
      },
    ],
  },

  [UnitType.SAM_SITE]: {
    type: UnitType.SAM_SITE,
    side: PlayerSide.Defender,
    name: 'SAM Site',
    description: 'Surface-to-air missile battery for anti-aircraft defense',
    stats: {
      mv: 0,  // Static emplacement
      atk: 3,
      def: 2,
      hp: 3,
      sp: 4,   // Missile supply
      pointCost: 25,
    },
    categories: [UnitCategory.ARTILLERY],
    specialAbilities: [
      {
        name: 'SAM Strike',
        description: 'Target 1 Air Unit or USS Wasp anywhere on map. 3 ATK dice. Costs 3 CP.',
        cpCost: 3,
      },
    ],
  },
};

/**
 * Create a unit from a template
 */
export function createUnit(
  id: string,
  type: UnitType,
  position: Hex
): { unit: any; stats: UnitStats; categories: UnitCategory[]; abilities: SpecialAbility[] } {
  const template = UNIT_DEFINITIONS[type];
  if (!template) {
    throw new Error(`Unknown unit type: ${type}`);
  }

  return {
    unit: {
      id,
      type: template.type,
      side: template.side,
      position,
    },
    stats: template.stats,
    categories: template.categories,
    abilities: template.specialAbilities,
  };
}

/**
 * Get unit template by type
 */
export function getUnitTemplate(type: UnitType): UnitTemplate {
  const template = UNIT_DEFINITIONS[type];
  if (!template) {
    throw new Error(`Unknown unit type: ${type}`);
  }
  return template;
}

/**
 * Get all unit types for a side
 */
export function getUnitTypesForSide(side: PlayerSide): UnitType[] {
  return Object.values(UnitType).filter(type => 
    UNIT_DEFINITIONS[type].side === side
  );
}

/**
 * Calculate total point cost for a list of unit types
 */
export function calculatePointCost(unitTypes: UnitType[]): number {
  return unitTypes.reduce((total, type) => {
    return total + UNIT_DEFINITIONS[type].stats.pointCost;
  }, 0);
}