#!/usr/bin/env npx tsx

/**
 * Comprehensive AI System Gap Analysis
 * Test specific game mechanics and AI capabilities to identify missing features
 */

import { GameState } from '../../dist/core/game/GameState.js';
import { GameEngine } from '../../dist/core/game/GameEngine.js';
import { Player } from '../../dist/core/game/Player.js';
import { GameMap } from '../../dist/core/game/Map.js';
import { PlayerSide, UnitType, ObjectiveType } from '../../dist/core/game/types.js';
import { AIDifficulty } from '../../dist/core/ai/types.js';
import { createTestUnits } from '../../dist/testing/UnitTestHelper.js';
import { Hex } from '../../dist/core/hex/index.js';
import * as fs from 'fs';

console.log('🔍 USS WASP AI SYSTEM GAP ANALYSIS');
console.log('==================================\n');

interface TestResult {
    [key: string]: boolean;
}

interface BaselineData {
    baseline: TestResult;
}

// Test 1: USS Wasp Operations AI
function testWaspOperationsAI(): boolean {
    console.log('🚢 TEST 1: USS Wasp Launch/Recovery AI');
    console.log('────────────────────────────────────');
    
    try {
        // Set a fixed seed for deterministic behavior
        const originalRandom = Math.random;
        let seed = 54321;
        Math.random = function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        
        const map = new GameMap(8, 8);
        const gameState = new GameState('wasp-ops-test', map, 15);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        assaultPlayer.commandPoints = 20;
        gameState.addPlayer(assaultPlayer);
        gameState.setActivePlayerBySide(PlayerSide.Assault);

        // Create USS Wasp with embarked units
        const waspUnits = createTestUnits([
            { id: 'wasp', type: UnitType.USS_WASP, side: PlayerSide.Assault, position: new Hex(0, 0) },
            { id: 'harrier1', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(0, 0) }, // Embarked
            { id: 'harrier2', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(0, 0) }, // Embarked
            { id: 'osprey1', type: UnitType.OSPREY, side: PlayerSide.Assault, position: new Hex(0, 0) }, // Embarked
        ]);

        waspUnits.forEach(unit => assaultPlayer.addUnit(unit));
        
        // Embark aircraft on USS Wasp (this might not be implemented)
        const wasp = waspUnits[0];
        console.log(`   USS Wasp cargo capacity: ${wasp.getCargoCapacity()}`);
        
        // CRITICAL: Re-initialize USS Wasp operations after adding units
        gameState.initializeWaspOperations();
        
        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);

        // Test if AI can launch aircraft
        console.log('   Testing AI launch operations...');
        gameState.phase = 'deployment';
        const deployActions = gameEngine.updateAI();
        console.log(`   AI deployment actions: ${deployActions.length}`);
        
        gameState.phase = 'action';
        const actionActions = gameEngine.updateAI();
        console.log(`   AI action decisions: ${actionActions.length}`);
        
        // Check if AI generates USS Wasp specific actions
        const waspActions = [...deployActions, ...actionActions].filter(action => 
            action.type === 'launch_from_wasp' || action.type === 'recover_to_wasp'
        );
        
        if (waspActions.length > 0) {
            console.log('   ✅ AI generates USS Wasp operations');
        } else {
            console.log('   ❌ MISSING: AI USS Wasp launch/recovery operations');
        }
        
        // Restore original Math.random
        Math.random = originalRandom;
        
        return waspActions.length > 0;
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        // Restore original Math.random in case of error
        Math.random = originalRandom;
        return false;
    }
}

