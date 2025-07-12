/**
 * Hexagon coordinate system implementation
 * Based on Redblobgames hex grid algorithms
 * Using cube coordinates (q, r, s) where q + r + s = 0
 */

export interface HexCoordinate {
  readonly q: number;
  readonly r: number;
  readonly s: number;
}

export class Hex implements HexCoordinate {
  constructor(
    public readonly q: number,
    public readonly r: number,
    public readonly s: number = -q - r
  ) {
    if (Math.abs(q + r + s) > Number.EPSILON) {
      throw new Error(`Invalid hex coordinates: q=${q}, r=${r}, s=${s}. Must satisfy q + r + s = 0`);
    }
  }

  /**
   * Create a hex from axial coordinates (q, r)
   */
  static fromAxial(q: number, r: number): Hex {
    return new Hex(q, r, -q - r);
  }

  /**
   * Create a hex from offset coordinates (col, row)
   * Assumes odd-q vertical layout
   */
  static fromOffset(col: number, row: number): Hex {
    const q = col;
    const r = row - (col - (col & 1)) / 2;
    return new Hex(q, r);
  }

  /**
   * Convert to offset coordinates (col, row)
   * Returns odd-q vertical layout
   */
  toOffset(): { col: number; row: number } {
    const col = this.q;
    const row = this.r + (this.q - (this.q & 1)) / 2;
    return { col, row };
  }

  /**
   * Add two hexes
   */
  add(other: HexCoordinate): Hex {
    return new Hex(this.q + other.q, this.r + other.r, this.s + other.s);
  }

  /**
   * Subtract two hexes
   */
  subtract(other: HexCoordinate): Hex {
    return new Hex(this.q - other.q, this.r - other.r, this.s - other.s);
  }

  /**
   * Scale a hex by a factor
   */
  scale(factor: number): Hex {
    return new Hex(this.q * factor, this.r * factor, this.s * factor);
  }

  /**
   * Calculate distance between two hexes
   */
  distanceTo(other: HexCoordinate): number {
    return (Math.abs(this.q - other.q) + Math.abs(this.r - other.r) + Math.abs(this.s - other.s)) / 2;
  }

  /**
   * Check if two hexes are equal
   */
  equals(other: HexCoordinate): boolean {
    return this.q === other.q && this.r === other.r && this.s === other.s;
  }

  /**
   * Get all six neighbors of this hex
   */
  neighbors(): Hex[] {
    return HEX_DIRECTIONS.map(direction => this.add(direction));
  }

  /**
   * Get neighbor in specific direction (0-5)
   */
  neighbor(direction: number): Hex {
    if (direction < 0 || direction >= 6) {
      throw new Error(`Invalid direction: ${direction}. Must be 0-5`);
    }
    return this.add(HEX_DIRECTIONS[direction]);
  }

  /**
   * Get all hexes within a certain range
   */
  range(range: number): Hex[] {
    const results: Hex[] = [];
    for (let q = -range; q <= range; q++) {
      const r1 = Math.max(-range, -q - range);
      const r2 = Math.min(range, -q + range);
      for (let r = r1; r <= r2; r++) {
        results.push(this.add(new Hex(q, r)));
      }
    }
    return results;
  }

  /**
   * Get ring of hexes at exact distance
   */
  ring(radius: number): Hex[] {
    if (radius === 0) {
      return [this];
    }
    
    const results: Hex[] = [];
    let hex = this.add(HEX_DIRECTIONS[4].scale(radius)); // Start at bottom-left
    
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < radius; j++) {
        results.push(hex);
        hex = hex.neighbor(i);
      }
    }
    
    return results;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Hex(${this.q}, ${this.r}, ${this.s})`;
  }

  /**
   * Convert to unique string key for maps/sets
   */
  toKey(): string {
    return `${this.q},${this.r}`;
  }
}

/**
 * The six hex directions in cube coordinates
 */
export const HEX_DIRECTIONS: readonly Hex[] = [
  new Hex(1, 0, -1),   // East
  new Hex(1, -1, 0),   // Northeast  
  new Hex(0, -1, 1),   // Northwest
  new Hex(-1, 0, 1),   // West
  new Hex(-1, 1, 0),   // Southwest
  new Hex(0, 1, -1),   // Southeast
] as const;

/**
 * Hex direction names
 */
export enum HexDirection {
  East = 0,
  Northeast = 1,
  Northwest = 2,
  West = 3,
  Southwest = 4,
  Southeast = 5,
}