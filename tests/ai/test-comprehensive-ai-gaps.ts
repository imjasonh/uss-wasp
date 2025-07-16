#!/usr/bin/env npx tsx

/**
 * Comprehensive AI Gap Analysis - Extended Testing
 * Identifies AI gaps beyond the basic 5 enhanced tests
 */

import { GameState } from '../../dist/core/game/GameState.js';
import { GameEngine } from '../../dist/core/game/GameEngine.js';
import { Player } from '../../dist/core/game/Player.js';
import { GameMap } from '../../dist/core/game/Map.js';
import { PlayerSide, UnitType, ObjectiveType, TurnPhase, TerrainType } from '../../dist/core/game/types.js';
import { AIDifficulty } from '../../dist/core/ai/types.js';
import { createTestUnits } from '../../dist/testing/UnitTestHelper.js';
import { Hex } from '../../dist/core/hex/index.js';

console.log('🔍 COMPREHENSIVE AI GAP ANALYSIS - EXTENDED TESTING');
console.log('===================================================\n');

interface ExtendedTestResult {
    [key: string]: {
        passed: boolean;
        score: number;
        issues: string[];
        recommendations: string[];
        criticalGaps: string[];
    };
}

// Test 1: AI Unit Coordination Effectiveness
function testAIUnitCoordination(): ExtendedTestResult['coordination'] {
    console.log('🤝 TEST 1: AI Unit Coordination Effectiveness');
    console.log('─────────────────────────────────────────────');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    const criticalGaps: string[] = [];
    
    try {
        const map = new GameMap(10, 10);
        const gameState = new GameState('coordination-test', map, 20);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        const defenderPlayer = new Player('defender', PlayerSide.Defender);
        
        assaultPlayer.commandPoints = 20;
        defenderPlayer.commandPoints = 20;
        
        gameState.addPlayer(assaultPlayer);
        gameState.addPlayer(defenderPlayer);
        
        // Create multiple units that should coordinate
        const assaultUnits = createTestUnits([
            { id: 'artillery', type: UnitType.ARTILLERY, side: PlayerSide.Assault, position: new Hex(1, 1) },
            { id: 'spotter', type: UnitType.MARSOC, side: PlayerSide.Assault, position: new Hex(2, 2) },
            { id: 'tank1', type: UnitType.AAV_7, side: PlayerSide.Assault, position: new Hex(3, 3) },
            { id: 'tank2', type: UnitType.AAV_7, side: PlayerSide.Assault, position: new Hex(4, 4) },
            { id: 'support', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(5, 5) }
        ]);
        
        const defenderUnits = createTestUnits([
            { id: 'target_cluster', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(6, 6) },
            { id: 'target_cluster2', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(6, 7) },
            { id: 'target_cluster3', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(7, 6) }
        ]);
        
        assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
        defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
        
        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
        
        gameState.setActivePlayerBySide(PlayerSide.Assault);
        gameState.phase = TurnPhase.ACTION;
        
        // Test coordination over multiple turns
        const coordinationMetrics = {
            combinedArmsAttacks: 0,
            supportingFires: 0,
            flanking: 0,
            concentratedAttacks: 0,
            wastedActions: 0
        };
        
        for (let turn = 0; turn < 3; turn++) {
            const actions = gameEngine.updateAI();
            
            // Analyze coordination patterns
            const attackActions = actions.filter(a => a.type === 'attack');
            const specialAbilityActions = actions.filter(a => a.type === 'special_ability');
            const moveActions = actions.filter(a => a.type === 'move');
            
            // Check for combined arms coordination
            const hasArtillery = specialAbilityActions.some(a => a.unitId === 'artillery');
            const hasSpotter = specialAbilityActions.some(a => a.unitId === 'spotter');
            const hasTankAttack = attackActions.some(a => a.unitId?.startsWith('tank'));
            
            if (hasArtillery && hasSpotter) {
                coordinationMetrics.supportingFires++;
            }
            
            if (hasTankAttack && hasArtillery) {
                coordinationMetrics.combinedArmsAttacks++;
            }
            
            // Check for concentrated attacks on same target
            const targetCounts = new Map<string, number>();
            attackActions.forEach(action => {
                if (action.targetId) {
                    targetCounts.set(action.targetId, (targetCounts.get(action.targetId) || 0) + 1);
                }
            });
            
            for (const [_, count] of targetCounts) {
                if (count >= 2) {
                    coordinationMetrics.concentratedAttacks++;
                }
            }
            
            // Check for flanking movements
            const tankMoves = moveActions.filter(a => a.unitId?.startsWith('tank'));
            if (tankMoves.length >= 2) {
                coordinationMetrics.flanking++;
            }
            
            // Check for wasted actions (units acting without purpose)
            if (actions.length > 0 && attackActions.length === 0 && specialAbilityActions.length === 0) {
                coordinationMetrics.wastedActions++;
            }
        }
        
        console.log(`   Combined arms attacks: ${coordinationMetrics.combinedArmsAttacks}`);
        console.log(`   Supporting fires: ${coordinationMetrics.supportingFires}`);
        console.log(`   Flanking movements: ${coordinationMetrics.flanking}`);
        console.log(`   Concentrated attacks: ${coordinationMetrics.concentratedAttacks}`);
        console.log(`   Wasted actions: ${coordinationMetrics.wastedActions}`);
        
        // Analyze coordination effectiveness
        let coordinationScore = 0;
        let maxScore = 0;
        
        if (coordinationMetrics.combinedArmsAttacks > 0) {
            coordinationScore += 25;
        } else {
            issues.push('No combined arms coordination detected');
            recommendations.push('Implement combined arms AI coordination');
        }
        maxScore += 25;
        
        if (coordinationMetrics.supportingFires > 0) {
            coordinationScore += 20;
        } else {
            issues.push('No supporting fires coordination detected');
            recommendations.push('Add artillery-spotter coordination logic');
        }
        maxScore += 20;
        
        if (coordinationMetrics.concentratedAttacks > 0) {
            coordinationScore += 20;
        } else {
            issues.push('No concentrated attacks on priority targets');
            recommendations.push('Implement target priority sharing between units');
        }
        maxScore += 20;
        
        if (coordinationMetrics.flanking > 0) {
            coordinationScore += 15;
        } else {
            issues.push('No flanking movements detected');
            recommendations.push('Add multi-unit tactical movement coordination');
        }
        maxScore += 15;
        
        if (coordinationMetrics.wastedActions === 0) {
            coordinationScore += 20;
        } else {
            issues.push(`${coordinationMetrics.wastedActions} turns with ineffective actions`);
            recommendations.push('Improve action purpose validation');
        }
        maxScore += 20;
        
        // Check for critical gaps
        if (coordinationMetrics.combinedArmsAttacks === 0 && coordinationMetrics.supportingFires === 0) {
            criticalGaps.push('Complete lack of unit coordination - AI treats units as independent');
        }
        
        const finalScore = (coordinationScore / maxScore) * 100;
        console.log(`   Coordination score: ${finalScore.toFixed(1)}%`);
        console.log(`   Issues found: ${issues.length}`);
        
        return {
            passed: finalScore >= 60,
            score: finalScore,
            issues,
            recommendations,
            criticalGaps
        };
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        return {
            passed: false,
            score: 0,
            issues: [`Test execution failed: ${(error as Error).message}`],
            recommendations: ['Fix test execution environment'],
            criticalGaps: ['Cannot test AI coordination due to system errors']
        };
    }
}