// Test 2: Hidden Unit AI Tactics
function testHiddenUnitAI(): boolean {
    console.log('\n🫥 TEST 2: Hidden Unit AI Tactics');
    console.log('──────────────────────────────────');
    
    try {
        const map = new GameMap(6, 6);
        const gameState = new GameState('hidden-unit-test', map, 10);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        const defenderPlayer = new Player('defender', PlayerSide.Defender);
        
        assaultPlayer.commandPoints = 15;
        defenderPlayer.commandPoints = 15;
        
        gameState.addPlayer(assaultPlayer);
        gameState.addPlayer(defenderPlayer);
        gameState.setActivePlayerBySide(PlayerSide.Assault);

        // Create scenario with hidden units
        const assaultUnits = createTestUnits([
            { id: 'marines', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
            { id: 'marsoc', type: UnitType.MARSOC, side: PlayerSide.Assault, position: new Hex(1, 2) } // Can detect hidden
        ]);

        const defenderUnits = createTestUnits([
            { id: 'hidden1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(4, 4) },
            { id: 'hidden2', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(4, 3) }
        ]);

        assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
        defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

        // Hide defender units
        defenderUnits.forEach(unit => {
            if (unit.canBeHidden && typeof unit.canBeHidden === 'function' && unit.canBeHidden()) {
                unit.hide();
                console.log(`   ${unit.type} is now hidden`);
            }
        });

        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
        gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

        // Test AI hidden unit tactics
        console.log('   Testing hidden unit AI decisions...');
        
        // Debug: Check unit states
        console.log('   Available units by player:');
        console.log('     Assault:', assaultPlayer.getLivingUnits().map(u => `${u.type}(hidden:${u.isHidden()})`));
        console.log('     Defender:', defenderPlayer.getLivingUnits().map(u => `${u.type}(hidden:${u.isHidden()})`));
        
        gameState.phase = 'action';
        const assaultActions = gameEngine.updateAI();
        
        gameState.setActivePlayerBySide(PlayerSide.Defender);
        const defenderActions = gameEngine.updateAI();
        
        // Debug: show all actions
        console.log('   Assault actions:', assaultActions.map(a => `${a.type}(${a.unitId})`));
        console.log('   Defender actions:', defenderActions.map(a => `${a.type}(${a.unitId})`));
        
        // Check for reveal/hide actions
        const hiddenActions = [...assaultActions, ...defenderActions].filter(action => 
            action.type === 'reveal' || action.type === 'hide'
        );
        
        console.log(`   Total actions generated: ${assaultActions.length + defenderActions.length}`);
        console.log(`   Hidden unit actions: ${hiddenActions.length}`);
        
        if (hiddenActions.length > 0) {
            console.log('   ✅ AI handles hidden unit tactics');
        } else {
            console.log('   ❌ MISSING: AI hidden unit tactical decisions');
        }
        
        return hiddenActions.length > 0;
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        return false;
    }
}

// Test 3: Special Abilities AI
function testSpecialAbilitiesAI(): boolean {
    console.log('\n💥 TEST 3: Special Abilities AI');
    console.log('───────────────────────────────');
    
    try {
        const map = new GameMap(6, 6);
        const gameState = new GameState('abilities-test', map, 10);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        const defenderPlayer = new Player('defender', PlayerSide.Defender);
        
        assaultPlayer.commandPoints = 15;
        defenderPlayer.commandPoints = 15;
        
        gameState.addPlayer(assaultPlayer);
        gameState.addPlayer(defenderPlayer);
        gameState.setActivePlayerBySide(PlayerSide.Assault);

        // Create units with special abilities
        const assaultUnits = createTestUnits([
            { id: 'artillery', type: UnitType.ARTILLERY, side: PlayerSide.Assault, position: new Hex(1, 1) },
            { id: 'marsoc', type: UnitType.MARSOC, side: PlayerSide.Assault, position: new Hex(1, 2) }
        ]);

        const defenderUnits = createTestUnits([
            { id: 'sam', type: UnitType.SAM_SITE, side: PlayerSide.Defender, position: new Hex(4, 4) },
            { id: 'mortar', type: UnitType.MORTAR_TEAM, side: PlayerSide.Defender, position: new Hex(4, 3) }
        ]);

        assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
        defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
        gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

        console.log('   Testing special ability AI decisions...');
        
        // Check unit abilities
        assaultUnits.forEach(unit => {
            console.log(`   ${unit.type} abilities: ${unit.specialAbilities?.length || 0}`);
        });
        
        gameState.phase = 'action';
        const assaultActions = gameEngine.updateAI();
        
        gameState.setActivePlayerBySide(PlayerSide.Defender);
        const defenderActions = gameEngine.updateAI();
        
        // Check for special ability actions
        const abilityActions = [...assaultActions, ...defenderActions].filter(action => 
            action.type === 'special_ability'
        );
        
        console.log(`   Total actions: ${assaultActions.length + defenderActions.length}`);
        console.log(`   Special ability actions: ${abilityActions.length}`);
        
        if (abilityActions.length > 0) {
            console.log('   ✅ AI uses special abilities');
            abilityActions.forEach(action => {
                console.log(`     - ${action.data?.abilityName || 'unknown ability'}`);
            });
        } else {
            console.log('   ❌ MISSING: AI special ability usage');
        }
        
        return abilityActions.length > 0;
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        return false;
    }
}

// Test 4: Objective-Based AI Strategy
function testObjectiveAI(): boolean {
    console.log('\n🎯 TEST 4: Objective-Based AI Strategy');
    console.log('─────────────────────────────────────');
    
    try {
        // Set a fixed seed for deterministic behavior
        const originalRandom = Math.random;
        let seed = 12345;
        Math.random = function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        const map = new GameMap(8, 6);
        const gameState = new GameState('objective-test', map, 15);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        const defenderPlayer = new Player('defender', PlayerSide.Defender);
        
        assaultPlayer.commandPoints = 15;
        defenderPlayer.commandPoints = 15;
        
        gameState.addPlayer(assaultPlayer);
        gameState.addPlayer(defenderPlayer);
        gameState.setActivePlayerBySide(PlayerSide.Assault);

        // Create units positioned relative to objectives
        const assaultUnits = createTestUnits([
            { id: 'marines1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 2) },
            { id: 'marines2', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 3) }
        ]);

        const defenderUnits = createTestUnits([
            { id: 'defense1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(6, 2) },
            { id: 'defense2', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(6, 3) }
        ]);

        assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
        defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

        // Add objectives to the map
        const objectives = [
            { id: 'obj1', position: new Hex(7, 2), type: 'Command Post', controlledBy: null },
            { id: 'obj2', position: new Hex(7, 3), type: 'Supply Depot', controlledBy: null }
        ];
        
        // Actually add objectives to the map
        map.addObjective(objectives[0].position, ObjectiveType.COMMS_HUB, objectives[0].id);
        map.addObjective(objectives[1].position, ObjectiveType.PORT, objectives[1].id);
        
        console.log(`   Objectives: ${objectives.length} targets`);

        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
        gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

        console.log('   Testing objective-focused AI decisions...');
        
        gameState.phase = 'movement';
        const movementActions = gameEngine.updateAI();
        
        gameState.phase = 'action';
        const actionActions = gameEngine.updateAI();
        
        // Check for objective-related actions
        const objectiveActions = [...movementActions, ...actionActions].filter(action => 
            action.type === 'secure_objective' || 
            (action.type === 'move' && action.data?.objective)
        );
        
        console.log(`   Movement actions: ${movementActions.length}`);
        console.log(`   Action decisions: ${actionActions.length}`);
        console.log(`   Objective-focused actions: ${objectiveActions.length}`);
        
        // Check if AI moves toward objectives
        let objectiveOrientedMovement = 0;
        movementActions.forEach(action => {
            if (action.type === 'move' && action.targetPosition) {
                const target = action.targetPosition;
                objectives.forEach(obj => {
                    const distance = Math.abs(target.q - obj.position.q) + Math.abs(target.r - obj.position.r);
                    if (distance <= 3) objectiveOrientedMovement++;
                });
            }
        });
        
        console.log(`   Objective-oriented movements: ${objectiveOrientedMovement}`);
        
        if (objectiveActions.length > 0 || objectiveOrientedMovement > 0) {
            console.log('   ✅ AI considers objectives in strategy');
        } else {
            console.log('   ❌ MISSING: AI objective-based strategy');
        }
        
        // Restore original Math.random
        Math.random = originalRandom;
        
        return objectiveActions.length > 0 || objectiveOrientedMovement > 0;
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        // Restore original Math.random in case of error
        Math.random = originalRandom;
        return false;
    }
}

// Test 5: Transport/Cargo AI
function testTransportAI(): boolean {
    console.log('\n🚁 TEST 5: Transport/Cargo AI Operations');
    console.log('────────────────────────────────────────');
    
    try {
        const map = new GameMap(6, 6);
        const gameState = new GameState('transport-test', map, 10);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        assaultPlayer.commandPoints = 15;
        gameState.addPlayer(assaultPlayer);
        gameState.setActivePlayerBySide(PlayerSide.Assault);

        // Create transport scenario
        const units = createTestUnits([
            { id: 'osprey', type: UnitType.OSPREY, side: PlayerSide.Assault, position: new Hex(2, 2) },
            { id: 'aav', type: UnitType.AAV_7, side: PlayerSide.Assault, position: new Hex(2, 3) },
            { id: 'marines1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 2) },
            { id: 'marines2', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 3) },
            { id: 'humvee', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(1, 1) }
        ]);

        units.forEach(unit => assaultPlayer.addUnit(unit));

        console.log('   Transport capacities:');
        units.forEach(unit => {
            const capacity = unit.getCargoCapacity();
            if (capacity > 0) {
                console.log(`     ${unit.type}: ${capacity} units`);
            }
        });

        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);

        console.log('   Testing transport AI decisions...');
        
        gameState.phase = 'deployment';
        const deployActions = gameEngine.updateAI();
        
        gameState.phase = 'movement';
        const moveActions = gameEngine.updateAI();
        
        gameState.phase = 'action';
        const actionActions = gameEngine.updateAI();
        
        // Check for transport actions
        const transportActions = [...deployActions, ...moveActions, ...actionActions].filter(action => 
            action.type === 'load' || action.type === 'unload'
        );
        
        console.log(`   Total actions: ${deployActions.length + moveActions.length + actionActions.length}`);
        console.log(`   Transport actions: ${transportActions.length}`);
        
        if (transportActions.length > 0) {
            console.log('   ✅ AI manages transport operations');
        } else {
            console.log('   ❌ MISSING: AI transport/cargo operations');
        }
        
        return transportActions.length > 0;
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        return false;
    }
}

// Test 6: AI Learning and Adaptation
function testAILearning(): boolean {
    console.log('\n🧠 TEST 6: AI Learning and Adaptation');
    console.log('─────────────────────────────────────');
    
    try {
        const map = new GameMap(6, 6);
        const gameState = new GameState('learning-test', map, 10);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        gameState.addPlayer(assaultPlayer);
        gameState.setActivePlayerBySide(PlayerSide.Assault);

        const units = createTestUnits([
            { id: 'marines', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 2) }
        ]);

        units.forEach(unit => assaultPlayer.addUnit(unit));

        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.ADAPTIVE);

        console.log('   Testing AI learning capabilities...');
        
        // Get AI status
        const aiStatus = gameEngine.getAIStatus(assaultPlayer.id);
        if (aiStatus) {
            console.log(`   AI difficulty: ${aiStatus.difficulty}`);
            console.log(`   AI enabled: ${aiStatus.isEnabled}`);
            console.log(`   Performance metrics available: ${aiStatus.performanceMetrics ? 'Yes' : 'No'}`);
            
            if (aiStatus.performanceMetrics) {
                const metrics = aiStatus.performanceMetrics;
                console.log(`     Casualties inflicted: ${metrics.casualtiesInflicted}`);
                console.log(`     Units preserved: ${metrics.unitsPreserved}`);
                console.log(`     Resource efficiency: ${metrics.resourceEfficiency}`);
            }
        }
        
        // Test learning data
        const aiControllers = gameEngine.getAllAIControllers();
        const assaultAI = aiControllers.get(assaultPlayer.id);
        
        if (assaultAI && typeof assaultAI.getLearningData === 'function') {
            const learningData = assaultAI.getLearningData();
            console.log(`   Learning data available: Yes`);
            console.log(`     Successful tactics: ${learningData.successfulTactics?.length || 0}`);
            console.log(`     Failed tactics: ${learningData.failedTactics?.length || 0}`);
            console.log('   ✅ AI learning system implemented');
            return true;
        } else {
            console.log('   ❌ MISSING: AI learning/adaptation system');
            return false;
        }
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        return false;
    }
}

