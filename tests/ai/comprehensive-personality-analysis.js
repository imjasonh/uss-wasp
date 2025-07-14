/**
 * Comprehensive AI personality analysis with full matchup matrix
 */

const { PersonalityFactory } = require('../../dist/core/ai/PersonalityFactory');
const { AIController } = require('../../dist/core/ai/AIController');
const { AIPersonalityType } = require('../../dist/core/ai/types');

console.log('📊 Comprehensive AI Personality Analysis');
console.log('=======================================\n');

// Get all personality types
const personalities = PersonalityFactory.getAllPersonalityTypes();
console.log(`Testing ${personalities.length} personality types in full matrix...`);

/**
 * Enhanced battle simulation with more factors
 */
function simulateBattle(attackerType, defenderType) {
  const attacker = PersonalityFactory.createPersonality(attackerType);
  const defender = PersonalityFactory.createPersonality(defenderType);
  
  // Simulate battle factors with more realistic weighting
  const attackerFactors = {
    // Aggression affects initiative and damage potential
    aggressionBonus: attacker.aggression * 2 + Math.random() * 2,
    // Planning affects positioning and tactical advantage
    planningBonus: attacker.forwardLooking * 1.5 + Math.random() * 1.5,
    // Precision affects hit rate and efficiency
    precisionBonus: attacker.mistakes * 1.2 + Math.random() * 1.2,
    // Risk tolerance affects bold moves
    riskBonus: attacker.riskTolerance * 3 + Math.random() * 2,
    // Mistakes cause critical failures
    errorPenalty: attacker.mistakeFrequency * 5 * Math.random(),
  };
  
  const defenderFactors = {
    aggressionBonus: defender.aggression * 2 + Math.random() * 2,
    planningBonus: defender.forwardLooking * 1.5 + Math.random() * 1.5,
    precisionBonus: defender.mistakes * 1.2 + Math.random() * 1.2,
    riskBonus: defender.riskTolerance * 3 + Math.random() * 2,
    errorPenalty: defender.mistakeFrequency * 5 * Math.random(),
  };
  
  // Calculate total combat effectiveness
  const attackerPower = 
    attackerFactors.aggressionBonus + 
    attackerFactors.planningBonus + 
    attackerFactors.precisionBonus + 
    attackerFactors.riskBonus - 
    attackerFactors.errorPenalty;
    
  const defenderPower = 
    defenderFactors.aggressionBonus + 
    defenderFactors.planningBonus + 
    defenderFactors.precisionBonus + 
    defenderFactors.riskBonus - 
    defenderFactors.errorPenalty;
  
  // Add defensive bonus (defender gets 10% bonus)
  const adjustedDefenderPower = defenderPower * 1.1;
  
  const winner = attackerPower > adjustedDefenderPower ? attackerType : defenderType;
  const margin = Math.abs(attackerPower - adjustedDefenderPower);
  
  return {
    winner,
    margin,
    attackerPower: attackerPower.toFixed(2),
    defenderPower: adjustedDefenderPower.toFixed(2),
    attackerFactors,
    defenderFactors
  };
}

// Run comprehensive battle matrix
const battleMatrix = {};
const detailedResults = [];
const simulationsPerMatchup = 10;

console.log(`\nRunning ${simulationsPerMatchup} battles for each matchup...`);
console.log('This may take a moment...\n');

// Initialize matrix
personalities.forEach(attacker => {
  battleMatrix[attacker] = {};
  personalities.forEach(defender => {
    battleMatrix[attacker][defender] = { wins: 0, losses: 0, totalPower: 0 };
  });
});

// Run all matchups
let completedMatchups = 0;
const totalMatchups = personalities.length * personalities.length;

personalities.forEach(attacker => {
  personalities.forEach(defender => {
    let attackerWins = 0;
    let defenderWins = 0;
    let totalAttackerPower = 0;
    let totalDefenderPower = 0;
    
    for (let i = 0; i < simulationsPerMatchup; i++) {
      const result = simulateBattle(attacker, defender);
      
      if (result.winner === attacker) {
        attackerWins++;
      } else {
        defenderWins++;
      }
      
      totalAttackerPower += parseFloat(result.attackerPower);
      totalDefenderPower += parseFloat(result.defenderPower);
    }
    
    battleMatrix[attacker][defender] = {
      wins: attackerWins,
      losses: defenderWins,
      totalPower: totalAttackerPower,
      avgPower: (totalAttackerPower / simulationsPerMatchup).toFixed(2)
    };
    
    detailedResults.push({
      attacker,
      defender,
      attackerWins,
      defenderWins,
      winRate: ((attackerWins / simulationsPerMatchup) * 100).toFixed(1),
      avgAttackerPower: (totalAttackerPower / simulationsPerMatchup).toFixed(2),
      avgDefenderPower: (totalDefenderPower / simulationsPerMatchup).toFixed(2)
    });
    
    completedMatchups++;
    if (completedMatchups % 8 === 0) {
      console.log(`Progress: ${completedMatchups}/${totalMatchups} matchups completed`);
    }
  });
});

