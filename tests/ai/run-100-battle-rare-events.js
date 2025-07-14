/**
 * 100 AI vs AI Battle Analysis - Looking for rare and unusual events
 * This script runs 100 battles and analyzes the combat logs for interesting patterns
 */

const { GameState } = require('../../dist/core/game/GameState');
const { GameEngine } = require('../../dist/core/game/GameEngine');
const { Player } = require('../../dist/core/game/Player');
const { GameMap } = require('../../dist/core/game/Map');
const { PlayerSide, UnitType } = require('../../dist/core/game/types');
const { AIDifficulty } = require('../../dist/core/ai/types');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper');
const { Hex } = require('../../dist/core/hex');

// Track rare events
const rareEvents = {
    perfectRolls: [],
    catastrophicFailures: [],
    epicBattles: [],
    quickVictories: [],
    massiveDestructions: [],
    unusualStateTransitions: [],
    extremeRollSequences: [],
    miracleShots: [],
    totalMisses: [],
    longStalemates: []
};

// Statistics tracking
const battleStats = {
    totalGames: 0,
    assaultWins: 0,
    defenderWins: 0,
    draws: 0,
    averageTurns: 0,
    totalTurns: 0,
    totalActions: 0,
    totalDestructions: 0,
    shortestGame: 999,
    longestGame: 0,
    highestDamage: 0,
    mostActionsInTurn: 0
};

/**
 * Analyze a single dice roll for interesting patterns
 */
function analyzeDiceRoll(rollText, gameNumber, turn) {
    const rollMatch = rollText.match(/rolled ([^)]+)\)/);
    if (!rollMatch) return;
    
    const rolls = rollMatch[1].split(', ').map(r => parseInt(r.trim()));
    const sum = rolls.reduce((a, b) => a + b, 0);
    const avg = sum / rolls.length;
    
    // Perfect rolls (all 6s)
    if (rolls.length > 1 && rolls.every(r => r === 6)) {
        rareEvents.perfectRolls.push({
            game: gameNumber,
            turn,
            dice: rolls,
            context: rollText
        });
    }
    
    // Catastrophic failures (all 1s)
    if (rolls.length > 1 && rolls.every(r => r === 1)) {
        rareEvents.catastrophicFailures.push({
            game: gameNumber,
            turn,
            dice: rolls,
            context: rollText
        });
    }
    
    // Extreme sequences (very high or very low total)
    if (rolls.length >= 3) {
        if (sum >= rolls.length * 5) {
            rareEvents.extremeRollSequences.push({
                game: gameNumber,
                turn,
                dice: rolls,
                sum,
                average: avg,
                context: rollText,
                type: 'high'
            });
        } else if (sum <= rolls.length * 2) {
            rareEvents.extremeRollSequences.push({
                game: gameNumber,
                turn,
                dice: rolls,
                sum,
                average: avg,
                context: rollText,
                type: 'low'
            });
        }
    }
    
    // Track highest damage
    if (rollText.includes('damage')) {
        const damageMatch = rollText.match(/for (\d+) damage/);
        if (damageMatch) {
            const damage = parseInt(damageMatch[1]);
            if (damage > battleStats.highestDamage) {
                battleStats.highestDamage = damage;
            }
        }
    }
    
    // Miracle shots (no hits on high rolls)
    if (rollText.includes('- no hits') && avg >= 4) {
        rareEvents.miracleShots.push({
            game: gameNumber,
            turn,
            dice: rolls,
            average: avg,
            context: rollText
        });
    }
    
    // Total misses on multiple dice
    if (rollText.includes('- no hits') && rolls.length >= 4) {
        rareEvents.totalMisses.push({
            game: gameNumber,
            turn,
            dice: rolls,
            context: rollText
        });
    }
}

/**
 * Analyze combat log for patterns
 */
