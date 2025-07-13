#!/usr/bin/env node

/**
 * DEBUG AA ENGAGEMENT PROCESS
 * Track why AA units aren't engaging aircraft in combat
 */

const { GameState } = require('./dist/core/game/GameState');
const { Player } = require('./dist/core/game/Player');
const { GameMap } = require('./dist/core/game/Map');
const { PlayerSide, UnitType, UnitCategory } = require('./dist/core/game/types');
const { createTestUnits } = require('./dist/testing/UnitTestHelper');
const { Hex } = require('./dist/core/hex');
const { AIDecisionMaker } = require('./dist/core/ai/AIDecisionMaker');
const { AIDecisionContext } = require('./dist/core/ai/types');

function debugAAEngagement() {
    console.log('🎯 DEBUG AA ENGAGEMENT PROCESS');
    console.log('=================================\n');
    
    // Create exact test setup from battle series
    const map = new GameMap(8, 8);
    const gameState = new GameState('aa-debug', map, 20);
    
    const defenderPlayer = new Player('defender', PlayerSide.Defender);
    gameState.addPlayer(defenderPlayer);
    
    // Create AA team and aircraft in close proximity
    const aaTeam = createTestUnits([
        { id: 'aa', type: UnitType.AA_TEAM, side: PlayerSide.Defender, position: new Hex(2, 3) }
    ])[0];
    
    const harrier = createTestUnits([
        { id: 'harrier', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(2, 2) }
    ])[0];
    
    defenderPlayer.addUnit(aaTeam);
    
    console.log('UNIT SETUP:');
    console.log(`  AA Team: (${aaTeam.state.position.q}, ${aaTeam.state.position.r}) - Type: ${aaTeam.type}`);
    console.log(`  Harrier: (${harrier.state.position.q}, ${harrier.state.position.r}) - Type: ${harrier.type}`);
    console.log(`  AA Team canAct(): ${aaTeam.canAct()}`);
    console.log(`  AA Team hasActed: ${aaTeam.state.hasActed}`);
    console.log(`  Harrier isAlive(): ${harrier.isAlive()}`);
    console.log(`  Harrier categories: ${Array.from(harrier.categories)}`);
    console.log(`  Harrier hasCategory(AIRCRAFT): ${harrier.hasCategory(UnitCategory.AIRCRAFT)}`);
    
    // Calculate distance manually
    const distance = Math.max(
        Math.abs(aaTeam.state.position.q - harrier.state.position.q),
        Math.abs(aaTeam.state.position.r - harrier.state.position.r),
        Math.abs(aaTeam.state.position.s - harrier.state.position.s)
    );
    console.log(`  Distance: ${distance} hexes`);
    
    // Test AI decision making
    const aiDecisionMaker = new AIDecisionMaker();
    
    // Create decision context
    const context = {
        gameState: gameState,
        player: defenderPlayer,
        availableUnits: [aaTeam],
        enemyUnits: [harrier],
        objectives: [],
        resourceStatus: {
            commandPoints: 10,
            territoryControl: 0.5,
            supplyStatus: 1.0,
            timeRemaining: 10
        },
        phaseInfo: {
            currentPhase: 'action',
            turnsRemaining: 10,
            phaseProgress: 0.5
        }
    };
    
    console.log('\nAI DECISION PROCESS:');
    console.log('====================');
    
    // Test target finding
    console.log('\n1. TESTING findValidTargets():');
    const targets = aiDecisionMaker.findValidTargets(aaTeam, [harrier], context);
    console.log(`   Valid targets found: ${targets.length}`);
    targets.forEach((target, i) => {
        console.log(`   Target ${i+1}: ${target.type} at (${target.state.position.q}, ${target.state.position.r})`);
    });
    
    // Test engagement analysis
    if (targets.length > 0) {
        console.log('\n2. TESTING analyzeEngagement():');
        const engagement = aiDecisionMaker.analyzeEngagement(aaTeam, targets[0], context);
        console.log(`   Should engage: ${engagement.shouldEngage}`);
        console.log(`   Confidence: ${engagement.confidence}`);
        console.log(`   Confidence > 0.3: ${engagement.confidence > 0.3}`);
    }
    
    // Test full decision making
    console.log('\n3. TESTING makeDecisions():');
    const decisions = aiDecisionMaker.makeDecisions(context);
    console.log(`   Total decisions: ${decisions.length}`);
    
    decisions.forEach((decision, i) => {
        console.log(`   Decision ${i+1}: ${decision.type} (priority ${decision.priority})`);
        if (decision.unitId) {
            console.log(`     Unit: ${decision.unitId}`);
        }
        if (decision.targetUnitId) {
            console.log(`     Target: ${decision.targetUnitId}`);
        }
        console.log(`     Reasoning: ${decision.reasoning}`);
    });
    
    const combatDecisions = decisions.filter(d => d.type === 'attack_target');
    console.log(`\n   Combat decisions: ${combatDecisions.length}`);
    
    if (combatDecisions.length === 0) {
        console.log('   ❌ NO COMBAT DECISIONS GENERATED FOR AA TEAM!');
    } else {
        console.log('   ✅ Combat decisions found!');
    }
}

debugAAEngagement();