console.log('\n✅ All battles completed!\n');

// Calculate overall statistics
const personalityStats = {};
personalities.forEach(personality => {
  let totalWins = 0;
  let totalLosses = 0;
  let totalPower = 0;
  let battles = 0;
  
  personalities.forEach(opponent => {
    totalWins += battleMatrix[personality][opponent].wins;
    totalLosses += battleMatrix[personality][opponent].losses;
    totalPower += parseFloat(battleMatrix[personality][opponent].avgPower);
    battles++;
  });
  
  personalityStats[personality] = {
    wins: totalWins,
    losses: totalLosses,
    winRate: ((totalWins / (totalWins + totalLosses)) * 100).toFixed(1),
    avgPower: (totalPower / battles).toFixed(2)
  };
});

// Generate comprehensive report
console.log('📋 Generating comprehensive report...');

const reportData = {
  personalities,
  battleMatrix,
  detailedResults,
  personalityStats,
  metadata: {
    simulationsPerMatchup,
    totalBattles: totalMatchups * simulationsPerMatchup,
    generatedAt: new Date().toISOString()
  }
};

// Save report data for documentation generation
const fs = require('fs');
const path = require('path');

// Ensure docs directory exists
const docsDir = path.join(__dirname, '../../docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(
  path.join(docsDir, 'personality-analysis-data.json'),
  JSON.stringify(reportData, null, 2)
);

console.log('✅ Report data saved to docs/personality-analysis-data.json');

// Display summary results
console.log('\n📊 PERSONALITY PERFORMANCE SUMMARY');
console.log('==================================');

// Sort by win rate
const sortedStats = Object.entries(personalityStats)
  .sort(([,a], [,b]) => parseFloat(b.winRate) - parseFloat(a.winRate));

console.log('\nOverall Win Rates:');
sortedStats.forEach(([personality, stats], index) => {
  const rank = index + 1;
  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '  ';
  console.log(`${medal} ${rank}. ${personality.toUpperCase()}: ${stats.winRate}% (${stats.wins}W-${stats.losses}L)`);
});

console.log('\nAverage Combat Power:');
const sortedPower = Object.entries(personalityStats)
  .sort(([,a], [,b]) => parseFloat(b.avgPower) - parseFloat(a.avgPower));

sortedPower.forEach(([personality, stats], index) => {
  const rank = index + 1;
  console.log(`  ${rank}. ${personality.toUpperCase()}: ${stats.avgPower} avg power`);
});

// Show most dominant matchups
console.log('\n🔥 Most Dominant Matchups (>80% win rate):');
const dominantMatchups = detailedResults
  .filter(result => parseFloat(result.winRate) > 80)
  .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

dominantMatchups.slice(0, 10).forEach(result => {
  console.log(`  ${result.attacker.toUpperCase()} vs ${result.defender.toUpperCase()}: ${result.winRate}% (${result.attackerWins}-${result.defenderWins})`);
});

// Show most balanced matchups
console.log('\n⚖️  Most Balanced Matchups (40-60% win rate):');
const balancedMatchups = detailedResults
  .filter(result => {
    const winRate = parseFloat(result.winRate);
    return winRate >= 40 && winRate <= 60;
  })
  .sort((a, b) => Math.abs(50 - parseFloat(a.winRate)) - Math.abs(50 - parseFloat(b.winRate)));

balancedMatchups.slice(0, 10).forEach(result => {
  console.log(`  ${result.attacker.toUpperCase()} vs ${result.defender.toUpperCase()}: ${result.winRate}% (${result.attackerWins}-${result.defenderWins})`);
});

console.log('\n🎯 Analysis Complete!');
console.log('====================');
console.log('✅ Full personality matrix tested');
console.log('✅ Performance statistics calculated');
console.log('✅ Balance analysis completed');
console.log('✅ Report data saved for documentation');
console.log('\nRun the documentation generator to create the final report!');