function analyzeGameEvents(gameNumber, logs) {
    let turnCount = 0;
    let actionCount = 0;
    let destructionCount = 0;
    let currentTurn = 0;
    let maxActionsInTurn = 0;
    let actionsThisTurn = 0;
    
    logs.forEach(log => {
        // Track turns
        if (log.includes('--- Turn')) {
            const turnMatch = log.match(/--- Turn (\d+) ---/);
            if (turnMatch) {
                if (actionsThisTurn > maxActionsInTurn) {
                    maxActionsInTurn = actionsThisTurn;
                }
                actionsThisTurn = 0;
                currentTurn = parseInt(turnMatch[1]);
                turnCount = currentTurn;
            }
        }
        
        // Track actions
        if (log.includes('Action succeeded') || log.includes('Action failed')) {
            actionCount++;
            actionsThisTurn++;
        }
        
        // Track destructions
        if (log.includes('TARGET DESTROYED')) {
            destructionCount++;
        }
        
        // Analyze dice rolls
        if (log.includes('rolled')) {
            analyzeDiceRoll(log, gameNumber, currentTurn);
        }
        
        // Track state transitions
        if (log.includes('State transition:')) {
            const transitionMatch = log.match(/State transition: (.+) -> (.+) \((.+)\)/);
            if (transitionMatch) {
                const [, from, to, reason] = transitionMatch;
                if (from === 'preparation' && to === 'final_stand') {
                    rareEvents.unusualStateTransitions.push({
                        game: gameNumber,
                        turn: currentTurn,
                        transition: `${from} -> ${to}`,
                        reason,
                        context: log
                    });
                }
            }
        }
    });
    
    // Update battle stats
    battleStats.totalTurns += turnCount;
    battleStats.totalActions += actionCount;
    battleStats.totalDestructions += destructionCount;
    
    if (turnCount < battleStats.shortestGame) {
        battleStats.shortestGame = turnCount;
    }
    if (turnCount > battleStats.longestGame) {
        battleStats.longestGame = turnCount;
    }
    if (maxActionsInTurn > battleStats.mostActionsInTurn) {
        battleStats.mostActionsInTurn = maxActionsInTurn;
    }
    
    // Classify battle types
    if (turnCount <= 3) {
        rareEvents.quickVictories.push({
            game: gameNumber,
            turns: turnCount,
            actions: actionCount,
            destructions: destructionCount
        });
    } else if (turnCount >= 15) {
        rareEvents.longStalemates.push({
            game: gameNumber,
            turns: turnCount,
            actions: actionCount,
            destructions: destructionCount
        });
    }
    
    if (destructionCount >= 5) {
        rareEvents.massiveDestructions.push({
            game: gameNumber,
            turns: turnCount,
            destructions: destructionCount
        });
    }
    
    if (actionCount >= 100) {
        rareEvents.epicBattles.push({
            game: gameNumber,
            turns: turnCount,
            actions: actionCount,
            destructions: destructionCount
        });
    }
}

/**
 * Run a single AI vs AI game with detailed logging
 */
