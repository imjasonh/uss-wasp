#!/usr/bin/env node

/**
 * Final AI vs AI Championship - Adjacent units for guaranteed combat
 */

const { GameState } = require('../../dist/core/game/GameState');
const { GameEngine } = require('../../dist/core/game/GameEngine');
const { Player } = require('../../dist/core/game/Player');
const { GameMap } = require('../../dist/core/game/Map');
const { PlayerSide, UnitType } = require('../../dist/core/game/types');
const { AIDifficulty } = require('../../dist/core/ai/types');
const { createTestUnits } = require('../../dist/testing/UnitTestHelper');
const { Hex } = require('../../dist/core/hex');

console.log('🎯 FINAL AI vs AI CHAMPIONSHIP');
console.log('===============================\n');

function runChampionshipBattle(battleNumber) {
  console.log(`⚔️  Championship Battle ${battleNumber}`);

  try {
    const map = new GameMap(4, 4);
    const gameState = new GameState(`championship-${battleNumber}`, map, 10);
    
    const assaultPlayer = new Player('assault-ai', PlayerSide.Assault);
    const defenderPlayer = new Player('defender-ai', PlayerSide.Defender);
    
    assaultPlayer.commandPoints = 10;
    defenderPlayer.commandPoints = 10;
    
    gameState.addPlayer(assaultPlayer);
    gameState.addPlayer(defenderPlayer);
    gameState.setActivePlayerBySide(PlayerSide.Assault);

    // Adjacent starting positions for guaranteed combat
    const assaultUnits = createTestUnits([
      { id: 'assault-1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) },
      { id: 'assault-2', type: UnitType.HUMVEE, side: PlayerSide.Assault, position: new Hex(1, 0) }
    ]);

    const defenderUnits = createTestUnits([
      { id: 'defender-1', type: UnitType.INFANTRY_SQUAD, side: PlayerSide.Defender, position: new Hex(2, 1) },
      { id: 'defender-2', type: UnitType.TECHNICAL, side: PlayerSide.Defender, position: new Hex(2, 0) }
    ]);

    assaultUnits.forEach(unit => assaultPlayer.addUnit(unit));
    defenderUnits.forEach(unit => defenderPlayer.addUnit(unit));

    const gameEngine = new GameEngine(gameState);
    gameEngine.addAIController(assaultPlayer.id, AIDifficulty.VETERAN);
    gameEngine.addAIController(defenderPlayer.id, AIDifficulty.VETERAN);

    console.log(`   Adjacent combat: Marines vs Infantry, Humvee vs Technical`);

    let turnCount = 0;
    let combatHappened = false;

    // Run battle for max 10 turns
    while (turnCount < 10) {
      turnCount++;
      
      // Only run action phase for direct combat
      gameState.phase = 'action';
      
      const currentPlayer = gameState.getActivePlayer();
      const aiActions = gameEngine.updateAI();
      
      // Check for successful combat
      if (aiActions.length > 0) {
        for (const action of aiActions) {
          if (action.type === 'attack') {
            // Execute the action manually to see results
            const result = gameEngine.executeAction(action);
            if (result.success && result.message.includes('damage')) {
              console.log(`     Turn ${turnCount}: ${result.message}`);
              combatHappened = true;
            }
          }
        }
      }
      
      // Check for victory
      const assaultAlive = assaultUnits.filter(unit => unit.isAlive()).length;
      const defenderAlive = defenderUnits.filter(unit => unit.isAlive()).length;
      
      if (assaultAlive === 0) {
        console.log(`   Result: 🔴 DEFENDER WINS (Turn ${turnCount})`);
        console.log(`   Survivors: ${defenderAlive} defender units\n`);
        return 'Defender';
      }
      
      if (defenderAlive === 0) {
        console.log(`   Result: 🔵 ASSAULT WINS (Turn ${turnCount})`);
        console.log(`   Survivors: ${assaultAlive} assault units\n`);
        return 'Assault';
      }
      
      // Switch players
      const currentSide = gameState.getActivePlayer()?.side;
      if (currentSide === PlayerSide.Assault) {
        gameState.setActivePlayerBySide(PlayerSide.Defender);
      } else {
        gameState.setActivePlayerBySide(PlayerSide.Assault);
      }
    }

    // Determine winner by remaining units
    const finalAssault = assaultUnits.filter(unit => unit.isAlive()).length;
    const finalDefender = defenderUnits.filter(unit => unit.isAlive()).length;
    
    if (finalAssault > finalDefender) {
      console.log(`   Result: 🔵 ASSAULT WINS by casualties`);
      console.log(`   Final: ${finalAssault} assault vs ${finalDefender} defender\n`);
      return 'Assault';
    } else if (finalDefender > finalAssault) {
      console.log(`   Result: 🔴 DEFENDER WINS by casualties`);
      console.log(`   Final: ${finalAssault} assault vs ${finalDefender} defender\n`);
      return 'Defender';
    } else {
      console.log(`   Result: 🤝 DRAW`);
      console.log(`   Final: ${finalAssault} vs ${finalDefender} units each\n`);
      return 'Draw';
    }

  } catch (error) {
    console.log(`   ❌ Battle ${battleNumber} error: ${error.message}\n`);
    return 'Error';
  }
}

// Run the championship
async function runFinalChampionship() {
  console.log('Running 10 championship battles...\n');
  
  const results = [];
  
  for (let i = 1; i <= 10; i++) {
    const result = runChampionshipBattle(i);
    results.push(result);
  }
  
  // Final tally
  console.log('🏆 CHAMPIONSHIP RESULTS');
  console.log('=======================');
  
  const summary = { Assault: 0, Defender: 0, Draw: 0, Error: 0 };
  
  results.forEach((result, index) => {
    const emoji = result === 'Assault' ? '🔵' : 
                  result === 'Defender' ? '🔴' :
                  result === 'Draw' ? '🤝' : '❌';
    console.log(`Battle ${index + 1}: ${emoji} ${result}`);
    summary[result]++;
  });
  
  console.log('\n📊 FINAL STANDINGS:');
  console.log(`🔵 Assault Victories: ${summary.Assault}`);
  console.log(`🔴 Defender Victories: ${summary.Defender}`);
  console.log(`🤝 Draws: ${summary.Draw}`);
  console.log(`❌ Errors: ${summary.Error}`);
  
  // Declare champion
  if (summary.Assault > summary.Defender) {
    console.log('\n🎉 ASSAULT FORCES WIN THE CHAMPIONSHIP!');
    console.log(`Victory margin: ${summary.Assault} - ${summary.Defender}`);
  } else if (summary.Defender > summary.Assault) {
    console.log('\n🎉 DEFENDER FORCES WIN THE CHAMPIONSHIP!');
    console.log(`Victory margin: ${summary.Defender} - ${summary.Assault}`);
  } else {
    console.log('\n⚔️  CHAMPIONSHIP ENDS IN A TIE!');
  }
}

runFinalChampionship().catch(console.error);