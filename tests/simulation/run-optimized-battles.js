#!/usr/bin/env node

/**
 * Optimized AI vs AI battle series with better unit positioning
 */

const { GameState } = require('../../dist/core/game/GameState');
const { GameEngine } = require('../../dist/core/game/GameEngine');
const { Player } = require('../../dist/core/game/Player');
const { GameMap } = require('../../dist/core/game/Map');
const { PlayerSide, UnitType } = require('../../dist/core/game/types');
const { AIDifficulty } = require('../../dist/core/ai/types');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper');
const { Hex } = require('../../dist/core/hex');

console.log('🏆 Optimized AI vs AI Battle Championship');
console.log('======================================\n');

/**
 * Run a single optimized AI vs AI battle
 */
function runOptimizedBattle(battleNumber) {
  console.log(`⚔️  Battle ${battleNumber}`);
  console.log('-------------');

  try {
    // Smaller map for closer engagement
    const map = new GameMap(6, 6);
    const gameState = new GameState(`battle-${battleNumber}`, map, 15);
    
    const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
    const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);
    
    assaultPlayer.commandPoints = 15;
    defenderPlayer.commandPoints = 15;
    
    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);
    gameState.setActivePlayerBySide(PlayerSide.Assault);

    // Create balanced forces with closer starting positions
    const assaultUnits = createTestUnits([
      { id: 'assault-1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
      { id: 'assault-2', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 2) },
      { id: 'assault-3', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(0, 1) },
      { id: 'assault-4', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(0, 0) }
    ]);

    const defenderUnits = createTestUnits([
      { id: 'defender-1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(4, 4) },
      { id: 'defender-2', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(4, 3) },
      { id: 'defender-3', type: UnitType.TECHNICAL, side: PlayerSide.Defender, position: new Hex(5, 4) },
      { id: 'defender-4', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(5, 3) }
    ]);

    // Add units to players
    assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
    defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

    // Create game engine with veteran difficulty for fair fights
    const gameEngine = new GameEngine(gameState);
    gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
    gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

    console.log(`   Setup: ${assaultUnits.length} Assault vs ${defenderUnits.length} Defender units`);
    console.log(`   Distance: ~3-4 hexes (combat engagement range)`);

    // Run the battle simulation
    let turnCount = 0;
    const maxTurns = 20; // Shorter battles
    let lastAssaultCount = assaultUnits.length;
    let lastDefenderCount = defenderUnits.length;
    let stalemateCounter = 0;
    let totalCombatActions = 0;

    while (turnCount < maxTurns) {
      turnCount++;
      
      try {
        // Process all phases of the turn
        const phases = ['event', 'command', 'deployment', 'movement', 'action', 'end'];
        
        for (const phase of phases) {
          gameState.phase = phase;
          
          const aiActions = gameEngine.updateAI();
          
          // Count combat actions for battle intensity
          if (phase === 'action' && aiActions.length > 0) {
            const combatActions = aiActions.filter(action => action.type === 'attack').length;
            totalCombatActions += combatActions;
            if (combatActions > 0) {
              console.log(`     Turn ${turnCount}: ${combatActions} combat actions`);
            }
          }
        }

        // Check for victory conditions every turn
        const currentAssaultCount = assaultPlayer.getLivingUnits().length;
        const currentDefenderCount = defenderPlayer.getLivingUnits().length;

        // Check for elimination victory
        if (currentAssaultCount === 0) {
          console.log(`   Result: 🔴 DEFENDER WINS by elimination (Turn ${turnCount})`);
          console.log(`   Survivors: ${currentDefenderCount} defender units`);
          console.log(`   Combat intensity: ${totalCombatActions} total attacks\n`);
          return 'Defender';
        }
        
        if (currentDefenderCount === 0) {
          console.log(`   Result: 🔵 ASSAULT WINS by elimination (Turn ${turnCount})`);
          console.log(`   Survivors: ${currentAssaultCount} assault units`);
          console.log(`   Combat intensity: ${totalCombatActions} total attacks\n`);
          return 'Assault';
        }

        // Check for casualties to track battle progress
        if (currentAssaultCount < lastAssaultCount || currentDefenderCount < lastDefenderCount) {
          console.log(`     Casualties: Assault ${lastAssaultCount}→${currentAssaultCount}, Defender ${lastDefenderCount}→${currentDefenderCount}`);
          stalemateCounter = 0; // Reset stalemate counter
        } else {
          stalemateCounter++;
        }

        // Check for stalemate (no casualties for multiple turns)
        if (stalemateCounter >= 5) { // 5 turns without casualties
          console.log(`   Result: ⚖️  STALEMATE (Turn ${turnCount})`);
          console.log(`   Final forces: ${currentAssaultCount} assault vs ${currentDefenderCount} defender`);
          console.log(`   Combat intensity: ${totalCombatActions} total attacks\n`);
          return 'Stalemate';
        }

        lastAssaultCount = currentAssaultCount;
        lastDefenderCount = currentDefenderCount;

        // Switch active player
        const currentSide = gameState.getActivePlayer()?.side;
        if (currentSide === PlayerSide.Assault) {
          gameState.setActivePlayerBySide(PlayerSide.Defender);
        } else {
          gameState.setActivePlayerBySide(PlayerSide.Assault);
        }

      } catch (error) {
        console.log(`   ⚠️  Error on turn ${turnCount}: ${error.message}`);
        break;
      }
    }

    // Game reached turn limit
    const finalAssaultCount = assaultPlayer.getLivingUnits().length;
    const finalDefenderCount = defenderPlayer.getLivingUnits().length;
    
    if (finalAssaultCount > finalDefenderCount) {
      console.log(`   Result: 🔵 ASSAULT WINS by attrition (Turn limit)`);
      console.log(`   Final: ${finalAssaultCount} assault vs ${finalDefenderCount} defender`);
      console.log(`   Combat intensity: ${totalCombatActions} total attacks\n`);
      return 'Assault';
    } else if (finalDefenderCount > finalAssaultCount) {
      console.log(`   Result: 🔴 DEFENDER WINS by attrition (Turn limit)`);
      console.log(`   Final: ${finalAssaultCount} assault vs ${finalDefenderCount} defender`);
      console.log(`   Combat intensity: ${totalCombatActions} total attacks\n`);
      return 'Defender';
    } else {
      console.log(`   Result: 🤝 DRAW (Turn limit)`);
      console.log(`   Final: ${finalAssaultCount} assault vs ${finalDefenderCount} defender`);
      console.log(`   Combat intensity: ${totalCombatActions} total attacks\n`);
      return 'Draw';
    }

  } catch (error) {
    console.log(`   ❌ Battle ${battleNumber} failed: ${error.message}\n`);
    return 'Error';
  }
}