// Test 2: AI Terrain Utilization Analysis
function testAITerrainUtilization(): ExtendedTestResult['terrain'] {
    console.log('\n🏔️ TEST 2: AI Terrain Utilization Analysis');
    console.log('───────────────────────────────────────────');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    const criticalGaps: string[] = [];
    
    try {
        const map = new GameMap(8, 8);
        const gameState = new GameState('terrain-test', map, 15);
        
        // Create terrain-varied map
        // Add some varied terrain (simplified for testing)
        const terrainPositions = [
            { pos: new Hex(3, 3), type: TerrainType.FOREST },
            { pos: new Hex(4, 4), type: TerrainType.FOREST },
            { pos: new Hex(5, 5), type: TerrainType.HILL },
            { pos: new Hex(6, 6), type: TerrainType.HILL },
            { pos: new Hex(2, 6), type: TerrainType.SWAMP },
            { pos: new Hex(6, 2), type: TerrainType.SWAMP }
        ];
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        const defenderPlayer = new Player('defender', PlayerSide.Defender);
        
        assaultPlayer.commandPoints = 15;
        defenderPlayer.commandPoints = 15;
        
        gameState.addPlayer(assaultPlayer);
        gameState.addPlayer(defenderPlayer);
        
        const assaultUnits = createTestUnits([
            { id: 'sniper', type: UnitType.MARSOC, side: PlayerSide.Assault, position: new Hex(1, 1) },
            { id: 'infantry', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 2) },
            { id: 'vehicle', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(1, 2) }
        ]);
        
        const defenderUnits = createTestUnits([
            { id: 'target', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(4, 4) }
        ]);
        
        assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
        defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
        
        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
        
        gameState.setActivePlayerBySide(PlayerSide.Assault);
        gameState.phase = TurnPhase.MOVEMENT;
        
        // Track terrain utilization
        const terrainMetrics = {
            moveToAdvantageousTerrain: 0,
            avoidDisadvantageousTerrain: 0,
            useTerrainForCover: 0,
            ignoreTerrainBenefits: 0,
            moveToDisadvantageousTerrain: 0
        };
        
        for (let turn = 0; turn < 3; turn++) {
            const actions = gameEngine.updateAI();
            const moveActions = actions.filter(a => a.type === 'move');
            
            for (const action of moveActions) {
                if (action.targetPosition) {
                    const targetHex = action.targetPosition;
                    const targetTerrain = map.getTerrainAt(targetHex);
                    
                    // Check if unit is moving to advantageous terrain
                    if (targetTerrain === TerrainType.FOREST || targetTerrain === TerrainType.HILL) {
                        terrainMetrics.moveToAdvantageousTerrain++;
                    }
                    
                    // Check if unit is avoiding disadvantageous terrain
                    if (targetTerrain === TerrainType.SWAMP || targetTerrain === TerrainType.DEEP_WATER) {
                        terrainMetrics.moveToDisadvantageousTerrain++;
                    }
                    
                    // Check if sniper is seeking high ground
                    if (action.unitId === 'sniper' && targetTerrain === TerrainType.HILL) {
                        terrainMetrics.useTerrainForCover++;
                    }
                    
                    // Check if infantry is using forest for cover
                    if (action.unitId === 'infantry' && targetTerrain === TerrainType.FOREST) {
                        terrainMetrics.useTerrainForCover++;
                    }
                    
                    // Check if vehicle is avoiding difficult terrain
                    if (action.unitId === 'vehicle' && (targetTerrain === TerrainType.SWAMP || targetTerrain === TerrainType.FOREST)) {
                        terrainMetrics.moveToDisadvantageousTerrain++;
                    }
                }
            }
            
            // Switch to next phase
            gameState.phase = TurnPhase.ACTION;
        }
        
        console.log(`   Moves to advantageous terrain: ${terrainMetrics.moveToAdvantageousTerrain}`);
        console.log(`   Moves to disadvantageous terrain: ${terrainMetrics.moveToDisadvantageousTerrain}`);
        console.log(`   Uses terrain for cover: ${terrainMetrics.useTerrainForCover}`);
        
        // Analyze terrain utilization
        let terrainScore = 0;
        let maxScore = 0;
        
        if (terrainMetrics.moveToAdvantageousTerrain > 0) {
            terrainScore += 30;
        } else {
            issues.push('AI does not seek advantageous terrain');
            recommendations.push('Implement terrain-aware movement planning');
        }
        maxScore += 30;
        
        if (terrainMetrics.moveToDisadvantageousTerrain === 0) {
            terrainScore += 25;
        } else {
            issues.push(`AI moved to disadvantageous terrain ${terrainMetrics.moveToDisadvantageousTerrain} times`);
            recommendations.push('Add terrain penalty awareness to movement AI');
        }
        maxScore += 25;
        
        if (terrainMetrics.useTerrainForCover > 0) {
            terrainScore += 25;
        } else {
            issues.push('AI does not use terrain for tactical advantage');
            recommendations.push('Implement unit-specific terrain preferences');
        }
        maxScore += 25;
        
        // Unit-specific terrain awareness
        if (terrainMetrics.moveToAdvantageousTerrain === 0 && terrainMetrics.useTerrainForCover === 0) {
            criticalGaps.push('AI completely ignores terrain tactical benefits');
        }
        
        const finalScore = (terrainScore / maxScore) * 100;
        console.log(`   Terrain utilization score: ${finalScore.toFixed(1)}%`);
        console.log(`   Issues found: ${issues.length}`);
        
        return {
            passed: finalScore >= 50,
            score: finalScore,
            issues,
            recommendations,
            criticalGaps
        };
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        return {
            passed: false,
            score: 0,
            issues: [`Test execution failed: ${(error as Error).message}`],
            recommendations: ['Fix test execution environment'],
            criticalGaps: ['Cannot test AI terrain utilization due to system errors']
        };
    }
}