function runSingleGame(gameNumber) {
    const logs = [];
    
    // Capture console output
    const originalLog = console.log;
    console.log = (...args) => {
        const message = args.join(' ');
        logs.push(message);
        if (gameNumber <= 5) { // Only show first 5 games in detail
            originalLog(...args);
        }
    };
    
    try {
        // Create game setup
        const map = new GameMap(8, 8);
        const gameState = new GameState(`ai-battle-${gameNumber}`, map, 20);
        
        const assaultPlayer = new Player('assault', PlayerSide.Assault);
        const defenderPlayer = new Player('defender', PlayerSide.Defender);
        
        gameState.addPlayer(assaultPlayer);
        gameState.addPlayer(defenderPlayer);
        
        // Add test units for realistic combat
        const assaultUnits = createTestUnits([
            { type: UnitType.USS_WASP, count: 1, side: PlayerSide.Assault },
            { type: UnitType.HARRIER, count: 2, side: PlayerSide.Assault },
            { type: UnitType.OSPREY, count: 1, side: PlayerSide.Assault },
            { type: UnitType.MARINE_SQUAD, count: 2, side: PlayerSide.Assault },
            { type: UnitType.MARSOC, count: 1, side: PlayerSide.Assault },
            { type: UnitType.AAV_7, count: 1, side: PlayerSide.Assault },
        ]);
        
        const defenderUnits = createTestUnits([
            { type: UnitType.INFANTRY_SQUAD, count: 2, side: PlayerSide.Defender },
            { type: UnitType.ATGM_TEAM, count: 2, side: PlayerSide.Defender },
            { type: UnitType.MORTAR_TEAM, count: 1, side: PlayerSide.Defender },
            { type: UnitType.AA_TEAM, count: 1, side: PlayerSide.Defender },
            { type: UnitType.ARTILLERY, count: 1, side: PlayerSide.Defender },
            { type: UnitType.SAM_SITE, count: 1, side: PlayerSide.Defender },
        ]);
        
        // Position units for combat
        assaultUnits.forEach((unit, index) => {
            const row = Math.floor(index / 2);
            const col = index % 2;
            unit.state.position = { q: col, r: row, s: -(col + row) };
            assaultPlayer.addUnit(unit);
        });
        
        defenderUnits.forEach((unit, index) => {
            const row = Math.floor(index / 2) + 5;
            const col = (index % 2) + 4;
            unit.state.position = { q: col, r: row, s: -(col + row) };
            defenderPlayer.addUnit(unit);
        });
        
        // Set up AI controllers
        const gameEngine = new GameEngine(gameState);
        gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
        gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);
        
        // Initialize command points
        assaultPlayer.commandPoints = 5;
        defenderPlayer.commandPoints = 5;
        
        // Set active player
        gameState.setActivePlayerBySide(PlayerSide.Assault);
        
        // Run the battle
        let turnCount = 0;
        const maxTurns = 20;
        
        while (!gameState.isGameOver && turnCount < maxTurns) {
            turnCount++;
            
            if (gameNumber <= 5) {
                console.log(`\n--- Turn ${turnCount} ---`);
            }
            
            // Process AI turn for current player
            const activePlayer = gameState.getActivePlayer();
            if (activePlayer && gameEngine.isAIControlled(activePlayer.id)) {
                const aiActions = gameEngine.updateAI();
                
                if (aiActions.length > 0 && gameNumber <= 5) {
                    console.log(`[AI] Executing ${aiActions.length} actions for player ${activePlayer.id}`);
                }
                
                // Execute AI actions
                aiActions.forEach(action => {
                    const result = gameEngine.executeAction(action);
                    if (gameNumber <= 5) {
                        console.log(`[AI] Attempting action: ${action.type} for unit ${action.unitId}`);
                        console.log(`[AI] ${result.success ? '✅' : '❌'} ${result.message}`);
                    }
                });
            }
            
            // Switch to next player
            gameState.nextPlayer();
            
            // Check for victory conditions
            const assaultUnits = assaultPlayer.getLivingUnits().length;
            const defenderUnits = defenderPlayer.getLivingUnits().length;
            
            if (assaultUnits === 0) {
                gameState.isGameOver = true;
                gameState.winner = defenderPlayer.id;
                battleStats.defenderWins++;
                if (gameNumber <= 5) {
                    console.log(`🏆 GAME ${gameNumber} RESULT: Defender Victory (elimination)`);
                }
                break;
            } else if (defenderUnits === 0) {
                gameState.isGameOver = true;
                gameState.winner = assaultPlayer.id;
                battleStats.assaultWins++;
                if (gameNumber <= 5) {
                    console.log(`🏆 GAME ${gameNumber} RESULT: Assault Victory (elimination)`);
                }
                break;
            }
            
            if (gameNumber <= 5) {
                console.log(`  Forces remaining - Assault: ${assaultUnits}, Defender: ${defenderUnits}`);
            }
        }
        
        // Handle time limit
        if (turnCount >= maxTurns && !gameState.isGameOver) {
            const assaultUnits = assaultPlayer.getLivingUnits().length;
            const defenderUnits = defenderPlayer.getLivingUnits().length;
            
            if (assaultUnits > defenderUnits) {
                gameState.winner = assaultPlayer.id;
                battleStats.assaultWins++;
                if (gameNumber <= 5) {
                    console.log(`🏆 GAME ${gameNumber} RESULT: Assault Victory (time limit)`);
                }
            } else if (defenderUnits > assaultUnits) {
                gameState.winner = defenderPlayer.id;
                battleStats.defenderWins++;
                if (gameNumber <= 5) {
                    console.log(`🏆 GAME ${gameNumber} RESULT: Defender Victory (time limit)`);
                }
            } else {
                battleStats.draws++;
                if (gameNumber <= 5) {
                    console.log(`🏆 GAME ${gameNumber} RESULT: Draw (time limit)`);
                }
            }
        }
        
        // Analyze this game's events
        analyzeGameEvents(gameNumber, logs);
        
        battleStats.totalGames++;
        
        // Brief progress update
        if (gameNumber > 5 && gameNumber % 10 === 0) {
            originalLog(`⏳ Completed ${gameNumber}/100 battles...`);
        }
        
    } catch (error) {
        console.error(`Error in game ${gameNumber}:`, error);
    } finally {
        // Restore console
        console.log = originalLog;
    }
}