/**
 * Run the optimized battle championship
 */
async function runBattleChampionship() {
  const results = [];
  const totalBattles = 10;

  console.log(`Running ${totalBattles} optimized AI vs AI battles...\n`);

  for (let i = 1; i <= totalBattles; i++) {
    const result = runOptimizedBattle(i);
    results.push(result);
  }

  // Summarize results
  console.log('🏆 CHAMPIONSHIP RESULTS');
  console.log('======================');
  
  const summary = {
    Assault: 0,
    Defender: 0,
    Stalemate: 0,
    Draw: 0,
    Error: 0
  };

  results.forEach((result, index) => {
    const emoji = getResultEmoji(result);
    console.log(`Battle ${index + 1}: ${emoji} ${result}`);
    summary[result]++;
  });

  console.log('\n📊 FINAL STANDINGS:');
  console.log(`   🔵 Assault Victories: ${summary.Assault}`);
  console.log(`   🔴 Defender Victories: ${summary.Defender}`);
  console.log(`   ⚖️  Stalemates: ${summary.Stalemate}`);
  console.log(`   🤝 Draws: ${summary.Draw}`);
  console.log(`   ❌ Errors: ${summary.Error}`);

  // Determine overall champion
  const assaultWinPercent = (summary.Assault / totalBattles * 100).toFixed(1);
  const defenderWinPercent = (summary.Defender / totalBattles * 100).toFixed(1);
  
  console.log(`\n🎯 WIN RATES:`);
  console.log(`   Assault: ${assaultWinPercent}%`);
  console.log(`   Defender: ${defenderWinPercent}%`);

  if (summary.Assault > summary.Defender) {
    console.log('\n🎉 ASSAULT FORCES are the CHAMPIONS!');
    console.log('   The Marines prove their amphibious assault superiority!');
  } else if (summary.Defender > summary.Assault) {
    console.log('\n🎉 DEFENDER FORCES are the CHAMPIONS!');
    console.log('   Home field advantage and defensive tactics prevail!');
  } else {
    console.log('\n⚔️  CHAMPIONSHIP ENDS IN A TIE!');
    console.log('   Both forces demonstrate equal tactical prowess!');
  }

  // Additional analysis
  const decisiveBattles = summary.Assault + summary.Defender;
  const indecisiveBattles = summary.Stalemate + summary.Draw;
  
  console.log(`\n📈 BATTLE ANALYSIS:`);
  console.log(`   Decisive battles: ${decisiveBattles}/${totalBattles} (${(decisiveBattles/totalBattles*100).toFixed(1)}%)`);
  console.log(`   Indecisive battles: ${indecisiveBattles}/${totalBattles} (${(indecisiveBattles/totalBattles*100).toFixed(1)}%)`);
  
  if (summary.Error === 0) {
    console.log('\n✅ AI SYSTEM PERFORMANCE: EXCELLENT');
    console.log('   All battles completed successfully with no errors!');
  } else {
    console.log(`\n⚠️  AI SYSTEM PERFORMANCE: ${summary.Error} errors occurred`);
  }
}

function getResultEmoji(result) {
  switch (result) {
    case 'Assault': return '🔵';
    case 'Defender': return '🔴';
    case 'Stalemate': return '⚖️';
    case 'Draw': return '🤝';
    case 'Error': return '❌';
    default: return '❓';
  }
}

// Run the championship
runBattleChampionship().catch(console.error);