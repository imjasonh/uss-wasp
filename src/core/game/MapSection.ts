/**
 * Map section system for modular map construction
 */

import { HexCoordinate } from '../hex';
import { TerrainType, ObjectiveType } from './types';

/**
 * Rotation angles for map sections
 */
export enum SectionRotation {
  NONE = 0,
  CLOCKWISE_60 = 60,
  CLOCKWISE_120 = 120,
  CLOCKWISE_180 = 180,
  CLOCKWISE_240 = 240,
  CLOCKWISE_300 = 300,
}

/**
 * Map section types for different tactical scenarios
 */
export enum MapSectionType {
  BEACH_LANDING = 'beach_landing',
  URBAN_SECTOR = 'urban_sector',
  HILL_COUNTRY = 'hill_country',
  FOREST_REGION = 'forest_region',
  COASTAL_WATER = 'coastal_water',
  INDUSTRIAL_ZONE = 'industrial_zone',
  RURAL_FARMLAND = 'rural_farmland',
  MOUNTAIN_PASS = 'mountain_pass',
}

/**
 * Map section size configurations
 */
export interface SectionDimensions {
  readonly width: number;
  readonly height: number;
}

/**
 * Standard section sizes
 */
export const SECTION_SIZES: Record<string, SectionDimensions> = {
  SMALL: { width: 4, height: 4 },
  MEDIUM: { width: 6, height: 6 },
  LARGE: { width: 8, height: 8 },
  RECTANGULAR: { width: 8, height: 4 },
};

/**
 * A hex definition within a map section
 */
export interface SectionHex {
  readonly offset: { q: number; r: number }; // Relative to section origin
  readonly terrain: TerrainType;
  readonly elevation: number;
  readonly features: string[];
  readonly objective?: {
    readonly type: ObjectiveType;
    readonly id: string;
  };
}

/**
 * A map section template that can be placed and rotated
 */
export interface MapSection {
  readonly id: string;
  readonly name: string;
  readonly type: MapSectionType;
  readonly dimensions: SectionDimensions;
  readonly description: string;
  readonly hexes: SectionHex[];
  readonly recommendedRotations: SectionRotation[];
  readonly compatibleWith: MapSectionType[];
  readonly metadata: {
    readonly author?: string;
    readonly difficulty: 'easy' | 'medium' | 'hard';
    readonly tacticalFocus: string[];
  };
}

/**
 * Placed map section with position and rotation
 */
export interface PlacedMapSection {
  readonly section: MapSection;
  readonly position: HexCoordinate; // Top-left corner of the section
  readonly rotation: SectionRotation;
}

/**
 * Map configuration using multiple sections
 */
export interface MapConfiguration {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly dimensions: SectionDimensions;
  readonly sections: PlacedMapSection[];
  readonly metadata: {
    readonly difficulty: 'easy' | 'medium' | 'hard';
    readonly recommendedPlayers: number;
    readonly estimatedDuration: number; // in minutes
  };
}

/**
 * Map section library for storing and managing sections
 */
export class MapSectionLibrary {
  private readonly sections: Map<string, MapSection>;
  private readonly configurations: Map<string, MapConfiguration>;

  public constructor() {
    this.sections = new Map();
    this.configurations = new Map();
    this.initializeDefaultSections();
    this.initializeDefaultConfigurations();
  }

  /**
   * Add a map section to the library
   */
  public addSection(section: MapSection): void {
    this.sections.set(section.id, section);
  }

  /**
   * Get a map section by ID
   */
  public getSection(id: string): MapSection | undefined {
    return this.sections.get(id);
  }

  /**
   * Get all sections of a specific type
   */
  public getSectionsByType(type: MapSectionType): MapSection[] {
    return Array.from(this.sections.values()).filter(section => section.type === type);
  }

  /**
   * Get all available sections
   */
  public getAllSections(): MapSection[] {
    return Array.from(this.sections.values());
  }

  /**
   * Add a map configuration to the library
   */
  public addConfiguration(config: MapConfiguration): void {
    this.configurations.set(config.id, config);
  }

