# AI Testing and Validation Guide

This document outlines the AI testing framework for preventing regressions and ensuring system stability.

## Test Types

### 1. Strict Validation Test 🚨

**Purpose**: Zero-tolerance validation for action failures  
**Command**: `npm run test:ai:strict`  
**Location**: `tests/ai/test-ai-strict.js`

This test enforces that ALL AI actions must succeed. Any action failure causes the test to fail with exit code 1.

**Current Status**: ❌ FAILING (59% action failure rate)
- 10 failures out of 17 total actions
- Must be fixed before AI system can be considered stable

**Failure Categories**:
- "Unit does not have this ability" (6 failures) 
- "Unknown special ability" (3 failures)
- "No valid path to target" (1 failure)

### 2. Gap Analysis Test 📊

**Purpose**: Feature completeness validation  
**Command**: `node tests/ai/test-ai-system-gaps.js`  
**Location**: `tests/ai/test-ai-system-gaps.js`

This test validates that AI subsystems are implemented and can generate decisions.

**Current Status**: ✅ PASSING (100% feature coverage)
- But ignores action failures, which is why strict validation is needed

### 3. Combat Validation Test ⚔️

**Purpose**: Tactical behavior validation  
**Command**: `node tests/combat/test-direct-combat.js`  
**Location**: `tests/combat/test-direct-combat.js`

This test validates AI combat decision making and unit interactions.

## Development Workflow

### For Pull Requests

1. **Required**: `npm run test:ai:strict` must pass (exit code 0)
2. **Recommended**: `npm run test:ai` for comprehensive feature validation
3. **Optional**: Manual combat testing for behavioral verification

### For CI/CD Integration

```bash
# Add to CI pipeline
npm run build
npm run test:ai:strict  # MUST pass for green build
npm run test:ai         # Additional validation
```

**Exit Codes**:
- `0`: All tests passed, no action failures
- `1`: Action failures detected, build should fail

### Debugging Action Failures

When `test:ai:strict` fails:

1. **Check the failure log** for specific error types
2. **Run with detailed logging** to see AI decision generation
3. **Fix root causes**:
   - Missing special ability implementations → Add to GameEngine
   - Invalid AI decisions → Fix decision generation logic
   - Pathfinding failures → Improve pathfinding algorithms

## Error Categories and Fixes

### "Unit does not have this ability"
- **Cause**: AI generates decisions for abilities units don't possess
- **Fix**: Add validation in AI decision generators to check `unit.specialAbilities`
- **Files**: `src/core/ai/AIDecisionMaker.ts` (special ability generation)

### "Unknown special ability: [ability name]" 
- **Cause**: GameEngine missing implementation for specific abilities
- **Fix**: Add ability implementation to `src/core/game/GameEngine.ts`
- **Examples**: Amphibious Command, VTOL, Tilt-rotor

### "No valid path to target"
- **Cause**: AI generates movement decisions for unreachable positions
- **Fix**: Improve pathfinding validation in decision generation
- **Files**: `src/core/ai/AIDecisionMaker.ts` (movement decisions)

## Regression Prevention

### Before Major Changes

1. Run `npm run test:ai:strict` to establish baseline
2. Document current failure count if any
3. Make changes
4. Ensure failure count does not increase

### After Bug Fixes

1. Fix should reduce total action failures
2. Strict test should pass (0 failures) when claiming "fully operational"
3. Update `ai-gaps.md` with current status

### CI Integration

```yaml
# Example GitHub Actions
- name: AI Validation
  run: |
    npm run build
    npm run test:ai:strict
  # This will fail the build if AI has action failures
```

## Current Action Items

Based on strict validation results:

1. **CRITICAL**: Fix 6x "Unit does not have this ability" errors
2. **HIGH**: Implement missing special abilities (Amphibious Command, VTOL, Tilt-rotor)  
3. **MEDIUM**: Fix USS Wasp pathfinding for movement decisions

**Goal**: Achieve 0 action failures in strict validation test

---

*Last Updated: 2025-07-15*  
*Current Status: 59% action failure rate - CRITICAL REGRESSIONS DETECTED*