// Test 3: AI Combat Effectiveness Analysis
function testAICombatEffectiveness(): ExtendedTestResult['combat'] {
    console.log('\n⚔️ TEST 3: AI Combat Effectiveness Analysis');
    console.log('───────────────────────────────────────────');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    const criticalGaps: string[] = [];
    
    try {
        const map = new GameMap(6, 6);
        const gameState = new GameState('combat-test', map, 10);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        const defenderPlayer = new Player('defender', PlayerSide.Defender);
        
        assaultPlayer.commandPoints = 20;
        defenderPlayer.commandPoints = 20;
        
        gameState.addPlayer(assaultPlayer);
        gameState.addPlayer(defenderPlayer);
        
        // Create combat scenario with units in ADJACENT positions (range 1)
        const assaultUnits = createTestUnits([
            { id: 'attacker1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 2) },
            { id: 'attacker2', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 3) },
            { id: 'support', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(1, 3) }
        ]);
        
        const defenderUnits = createTestUnits([
            { id: 'defender1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 2) },
            { id: 'defender2', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 3) }
        ]);
        
        assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
        defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
        
        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
        gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);
        
        gameState.setActivePlayerBySide(PlayerSide.Assault);
        gameState.phase = TurnPhase.ACTION;
        
        // Track combat effectiveness
        const combatMetrics = {
            attackActions: 0,
            successfulAttacks: 0,
            targetPrioritization: 0,
            damageDealt: 0,
            damageTaken: 0,
            unitsLost: 0,
            unitsDestroyed: 0,
            retreatWhenOutnumbered: 0,
            suicidalAttacks: 0
        };
        
        const initialAssaultUnits = assaultPlayer.getLivingUnits().length;
        const initialDefenderUnits = defenderPlayer.getLivingUnits().length;
        
        for (let turn = 0; turn < 5; turn++) {
            const assaultActions = gameEngine.updateAI();
            gameState.setActivePlayerBySide(PlayerSide.Defender);
            const defenderActions = gameEngine.updateAI();
            
            const allActions = [...assaultActions, ...defenderActions];
            const attackActions = allActions.filter(a => a.type === 'attack');
            combatMetrics.attackActions += attackActions.length;
            
            // Check for target prioritization (attacking weakest/most valuable targets)
            const defenderUnits = defenderPlayer.getLivingUnits();
            if (defenderUnits.length === 0) continue;
            
            const weakestTarget = defenderUnits.reduce((weakest, unit) => 
                unit.state.currentHP < weakest.state.currentHP ? unit : weakest
            );
            
            const attacksOnWeakest = attackActions.filter(a => a.targetId === weakestTarget.id);
            combatMetrics.targetPrioritization += attacksOnWeakest.length;
            
            // Check for retreat behavior when outnumbered
            const currentAssaultUnits = assaultPlayer.getLivingUnits().length;
            const currentDefenderUnits = defenderPlayer.getLivingUnits().length;
            
            if (currentAssaultUnits < currentDefenderUnits) {
                const retreatActions = assaultActions.filter(a => a.type === 'move');
                // Simplified retreat detection - moving away from enemy
                combatMetrics.retreatWhenOutnumbered += retreatActions.length;
            }
            
            // Check for suicidal attacks (attacking when heavily damaged)
            const assaultUnits = assaultPlayer.getLivingUnits();
            const heavilyDamagedUnits = assaultUnits.filter(u => u.state.currentHP <= 1);
            const suicidalAttacks = attackActions.filter(a => 
                heavilyDamagedUnits.some(u => u.id === a.unitId)
            );
            combatMetrics.suicidalAttacks += suicidalAttacks.length;
            
            gameState.setActivePlayerBySide(PlayerSide.Assault);
        }
        
        const finalAssaultUnits = assaultPlayer.getLivingUnits().length;
        const finalDefenderUnits = defenderPlayer.getLivingUnits().length;
        
        combatMetrics.unitsLost = initialAssaultUnits - finalAssaultUnits;
        combatMetrics.unitsDestroyed = initialDefenderUnits - finalDefenderUnits;
        
        console.log(`   Attack actions: ${combatMetrics.attackActions}`);
        console.log(`   Target prioritization: ${combatMetrics.targetPrioritization}`);
        console.log(`   Units lost: ${combatMetrics.unitsLost}`);
        console.log(`   Units destroyed: ${combatMetrics.unitsDestroyed}`);
        console.log(`   Retreat actions: ${combatMetrics.retreatWhenOutnumbered}`);
        console.log(`   Suicidal attacks: ${combatMetrics.suicidalAttacks}`);
        
        // Analyze combat effectiveness
        let combatScore = 0;
        let maxScore = 0;
        
        if (combatMetrics.attackActions > 0) {
            combatScore += 20;
        } else {
            issues.push('AI did not engage in combat');
            recommendations.push('Improve AI combat engagement logic');
            criticalGaps.push('AI avoids combat completely');
        }
        maxScore += 20;
        
        if (combatMetrics.targetPrioritization > 0) {
            combatScore += 25;
        } else {
            issues.push('AI does not prioritize targets effectively');
            recommendations.push('Implement target prioritization system');
        }
        maxScore += 25;
        
        const killRatio = combatMetrics.unitsDestroyed / Math.max(1, combatMetrics.unitsLost);
        if (killRatio >= 1.0) {
            combatScore += 25;
        } else if (killRatio >= 0.5) {
            combatScore += 15;
        } else {
            issues.push(`Poor kill ratio: ${killRatio.toFixed(2)}`);
            recommendations.push('Improve AI tactical combat effectiveness');
        }
        maxScore += 25;
        
        if (combatMetrics.retreatWhenOutnumbered > 0) {
            combatScore += 15;
        } else {
            issues.push('AI does not retreat when tactical situation is poor');
            recommendations.push('Implement tactical retreat logic');
        }
        maxScore += 15;
        
        if (combatMetrics.suicidalAttacks === 0) {
            combatScore += 15;
        } else {
            issues.push(`AI made ${combatMetrics.suicidalAttacks} suicidal attacks`);
            recommendations.push('Add self-preservation logic to combat AI');
        }
        maxScore += 15;
        
        const finalScore = (combatScore / maxScore) * 100;
        console.log(`   Combat effectiveness score: ${finalScore.toFixed(1)}%`);
        console.log(`   Issues found: ${issues.length}`);
        
        return {
            passed: finalScore >= 60,
            score: finalScore,
            issues,
            recommendations,
            criticalGaps
        };
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        return {
            passed: false,
            score: 0,
            issues: [`Test execution failed: ${(error as Error).message}`],
            recommendations: ['Fix test execution environment'],
            criticalGaps: ['Cannot test AI combat effectiveness due to system errors']
        };
    }
}

