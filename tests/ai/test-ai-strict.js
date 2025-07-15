#!/usr/bin/env node

/**
 * Strict AI Test - Enforces zero action failures for regression prevention
 * This test treats any AI action failure as a critical error
 */

const { GameState } = require('../../dist/core/game/GameState');
const { GameEngine } = require('../../dist/core/game/GameEngine');
const { Player } = require('../../dist/core/game/Player');
const { GameMap } = require('../../dist/core/game/Map');
const { PlayerSide, UnitType } = require('../../dist/core/game/types');
const { AIDifficulty } = require('../../dist/core/ai/types');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper');
const { Hex } = require('../../dist/core/hex');

console.log('🚨 USS WASP AI STRICT VALIDATION');
console.log('================================\n');

let totalActionsFailed = 0;
let totalActionsSucceeded = 0;
let actionFailures = [];

// Override console.log to capture and count action failures
const originalLog = console.log;
console.log = function(...args) {
    const message = args.join(' ');
    
    if (message.includes('❌ Action failed:')) {
        totalActionsFailed++;
        // Extract failure reason for detailed reporting
        const failureMatch = message.match(/❌ Action failed: (.+)/);
        if (failureMatch) {
            actionFailures.push(failureMatch[1]);
        }
    } else if (message.includes('✅ Action succeeded:')) {
        totalActionsSucceeded++;
    }
    
    // Always call original log
    originalLog.apply(console, args);
};

async function runStrictAIValidation() {
    console.log('Running AI validation with zero-tolerance for action failures...\n');
    
    // Test 1: Basic Combat AI
    try {
        console.log('🎯 TEST 1: Combat AI Validation');
        console.log('──────────────────────────────');
        
        const map = new GameMap(6, 6);
        const gameState = new GameState('combat-test', map, 10);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        const defenderPlayer = new Player('defender', PlayerSide.Defender);
        
        assaultPlayer.commandPoints = 10;
        defenderPlayer.commandPoints = 10;
        
        gameState.addPlayer(assaultPlayer);
        gameState.addPlayer(defenderPlayer);
        
        // Create test combat scenario
        const assaultUnits = createTestUnits([
            { id: 'marine1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
            { id: 'humvee1', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(1, 2) }
        ]);
        
        const defenderUnits = createTestUnits([
            { id: 'infantry1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 1) },
            { id: 'technical1', type: UnitType.TECHNICAL, side: PlayerSide.Defender, position: new Hex(3, 2) }
        ]);
        
        assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
        defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
        
        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
        gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);
        
        // Run 3 turns of AI actions to test for failures
        for (let turn = 1; turn <= 3; turn++) {
            console.log(`\n--- Turn ${turn} ---`);
            
            gameState.setActivePlayerBySide(PlayerSide.Assault);
            gameState.phase = 'action';
            const assaultActions = gameEngine.updateAI();
            console.log(`   Assault actions: ${assaultActions.length}`);
            
            gameState.setActivePlayerBySide(PlayerSide.Defender);
            gameState.phase = 'action'; 
            const defenderActions = gameEngine.updateAI();
            console.log(`   Defender actions: ${defenderActions.length}`);
            
            // Reset action states for next turn
            [...assaultUnits, ...defenderUnits].forEach(unit => {
                unit.state.hasActed = false;
                unit.state.hasMoved = false;
            });
        }
        
        console.log('   ✅ Combat AI validation complete');
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        totalActionsFailed++;
    }
    
    // Test 2: USS Wasp Operations AI
    try {
        console.log('\n🚢 TEST 2: USS Wasp Operations Validation');
        console.log('────────────────────────────────────────');
        
        const map = new GameMap(8, 8);
        const gameState = new GameState('wasp-test', map, 15);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        assaultPlayer.commandPoints = 20;
        gameState.addPlayer(assaultPlayer);
        gameState.setActivePlayerBySide(PlayerSide.Assault);

        // Create USS Wasp scenario
        const waspUnits = createTestUnits([
            { id: 'wasp', type: UnitType.USS_WASP, side: PlayerSide.Assault, position: new Hex(0, 0) },
            { id: 'harrier1', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(0, 0) },
            { id: 'osprey1', type: UnitType.OSPREY, side: PlayerSide.Assault, position: new Hex(0, 0) }
        ]);

        waspUnits.forEach(unit => assaultPlayer.addUnit(unit));
        gameState.initializeWaspOperations();
        
        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);

        console.log('   Testing AI USS Wasp operations...');
        
        // Test deployment phase
        gameState.phase = 'deployment';
        const deployActions = gameEngine.updateAI();
        console.log(`   Deployment actions: ${deployActions.length}`);
        
        // Test action phase
        gameState.phase = 'action';
        const actionActions = gameEngine.updateAI();
        console.log(`   Action phase actions: ${actionActions.length}`);
        
        console.log('   ✅ USS Wasp operations validation complete');
        
    } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        totalActionsFailed++;
    }
    
    // Report Results
    console.log('\n🎯 STRICT VALIDATION RESULTS');
    console.log('════════════════════════════');
    console.log(`✅ Actions succeeded: ${totalActionsSucceeded}`);
    console.log(`❌ Actions failed: ${totalActionsFailed}`);
    
    if (totalActionsFailed > 0) {
        console.log('\n💥 CRITICAL FAILURES DETECTED:');
        actionFailures.forEach((failure, index) => {
            console.log(`   ${index + 1}. ${failure}`);
        });
        
        console.log('\n🚨 AI SYSTEM HAS REGRESSIONS - TEST FAILED!');
        console.log('These failures must be fixed before the AI system can be considered stable.');
        
        process.exit(1); // Fail the test
    } else {
        console.log('\n🎉 AI SYSTEM VALIDATION PASSED!');
        console.log('All AI actions executed successfully - no regressions detected.');
        
        process.exit(0); // Pass the test
    }
}

runStrictAIValidation().catch(error => {
    console.error('💥 VALIDATION FAILED:', error);
    process.exit(1);
});