// Load baseline for comparison
function loadBaseline(): TestResult {
    try {
        const baseline = JSON.parse(fs.readFileSync('./ai-gap-baseline.json', 'utf8')) as BaselineData;
        return baseline.baseline;
    } catch (error) {
        console.log('⚠️ No baseline found, using empty baseline');
        return {};
    }
}

// Run all gap analysis tests
async function runGapAnalysis(): Promise<void> {
    console.log('Running comprehensive AI system gap analysis...\n');
    
    const results: TestResult = {
        waspOps: testWaspOperationsAI(),
        hiddenUnits: testHiddenUnitAI(),
        specialAbilities: testSpecialAbilitiesAI(),
        objectives: testObjectiveAI(),
        transport: testTransportAI(),
        learning: testAILearning()
    };
    
    console.log('\n🎯 GAP ANALYSIS SUMMARY');
    console.log('=======================');
    
    const implemented = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    console.log(`✅ Implemented: ${implemented}/${total} (${Math.round(implemented/total*100)}%)`);
    console.log(`❌ Missing: ${total - implemented}/${total} (${Math.round((total-implemented)/total*100)}%)`);
    
    console.log('\n📋 DETAILED RESULTS:');
    console.log(`🚢 USS Wasp Operations: ${results.waspOps ? '✅' : '❌'}`);
    console.log(`🫥 Hidden Unit Tactics: ${results.hiddenUnits ? '✅' : '❌'}`);
    console.log(`💥 Special Abilities: ${results.specialAbilities ? '✅' : '❌'}`);
    console.log(`🎯 Objective Strategy: ${results.objectives ? '✅' : '❌'}`);
    console.log(`🚁 Transport Operations: ${results.transport ? '✅' : '❌'}`);
    console.log(`🧠 Learning/Adaptation: ${results.learning ? '✅' : '❌'}`);
    
    // Compare with baseline to detect regressions
    console.log('\n🔍 REGRESSION ANALYSIS:');
    const baseline = loadBaseline();
    const regressions: string[] = [];
    const improvements: string[] = [];
    
    for (const [feature, current] of Object.entries(results)) {
        const baselineValue = baseline[feature];
        if (baselineValue === true && current === false) {
            regressions.push(feature);
        } else if (baselineValue === false && current === true) {
            improvements.push(feature);
        }
    }
    
    if (regressions.length > 0) {
        console.log(`❌ REGRESSIONS DETECTED: ${regressions.join(', ')}`);
        console.log('🚨 Previously working features are now broken!');
    } else {
        console.log('✅ No regressions detected - all baseline features maintained');
    }
    
    if (improvements.length > 0) {
        console.log(`🎉 IMPROVEMENTS: ${improvements.join(', ')}`);
    }
    
    console.log('\n🔧 RECOMMENDED NEXT STEPS:');
    const missingFeatures: string[] = [];
    
    if (!results.waspOps) {
        console.log('   1. Implement USS Wasp launch/recovery AI decision types');
        missingFeatures.push('USS Wasp Operations');
    }
    if (!results.hiddenUnits) {
        console.log('   2. Add hidden unit reveal/hide AI tactical decisions');
        missingFeatures.push('Hidden Unit Tactics');
    }
    if (!results.specialAbilities) {
        console.log('   3. Implement special ability usage in AI decision-making');
        missingFeatures.push('Special Abilities');
    }
    if (!results.objectives) {
        console.log('   4. Add objective-focused strategic AI planning');
        missingFeatures.push('Objective Strategy');
    }
    if (!results.transport) {
        console.log('   5. Implement transport load/unload AI operations');
        missingFeatures.push('Transport Operations');
    }
    if (!results.learning) {
        console.log('   6. Complete AI learning and adaptation system');
        missingFeatures.push('Learning/Adaptation');
    }
    
    if (implemented === total) {
        console.log('\n🎉 ALL AI SYSTEMS OPERATIONAL - Ready for Phase 7!');
        process.exit(0);
    } else if (regressions.length > 0) {
        console.log(`\n💥 CRITICAL: ${regressions.length} regression(s) detected - CI should fail!`);
        process.exit(1);
    } else {
        console.log(`\n⚡ Current Status: ${Math.round(implemented/total*100)}% complete - ${missingFeatures.length} systems still need implementation`);
        console.log('📊 No regressions detected - baseline maintained ✅');
        process.exit(0);
    }
}

runGapAnalysis().catch(console.error);