// Test 4: AI Learning System Validation
function testAILearningSystem(): ExtendedTestResult['learning'] {
    console.log('\n🧠 TEST 4: AI Learning System Validation');
    console.log('────────────────────────────────────────');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    const criticalGaps: string[] = [];
    
    try {
        const map = new GameMap(6, 6);
        const gameState = new GameState('learning-test', map, 10);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        assaultPlayer.commandPoints = 15;
        gameState.addPlayer(assaultPlayer);
        
        const units = createTestUnits([
            { id: 'learner', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 2) }
        ]);
        
        units.forEach(unit => assaultPlayer.addUnit(unit));
        
        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.ADAPTIVE);
        
        gameState.setActivePlayerBySide(PlayerSide.Assault);
        gameState.phase = TurnPhase.ACTION;
        
        // Test learning system
        const learningMetrics = {
            initialBehavior: [] as string[],
            adaptedBehavior: [] as string[],
            behaviorChange: false,
            memoryRetention: false,
            performanceImprovement: false
        };
        
        // Record initial behavior
        for (let i = 0; i < 3; i++) {
            const actions = gameEngine.updateAI();
            learningMetrics.initialBehavior.push(actions.map(a => a.type).join(','));
        }
        
        // Simulate learning scenario (failed actions)
        // This would normally be done by feeding back action results
        const aiController = gameEngine.getAllAIControllers().get(assaultPlayer.id);
        if (aiController) {
            // Simulate learning from failed actions
            const failedActions = [{
                type: 'special_ability' as const,
                playerId: assaultPlayer.id,
                unitId: 'learner',
                data: { abilityName: 'NonexistentAbility' }
            }];
            
            const failedResults = [{ success: false, message: 'Unit does not have this ability' }];
            aiController.processActionResults(failedActions, failedResults);
            
            // Test if AI learned from failure
            for (let i = 0; i < 3; i++) {
                const actions = gameEngine.updateAI();
                learningMetrics.adaptedBehavior.push(actions.map(a => a.type).join(','));
            }
            
            // Check if behavior changed
            const initialPattern = learningMetrics.initialBehavior.join('|');
            const adaptedPattern = learningMetrics.adaptedBehavior.join('|');
            learningMetrics.behaviorChange = initialPattern !== adaptedPattern;
            
            // Check learning data
            const learningData = aiController.getLearningData();
            learningMetrics.memoryRetention = learningData.successfulTactics.length > 0 || 
                                           learningData.failedTactics.length > 0;
            
            // Check performance metrics
            const aiStatus = aiController.getAIStatus();
            learningMetrics.performanceImprovement = aiStatus.performanceMetrics.resourceEfficiency > 0;
        }
        
        console.log(`   Initial behavior: ${learningMetrics.initialBehavior.join(' | ')}`);
        console.log(`   Adapted behavior: ${learningMetrics.adaptedBehavior.join(' | ')}`);
        console.log(`   Behavior change: ${learningMetrics.behaviorChange}`);
        console.log(`   Memory retention: ${learningMetrics.memoryRetention}`);
        console.log(`   Performance tracking: ${learningMetrics.performanceImprovement}`);
        
        // Analyze learning effectiveness
        let learningScore = 0;
        let maxScore = 0;
        
        if (learningMetrics.behaviorChange) {
            learningScore += 30;
        } else {
            issues.push('AI behavior does not adapt based on experience');
            recommendations.push('Implement behavioral adaptation based on action results');
        }
        maxScore += 30;
        
        if (learningMetrics.memoryRetention) {
            learningScore += 25;
        } else {
            issues.push('AI does not retain learning data');
            recommendations.push('Implement persistent learning data storage');
            criticalGaps.push('No learning memory system - AI cannot improve over time');
        }
        maxScore += 25;
        
        if (learningMetrics.performanceImprovement) {
            learningScore += 25;
        } else {
            issues.push('AI does not track performance metrics');
            recommendations.push('Add comprehensive performance tracking');
        }
        maxScore += 25;
        
        // Check for adaptive difficulty
        if (aiController) {
            const aiStatus = aiController.getAIStatus();
            if (aiStatus.difficulty === AIDifficulty.ADAPTIVE) {
                learningScore += 20;
            } else {
                issues.push('AI is not using adaptive difficulty');
                recommendations.push('Implement adaptive difficulty system');
            }
        }
        maxScore += 20;
        
        const finalScore = (learningScore / maxScore) * 100;
        console.log(`   Learning system score: ${finalScore.toFixed(1)}%`);
        console.log(`   Issues found: ${issues.length}`);
        
        return {
            passed: finalScore >= 50,
            score: finalScore,
            issues,
            recommendations,
            criticalGaps
        };
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        return {
            passed: false,
            score: 0,
            issues: [`Test execution failed: ${(error as Error).message}`],
            recommendations: ['Fix test execution environment'],
            criticalGaps: ['Cannot test AI learning system due to system errors']
        };
    }
}

