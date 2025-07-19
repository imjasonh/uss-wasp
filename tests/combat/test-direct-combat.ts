#!/usr/bin/env npx tsx

/**
 * Test AI combat with units starting adjacent (direct combat range)
 */

import { GameState } from '../../dist/core/game/GameState.js';
import { GameEngine } from '../../dist/core/game/GameEngine.js';
import { Player } from '../../dist/core/game/Player.js';
import { GameMap } from '../../dist/core/game/Map.js';
import { PlayerSide, UnitType } from '../../dist/core/game/types.js';
import { AIDifficulty } from '../../dist/core/ai/types.js';
import { createTestUnits } from '../../dist/testing/UnitTestHelper.js';
import { Hex } from '../../dist/core/hex/index.js';
import { GameVisualizationLogger } from '../../dist/core/logging/GameVisualizationLogger.js';
import * as fs from 'fs';

console.log('🔥 Direct Combat AI Test');
console.log('========================\n');

try {
    // Create direct combat scenario - units very close
    const map = new GameMap(4, 4);
    const gameState = new GameState('direct-combat-test', map, 10);
    
    const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
    const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);
    
    assaultPlayer.commandPoints = 10;
    defenderPlayer.commandPoints = 10;
    
    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);
    gameState.setActivePlayerBySide(PlayerSide.Assault);

    // Create units starting adjacent (within combat range)
    const assaultUnits = createTestUnits([
        { id: 'assault-1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
        { id: 'assault-2', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(0, 1) }
    ]);

    const defenderUnits = createTestUnits([
        { id: 'defender-1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(2, 1) },
        { id: 'defender-2', type: UnitType.TECHNICAL, side: PlayerSide.Defender, position: new Hex(2, 2) }
    ]);

    // Add units to players
    assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
    defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

    const gameEngine = new GameEngine(gameState);
    const vizLogger = gameEngine.enableVisualizationLogging('direct-combat-test');
    console.log('✅ Visualization logging enabled');
    
    gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
    gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

    console.log('✅ Direct combat scenario setup:');
    console.log(`   Assault: Marines at (1,1), Humvee at (0,1)`);
    console.log(`   Defender: Infantry at (2,1), Technical at (2,2)`);
    console.log(`   Distance: 1-2 hexes (optimal combat range)\n`);

    let totalCombatActions = 0;
    let totalDamageDealt = 0;

    // Test action phase combat specifically
    for (let turn = 1; turn <= 5; turn++) {
        console.log(`--- Turn ${turn} ---`);
        
        // Check initial health states
        const initialAssaultHealth = assaultPlayer.getLivingUnits().reduce((sum, u) => sum + u.state.health, 0);
        const initialDefenderHealth = defenderPlayer.getLivingUnits().reduce((sum, u) => sum + u.state.health, 0);
        
        // Assault action phase
        gameState.setActivePlayerBySide(PlayerSide.Assault);
        gameState.phase = 'action';
        const assaultActions = gameEngine.updateAI();
        
        // Defender action phase  
        gameState.setActivePlayerBySide(PlayerSide.Defender);
        gameState.phase = 'action';
        const defenderActions = gameEngine.updateAI();
        
        // Check final health states
        const finalAssaultHealth = assaultPlayer.getLivingUnits().reduce((sum, u) => sum + u.state.health, 0);
        const finalDefenderHealth = defenderPlayer.getLivingUnits().reduce((sum, u) => sum + u.state.health, 0);
        
        const combatActions = [...assaultActions, ...defenderActions].filter(a => a.type === 'attack').length;
        totalCombatActions += combatActions;
        
        const damageThisTurn = (initialAssaultHealth - finalAssaultHealth) + (initialDefenderHealth - finalDefenderHealth);
        totalDamageDealt += damageThisTurn;
        
        console.log(`  Combat actions: ${combatActions} attacks`);
        console.log(`  Damage dealt: ${damageThisTurn} points`);
        console.log(`  Assault: ${assaultPlayer.getLivingUnits().length} alive, ${finalAssaultHealth} total HP`);
        console.log(`  Defender: ${defenderPlayer.getLivingUnits().length} alive, ${finalDefenderHealth} total HP`);
        
        // Stop if one side is eliminated
        if (assaultPlayer.getLivingUnits().length === 0 || defenderPlayer.getLivingUnits().length === 0) {
            console.log(`\n🏆 Combat concluded on turn ${turn}!`);
            break;
        }
    }

    console.log('\n📊 COMBAT ANALYSIS:');
    console.log(`   Total Combat Actions: ${totalCombatActions}`);
    console.log(`   Total Damage Dealt: ${totalDamageDealt}`);
    console.log(`   Assault Survivors: ${assaultPlayer.getLivingUnits().length}`);
    console.log(`   Defender Survivors: ${defenderPlayer.getLivingUnits().length}`);
    
    // Export visualization log
    const fullLog = vizLogger.exportVisualizationLog();
    const logPath = './tests/combat/logs/direct-combat-visualization.json';
    
    // Ensure logs directory exists
    if (!fs.existsSync('./tests/combat/logs')) {
        fs.mkdirSync('./tests/combat/logs', { recursive: true });
    }
    
    fs.writeFileSync(logPath, JSON.stringify(fullLog, null, 2));
    console.log(`\n📊 Visualization log saved: ${logPath}`);
    console.log(`   - Total actions: ${fullLog.summary.totalActions}`);
    console.log(`   - Combat engagements: ${fullLog.summary.combatEngagements}`);
    console.log(`   - Movement actions: ${fullLog.summary.movementActions}`);
    
    if (totalCombatActions > 0) {
        console.log('\n✅ SUCCESS: AI systems engage in direct combat');
        console.log('   Units positioned correctly for optimal engagement');
        console.log('   Combat actions generated and executed');
    } else {
        console.log('\n❌ FAILURE: No combat actions detected');
        console.log('   Units may not be engaging despite proximity');
    }

} catch (error) {
    console.error('💥 Direct Combat Test Error:', (error as Error).message);
    console.error((error as Error).stack);
    process.exit(1);
}