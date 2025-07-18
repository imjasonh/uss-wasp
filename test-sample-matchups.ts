import { PersonalityMatchupTester } from './tests/ai/test-personality-matchups';
import { AIPersonalityType } from './src/core/ai/types';

// Create a custom tester that runs only a subset of personalities
class SamplePersonalityTester extends PersonalityMatchupTester {
  private readonly testPersonalities: AIPersonalityType[] = [
    AIPersonalityType.BERSERKER,
    AIPersonalityType.STRATEGIST,
    AIPersonalityType.CONSERVATIVE,
    AIPersonalityType.BALANCED
  ];

  public async runSampleMatchups(): Promise<void> {
    console.log('🤖 Sample AI Personality Matchup Test');
    console.log('====================================');
    console.log(`Testing ${this.testPersonalities.length}x${this.testPersonalities.length} matchups with 2 games each\n`);

    const results = [];
    let totalCombatActions = 0;
    let totalSpecialActions = 0;
    let totalAttackerWins = 0;
    let totalDefenderWins = 0;
    let totalGames = 0;

    for (const attacker of this.testPersonalities) {
      for (const defender of this.testPersonalities) {
        console.log(`🎯 Testing ${attacker.toUpperCase()} vs ${defender.toUpperCase()}`);
        
        let attackerWins = 0;
        let defenderWins = 0;
        let combatActions = 0;
        let specialActions = 0;
        
        // Run 2 games per matchup
        for (let game = 1; game <= 2; game++) {
          const result = await (this as any).runSingleBattle(attacker, defender);
          
          if (result.winner === 'assault') attackerWins++;
          else defenderWins++;
          
          combatActions += result.combatActions;
          specialActions += result.specialActions;
          totalGames++;
        }
        
        totalCombatActions += combatActions;
        totalSpecialActions += specialActions;
        totalAttackerWins += attackerWins;
        totalDefenderWins += defenderWins;
        
        const winRate = (attackerWins / 2 * 100).toFixed(1);
        console.log(`   Result: ${attackerWins}-${defenderWins} (${winRate}% attacker) | Combat: ${combatActions} | Special: ${specialActions}\n`);
        
        results.push({
          attacker,
          defender,
          attackerWins,
          defenderWins,
          combatActions,
          specialActions,
          winRate: parseFloat(winRate)
        });
      }
    }

    console.log('📊 SAMPLE TEST RESULTS');
    console.log('======================');
    console.log(`Total Games: ${totalGames}`);
    console.log(`Total Combat Actions: ${totalCombatActions} (${(totalCombatActions / totalGames).toFixed(2)} per game)`);
    console.log(`Total Special Actions: ${totalSpecialActions} (${(totalSpecialActions / totalGames).toFixed(2)} per game)`);
    console.log(`Attacker Win Rate: ${(totalAttackerWins / totalGames * 100).toFixed(1)}%`);
    console.log(`Defender Win Rate: ${(totalDefenderWins / totalGames * 100).toFixed(1)}%`);
    
    console.log('\n🏆 BEST MATCHUPS:');
    const bestAttacker = results.filter(r => r.winRate > 70).sort((a, b) => b.winRate - a.winRate).slice(0, 3);
    bestAttacker.forEach(r => {
      console.log(`   ${r.attacker} dominates ${r.defender} (${r.winRate}%)`);
    });
    
    console.log('\n🛡️ BEST DEFENDERS:');
    const bestDefender = results.filter(r => r.winRate < 30).sort((a, b) => a.winRate - b.winRate).slice(0, 3);
    bestDefender.forEach(r => {
      console.log(`   ${r.defender} holds vs ${r.attacker} (${(100 - r.winRate).toFixed(1)}% defense)`);
    });
    
    console.log('\n⚖️ BALANCED MATCHUPS:');
    const balanced = results.filter(r => r.winRate >= 40 && r.winRate <= 60).sort((a, b) => Math.abs(50 - a.winRate) - Math.abs(50 - b.winRate)).slice(0, 3);
    balanced.forEach(r => {
      console.log(`   ${r.attacker} vs ${r.defender} (${r.winRate}%)`);
    });
  }
}

async function main() {
  const tester = new SamplePersonalityTester();
  await tester.runSampleMatchups();
}

main().catch(console.error);