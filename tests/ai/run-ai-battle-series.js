#!/usr/bin/env node

/**
 * Run a series of AI vs AI battles to see who wins
 */

const { GameState } = require('../../dist/core/game/GameState');
const { GameEngine } = require('../../dist/core/game/GameEngine');
const { Player } = require('../../dist/core/game/Player');
const { GameMap } = require('../../dist/core/game/Map');
const { PlayerSide, UnitType } = require('../../dist/core/game/types');
const { AIDifficulty } = require('../../dist/core/ai/types');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper');
const { Hex } = require('../../dist/core/hex');

console.log('⚔️  AI vs AI Battle Series');
console.log('========================\n');

/**
 * Run a single AI vs AI battle
 */
function runBattle(battleNumber) {
  console.log(`🎮 Battle ${battleNumber}`);
  console.log('----------');

  try {
    // Create balanced scenario
    const map = new GameMap(8, 8);
    const gameState = new GameState(`battle-${battleNumber}`, map, 15);
    
    const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
    const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);
    
    // Give both sides some command points
    assaultPlayer.commandPoints = 15;
    defenderPlayer.commandPoints = 15;
    
    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);
    gameState.setActivePlayerBySide(PlayerSide.Assault);

    // Create balanced forces
    const assaultUnits = createTestUnits([
      { id: 'assault-1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(0, 0) },
      { id: 'assault-2', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 0) },
      { id: 'assault-3', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(0, 1) },
      { id: 'assault-4', type: UnitType.AAV_7, side: PlayerSide.Assault, position: new Hex(1, 1) },
      { id: 'assault-5', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(0, 2) }
    ]);

    const defenderUnits = createTestUnits([
      { id: 'defender-1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(6, 6) },
      { id: 'defender-2', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(7, 6) },
      { id: 'defender-3', type: UnitType.ATGM_TEAM, side: PlayerSide.Defender, position: new Hex(6, 7) },
      { id: 'defender-4', type: UnitType.TECHNICAL, side: PlayerSide.Defender, position: new Hex(7, 7) },
      { id: 'defender-5', type: UnitType.MORTAR_TEAM, side: PlayerSide.Defender, position: new Hex(5, 6) }
    ]);

    // Add units to players
    assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
    defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

    // Create game engine with different AI difficulties for variety
    const gameEngine = new GameEngine(gameState);
    const assaultDifficulty = getRandomDifficulty();
    const defenderDifficulty = getRandomDifficulty();
    
    gameEngine.addAIController(assaultPlayer.id, assaultDifficulty);
    gameEngine.addAIController(defenderPlayer.id, defenderDifficulty);

    console.log(`   Setup: Assault (${assaultDifficulty}) vs Defender (${defenderDifficulty})`);
    console.log(`   Forces: ${assaultUnits.length} assault units vs ${defenderUnits.length} defender units`);

    // Run the battle simulation
    let turnCount = 0;
    const maxTurns = 50; // Prevent infinite games
    let lastAssaultCount = assaultUnits.length;
    let lastDefenderCount = defenderUnits.length;
    let stalemateCounter = 0;

    while (turnCount < maxTurns) {
      turnCount++;
      
      try {
        // Process all phases of the turn
        const phases = ['event', 'command', 'deployment', 'movement', 'action', 'end'];
        
        for (const phase of phases) {
          // Set the current phase
          gameState.phase = phase;
          
          console.log(`   Turn ${turnCount}, Phase: ${phase}`);
          
          // Generate AI actions for current phase
          const aiActions = gameEngine.updateAI();
          
          if (aiActions.length > 0) {
            console.log(`   AI executed ${aiActions.length} actions in ${phase} phase`);
          }
        }

        // Check for victory conditions every 5 turns
        if (turnCount % 5 === 0) {
          const currentAssaultCount = assaultPlayer.getLivingUnits().length;
          const currentDefenderCount = defenderPlayer.getLivingUnits().length;

          // Check for elimination victory
          if (currentAssaultCount === 0) {
            console.log(`   Result: 🏆 DEFENDER WINS by elimination (Turn ${turnCount})`);
            console.log(`   Remaining: ${currentDefenderCount} defender units\n`);
            return 'Defender';
          }
          
          if (currentDefenderCount === 0) {
            console.log(`   Result: 🏆 ASSAULT WINS by elimination (Turn ${turnCount})`);
            console.log(`   Remaining: ${currentAssaultCount} assault units\n`);
            return 'Assault';
          }

          // Check for stalemate (no casualties for multiple turns)
          if (currentAssaultCount === lastAssaultCount && currentDefenderCount === lastDefenderCount) {
            stalemateCounter++;
            if (stalemateCounter >= 3) { // 15 turns without casualties
              console.log(`   Result: ⚖️  STALEMATE (Turn ${turnCount})`);
              console.log(`   Forces: ${currentAssaultCount} assault vs ${currentDefenderCount} defender\n`);
              return 'Stalemate';
            }
          } else {
            stalemateCounter = 0;
          }

          lastAssaultCount = currentAssaultCount;
          lastDefenderCount = currentDefenderCount;
        }

        // Switch active player
        const currentSide = gameState.getActivePlayer()?.side;
        if (currentSide === PlayerSide.Assault) {
          gameState.setActivePlayerBySide(PlayerSide.Defender);
        } else {
          gameState.setActivePlayerBySide(PlayerSide.Assault);
        }

      } catch (error) {
        console.log(`   Error on turn ${turnCount}: ${error.message}`);
        break;
      }
    }

    // Game reached turn limit
    const finalAssaultCount = assaultPlayer.getLivingUnits().length;
    const finalDefenderCount = defenderPlayer.getLivingUnits().length;
    
    if (finalAssaultCount > finalDefenderCount) {
      console.log(`   Result: 🏆 ASSAULT WINS by attrition (Turn limit)`);
      console.log(`   Final: ${finalAssaultCount} assault vs ${finalDefenderCount} defender\n`);
      return 'Assault';
    } else if (finalDefenderCount > finalAssaultCount) {
      console.log(`   Result: 🏆 DEFENDER WINS by attrition (Turn limit)`);
      console.log(`   Final: ${finalAssaultCount} assault vs ${finalDefenderCount} defender\n`);
      return 'Defender';
    } else {
      console.log(`   Result: ⚖️  DRAW by attrition (Turn limit)`);
      console.log(`   Final: ${finalAssaultCount} assault vs ${finalDefenderCount} defender\n`);
      return 'Draw';
    }

  } catch (error) {
    console.log(`   ❌ Battle ${battleNumber} failed: ${error.message}\n`);
    return 'Error';
  }
}

