#!/usr/bin/env node

/**
 * DEBUG COMPLETE AA ATTACK FLOW
 * Trace from AI decision through action execution
 */

const { GameState } = require('../../dist/core/game/GameState');
const { GameEngine } = require('../../dist/core/game/GameEngine');
const { Player } = require('../../dist/core/game/Player');
const { GameMap } = require('../../dist/core/game/Map');
const { PlayerSide, UnitType, ActionType } = require('../../dist/core/game/types');
const { AIDifficulty } = require('../../dist/core/ai/types');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper');
const { Hex } = require('../../dist/core/hex');

function debugAAFullFlow() {
    console.log('🎯 DEBUG COMPLETE AA ATTACK FLOW');
    console.log('==================================\n');
    
    // Create minimal test scenario
    const map = new GameMap(8, 8);
    const gameState = new GameState('aa-flow-debug', map, 20);
    
    const assaultPlayer = new Player('assault', PlayerSide.Assault);
    const defenderPlayer = new Player('defender', PlayerSide.Defender);
    
    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);
    
    // Create AA team and aircraft
    const aaTeam = createTestUnits([
        { id: 'aa', type: UnitType.AA_TEAM, side: PlayerSide.Defender, position: new Hex(2, 3) }
    ])[0];
    
    const harrier = createTestUnits([
        { id: 'harrier', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(2, 2) }
    ])[0];
    
    defenderPlayer.addUnit(aaTeam);
    assaultPlayer.addUnit(harrier);
    
    // Set up game engine with AI
    const gameEngine = new GameEngine(gameState);
    gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);
    
    gameState.setActivePlayerBySide(PlayerSide.Defender);
    gameState.phase = 'action';
    
    console.log('INITIAL SETUP:');
    console.log(`  AA Team: (${aaTeam.state.position.q}, ${aaTeam.state.position.r}) - canAct: ${aaTeam.canAct()}`);
    console.log(`  Harrier: (${harrier.state.position.q}, ${harrier.state.position.r}) - isAlive: ${harrier.isAlive()}`);
    console.log(`  Active player: ${gameState.currentPlayerId}`);
    console.log(`  Game phase: ${gameState.phase}`);
    
    // Manual distance check
    const distance = Math.max(
        Math.abs(aaTeam.state.position.q - harrier.state.position.q),
        Math.abs(aaTeam.state.position.r - harrier.state.position.r),
        Math.abs(aaTeam.state.position.s - harrier.state.position.s)
    );
    console.log(`  Distance: ${distance} hexes`);
    
    // Test manual combat validation
    const { CombatSystem } = require('../../dist/core/game/Combat');
    const canAttackResult = CombatSystem.canAttack(aaTeam, harrier, gameState);
    console.log(`\nCOMBAT VALIDATION:`);
    console.log(`  canAttack result: ${canAttackResult.valid}`);
    if (!canAttackResult.valid) {
        console.log(`  Reason: ${canAttackResult.reason}`);
    }
    
    // Skip manual test and go straight to AI test
    console.log(`\nSKIPPING MANUAL TEST - GOING TO AI TEST`);
    console.log(`  (Manual test would work but would kill the target)`);
    console.log(`  AA Team initial hasActed: ${aaTeam.state.hasActed}`);
    
    console.log(`\nAI FLOW TEST:`);
    console.log(`  AA Team hasActed reset: ${aaTeam.state.hasActed}`);
    
    // Run AI update
    const aiActions = gameEngine.updateAI();
    console.log(`  AI generated ${aiActions.length} actions`);
    
    aiActions.forEach((action, i) => {
        console.log(`  Action ${i+1}: ${action.type} from ${action.unitId} to ${action.targetId || action.targetPosition}`);
    });
    
    // Check if AA team actually attacked
    console.log(`\nFINAL STATE:`);
    console.log(`  AA Team hasActed: ${aaTeam.state.hasActed}`);
    console.log(`  Harrier HP: ${harrier.state.currentHP}/${harrier.stats.hp}`);
    console.log(`  Harrier alive: ${harrier.isAlive()}`);
    
    // Try to identify why AA might not be attacking
    if (aiActions.length === 0) {
        console.log(`\n❌ NO AI ACTIONS GENERATED!`);
    } else {
        const attackActions = aiActions.filter(a => a.type === ActionType.ATTACK);
        console.log(`\n  Attack actions: ${attackActions.length}`);
        const aaAttacks = attackActions.filter(a => a.unitId === 'aa');
        console.log(`  AA Team attacks: ${aaAttacks.length}`);
        
        if (aaAttacks.length === 0) {
            console.log(`  ❌ AA Team generated no attack actions!`);
        } else {
            console.log(`  ✅ AA Team generated attack actions!`);
        }
    }
}

debugAAFullFlow();