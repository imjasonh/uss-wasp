#!/usr/bin/env node

/**
 * BALANCE TEST - Quick 3-game analysis
 */

const { GameState } = require('../../dist/core/game/GameState');
const { GameEngine } = require('../../dist/core/game/GameEngine');
const { Player } = require('../../dist/core/game/Player');
const { GameMap } = require('../../dist/core/game/Map');
const { PlayerSide, UnitType } = require('../../dist/core/game/types');
const { AIDifficulty } = require('../../dist/core/ai/types');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper');
const { Hex } = require('../../dist/core/hex');

function runBalanceTest() {
    console.log('⚖️ BALANCE TEST - 3 Games');
    console.log('==========================\n');
    
    const results = [];
    
    for (let game = 1; game <= 3; game++) {
        console.log(`🎮 Game ${game}:`);
        
        try {
            const map = new GameMap(8, 8);
            const gameState = new GameState(`balance-test-${game}`, map, 8); // Shorter for testing
            
            const assaultPlayer = new Player('assault', PlayerSide.Assault);
            const defenderPlayer = new Player('defender', PlayerSide.Defender);
            
            gameState.addPlayer(assaultPlayer);
            gameState.addPlayer(defenderPlayer);
            gameState.setActivePlayerBySide(PlayerSide.Assault);

            // Current positioning from test-ai-battle-series.js
            const assaultUnits = createTestUnits([
                { id: 'wasp', type: UnitType.USS_WASP, side: PlayerSide.Assault, position: new Hex(0, 6) },
                { id: 'harrier1', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(1, 5) },
                { id: 'harrier2', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(0, 5) },
                { id: 'osprey', type: UnitType.OSPREY, side: PlayerSide.Assault, position: new Hex(1, 4) },
                { id: 'marines1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 3) },
                { id: 'marines2', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 4) },
                { id: 'marsoc', type: UnitType.MARSOC, side: PlayerSide.Assault, position: new Hex(1, 3) },
                { id: 'aav', type: UnitType.AAV_7, side: PlayerSide.Assault, position: new Hex(1, 2) }
            ]);

            const defenderUnits = createTestUnits([
                { id: 'infantry1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 3) },
                { id: 'infantry2', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 4) },
                { id: 'atgm1', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(2, 2) },
                { id: 'atgm2', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(2, 1) },
                { id: 'aa_team', type: UnitType.AA_TEAM, side: PlayerSide.Defender, position: new Hex(4, 3) },
                { id: 'mortar', type: UnitType.MORTAR_TEAM, side: PlayerSide.Defender, position: new Hex(5, 5) },
                { id: 'artillery', type: UnitType.ARTILLERY, side: PlayerSide.Defender, position: new Hex(6, 6) },
                { id: 'sam_site', type: UnitType.SAM_SITE, side: PlayerSide.Defender, position: new Hex(4, 4) }
            ]);

            assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
            defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

            const gameEngine = new GameEngine(gameState);
            gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
            gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

            let turn = 1;
            let winner = null;
            let assaultCasualties = 0;
            let defenderCasualties = 0;
            
            console.log(`  Initial: A${assaultPlayer.getLivingUnits().length} vs D${defenderPlayer.getLivingUnits().length}`);

            while (turn <= 8 && !winner) {
                const startAssault = assaultPlayer.getLivingUnits().length;
                const startDefender = defenderPlayer.getLivingUnits().length;
                
                // Quick turn processing
                gameState.setActivePlayerBySide(PlayerSide.Assault);
                gameState.phase = 'action';
                const assaultActions = gameEngine.updateAI();
                
                gameState.setActivePlayerBySide(PlayerSide.Defender);
                gameState.phase = 'action';
                const defenderActions = gameEngine.updateAI();
                
                const endAssault = assaultPlayer.getLivingUnits().length;
                const endDefender = defenderPlayer.getLivingUnits().length;
                
                const turnAssaultLosses = startAssault - endAssault;
                const turnDefenderLosses = startDefender - endDefender;
                
                assaultCasualties += turnAssaultLosses;
                defenderCasualties += turnDefenderLosses;
                
                if (turnAssaultLosses > 0 || turnDefenderLosses > 0) {
                    console.log(`  T${turn}: A${endAssault}(-${turnAssaultLosses}) vs D${endDefender}(-${turnDefenderLosses})`);
                }
                
                if (endAssault === 0) {
                    winner = 'Defender';
                    break;
                } else if (endDefender === 0) {
                    winner = 'Assault';
                    break;
                }
                
                turn++;
            }
            
            if (!winner) {
                const finalAssault = assaultPlayer.getLivingUnits().length;
                const finalDefender = defenderPlayer.getLivingUnits().length;
                winner = finalAssault > finalDefender ? 'Assault' : 'Defender';
            }
            
            const result = {
                game,
                winner,
                turns: turn - 1,
                assaultCasualties,
                defenderCasualties,
                finalAssault: assaultPlayer.getLivingUnits().length,
                finalDefender: defenderPlayer.getLivingUnits().length
            };
            
            results.push(result);
            console.log(`  Result: ${winner} victory (${result.turns} turns, A:${result.assaultCasualties} D:${result.defenderCasualties} casualties)\n`);
            
        } catch (error) {
            console.log(`  ERROR: ${error.message}\n`);
            results.push({ game, winner: 'Error', error: error.message });
        }
    }
    
    // Analysis
    console.log('📊 BALANCE ANALYSIS:');
    const validGames = results.filter(r => r.winner !== 'Error');
    const assaultWins = validGames.filter(r => r.winner === 'Assault').length;
    const defenderWins = validGames.filter(r => r.winner === 'Defender').length;
    
    console.log(`  Assault Wins: ${assaultWins}/${validGames.length} (${Math.round(assaultWins/validGames.length*100)}%)`);
    console.log(`  Defender Wins: ${defenderWins}/${validGames.length} (${Math.round(defenderWins/validGames.length*100)}%)`);
    
    if (validGames.length > 0) {
        const avgAssaultCasualties = validGames.reduce((sum, r) => sum + r.assaultCasualties, 0) / validGames.length;
        const avgDefenderCasualties = validGames.reduce((sum, r) => sum + r.defenderCasualties, 0) / validGames.length;
        const avgTurns = validGames.reduce((sum, r) => sum + r.turns, 0) / validGames.length;
        
        console.log(`  Avg Assault Casualties: ${avgAssaultCasualties.toFixed(1)}`);
        console.log(`  Avg Defender Casualties: ${avgDefenderCasualties.toFixed(1)}`);
        console.log(`  Avg Game Length: ${avgTurns.toFixed(1)} turns`);
        
        // Balance recommendations
        console.log('\n🎯 BALANCE RECOMMENDATIONS:');
        if (assaultWins > defenderWins * 1.5) {
            console.log('  ⚠️ ASSAULT TOO STRONG - Nerf air power or boost defender range');
        } else if (defenderWins > assaultWins * 1.5) {
            console.log('  ⚠️ DEFENDERS TOO STRONG - Buff assault positioning or weapons');
        } else {
            console.log('  ✅ BALANCED - Fine-tune for more decisive victories');
        }
        
        if (avgTurns >= 7) {
            console.log('  ⚠️ GAMES TOO LONG - Increase lethality or improve positioning');
        }
        
        if (avgAssaultCasualties < 2 || avgDefenderCasualties < 2) {
            console.log('  ⚠️ NOT ENOUGH CASUALTIES - Combat too conservative');
        }
    }
    
    return results;
}

runBalanceTest();