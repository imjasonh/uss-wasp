# USS Wasp Test Suite Organization

This directory contains all test and debug files for the USS Wasp: Operation Beachhead Inferno project, organized by purpose and functionality.

## Directory Structure

### 📁 `ai/`
AI system tests and validation
- `test-ai.js` - Basic AI functionality tests
- `test-ai-system-gaps.js` - AI system gap analysis (CI-critical)
- `test-ai-battle-series.js` - AI vs AI battle series (CI-critical)  
- `run-comprehensive-ai-test.js` - Full AI validation suite (CI-critical)
- `run-ai-battle-series.js` - AI battle series runner

### 📁 `combat/`
Combat system validation and mechanics testing
- `combat-test.js` - Core combat system tests
- `test-direct-combat.js` - Direct combat validation (CI-critical)
- `test-close-combat.js` - Close combat mechanics (CI-critical)
- `multi-turn-combat-test.js` - Multi-turn combat scenarios
- `quick-engagement-test.js` - Quick combat engagement tests

### 📁 `core/`
Core game system tests (pathfinding, logging, balance)
- `test-pathfinding-core.js` - Pathfinding system tests (CI-critical)
- `balance-test.js` - Game balance analysis
- `test-logging-system.js` - Comprehensive logging system tests

### 📁 `simulation/`
Full game simulations and performance benchmarks
- `quick-battle-test.js` - Quick AI validation (CI-critical)
- `run-full-game-simulation.js` - Complete game simulations (CI-critical)
- `run-optimized-battles.js` - Optimized battle scenarios
- `run-final-championship.js` - Championship battle series

### 📁 `debug/`
Debug utilities and diagnostic tools
- `debug-ai-movement.js` - AI movement debugging
- `debug-combat-decisions.js` - Combat decision analysis
- `debug-aa-targeting.js` - Anti-air targeting debug
- `debug-aa-engagement.js` - Anti-air engagement debug
- `debug-aa-full-flow.js` - Full anti-air flow debug
- `debug-coordinate-system.js` - Coordinate system debugging
- `debug-edge-cases.js` - Edge case analysis
- `debug-gameengine-pathfinding.js` - GameEngine pathfinding debug
- `debug-manual-gameengine.js` - Manual GameEngine testing
- `debug-pathfinding.js` - Pathfinding system debugging
- `coordinate-debug.js` - Coordinate debugging utilities
- `pathfinding-debug.js` - Pathfinding diagnostic tools

## CI Integration

The following test files are critical for CI/CD pipelines and are referenced in GitHub Actions workflows:

### Main CI (`ci.yml`)
- `tests/simulation/quick-battle-test.js` - Quick AI validation

### AI Tests (`ai-tests.yml`)
- `tests/ai/test-ai-system-gaps.js` - AI system gap analysis
- `tests/ai/test-ai-battle-series.js` - AI battle series tests
- `tests/ai/run-comprehensive-ai-test.js` - Comprehensive AI validation
- `tests/simulation/quick-battle-test.js` - Performance benchmarks
- `tests/combat/test-direct-combat.js` - Combat mechanics validation
- `tests/combat/test-close-combat.js` - Close combat validation
- `tests/core/test-pathfinding-core.js` - Pathfinding validation
- `tests/simulation/run-full-game-simulation.js` - Full game simulations

## Usage

### Running Specific Test Categories

```bash
# AI system tests
node tests/ai/run-comprehensive-ai-test.js

# Combat validation
node tests/combat/test-direct-combat.js

# Core system tests  
node tests/core/test-pathfinding-core.js

# Quick simulation
node tests/simulation/quick-battle-test.js

# Debug tools
node tests/debug/debug-ai-movement.js
```

### NPM Scripts

The following NPM scripts are available for test execution:

```bash
npm run test:ai    # Runs comprehensive AI test suite
```

## File Migration Notes

All test files have been moved from the root directory and organized by functionality. Relative import paths have been updated to point to `../../dist/` to maintain compatibility with the compiled TypeScript modules.

This organization improves:
- **Project cleanliness** - Root directory is no longer cluttered
- **Developer navigation** - Easy to find tests by category
- **CI maintenance** - Clear separation of critical vs development tools
- **Onboarding** - New developers can quickly understand test structure