  /**
   * Get a map configuration by ID
   */
  public getConfiguration(id: string): MapConfiguration | undefined {
    return this.configurations.get(id);
  }

  /**
   * Get all available configurations
   */
  public getAllConfigurations(): MapConfiguration[] {
    return Array.from(this.configurations.values());
  }

  /**
   * Initialize default map sections
   */
  private initializeDefaultSections(): void {
    // Beach Landing Section
    const beachLandingSection: MapSection = {
      id: 'beach_landing_01',
      name: 'Sandy Beach Landing',
      type: MapSectionType.BEACH_LANDING,
      dimensions: SECTION_SIZES.MEDIUM,
      description: 'Open beach with clear approach from water',
      hexes: [
        // Water hexes
        { offset: { q: 0, r: 0 }, terrain: TerrainType.DEEP_WATER, elevation: 0, features: [] },
        { offset: { q: 1, r: 0 }, terrain: TerrainType.DEEP_WATER, elevation: 0, features: [] },
        { offset: { q: 2, r: 0 }, terrain: TerrainType.SHALLOW_WATER, elevation: 0, features: [] },
        { offset: { q: 3, r: 0 }, terrain: TerrainType.SHALLOW_WATER, elevation: 0, features: [] },

        // Beach hexes
        { offset: { q: 0, r: 1 }, terrain: TerrainType.SHALLOW_WATER, elevation: 0, features: [] },
        {
          offset: { q: 1, r: 1 },
          terrain: TerrainType.BEACH,
          elevation: 0,
          features: ['landing_zone'],
        },
        {
          offset: { q: 2, r: 1 },
          terrain: TerrainType.BEACH,
          elevation: 0,
          features: ['landing_zone'],
        },
        { offset: { q: 3, r: 1 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },

        // Inland hexes
        { offset: { q: 0, r: 2 }, terrain: TerrainType.BEACH, elevation: 0, features: [] },
        { offset: { q: 1, r: 2 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 2, r: 2 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 3, r: 2 }, terrain: TerrainType.LIGHT_WOODS, elevation: 0, features: [] },

        // More inland
        { offset: { q: 0, r: 3 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 1, r: 3 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 2, r: 3 }, terrain: TerrainType.LIGHT_WOODS, elevation: 0, features: [] },
        { offset: { q: 3, r: 3 }, terrain: TerrainType.HILLS, elevation: 1, features: [] },
      ],
      recommendedRotations: [SectionRotation.NONE, SectionRotation.CLOCKWISE_180],
      compatibleWith: [MapSectionType.URBAN_SECTOR, MapSectionType.HILL_COUNTRY],
      metadata: {
        difficulty: 'easy',
        tacticalFocus: ['amphibious_assault', 'landing_operations'],
      },
    };

    // Urban Sector Section
    const urbanSectorSection: MapSection = {
      id: 'urban_sector_01',
      name: 'Downtown District',
      type: MapSectionType.URBAN_SECTOR,
      dimensions: SECTION_SIZES.MEDIUM,
      description: 'Dense urban area with buildings and cover',
      hexes: [
        // Urban grid
        { offset: { q: 0, r: 0 }, terrain: TerrainType.URBAN, elevation: 0, features: [] },
        { offset: { q: 1, r: 0 }, terrain: TerrainType.URBAN, elevation: 0, features: [] },
        { offset: { q: 2, r: 0 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 3, r: 0 }, terrain: TerrainType.URBAN, elevation: 0, features: [] },

        { offset: { q: 0, r: 1 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        {
          offset: { q: 1, r: 1 },
          terrain: TerrainType.URBAN,
          elevation: 0,
          features: [],
          objective: { type: ObjectiveType.CIVIC_CENTER, id: 'civic_center_01' },
        },
        { offset: { q: 2, r: 1 }, terrain: TerrainType.URBAN, elevation: 0, features: [] },
        { offset: { q: 3, r: 1 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },

        { offset: { q: 0, r: 2 }, terrain: TerrainType.URBAN, elevation: 0, features: [] },
        { offset: { q: 1, r: 2 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 2, r: 2 }, terrain: TerrainType.URBAN, elevation: 0, features: [] },
        { offset: { q: 3, r: 2 }, terrain: TerrainType.URBAN, elevation: 0, features: [] },

        { offset: { q: 0, r: 3 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 1, r: 3 }, terrain: TerrainType.URBAN, elevation: 0, features: [] },
        { offset: { q: 2, r: 3 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 3, r: 3 }, terrain: TerrainType.URBAN, elevation: 0, features: [] },
      ],
      recommendedRotations: [
        SectionRotation.NONE,
        SectionRotation.CLOCKWISE_60,
        SectionRotation.CLOCKWISE_180,
      ],
      compatibleWith: [MapSectionType.BEACH_LANDING, MapSectionType.INDUSTRIAL_ZONE],
      metadata: {
        difficulty: 'hard',
        tacticalFocus: ['urban_warfare', 'close_quarters_combat'],
      },
    };

    // Hill Country Section
    const hillCountrySection: MapSection = {
      id: 'hill_country_01',
      name: 'Rolling Hills',
      type: MapSectionType.HILL_COUNTRY,
      dimensions: SECTION_SIZES.MEDIUM,
      description: 'Elevated terrain with observation points',
      hexes: [
        // Hills and high ground
        { offset: { q: 0, r: 0 }, terrain: TerrainType.HILLS, elevation: 1, features: [] },
        { offset: { q: 1, r: 0 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 2, r: 0 }, terrain: TerrainType.HILLS, elevation: 2, features: [] },
        { offset: { q: 3, r: 0 }, terrain: TerrainType.HILLS, elevation: 1, features: [] },

        { offset: { q: 0, r: 1 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 1, r: 1 }, terrain: TerrainType.HILLS, elevation: 1, features: [] },
        {
          offset: { q: 2, r: 1 },
          terrain: TerrainType.HILLS,
          elevation: 2,
          features: [],
          objective: { type: ObjectiveType.HIGH_VALUE_TARGET, id: 'observation_post_01' },
        },
        { offset: { q: 3, r: 1 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },

        { offset: { q: 0, r: 2 }, terrain: TerrainType.HILLS, elevation: 1, features: [] },
        { offset: { q: 1, r: 2 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 2, r: 2 }, terrain: TerrainType.HILLS, elevation: 1, features: [] },
        { offset: { q: 3, r: 2 }, terrain: TerrainType.HILLS, elevation: 2, features: [] },

        { offset: { q: 0, r: 3 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 1, r: 3 }, terrain: TerrainType.HILLS, elevation: 1, features: [] },
        { offset: { q: 2, r: 3 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
        { offset: { q: 3, r: 3 }, terrain: TerrainType.HILLS, elevation: 1, features: [] },
      ],
      recommendedRotations: [
        SectionRotation.NONE,
        SectionRotation.CLOCKWISE_120,
        SectionRotation.CLOCKWISE_240,
      ],
      compatibleWith: [MapSectionType.BEACH_LANDING, MapSectionType.FOREST_REGION],
      metadata: {
        difficulty: 'medium',
        tacticalFocus: ['elevation_advantage', 'observation', 'artillery_support'],
      },
    };

    // Forest Region Section
    const forestRegionSection: MapSection = {
      id: 'forest_region_01',
      name: 'Dense Forest',
      type: MapSectionType.FOREST_REGION,
      dimensions: SECTION_SIZES.MEDIUM,
      description: 'Heavily wooded area with concealment',
      hexes: [
        // Forest layout
        { offset: { q: 0, r: 0 }, terrain: TerrainType.LIGHT_WOODS, elevation: 0, features: [] },
        { offset: { q: 1, r: 0 }, terrain: TerrainType.HEAVY_WOODS, elevation: 0, features: [] },
        { offset: { q: 2, r: 0 }, terrain: TerrainType.HEAVY_WOODS, elevation: 0, features: [] },
        { offset: { q: 3, r: 0 }, terrain: TerrainType.LIGHT_WOODS, elevation: 0, features: [] },

        { offset: { q: 0, r: 1 }, terrain: TerrainType.HEAVY_WOODS, elevation: 0, features: [] },
        { offset: { q: 1, r: 1 }, terrain: TerrainType.HEAVY_WOODS, elevation: 0, features: [] },
        {
          offset: { q: 2, r: 1 },
          terrain: TerrainType.CLEAR,
          elevation: 0,
          features: ['clearing'],
        },
        { offset: { q: 3, r: 1 }, terrain: TerrainType.HEAVY_WOODS, elevation: 0, features: [] },

        { offset: { q: 0, r: 2 }, terrain: TerrainType.LIGHT_WOODS, elevation: 0, features: [] },
        {
          offset: { q: 1, r: 2 },
          terrain: TerrainType.CLEAR,
          elevation: 0,
          features: ['clearing'],
        },
        { offset: { q: 2, r: 2 }, terrain: TerrainType.HEAVY_WOODS, elevation: 0, features: [] },
        { offset: { q: 3, r: 2 }, terrain: TerrainType.HEAVY_WOODS, elevation: 0, features: [] },

        { offset: { q: 0, r: 3 }, terrain: TerrainType.HEAVY_WOODS, elevation: 0, features: [] },
        { offset: { q: 1, r: 3 }, terrain: TerrainType.HEAVY_WOODS, elevation: 0, features: [] },
        { offset: { q: 2, r: 3 }, terrain: TerrainType.LIGHT_WOODS, elevation: 0, features: [] },
        { offset: { q: 3, r: 3 }, terrain: TerrainType.LIGHT_WOODS, elevation: 0, features: [] },
      ],
      recommendedRotations: [
        SectionRotation.NONE,
        SectionRotation.CLOCKWISE_60,
        SectionRotation.CLOCKWISE_180,
      ],
      compatibleWith: [MapSectionType.HILL_COUNTRY, MapSectionType.RURAL_FARMLAND],
      metadata: {
        difficulty: 'medium',
        tacticalFocus: ['stealth', 'concealment', 'ambush_tactics'],
      },
    };

    // Add sections to library
    this.addSection(beachLandingSection);
    this.addSection(urbanSectorSection);
    this.addSection(hillCountrySection);
    this.addSection(forestRegionSection);
  }

  /**
   * Initialize default map configurations
   */
  private initializeDefaultConfigurations(): void {
    // Basic Amphibious Assault configuration
    const basicAssault: MapConfiguration = {
      id: 'basic_assault',
      name: 'Basic Amphibious Assault',
      description: 'Standard beach landing with urban objective',
      dimensions: { width: 12, height: 6 },
      sections: [
        {
          section: this.getSection('beach_landing_01') as MapSection,
          position: { q: 0, r: 0, s: 0 },
          rotation: SectionRotation.NONE,
        },
        {
          section: this.getSection('urban_sector_01') as MapSection,
          position: { q: 6, r: 0, s: -6 },
          rotation: SectionRotation.NONE,
        },
      ],
      metadata: {
        difficulty: 'easy',
        recommendedPlayers: 2,
        estimatedDuration: 45,
      },
    };

    // Complex Multi-terrain configuration
    const complexTerrain: MapConfiguration = {
      id: 'complex_terrain',
      name: 'Multi-Terrain Operations',
      description: 'Varied terrain with multiple tactical challenges',
      dimensions: { width: 12, height: 12 },
      sections: [
        {
          section: this.getSection('beach_landing_01') as MapSection,
          position: { q: 0, r: 0, s: 0 },
          rotation: SectionRotation.NONE,
        },
        {
          section: this.getSection('hill_country_01') as MapSection,
          position: { q: 6, r: 0, s: -6 },
          rotation: SectionRotation.CLOCKWISE_60,
        },
        {
          section: this.getSection('forest_region_01') as MapSection,
          position: { q: 0, r: 6, s: -6 },
          rotation: SectionRotation.NONE,
        },
        {
          section: this.getSection('urban_sector_01') as MapSection,
          position: { q: 6, r: 6, s: -12 },
          rotation: SectionRotation.CLOCKWISE_180,
        },
      ],
      metadata: {
        difficulty: 'hard',
        recommendedPlayers: 2,
        estimatedDuration: 90,
      },
    };

    // Add configurations to library
    this.addConfiguration(basicAssault);
    this.addConfiguration(complexTerrain);
  }
}