// Test 5: AI Adaptation Testing
function testAIAdaptation(): ExtendedTestResult['adaptation'] {
    console.log('\n🔄 TEST 5: AI Adaptation Testing');
    console.log('────────────────────────────────');
    
    const issues: string[] = [];
    const recommendations: string[] = [];
    const criticalGaps: string[] = [];
    
    try {
        const map = new GameMap(6, 6);
        const gameState = new GameState('adaptation-test', map, 10);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        assaultPlayer.commandPoints = 20;
        gameState.addPlayer(assaultPlayer);
        
        const units = createTestUnits([
            { id: 'adaptive', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 2) }
        ]);
        
        units.forEach(unit => assaultPlayer.addUnit(unit));
        
        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.ADAPTIVE);
        
        gameState.setActivePlayerBySide(PlayerSide.Assault);
        gameState.phase = TurnPhase.ACTION;
        
        // Test adaptation to different scenarios
        const adaptationMetrics = {
            difficultyAdjustment: false,
            tacticalFlexibility: 0,
            counterStrategies: 0,
            environmentalAdaptation: 0,
            personalityConsistency: true
        };
        
        const aiController = gameEngine.getAllAIControllers().get(assaultPlayer.id);
        if (aiController) {
            // Test difficulty adjustment
            const initialDifficulty = aiController.getAIStatus().difficulty;
            
            // Simulate player winning scenario
            const playerActions = [{
                type: 'attack' as const,
                playerId: 'human',
                unitId: 'enemy',
                targetId: 'adaptive'
            }];
            
            aiController.analyzePlayerBehavior(gameState, playerActions);
            
            // Check if AI adapted
            const newDifficulty = aiController.getAIStatus().difficulty;
            adaptationMetrics.difficultyAdjustment = newDifficulty !== initialDifficulty;
            
            // Test tactical flexibility
            const scenarios = [
                { phase: TurnPhase.MOVEMENT, expectedActions: ['move'] },
                { phase: TurnPhase.ACTION, expectedActions: ['attack', 'special_ability'] }
            ];
            
            for (const scenario of scenarios) {
                gameState.phase = scenario.phase;
                const actions = gameEngine.updateAI();
                
                const hasExpectedActions = scenario.expectedActions.some(expected => 
                    actions.some(action => action.type === expected)
                );
                
                if (hasExpectedActions) {
                    adaptationMetrics.tacticalFlexibility++;
                }
            }
            
            // Test personality consistency
            const personality = aiController.getPersonality();
            if (personality) {
                adaptationMetrics.personalityConsistency = personality.name.length > 0;
            }
        }
        
        console.log(`   Difficulty adjustment: ${adaptationMetrics.difficultyAdjustment}`);
        console.log(`   Tactical flexibility: ${adaptationMetrics.tacticalFlexibility}/2`);
        console.log(`   Personality consistency: ${adaptationMetrics.personalityConsistency}`);
        
        // Analyze adaptation effectiveness
        let adaptationScore = 0;
        let maxScore = 0;
        
        if (adaptationMetrics.difficultyAdjustment) {
            adaptationScore += 25;
        } else {
            issues.push('AI difficulty does not adapt to player performance');
            recommendations.push('Implement dynamic difficulty adjustment');
        }
        maxScore += 25;
        
        if (adaptationMetrics.tacticalFlexibility >= 2) {
            adaptationScore += 25;
        } else {
            issues.push(`Limited tactical flexibility: ${adaptationMetrics.tacticalFlexibility}/2`);
            recommendations.push('Improve AI phase-specific tactical adaptation');
        }
        maxScore += 25;
        
        if (adaptationMetrics.personalityConsistency) {
            adaptationScore += 20;
        } else {
            issues.push('AI personality system not functioning');
            recommendations.push('Fix AI personality implementation');
        }
        maxScore += 20;
        
        // Check for environmental adaptation
        if (adaptationMetrics.environmentalAdaptation > 0) {
            adaptationScore += 20;
        } else {
            issues.push('AI does not adapt to environmental changes');
            recommendations.push('Implement environmental adaptation system');
        }
        maxScore += 20;
        
        // Check for counter-strategies
        if (adaptationMetrics.counterStrategies > 0) {
            adaptationScore += 10;
        } else {
            issues.push('AI does not develop counter-strategies');
            recommendations.push('Add counter-strategy development logic');
        }
        maxScore += 10;
        
        const finalScore = (adaptationScore / maxScore) * 100;
        console.log(`   Adaptation score: ${finalScore.toFixed(1)}%`);
        console.log(`   Issues found: ${issues.length}`);
        
        return {
            passed: finalScore >= 60,
            score: finalScore,
            issues,
            recommendations,
            criticalGaps
        };
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${(error as Error).message}`);
        return {
            passed: false,
            score: 0,
            issues: [`Test execution failed: ${(error as Error).message}`],
            recommendations: ['Fix test execution environment'],
            criticalGaps: ['Cannot test AI adaptation due to system errors']
        };
    }
}

// Main execution
function main() {
    console.log('Running comprehensive AI gap analysis...\n');
    
    const results: ExtendedTestResult = {
        coordination: testAIUnitCoordination(),
        terrain: testAITerrainUtilization(),
        combat: testAICombatEffectiveness(),
        learning: testAILearningSystem(),
        adaptation: testAIAdaptation()
    };
    
    // Compile overall results
    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r.passed).length;
    const allIssues = Object.values(results).flatMap(r => r.issues);
    const allRecommendations = Object.values(results).flatMap(r => r.recommendations);
    const allCriticalGaps = Object.values(results).flatMap(r => r.criticalGaps);
    const averageScore = Object.values(results).reduce((sum, r) => sum + r.score, 0) / totalTests;
    
    console.log('\n🎯 COMPREHENSIVE GAP ANALYSIS SUMMARY');
    console.log('====================================');
    console.log(`✅ Tests Passed: ${passedTests}/${totalTests} (${(passedTests/totalTests*100).toFixed(1)}%)`);
    console.log(`❌ Tests Failed: ${totalTests - passedTests}/${totalTests}`);
    console.log(`📊 Average Score: ${averageScore.toFixed(1)}%`);
    console.log(`🔍 Issues Found: ${allIssues.length}`);
    console.log(`💡 Recommendations: ${allRecommendations.length}`);
    console.log(`🚨 Critical Gaps: ${allCriticalGaps.length}`);
    
    console.log('\n📋 DETAILED RESULTS:');
    Object.entries(results).forEach(([testName, result]) => {
        const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${testName}: ${result.score.toFixed(1)}% (${result.issues.length} issues)`);
    });
    
    if (allCriticalGaps.length > 0) {
        console.log('\n🚨 CRITICAL AI GAPS IDENTIFIED:');
        allCriticalGaps.forEach((gap, i) => {
            console.log(`   ${i + 1}. ${gap}`);
        });
    }
    
    if (allIssues.length > 0) {
        console.log('\n🔍 ALL ISSUES FOUND:');
        allIssues.forEach((issue, i) => {
            console.log(`   ${i + 1}. ${issue}`);
        });
    }
    
    if (allRecommendations.length > 0) {
        console.log('\n🔧 RECOMMENDATIONS:');
        allRecommendations.forEach((rec, i) => {
            console.log(`   ${i + 1}. ${rec}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL COMPREHENSIVE TESTS PASSED - AI system is highly robust!');
    } else {
        console.log(`💥 ${totalTests - passedTests} comprehensive tests failed - significant AI gaps detected!`);
        console.log(`📈 Overall AI system maturity: ${averageScore.toFixed(1)}%`);
        
        if (allCriticalGaps.length > 0) {
            console.log(`🚨 ${allCriticalGaps.length} critical gaps require immediate attention`);
        }
    }
}

main();