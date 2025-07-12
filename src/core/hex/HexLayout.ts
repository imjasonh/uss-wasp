/**
 * Hex layout and pixel conversion utilities
 */

import { Hex, HexCoordinate } from './Hex';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}


export interface Orientation {
  readonly f0: number;
  readonly f1: number;
  readonly f2: number;
  readonly f3: number;
  readonly b0: number;
  readonly b1: number;
  readonly b2: number;
  readonly b3: number;
  readonly startAngle: number;
}

/**
 * Pointy-top orientation (default for most hex games)
 */
export const POINTY_TOP_ORIENTATION: Orientation = {
  f0: Math.sqrt(3.0),
  f1: Math.sqrt(3.0) / 2.0,
  f2: 0.0,
  f3: 3.0 / 2.0,
  b0: Math.sqrt(3.0) / 3.0,
  b1: -1.0 / 3.0,
  b2: 0.0,
  b3: 2.0 / 3.0,
  startAngle: 0.5,
};

/**
 * Flat-top orientation
 */
export const FLAT_TOP_ORIENTATION: Orientation = {
  f0: 3.0 / 2.0,
  f1: 0.0,
  f2: Math.sqrt(3.0) / 2.0,
  f3: Math.sqrt(3.0),
  b0: 2.0 / 3.0,
  b1: 0.0,
  b2: -1.0 / 3.0,
  b3: Math.sqrt(3.0) / 3.0,
  startAngle: 0.0,
};

export class HexLayout {
  constructor(
    public readonly orientation: Orientation,
    public readonly size: Size,
    public readonly origin: Point
  ) {}

  /**
   * Convert hex coordinates to pixel coordinates
   */
  hexToPixel(hex: HexCoordinate): Point {
    const M = this.orientation;
    const x = (M.f0 * hex.q + M.f1 * hex.r) * this.size.width;
    const y = (M.f2 * hex.q + M.f3 * hex.r) * this.size.height;
    return {
      x: x + this.origin.x,
      y: y + this.origin.y,
    };
  }

  /**
   * Convert pixel coordinates to hex coordinates
   */
  pixelToHex(point: Point): Hex {
    const M = this.orientation;
    const pt = {
      x: (point.x - this.origin.x) / this.size.width,
      y: (point.y - this.origin.y) / this.size.height,
    };
    const q = M.b0 * pt.x + M.b1 * pt.y;
    const r = M.b2 * pt.x + M.b3 * pt.y;
    return this.roundHex(q, r, -q - r);
  }

  /**
   * Round fractional hex coordinates to nearest hex
   */
  private roundHex(q: number, r: number, s: number): Hex {
    let rq = Math.round(q);
    let rr = Math.round(r);
    let rs = Math.round(s);

    const qDiff = Math.abs(rq - q);
    const rDiff = Math.abs(rr - r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    } else {
      rs = -rq - rr;
    }

    return new Hex(rq, rr, rs);
  }

  /**
   * Get the polygon corners of a hex in pixel coordinates
   */
  hexCorners(hex: HexCoordinate): Point[] {
    const corners: Point[] = [];
    const center = this.hexToPixel(hex);
    
    for (let i = 0; i < 6; i++) {
      const angle = 2.0 * Math.PI * (this.orientation.startAngle - i) / 6.0;
      corners.push({
        x: center.x + this.size.width * Math.cos(angle),
        y: center.y + this.size.height * Math.sin(angle),
      });
    }
    
    return corners;
  }

  /**
   * Get bounding rectangle that contains all given hexes
   */
  getBounds(hexes: HexCoordinate[]): { min: Point; max: Point } {
    if (hexes.length === 0) {
      return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
    }

    const pixels = hexes.map(hex => this.hexToPixel(hex));
    let minX = pixels[0].x;
    let maxX = pixels[0].x;
    let minY = pixels[0].y;
    let maxY = pixels[0].y;

    for (const pixel of pixels) {
      minX = Math.min(minX, pixel.x);
      maxX = Math.max(maxX, pixel.x);
      minY = Math.min(minY, pixel.y);
      maxY = Math.max(maxY, pixel.y);
    }

    // Add hex size to account for hex radius
    const margin = Math.max(this.size.width, this.size.height);
    return {
      min: { x: minX - margin, y: minY - margin },
      max: { x: maxX + margin, y: maxY + margin },
    };
  }
}