/**
 * Print analysis of rare events
 */
function printRareEventAnalysis() {
    console.log('\n🎲 RARE EVENT ANALYSIS');
    console.log('======================');
    
    console.log(`\n✨ Perfect Rolls (all 6s): ${rareEvents.perfectRolls.length}`);
    rareEvents.perfectRolls.forEach(event => {
        console.log(`  Game ${event.game}, Turn ${event.turn}: ${event.dice.join(',')} - ${event.context}`);
    });
    
    console.log(`\n💥 Catastrophic Failures (all 1s): ${rareEvents.catastrophicFailures.length}`);
    rareEvents.catastrophicFailures.forEach(event => {
        console.log(`  Game ${event.game}, Turn ${event.turn}: ${event.dice.join(',')} - ${event.context}`);
    });
    
    console.log(`\n🎯 Extreme Roll Sequences: ${rareEvents.extremeRollSequences.length}`);
    rareEvents.extremeRollSequences.slice(0, 5).forEach(event => {
        console.log(`  Game ${event.game}, Turn ${event.turn}: ${event.dice.join(',')} (avg: ${event.average.toFixed(1)}, ${event.type})`);
    });
    
    console.log(`\n🚀 Quick Victories (≤3 turns): ${rareEvents.quickVictories.length}`);
    rareEvents.quickVictories.forEach(event => {
        console.log(`  Game ${event.game}: ${event.turns} turns, ${event.actions} actions, ${event.destructions} destroyed`);
    });
    
    console.log(`\n⏰ Long Stalemates (≥15 turns): ${rareEvents.longStalemates.length}`);
    rareEvents.longStalemates.forEach(event => {
        console.log(`  Game ${event.game}: ${event.turns} turns, ${event.actions} actions, ${event.destructions} destroyed`);
    });
    
    console.log(`\n💀 Massive Destructions (≥5 units): ${rareEvents.massiveDestructions.length}`);
    rareEvents.massiveDestructions.forEach(event => {
        console.log(`  Game ${event.game}: ${event.destructions} units destroyed in ${event.turns} turns`);
    });
    
    console.log(`\n🎭 Epic Battles (≥100 actions): ${rareEvents.epicBattles.length}`);
    rareEvents.epicBattles.forEach(event => {
        console.log(`  Game ${event.game}: ${event.actions} actions over ${event.turns} turns`);
    });
    
    console.log(`\n🔮 Unusual State Transitions: ${rareEvents.unusualStateTransitions.length}`);
    rareEvents.unusualStateTransitions.forEach(event => {
        console.log(`  Game ${event.game}, Turn ${event.turn}: ${event.transition} (${event.reason})`);
    });
    
    console.log(`\n🎯 Miracle Shots (high rolls, no hits): ${rareEvents.miracleShots.length}`);
    rareEvents.miracleShots.slice(0, 3).forEach(event => {
        console.log(`  Game ${event.game}, Turn ${event.turn}: ${event.dice.join(',')} (avg: ${event.average.toFixed(1)}) - no hits`);
    });
    
    console.log(`\n🚫 Total Misses (4+ dice, no hits): ${rareEvents.totalMisses.length}`);
    rareEvents.totalMisses.slice(0, 3).forEach(event => {
        console.log(`  Game ${event.game}, Turn ${event.turn}: ${event.dice.join(',')} - complete miss`);
    });
}