/**
 * Get random AI difficulty for variety
 */
function getRandomDifficulty() {
  const difficulties = [AIDifficulty.NOVICE, AIDifficulty.VETERAN, AIDifficulty.ELITE];
  return difficulties[Math.floor(Math.random() * difficulties.length)];
}

/**
 * Run the battle series
 */
async function runBattleSeries() {
  const results = [];
  const totalBattles = 10;

  console.log(`Running ${totalBattles} AI vs AI battles...\n`);

  for (let i = 1; i <= totalBattles; i++) {
    const result = runBattle(i);
    results.push(result);
  }

  // Summarize results
  console.log('📊 Battle Series Summary');
  console.log('========================');
  
  const summary = {
    Assault: 0,
    Defender: 0,
    Stalemate: 0,
    Draw: 0,
    Error: 0
  };

  results.forEach((result, index) => {
    console.log(`Battle ${index + 1}: ${getResultEmoji(result)} ${result}`);
    summary[result]++;
  });

  console.log('\n🏆 Final Tally:');
  console.log(`   Assault Victories: ${summary.Assault}`);
  console.log(`   Defender Victories: ${summary.Defender}`);
  console.log(`   Stalemates: ${summary.Stalemate}`);
  console.log(`   Draws: ${summary.Draw}`);
  console.log(`   Errors: ${summary.Error}`);

  // Determine overall winner
  if (summary.Assault > summary.Defender) {
    console.log('\n🎉 ASSAULT FORCES dominate the series!');
  } else if (summary.Defender > summary.Assault) {
    console.log('\n🎉 DEFENDER FORCES dominate the series!');
  } else {
    console.log('\n⚖️  Series ends in a TIE!');
  }

  // Note about AI execution limitations
  console.log('\n⚠️  NOTE: AI is generating tactical decisions but actions are not');
  console.log('   being executed due to missing game engine execution system.');
  console.log('   This test shows AI decision-making capability, not full gameplay.');
}

function getResultEmoji(result) {
  switch (result) {
    case 'Assault': return '🟦';
    case 'Defender': return '🟥';
    case 'Stalemate': return '⚖️';
    case 'Draw': return '🤝';
    case 'Error': return '❌';
    default: return '❓';
  }
}

// Run the battle series
runBattleSeries().catch(console.error);