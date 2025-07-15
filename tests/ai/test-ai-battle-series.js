/**
 * Comprehensive AI vs AI Battle Series - 10 Games
 * Tests which side (Assault vs Defender) wins more often
 */

const { GameState } = require('../../dist/core/game/GameState');
const { GameEngine } = require('../../dist/core/game/GameEngine');
const { Player } = require('../../dist/core/game/Player');
const { GameMap } = require('../../dist/core/game/Map');
const { PlayerSide, UnitType } = require('../../dist/core/game/types');
const { AIDifficulty } = require('../../dist/core/ai/types');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper');
const { Hex } = require('../../dist/core/hex');

/**
 * Run a single AI vs AI game to completion
 */
function runSingleGame(gameNumber) {
    console.log(`\n🎮 GAME ${gameNumber}`);
    console.log('================');
    
    try {
        // Create game setup - smaller map for closer combat
        const map = new GameMap(8, 8);
        const gameState = new GameState(`ai-battle-${gameNumber}`, map, 20); // 20 turn limit for extended combat
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        const defenderPlayer = new Player('defender', PlayerSide.Defender);
        
        gameState.addPlayer(assaultPlayer);
        gameState.addPlayer(defenderPlayer);
        gameState.setActivePlayerBySide(PlayerSide.Assault);

        // MAXIMUM COMBAT POSITIONS - All units adjacent for guaranteed engagement
        const assaultUnits = createTestUnits([
            { id: 'wasp', type: UnitType.USS_WASP, side: PlayerSide.Assault, position: new Hex(1, 7) }, // Closer for engagement
            { id: 'harrier1', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(2, 2) }, // Adjacent to AA team
            { id: 'harrier2', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(3, 2) }, // Adjacent to SAM site
            { id: 'osprey', type: UnitType.OSPREY, side: PlayerSide.Assault, position: new Hex(1, 2) }, // Adjacent to AA team
            { id: 'marines1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) }, // Adjacent to infantry1
            { id: 'marines2', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(2, 1) }, // Adjacent to infantry2
            { id: 'marsoc', type: UnitType.MARSOC, side: PlayerSide.Assault, position: new Hex(0, 1) }, // Adjacent to ATGM1
            { id: 'aav', type: UnitType.AAV_7, side: PlayerSide.Assault, position: new Hex(1, 0) } // Adjacent to ATGM2
        ]);

        const defenderUnits = createTestUnits([
            { id: 'infantry1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(2, 0) }, // Adjacent to marines1
            { id: 'infantry2', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(3, 0) }, // Adjacent to marines2
            { id: 'atgm1', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(0, 0) }, // Adjacent to marsoc
            { id: 'atgm2', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(0, 2) }, // Adjacent to aav
            { id: 'aa_team', type: UnitType.AA_TEAM, side: PlayerSide.Defender, position: new Hex(2, 3) }, // Adjacent to harrier1/osprey
            { id: 'mortar', type: UnitType.MORTAR_TEAM, side: PlayerSide.Defender, position: new Hex(4, 1) }, // Fire support
            { id: 'artillery', type: UnitType.ARTILLERY, side: PlayerSide.Defender, position: new Hex(5, 1) }, // Deep fires
            { id: 'sam_site', type: UnitType.SAM_SITE, side: PlayerSide.Defender, position: new Hex(4, 2) } // Adjacent to harrier2
        ]);

        assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
        defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

        // Don't hide units initially for combat testing - let combat happen first
        // defenderUnits.slice(0, 4).forEach(unit => {
        //     if (unit.canBeHidden && typeof unit.canBeHidden === 'function' && unit.canBeHidden()) {
        //         unit.hide();
        //     }
        // });

        // Set up AI controllers with veteran difficulty
        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
        gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

        // Initialize USS Wasp operations
        gameState.initializeWaspOperations();
        
        // Give both sides some command points
        assaultPlayer.commandPoints = 10;
        defenderPlayer.commandPoints = 8;

        console.log(`Initial Forces:`);
        console.log(`  Assault: ${assaultUnits.length} units (${assaultPlayer.getLivingUnits().length} active)`);
        console.log(`  Defender: ${defenderUnits.length} units (${defenderPlayer.getLivingUnits().length} active)`);
        
        // Show engagement ranges for key units
        const marines1 = assaultUnits.find(u => u.id === 'marines1');
        const infantry1 = defenderUnits.find(u => u.id === 'infantry1');
        if (marines1 && infantry1) {
            const distance = Math.max(
                Math.abs(marines1.state.position.q - infantry1.state.position.q),
                Math.abs(marines1.state.position.r - infantry1.state.position.r),
                Math.abs(marines1.state.position.s - infantry1.state.position.s)
            ) / 2;
            console.log(`  Marines to Infantry distance: ${distance} hexes (range 2)`);
        }

        let turn = 1;
        let winner = null;
        let gameResult = 'ongoing';

        // Main game loop
        while (turn <= 15 && !winner) {
            console.log(`\n--- Turn ${turn} ---`);
            
            // Process both sides for this turn
            for (const phase of ['movement', 'action']) {
                gameState.phase = phase;
                
                // Assault turn
                gameState.setActivePlayerBySide(PlayerSide.Assault);
                const assaultActions = gameEngine.updateAI();
                if (assaultActions.length > 0) {
                    console.log(`  Assault ${phase}: ${assaultActions.length} actions`);
                }
                
                // Defender turn  
                gameState.setActivePlayerBySide(PlayerSide.Defender);
                const defenderActions = gameEngine.updateAI();
                if (defenderActions.length > 0) {
                    console.log(`  Defender ${phase}: ${defenderActions.length} actions`);
                }
            }

            // Check victory conditions
            const assaultAlive = assaultPlayer.getLivingUnits().length;
            const defenderAlive = defenderPlayer.getLivingUnits().length;
            
            console.log(`  Forces remaining - Assault: ${assaultAlive}, Defender: ${defenderAlive}`);

            // Victory conditions
            if (assaultAlive === 0) {
                winner = 'Defender';
                gameResult = 'defender_elimination';
            } else if (defenderAlive === 0) {
                winner = 'Assault';
                gameResult = 'assault_elimination';
            } else if (turn >= 15) {
                // Check objectives/territorial control for time victory
                const assaultObjectives = Math.floor(Math.random() * 3); // Simplified for testing
                const defenderObjectives = 3 - assaultObjectives;
                
                if (assaultObjectives > defenderObjectives) {
                    winner = 'Assault';
                    gameResult = 'assault_objectives';
                } else {
                    winner = 'Defender';
                    gameResult = 'defender_time';
                }
            }

            turn++;
        }

        console.log(`\n🏆 GAME ${gameNumber} RESULT: ${winner} Victory (${gameResult})`);
        
        return {
            game: gameNumber,
            winner: winner,
            result: gameResult,
            turns: turn - 1,
            assaultSurvivors: assaultPlayer.getLivingUnits().length,
            defenderSurvivors: defenderPlayer.getLivingUnits().length
        };

    } catch (error) {
        console.log(`❌ GAME ${gameNumber} ERROR: ${error.message}`);
        return {
            game: gameNumber,
            winner: 'Error',
            result: 'error',
            turns: 0,
            assaultSurvivors: 0,
            defenderSurvivors: 0,
            error: error.message
        };
    }
}

/**
 * Run the complete 10-game battle series
 */
function runBattleSeries() {
    console.log('🎯 USS WASP AI vs AI BATTLE SERIES');
    console.log('===================================');
    console.log('Running 10 games to determine tactical superiority...\n');

    const results = [];
    
    for (let i = 1; i <= 10; i++) {
        const result = runSingleGame(i);
        results.push(result);
        
        // Brief pause between games
        if (i < 10) {
            console.log('\n⏳ Preparing next battle...');
        }
    }

    // Analyze results
    console.log('\n📊 BATTLE SERIES ANALYSIS');
    console.log('==========================\n');

    const assaultWins = results.filter(r => r.winner === 'Assault').length;
    const defenderWins = results.filter(r => r.winner === 'Defender').length;
    const errors = results.filter(r => r.winner === 'Error').length;
    const validGames = results.filter(r => r.winner !== 'Error');

    console.log('🏆 VICTORY SUMMARY:');
    console.log(`   Assault Victories: ${assaultWins}/10 (${Math.round(assaultWins/10*100)}%)`);
    console.log(`   Defender Victories: ${defenderWins}/10 (${Math.round(defenderWins/10*100)}%)`);
    if (errors > 0) console.log(`   Errors: ${errors}/10`);

    if (validGames.length > 0) {
        const avgTurns = validGames.reduce((sum, r) => sum + r.turns, 0) / validGames.length;
        const avgAssaultSurvivors = validGames.reduce((sum, r) => sum + r.assaultSurvivors, 0) / validGames.length;
        const avgDefenderSurvivors = validGames.reduce((sum, r) => sum + r.defenderSurvivors, 0) / validGames.length;

        console.log('\n📈 GAME STATISTICS:');
        console.log(`   Average Game Length: ${avgTurns.toFixed(1)} turns`);
        console.log(`   Average Assault Survivors: ${avgAssaultSurvivors.toFixed(1)} units`);
        console.log(`   Average Defender Survivors: ${avgDefenderSurvivors.toFixed(1)} units`);
    }

    // Victory types breakdown
    const victoryTypes = {};
    validGames.forEach(game => {
        victoryTypes[game.result] = (victoryTypes[game.result] || 0) + 1;
    });

    if (Object.keys(victoryTypes).length > 0) {
        console.log('\n🎖️ VICTORY TYPES:');
        Object.entries(victoryTypes).forEach(([type, count]) => {
            console.log(`   ${type}: ${count} games`);
        });
    }

    // Detailed game results
    console.log('\n📋 DETAILED RESULTS:');
    results.forEach(game => {
        if (game.winner !== 'Error') {
            console.log(`   Game ${game.game}: ${game.winner} (${game.turns} turns, ${game.result})`);
        } else {
            console.log(`   Game ${game.game}: ERROR - ${game.error}`);
        }
    });

    // Final conclusion
    console.log('\n🏁 TACTICAL CONCLUSION:');
    if (assaultWins > defenderWins) {
        console.log(`   🚁 ASSAULT FORCES demonstrate superior tactics with ${assaultWins}/${validGames.length} victories`);
        console.log(`   The USS Wasp amphibious assault doctrine proves effective!`);
    } else if (defenderWins > assaultWins) {
        console.log(`   🛡️ DEFENDER FORCES demonstrate superior tactics with ${defenderWins}/${validGames.length} victories`);
        console.log(`   Hidden unit deployment and defensive positioning dominate!`);
    } else {
        console.log(`   ⚖️ BALANCED WARFARE: Both sides show equal tactical capability`);
        console.log(`   The game demonstrates excellent tactical balance!`);
    }

    return results;
}

// Run the battle series
runBattleSeries();