/**
 * Print final statistics
 */
function printFinalStatistics() {
    console.log('\n📊 FINAL BATTLE STATISTICS');
    console.log('===========================');
    
    console.log(`\n🏆 Victory Distribution:`);
    console.log(`  Assault Wins: ${battleStats.assaultWins}/${battleStats.totalGames} (${(battleStats.assaultWins/battleStats.totalGames*100).toFixed(1)}%)`);
    console.log(`  Defender Wins: ${battleStats.defenderWins}/${battleStats.totalGames} (${(battleStats.defenderWins/battleStats.totalGames*100).toFixed(1)}%)`);
    console.log(`  Draws: ${battleStats.draws}/${battleStats.totalGames} (${(battleStats.draws/battleStats.totalGames*100).toFixed(1)}%)`);
    
    console.log(`\n📈 Battle Metrics:`);
    console.log(`  Average turns per game: ${(battleStats.totalTurns/battleStats.totalGames).toFixed(1)}`);
    console.log(`  Shortest game: ${battleStats.shortestGame} turns`);
    console.log(`  Longest game: ${battleStats.longestGame} turns`);
    console.log(`  Average actions per game: ${(battleStats.totalActions/battleStats.totalGames).toFixed(1)}`);
    console.log(`  Most actions in one turn: ${battleStats.mostActionsInTurn}`);
    console.log(`  Total units destroyed: ${battleStats.totalDestructions}`);
    console.log(`  Highest single damage: ${battleStats.highestDamage}`);
    
    console.log(`\n🎯 Game Balance Analysis:`);
    const assaultAdvantage = battleStats.assaultWins - battleStats.defenderWins;
    if (Math.abs(assaultAdvantage) <= 5) {
        console.log(`  ⚖️ EXCELLENT BALANCE: Difference of ${Math.abs(assaultAdvantage)} wins`);
    } else if (Math.abs(assaultAdvantage) <= 10) {
        console.log(`  📊 GOOD BALANCE: ${assaultAdvantage > 0 ? 'Assault' : 'Defender'} advantage of ${Math.abs(assaultAdvantage)} wins`);
    } else {
        console.log(`  ⚠️ BALANCE CONCERN: ${assaultAdvantage > 0 ? 'Assault' : 'Defender'} advantage of ${Math.abs(assaultAdvantage)} wins`);
    }
}

// Main execution
console.log('🎖️ USS WASP: 100 BATTLE ANALYSIS');
console.log('=================================');
console.log('Running 100 AI vs AI battles to analyze rare events...\n');

const startTime = Date.now();

// Run all battles (start with 10 for testing)
const battleCount = 10;
for (let i = 1; i <= battleCount; i++) {
    runSingleGame(i);
}

const endTime = Date.now();
const duration = ((endTime - startTime) / 1000).toFixed(1);

console.log(`\n⏱️ Analysis complete! (${duration}s)`);

// Print analysis
printRareEventAnalysis();
printFinalStatistics();

console.log('\n🎖️ 100 Battle Analysis Complete!');