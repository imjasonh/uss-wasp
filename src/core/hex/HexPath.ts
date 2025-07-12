/**
 * Pathfinding and line-of-sight utilities for hex grids
 */

import { Hex, HexCoordinate } from './Hex';

/**
 * Calculate line of hexes between two points
 * Uses linear interpolation
 */
export function hexLineDraw(start: HexCoordinate, end: HexCoordinate): Hex[] {
  const distance = new Hex(start.q, start.r, start.s).distanceTo(end);
  const results: Hex[] = [];
  
  for (let i = 0; i <= distance; i++) {
    const t = distance === 0 ? 0 : i / distance;
    results.push(hexLerp(start, end, t));
  }
  
  return results;
}

/**
 * Linear interpolation between two hex coordinates
 */
function hexLerp(start: HexCoordinate, end: HexCoordinate, t: number): Hex {
  const q = lerp(start.q, end.q, t);
  const r = lerp(start.r, end.r, t);
  const s = lerp(start.s, end.s, t);
  return hexRound(q, r, s);
}

/**
 * Linear interpolation between two numbers
 */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Round fractional hex coordinates to nearest valid hex
 */
function hexRound(q: number, r: number, s: number): Hex {
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
 * A* pathfinding algorithm for hex grids
 */
export interface PathfindingOptions {
  /**
   * Function to calculate movement cost from one hex to another
   * Return Infinity or negative value to indicate impassable terrain
   */
  getCost: (from: HexCoordinate, to: HexCoordinate) => number;
  
  /**
   * Heuristic function for A* (defaults to hex distance)
   */
  heuristic?: (from: HexCoordinate, to: HexCoordinate) => number;
  
  /**
   * Maximum search distance (prevents infinite loops)
   */
  maxDistance?: number;
}

export interface PathNode {
  hex: Hex;
  gCost: number;  // Cost from start
  hCost: number;  // Heuristic cost to end
  fCost: number;  // Total cost (g + h)
  parent?: PathNode;
}

/**
 * Find optimal path between two hexes using A* algorithm
 */
export function findPath(
  start: HexCoordinate, 
  end: HexCoordinate, 
  options: PathfindingOptions
): Hex[] {
  const { getCost, heuristic = defaultHeuristic, maxDistance = 50 } = options;
  
  const startHex = new Hex(start.q, start.r, start.s);
  const endHex = new Hex(end.q, end.r, end.s);
  
  if (startHex.equals(endHex)) {
    return [startHex];
  }
  
  const openSet = new Map<string, PathNode>();
  const closedSet = new Set<string>();
  
  const startNode: PathNode = {
    hex: startHex,
    gCost: 0,
    hCost: heuristic(startHex, endHex),
    fCost: 0,
  };
  startNode.fCost = startNode.gCost + startNode.hCost;
  
  openSet.set(startHex.toKey(), startNode);
  
  while (openSet.size > 0) {
    // Find node with lowest fCost
    let current: PathNode | undefined;
    let lowestFCost = Infinity;
    
    for (const node of openSet.values()) {
      if (node.fCost < lowestFCost) {
        lowestFCost = node.fCost;
        current = node;
      }
    }
    
    if (!current) break;
    
    const currentKey = current.hex.toKey();
    openSet.delete(currentKey);
    closedSet.add(currentKey);
    
    // Check if we reached the end
    if (current.hex.equals(endHex)) {
      return reconstructPath(current);
    }
    
    // Check distance limit
    if (current.gCost >= maxDistance) {
      continue;
    }
    
    // Check all neighbors
    for (const neighbor of current.hex.neighbors()) {
      const neighborKey = neighbor.toKey();
      
      if (closedSet.has(neighborKey)) {
        continue;
      }
      
      const moveCost = getCost(current.hex, neighbor);
      if (moveCost <= 0 || !isFinite(moveCost)) {
        continue; // Impassable terrain
      }
      
      const tentativeGCost = current.gCost + moveCost;
      const existingNode = openSet.get(neighborKey);
      
      if (!existingNode || tentativeGCost < existingNode.gCost) {
        const neighborNode: PathNode = {
          hex: neighbor,
          gCost: tentativeGCost,
          hCost: heuristic(neighbor, endHex),
          fCost: 0,
          parent: current,
        };
        neighborNode.fCost = neighborNode.gCost + neighborNode.hCost;
        
        openSet.set(neighborKey, neighborNode);
      }
    }
  }
  
  // No path found
  return [];
}

/**
 * Reconstruct path from end node by following parent links
 */
function reconstructPath(endNode: PathNode): Hex[] {
  const path: Hex[] = [];
  let current: PathNode | undefined = endNode;
  
  while (current) {
    path.unshift(current.hex);
    current = current.parent;
  }
  
  return path;
}

/**
 * Default heuristic function (hex distance)
 */
function defaultHeuristic(from: HexCoordinate, to: HexCoordinate): number {
  return new Hex(from.q, from.r, from.s).distanceTo(to);
}

/**
 * Check if there's a clear line of sight between two hexes
 */
export function hasLineOfSight(
  start: HexCoordinate,
  end: HexCoordinate,
  isBlocked: (hex: HexCoordinate) => boolean
): boolean {
  const line = hexLineDraw(start, end);
  
  // Skip start and end hexes when checking for blockers
  for (let i = 1; i < line.length - 1; i++) {
    if (isBlocked(line[i])) {
      return false;
    }
  }
  
  return true;
}

/**
 * Get all hexes visible from a given position
 */
export function getVisibleHexes(
  origin: HexCoordinate,
  range: number,
  isBlocked: (hex: HexCoordinate) => boolean
): Hex[] {
  const visible: Hex[] = [];
  const originHex = new Hex(origin.q, origin.r, origin.s);
  
  // Check all hexes within range
  for (const hex of originHex.range(range)) {
    if (hasLineOfSight(origin, hex, isBlocked)) {
      visible.push(hex);
    }
  }
  
  return visible;
}