/**
 * Tests for hex grid utilities
 */

import { Hex, HexDirection } from '../core/hex/Hex';
import { HexLayout, POINTY_TOP_ORIENTATION } from '../core/hex/HexLayout';
import { findPath, hexLineDraw, hasLineOfSight } from '../core/hex/HexPath';

describe('Hex', () => {
  describe('constructor', () => {
    it('should create valid hex coordinates', () => {
      const hex = new Hex(1, -1, 0);
      expect(hex.q).toBe(1);
      expect(hex.r).toBe(-1);
      expect(hex.s).toBe(0);
    });

    it('should throw error for invalid coordinates', () => {
      expect(() => new Hex(1, 1, 1)).toThrow();
    });

    it('should auto-calculate s when not provided', () => {
      const hex = new Hex(2, -1);
      expect(hex.s).toBe(-1);
    });
  });

  describe('fromAxial', () => {
    it('should create hex from axial coordinates', () => {
      const hex = Hex.fromAxial(1, -1);
      expect(hex.q).toBe(1);
      expect(hex.r).toBe(-1);
      expect(hex.s).toBe(0);
    });
  });

  describe('distance', () => {
    it('should calculate distance correctly', () => {
      const a = new Hex(0, 0, 0);
      const b = new Hex(3, -3, 0);
      expect(a.distanceTo(b)).toBe(3);
    });

    it('should return 0 for same hex', () => {
      const hex = new Hex(1, -1, 0);
      expect(hex.distanceTo(hex)).toBe(0);
    });
  });

  describe('neighbors', () => {
    it('should return 6 neighbors', () => {
      const hex = new Hex(0, 0, 0);
      const neighbors = hex.neighbors();
      expect(neighbors).toHaveLength(6);
    });

    it('should return correct neighbor directions', () => {
      const hex = new Hex(0, 0, 0);
      const east = hex.neighbor(HexDirection.East);
      expect(east.equals(new Hex(1, 0, -1))).toBe(true);
    });
  });

  describe('add and subtract', () => {
    it('should add hexes correctly', () => {
      const a = new Hex(1, -1, 0);
      const b = new Hex(0, 1, -1);
      const result = a.add(b);
      expect(result.equals(new Hex(1, 0, -1))).toBe(true);
    });

    it('should subtract hexes correctly', () => {
      const a = new Hex(1, 0, -1);
      const b = new Hex(0, 1, -1);
      const result = a.subtract(b);
      expect(result.equals(new Hex(1, -1, 0))).toBe(true);
    });
  });

  describe('range', () => {
    it('should return single hex for range 0', () => {
      const hex = new Hex(0, 0, 0);
      const range = hex.range(0);
      expect(range).toHaveLength(1);
      expect(range[0].equals(hex)).toBe(true);
    });

    it('should return correct number of hexes for range 1', () => {
      const hex = new Hex(0, 0, 0);
      const range = hex.range(1);
      expect(range).toHaveLength(7); // center + 6 neighbors
    });
  });
});

describe('HexLayout', () => {
  const layout = new HexLayout(POINTY_TOP_ORIENTATION, { width: 10, height: 10 }, { x: 0, y: 0 });

  describe('hexToPixel and pixelToHex', () => {
    it('should convert hex to pixel and back', () => {
      const originalHex = new Hex(1, -1, 0);
      const pixel = layout.hexToPixel(originalHex);
      const convertedHex = layout.pixelToHex(pixel);
      expect(convertedHex.equals(originalHex)).toBe(true);
    });
  });

  describe('hexCorners', () => {
    it('should return 6 corners', () => {
      const hex = new Hex(0, 0, 0);
      const corners = layout.hexCorners(hex);
      expect(corners).toHaveLength(6);
    });
  });
});

describe('HexPath', () => {
  describe('hexLineDraw', () => {
    it('should draw line between adjacent hexes', () => {
      const start = new Hex(0, 0, 0);
      const end = new Hex(1, 0, -1);
      const line = hexLineDraw(start, end);
      expect(line).toHaveLength(2);
      expect(line[0].equals(start)).toBe(true);
      expect(line[1].equals(end)).toBe(true);
    });

    it('should draw line for same hex', () => {
      const hex = new Hex(0, 0, 0);
      const line = hexLineDraw(hex, hex);
      expect(line).toHaveLength(1);
      expect(line[0].equals(hex)).toBe(true);
    });
  });

  describe('findPath', () => {
    it('should find path between adjacent hexes', () => {
      const start = new Hex(0, 0, 0);
      const end = new Hex(1, 0, -1);
      const path = findPath(start, end, {
        getCost: () => 1, // All moves cost 1
      });
      expect(path).toHaveLength(2);
      expect(path[0].equals(start)).toBe(true);
      expect(path[1].equals(end)).toBe(true);
    });

    it('should return empty array when no path exists', () => {
      const start = new Hex(0, 0, 0);
      const end = new Hex(1, 0, -1);
      const path = findPath(start, end, {
        getCost: () => Infinity, // All moves impossible
      });
      expect(path).toHaveLength(0);
    });

    it('should return single hex for same start and end', () => {
      const hex = new Hex(0, 0, 0);
      const path = findPath(hex, hex, {
        getCost: () => 1,
      });
      expect(path).toHaveLength(1);
      expect(path[0].equals(hex)).toBe(true);
    });
  });

  describe('hasLineOfSight', () => {
    it('should return true for adjacent hexes', () => {
      const start = new Hex(0, 0, 0);
      const end = new Hex(1, 0, -1);
      const hasLOS = hasLineOfSight(start, end, () => false);
      expect(hasLOS).toBe(true);
    });

    it('should return false when blocked', () => {
      const start = new Hex(0, 0, 0);
      const end = new Hex(2, 0, -2);
      const blocker = new Hex(1, 0, -1);
      const hasLOS = hasLineOfSight(start, end, hex =>
        new Hex(hex.q, hex.r, hex.s).equals(blocker)
      );
      expect(hasLOS).toBe(false);
    });
  });
});
