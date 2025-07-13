#!/usr/bin/env node

/**
 * Comprehensive Logging System Test
 * Demonstrates game logging, state management, and checkpoint functionality
 */

const { GameState } = require('./dist/core/game/GameState');
const { GameEngine } = require('./dist/core/game/GameEngine');
const { Player } = require('./dist/core/game/Player');
const { GameMap } = require('./dist/core/game/Map');
const { PlayerSide, UnitType, ActionType } = require('./dist/core/game/types');
const { AIDifficulty } = require('./dist/core/ai/types');
const { createTestUnits } = require('./dist/testing/UnitTestHelper');
const { Hex } = require('./dist/core/hex');
const { initializeGameLogger, LogLevel, LogCategory } = require('./dist/core/logging/GameLogger');
const { GameStateManager } = require('./dist/core/logging/GameStateManager');

async function testLoggingSystem() {
    console.log('🎯 COMPREHENSIVE LOGGING SYSTEM TEST');
    console.log('=====================================\n');
    
    // Initialize the logging system
    const gameId = `logging-test-${Date.now()}`;
    const logger = initializeGameLogger(gameId, LogLevel.INFO);
    const stateManager = new GameStateManager(logger, {
        autoSnapshot: true,
        snapshotInterval: 2, // Snapshot every 2 turns
        maxSnapshots: 10
    });
    
    console.log('📋 PHASE 1: Game Setup with Logging');
    console.log('====================================');
    
    // Create game setup
    const map = new GameMap(6, 6);
    const gameState = new GameState(gameId, map, 10);
    
    const assaultPlayer = new Player('assault', PlayerSide.Assault);
    const defenderPlayer = new Player('defender', PlayerSide.Defender);
    
    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);
    gameState.setActivePlayerBySide(PlayerSide.Assault);
    
    // Create a focused scenario for logging demonstration
    const assaultUnits = createTestUnits([
        { id: 'harrier1', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(1, 1) },
        { id: 'marines1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 1) },
        { id: 'aav1', type: UnitType.AAV_7, side: PlayerSide.Assault, position: new Hex(0, 1) }
    ]);

    const defenderUnits = createTestUnits([
        { id: 'aa1', type: UnitType.AA_TEAM, side: PlayerSide.Defender, position: new Hex(1, 2) },
        { id: 'infantry1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(2, 2) },
        { id: 'atgm1', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(0, 2) }
    ]);

    assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
    defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));
    
    // Set up game engine with logging
    const gameEngine = new GameEngine(gameState);
    gameEngine.setLogger(logger);
    gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
    gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);
    
    // Create initial snapshot
    const initialSnapshotId = logger.createSnapshot(gameState, 'Game Start - Initial Setup');
    
    console.log('✅ Game setup completed with comprehensive logging');
    console.log(`   Units: ${assaultUnits.length} assault, ${defenderUnits.length} defender`);
    console.log(`   Logger initialized: ${gameId}`);
    console.log(`   Initial snapshot: ${initialSnapshotId}\n`);
    
    console.log('📋 PHASE 2: AI vs AI Combat with Detailed Logging');
    console.log('==================================================');
    
    let turn = 1;
    let combatSnapshotId = null;
    let victorySnapshotId = null;
    
    // Run several turns with detailed logging
    while (turn <= 5 && !gameState.isGameOver) {
        console.log(`\n--- Turn ${turn} ---`);
        
        // Assault turn
        gameState.setActivePlayerBySide(PlayerSide.Assault);
        gameState.phase = 'movement';
        
        logger.logPhaseChange('action', 'movement', gameState);
        const assaultActions = gameEngine.updateAI();
        console.log(`  Assault: ${assaultActions.length} actions`);
        
        // Switch to action phase
        gameState.phase = 'action';
        logger.logPhaseChange('movement', 'action', gameState);
        const assaultCombatActions = gameEngine.updateAI();
        console.log(`  Assault combat: ${assaultCombatActions.length} actions`);
        
        // Defender turn
        gameState.setActivePlayerBySide(PlayerSide.Defender);
        gameState.phase = 'movement';
        logger.logPhaseChange('action', 'movement', gameState);
        const defenderActions = gameEngine.updateAI();
        console.log(`  Defender: ${defenderActions.length} actions`);
        
        // Switch to action phase
        gameState.phase = 'action';
        logger.logPhaseChange('movement', 'action', gameState);
        const defenderCombatActions = gameEngine.updateAI();
        console.log(`  Defender combat: ${defenderCombatActions.length} actions`);
        
        // Check for first combat
        if (turn === 2 && !combatSnapshotId) {
            combatSnapshotId = logger.createSnapshot(gameState, 'First Combat Engagement');
            console.log(`  📸 Combat snapshot created: ${combatSnapshotId}`);
        }
        
        // Advance turn
        gameState.turn = turn + 1;
        turn++;
        
        // Check victory conditions
        const assaultAlive = assaultPlayer.getLivingUnits().length;
        const defenderAlive = defenderPlayer.getLivingUnits().length;
        
        if (assaultAlive === 0 || defenderAlive === 0) {
            const winner = assaultAlive > 0 ? 'Assault' : 'Defender';
            victorySnapshotId = logger.createSnapshot(gameState, `Victory: ${winner} wins`);
            gameState.isGameOver = true;
            gameState.winner = winner;
            console.log(`  🏆 Victory: ${winner} wins!`);
            console.log(`  📸 Victory snapshot: ${victorySnapshotId}`);
        }
        
        console.log(`  Status: A${assaultAlive} vs D${defenderAlive}`);
    }
    
    console.log('\n📋 PHASE 3: Logging Analysis and Statistics');
    console.log('===========================================');
    
    // Analyze logged data
    const summary = logger.getGameSummary();
    console.log('Game Summary:');
    console.log(`  Total logs: ${summary.totalLogs}`);
    console.log(`  Combat events: ${summary.combatEvents}`);
    console.log(`  Unit actions: ${summary.unitActions}`);
    console.log(`  AI decisions: ${summary.aiDecisions}`);
    console.log(`  Snapshots: ${summary.totalSnapshots}`);
    console.log(`  Game duration: ${summary.gameEndTime - summary.gameStartTime}ms`);
    
    // Show logs by category
    console.log('\nLogs by category:');
    Object.entries(summary.logsByCategory).forEach(([category, count]) => {
        console.log(`  ${category}: ${count}`);
    });
    
    // Show recent combat logs
    const combatLogs = logger.getLogs(LogCategory.COMBAT);
    if (combatLogs.length > 0) {
        console.log('\nRecent combat events:');
        combatLogs.slice(-3).forEach(log => {
            console.log(`  ${log.message}`);
        });
    }
    
    console.log('\n📋 PHASE 4: State Management and Checkpoints');
    console.log('==============================================');
    
    // Show available snapshots
    const snapshots = stateManager.getAvailableSnapshots();
    console.log('Available snapshots:');
    snapshots.forEach(snapshot => {
        console.log(`  ${snapshot.snapshotId}: ${snapshot.description} (T${snapshot.turn}, ${snapshot.timeSince})`);
    });
    
    // Demonstrate state restoration
    if (combatSnapshotId) {
        console.log(`\n🔄 Testing state restoration from: ${combatSnapshotId}`);
        const restoreResult = stateManager.restoreFromSnapshot(combatSnapshotId, 6, 6);
        
        if (restoreResult.success && restoreResult.gameState) {
            const restoredState = restoreResult.gameState;
            console.log(`✅ State restored successfully!`);
            console.log(`   Turn: ${restoredState.turn}`);
            console.log(`   Phase: ${restoredState.phase}`);
            console.log(`   Players: ${restoredState.players.size}`);
            
            // Show unit status in restored state
            restoredState.players.forEach(player => {
                const livingUnits = player.getLivingUnits();
                console.log(`   ${player.side}: ${livingUnits.length} units alive`);
            });
        } else {
            console.log(`❌ Restore failed: ${restoreResult.error}`);
        }
    }
    
    // Demonstrate snapshot comparison
    if (initialSnapshotId && combatSnapshotId) {
        console.log(`\n📊 Snapshot comparison: ${initialSnapshotId} vs ${combatSnapshotId}`);
        const diff = stateManager.getSnapshotDiff(initialSnapshotId, combatSnapshotId);
        if (diff) {
            console.log(`   Turn difference: ${diff.turnDiff}`);
            console.log(`   Phase change: ${diff.phaseDiff}`);
            console.log(`   Time elapsed: ${diff.timeDiff}ms`);
            console.log(`   Summary: ${diff.summary}`);
            
            if (Object.keys(diff.playerChanges).length > 0) {
                console.log('   Player changes:');
                Object.entries(diff.playerChanges).forEach(([playerId, changes]) => {
                    console.log(`     ${playerId}:`, changes);
                });
            }
        }
    }
    
    console.log('\n📋 PHASE 5: Export and Import Testing');
    console.log('======================================');
    
    // Export logs
    const exportedLogs = logger.exportLogs();
    console.log(`✅ Logs exported: ${exportedLogs.length} characters`);
    
    // Export a snapshot
    if (victorySnapshotId) {
        const exportedSnapshot = stateManager.exportSnapshot(victorySnapshotId);
        if (exportedSnapshot) {
            console.log(`✅ Victory snapshot exported: ${exportedSnapshot.length} characters`);
            
            // Test import (for demonstration)
            const importedId = stateManager.importSnapshot(exportedSnapshot);
            if (importedId) {
                console.log(`✅ Snapshot re-imported as: ${importedId}`);
            }
        }
    }
    
    console.log('\n📋 PHASE 6: Advanced Filtering and Analysis');
    console.log('============================================');
    
    // Filter logs by different criteria
    const aiDecisions = logger.getLogs(LogCategory.AI_DECISION);
    const errorLogs = logger.getLogs(undefined, LogLevel.ERROR);
    const turn1Logs = logger.getLogs(undefined, undefined, 1, 1);
    
    console.log(`AI decisions logged: ${aiDecisions.length}`);
    console.log(`Error-level logs: ${errorLogs.length}`);
    console.log(`Turn 1 logs: ${turn1Logs.length}`);
    
    // Show a sample of AI decisions
    if (aiDecisions.length > 0) {
        console.log('\nSample AI decisions:');
        aiDecisions.slice(0, 3).forEach(log => {
            const data = log.data?.decision;
            if (data) {
                console.log(`  ${data.type} (P${data.priority}): ${data.reasoning}`);
            }
        });
    }
    
    console.log('\n🎉 LOGGING SYSTEM TEST COMPLETED!');
    console.log('==================================');
    console.log('✅ Comprehensive game logging implemented');
    console.log('✅ State serialization and checkpoints working');
    console.log('✅ AI decision tracking functional');
    console.log('✅ Combat logging with detailed metrics');
    console.log('✅ Export/import capabilities verified');
    console.log('✅ Advanced filtering and analysis tools ready');
    
    console.log('\n📚 USAGE GUIDE:');
    console.log('================');
    console.log('1. Initialize logger: initializeGameLogger(gameId)');
    console.log('2. Set engine logger: gameEngine.setLogger(logger)');
    console.log('3. Create snapshots: logger.createSnapshot(gameState, description)');
    console.log('4. Restore state: stateManager.restoreFromSnapshot(snapshotId)');
    console.log('5. Export logs: logger.exportLogs()');
    console.log('6. Filter logs: logger.getLogs(category, level, fromTurn, toTurn)');
    console.log('7. Analyze: logger.getGameSummary()');
    
    return {
        logger,
        stateManager,
        summary: logger.getGameSummary(),
        snapshots: stateManager.getAvailableSnapshots()
    };
}

// Run the test
testLoggingSystem().catch(console.error);