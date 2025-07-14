/**
 * Map builder for constructing maps from modular sections
 */

import { Hex, HexCoordinate } from '../hex';
import { GameMap } from './Map';
import { TerrainType } from './types';
import {
  MapSection,
  PlacedMapSection,
  MapConfiguration,
  SectionRotation,
  SectionHex,
} from './MapSection';

/**
 * Result of map building operation
 */
export interface MapBuildResult {
  readonly success: boolean;
  readonly map?: GameMap;
  readonly errors: string[];
  readonly warnings: string[];
}

/**
 * Map builder for constructing maps from sections
 */
export class MapBuilder {
  /**
   * Build a map from a configuration
   */
  public static buildFromConfiguration(config: MapConfiguration): MapBuildResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Create empty map with configuration dimensions
      const map = new GameMap(config.dimensions.width, config.dimensions.height);

      // Clear default terrain (we'll fill it from sections)
      MapBuilder.clearMap(map);

      // Place each section
      for (const placedSection of config.sections) {
        const result = MapBuilder.placeSection(map, placedSection);
        if (!result.success) {
          errors.push(...result.errors);
        }
        warnings.push(...result.warnings);
      }

      if (errors.length > 0) {
        return { success: false, errors, warnings };
      }

      return { success: true, map, errors, warnings };
    } catch (error) {
      return {
        success: false,
        errors: [`Failed to build map: ${error instanceof Error ? error.message : String(error)}`],
        warnings,
      };
    }
  }

  /**
   * Place a section on the map
   */
  public static placeSection(map: GameMap, placedSection: PlacedMapSection): MapBuildResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Transform section hexes based on position and rotation
      const transformedHexes = MapBuilder.transformSectionHexes(
        placedSection.section,
        placedSection.position,
        placedSection.rotation
      );

      // Place each hex on the map
      for (const { hex, sectionHex } of transformedHexes) {
        // Validate hex is within map bounds
        if (!map.isValidHex(hex)) {
          errors.push(`Section hex at (${hex.q}, ${hex.r}) is outside map bounds`);
          continue;
        }

        // Set terrain
        map.setTerrain(hex, sectionHex.terrain);

        // Set elevation
        map.setElevation(hex, sectionHex.elevation);

        // Add objective if present
        if (sectionHex.objective) {
          map.addObjective(hex, sectionHex.objective.type, sectionHex.objective.id);
        }

        // Note: Features are stored in the section hex but could be processed here
        // if needed for additional map functionality
      }

      return { success: true, map, errors, warnings };
    } catch (error) {
      return {
        success: false,
        errors: [
          `Failed to place section: ${error instanceof Error ? error.message : String(error)}`,
        ],
        warnings,
      };
    }
  }

  /**
   * Transform section hexes based on position and rotation
   */
  private static transformSectionHexes(
    section: MapSection,
    position: HexCoordinate,
    rotation: SectionRotation
  ): Array<{ hex: Hex; sectionHex: SectionHex }> {
    const transformedHexes: Array<{ hex: Hex; sectionHex: SectionHex }> = [];
    const positionHex = new Hex(position.q, position.r, position.s);

    for (const sectionHex of section.hexes) {
      // Convert section offset to hex coordinate
      const offsetHex = Hex.fromOffset(sectionHex.offset.q, sectionHex.offset.r);

      // Apply rotation
      const rotatedHex = MapBuilder.rotateHex(offsetHex, rotation);

      // Apply position offset
      const finalHex = positionHex.add(rotatedHex);

      transformedHexes.push({ hex: finalHex, sectionHex });
    }

    return transformedHexes;
  }

  /**
   * Rotate a hex coordinate by the specified rotation
   */
  private static rotateHex(hex: Hex, rotation: SectionRotation): Hex {
    // Convert degrees to number of 60-degree rotations
    const rotations = Math.floor(rotation / 60) % 6;

    let rotatedHex = hex;
    for (let i = 0; i < rotations; i++) {
      rotatedHex = MapBuilder.rotateHex60(rotatedHex);
    }

    return rotatedHex;
  }

  /**
   * Rotate a hex coordinate by 60 degrees clockwise
   */
  private static rotateHex60(hex: Hex): Hex {
    // 60-degree clockwise rotation: (q, r, s) -> (-s, -q, -r)
    return new Hex(-hex.s, -hex.q, -hex.r);
  }

  /**
   * Clear map terrain to default (clear)
   */
  private static clearMap(map: GameMap): void {
    const dimensions = map.getDimensions();
    for (let q = 0; q < dimensions.width; q++) {
      for (let r = 0; r < dimensions.height; r++) {
        const hex = Hex.fromOffset(q, r);
        map.setTerrain(hex, TerrainType.CLEAR);
      }
    }
  }

  /**
   * Validate that a configuration is valid
   */
  public static validateConfiguration(config: MapConfiguration): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check that all sections fit within map bounds
    for (const placedSection of config.sections) {
      const sectionBounds = MapBuilder.calculateSectionBounds(placedSection);

      if (
        sectionBounds.maxQ >= config.dimensions.width ||
        sectionBounds.maxR >= config.dimensions.height ||
        sectionBounds.minQ < 0 ||
        sectionBounds.minR < 0
      ) {
        errors.push(`Section ${placedSection.section.name} extends outside map bounds`);
      }
    }

    // Check for overlapping sections (warning, not error)
    const overlaps = MapBuilder.findSectionOverlaps(config.sections);
    if (overlaps.length > 0) {
      errors.push(`Found ${overlaps.length} overlapping section pairs`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Calculate the bounding box of a placed section
   */
  private static calculateSectionBounds(placedSection: PlacedMapSection): {
    minQ: number;
    maxQ: number;
    minR: number;
    maxR: number;
  } {
    const transformedHexes = MapBuilder.transformSectionHexes(
      placedSection.section,
      placedSection.position,
      placedSection.rotation
    );

    let minQ = Infinity;
    let maxQ = -Infinity;
    let minR = Infinity;
    let maxR = -Infinity;

    for (const { hex } of transformedHexes) {
      minQ = Math.min(minQ, hex.q);
      maxQ = Math.max(maxQ, hex.q);
      minR = Math.min(minR, hex.r);
      maxR = Math.max(maxR, hex.r);
    }

    return { minQ, maxQ, minR, maxR };
  }

  /**
   * Find overlapping sections
   */
  private static findSectionOverlaps(sections: PlacedMapSection[]): Array<{
    section1: PlacedMapSection;
    section2: PlacedMapSection;
    overlappingHexes: Hex[];
  }> {
    const overlaps: Array<{
      section1: PlacedMapSection;
      section2: PlacedMapSection;
      overlappingHexes: Hex[];
    }> = [];

    for (let i = 0; i < sections.length; i++) {
      for (let j = i + 1; j < sections.length; j++) {
        const section1 = sections[i];
        const section2 = sections[j];

        const hexes1 = MapBuilder.transformSectionHexes(
          section1.section,
          section1.position,
          section1.rotation
        );
        const hexes2 = MapBuilder.transformSectionHexes(
          section2.section,
          section2.position,
          section2.rotation
        );

        const overlappingHexes: Hex[] = [];
        for (const { hex: hex1 } of hexes1) {
          for (const { hex: hex2 } of hexes2) {
            if (hex1.equals(hex2)) {
              overlappingHexes.push(hex1);
            }
          }
        }

        if (overlappingHexes.length > 0) {
          overlaps.push({ section1, section2, overlappingHexes });
        }
      }
    }

    return overlaps;
  }

  /**
   * Create a preview of section placement without building the full map
   */
  public static previewSectionPlacement(
    section: MapSection,
    position: HexCoordinate,
    rotation: SectionRotation,
    mapDimensions: { width: number; height: number }
  ): { hexes: Array<{ hex: Hex; terrain: TerrainType }>; valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const hexes: Array<{ hex: Hex; terrain: TerrainType }> = [];

    try {
      const transformedHexes = MapBuilder.transformSectionHexes(section, position, rotation);

      for (const { hex, sectionHex } of transformedHexes) {
        // Check bounds
        if (
          hex.q < 0 ||
          hex.q >= mapDimensions.width ||
          hex.r < 0 ||
          hex.r >= mapDimensions.height
        ) {
          errors.push(`Hex at (${hex.q}, ${hex.r}) is outside map bounds`);
        }

        hexes.push({ hex, terrain: sectionHex.terrain });
      }

      return { hexes, valid: errors.length === 0, errors };
    } catch (error) {
      return {
        hexes: [],
        valid: false,
        errors: [`Preview failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }
}
