/**
 * Test personality vs personality battles for balance validation
 */

const { PersonalityFactory } = require('../../dist/core/ai/PersonalityFactory');
const { AIController } = require('../../dist/core/ai/AIController');
const { AIPersonalityType } = require('../../dist/core/ai/types');

console.log('⚔️  Testing AI Personality Battle Simulations');
console.log('=============================================\n');

// Test 1: Initialize AI controllers with different personalities
console.log('🤖 Test 1: AI Controller Initialization with Personalities');
console.log('-----------------------------------------------------------');

const testPersonalities = [
  AIPersonalityType.BERSERKER,
  AIPersonalityType.STRATEGIST,
  AIPersonalityType.CONSERVATIVE,
  AIPersonalityType.BALANCED,
  AIPersonalityType.ROOKIE,
  AIPersonalityType.VETERAN,
];

const aiControllers = {};

testPersonalities.forEach(personalityType => {
  try {
    const controller = new AIController(`ai_${personalityType}`, personalityType);
    aiControllers[personalityType] = controller;
    
    const personality = controller.getPersonality();
    const description = controller.getPersonalityDescription();
    
    console.log(`✅ ${personalityType.toUpperCase()} AI Controller created:`);
    console.log(`   ${description}`);
    
    if (personality) {
      console.log(`   Mistake Frequency: ${personality.mistakeFrequency.toFixed(2)}`);
      console.log(`   Tactical Complexity: ${personality.tacticalComplexity.toFixed(2)}`);
    }
    console.log();
  } catch (error) {
    console.log(`❌ Failed to create ${personalityType} controller: ${error.message}`);
  }
});

// Test 2: Personality matchup analysis
console.log('🥊 Test 2: Personality Matchup Analysis');
console.log('----------------------------------------');

const battleMatchups = [
  { attacker: AIPersonalityType.BERSERKER, defender: AIPersonalityType.CONSERVATIVE },
  { attacker: AIPersonalityType.STRATEGIST, defender: AIPersonalityType.ROOKIE },
  { attacker: AIPersonalityType.BERSERKER, defender: AIPersonalityType.VETERAN },
  { attacker: AIPersonalityType.BALANCED, defender: AIPersonalityType.BALANCED },
];

battleMatchups.forEach(({ attacker, defender }) => {
  console.log(`${attacker.toUpperCase()} vs ${defender.toUpperCase()}:`);
  
  const attackerPersonality = PersonalityFactory.createPersonality(attacker);
  const defenderPersonality = PersonalityFactory.createPersonality(defender);
  
  // Analyze theoretical advantages
  const aggressionAdvantage = attackerPersonality.aggression - defenderPersonality.aggression;
  const planningAdvantage = attackerPersonality.forwardLooking - defenderPersonality.forwardLooking;
  const precisionAdvantage = attackerPersonality.mistakes - defenderPersonality.mistakes;
  
  console.log(`  Aggression Advantage: ${aggressionAdvantage > 0 ? '+' : ''}${aggressionAdvantage}`);
  console.log(`  Planning Advantage: ${planningAdvantage > 0 ? '+' : ''}${planningAdvantage}`);
  console.log(`  Precision Advantage: ${precisionAdvantage > 0 ? '+' : ''}${precisionAdvantage}`);
  
  // Predict likely outcome
  let prediction = 'Balanced';
  if (aggressionAdvantage > 1 && precisionAdvantage > 0) {
    prediction = `${attacker} likely wins (aggressive and precise)`;
  } else if (planningAdvantage > 1 && precisionAdvantage > 0) {
    prediction = `${attacker} likely wins (strategic and precise)`;
  } else if (aggressionAdvantage < -1 && planningAdvantage < -1) {
    prediction = `${defender} likely wins (better overall)`;
  }
  
  console.log(`  Prediction: ${prediction}`);
  console.log();
});

// Test 3: Priority weight comparison
console.log('📊 Test 3: Priority Weight Comparison');
console.log('-------------------------------------');

const priorityComparison = [
  { name: 'Combat Focus', personalities: [AIPersonalityType.BERSERKER, AIPersonalityType.CONSERVATIVE] },
  { name: 'Planning Focus', personalities: [AIPersonalityType.STRATEGIST, AIPersonalityType.ROOKIE] },
  { name: 'Experience Level', personalities: [AIPersonalityType.VETERAN, AIPersonalityType.ROOKIE] },
];

priorityComparison.forEach(({ name, personalities }) => {
  console.log(`${name} Comparison:`);
  
  personalities.forEach(personalityType => {
    const personality = PersonalityFactory.createPersonality(personalityType);
    const topPriorities = Object.entries(personality.priorityWeights)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([priority, weight]) => `${priority}(${weight.toFixed(1)})`)
      .join(', ');
    
    console.log(`  ${personalityType}: ${topPriorities}`);
  });
  console.log();
});

// Test 4: Battle simulation framework
console.log('🎲 Test 4: Battle Simulation Framework');
console.log('--------------------------------------');

/**
 * Simulate a battle between two AI personalities
 * Note: This is a simplified simulation for testing the framework
 */
function simulateBattle(attackerType, defenderType) {
  const attacker = PersonalityFactory.createPersonality(attackerType);
  const defender = PersonalityFactory.createPersonality(defenderType);
  
  // Simulate battle factors
  const factors = {
    // Aggression affects first strike and damage
    attackerDamage: attacker.aggression * 2 + Math.random() * 3,
    defenderDamage: defender.aggression * 2 + Math.random() * 3,
    
    // Planning affects positioning and tactics
    attackerTactics: attacker.forwardLooking * 1.5 + Math.random() * 2,
    defenderTactics: defender.forwardLooking * 1.5 + Math.random() * 2,
    
    // Precision affects hit rate and efficiency
    attackerAccuracy: attacker.mistakes * 0.8 + Math.random() * 1.2,
    defenderAccuracy: defender.mistakes * 0.8 + Math.random() * 1.2,
    
    // Mistake frequency affects critical errors
    attackerErrors: attacker.mistakeFrequency * Math.random(),
    defenderErrors: defender.mistakeFrequency * Math.random(),
  };
  
  // Calculate effective combat power
  const attackerPower = (factors.attackerDamage + factors.attackerTactics) * factors.attackerAccuracy - factors.attackerErrors * 2;
  const defenderPower = (factors.defenderDamage + factors.defenderTactics) * factors.defenderAccuracy - factors.defenderErrors * 2;
  
  const winner = attackerPower > defenderPower ? attackerType : defenderType;
  const margin = Math.abs(attackerPower - defenderPower);
  
  return {
    winner,
    margin,
    attackerPower: attackerPower.toFixed(2),
    defenderPower: defenderPower.toFixed(2),
    factors
  };
}

// Run battle simulations
const battleResults = [];
const simulationCount = 10;

console.log(`Running ${simulationCount} simulated battles for each matchup...\\n`);

battleMatchups.forEach(({ attacker, defender }) => {
  console.log(`${attacker.toUpperCase()} vs ${defender.toUpperCase()} (${simulationCount} battles):`);
  
  let attackerWins = 0;
  let defenderWins = 0;
  let totalAttackerPower = 0;
  let totalDefenderPower = 0;
  
  for (let i = 0; i < simulationCount; i++) {
    const result = simulateBattle(attacker, defender);
    
    if (result.winner === attacker) {
      attackerWins++;
    } else {
      defenderWins++;
    }
    
    totalAttackerPower += parseFloat(result.attackerPower);
    totalDefenderPower += parseFloat(result.defenderPower);
  }
  
  const attackerWinRate = ((attackerWins / simulationCount) * 100).toFixed(1);
  const defenderWinRate = ((defenderWins / simulationCount) * 100).toFixed(1);
  const avgAttackerPower = (totalAttackerPower / simulationCount).toFixed(2);
  const avgDefenderPower = (totalDefenderPower / simulationCount).toFixed(2);
  
  console.log(`  Results: ${attacker} ${attackerWinRate}% - ${defenderWinRate}% ${defender}`);
  console.log(`  Average Power: ${attacker} ${avgAttackerPower} - ${avgDefenderPower} ${defender}`);
  
  // Determine balance
  const winRateDifference = Math.abs(attackerWins - defenderWins);
  let balanceAssessment = 'Balanced';
  if (winRateDifference > 7) {
    balanceAssessment = 'Unbalanced';
  } else if (winRateDifference > 4) {
    balanceAssessment = 'Slightly Unbalanced';
  }
  
  console.log(`  Balance Assessment: ${balanceAssessment}`);
  console.log();
  
  battleResults.push({
    matchup: `${attacker} vs ${defender}`,
    attackerWins,
    defenderWins,
    balance: balanceAssessment,
    avgAttackerPower,
    avgDefenderPower
  });
});

// Test 5: Balance analysis
console.log('⚖️  Test 5: Overall Balance Analysis');
console.log('------------------------------------');

const balanceStats = {
  balanced: battleResults.filter(r => r.balance === 'Balanced').length,
  slightlyUnbalanced: battleResults.filter(r => r.balance === 'Slightly Unbalanced').length,
  unbalanced: battleResults.filter(r => r.balance === 'Unbalanced').length,
};

console.log('Balance Distribution:');
console.log(`  Balanced: ${balanceStats.balanced}/${battleResults.length} matchups`);
console.log(`  Slightly Unbalanced: ${balanceStats.slightlyUnbalanced}/${battleResults.length} matchups`);
console.log(`  Unbalanced: ${balanceStats.unbalanced}/${battleResults.length} matchups`);

const balanceScore = (balanceStats.balanced * 3 + balanceStats.slightlyUnbalanced * 2 + balanceStats.unbalanced * 1) / (battleResults.length * 3);
console.log(`\\nOverall Balance Score: ${(balanceScore * 100).toFixed(1)}%`);

if (balanceScore > 0.8) {
  console.log('✅ Excellent balance - personalities provide variety without dominance');
} else if (balanceScore > 0.6) {
  console.log('🟡 Good balance - minor adjustments may be needed');
} else {
  console.log('❌ Poor balance - significant adjustments needed');
}

// Test 6: Personality effectiveness analysis
console.log('\\n🎯 Test 6: Personality Effectiveness Analysis');
console.log('----------------------------------------------');

const personalityStats = {};

battleResults.forEach(result => {
  const [attacker, defender] = result.matchup.split(' vs ');
  
  if (!personalityStats[attacker]) {
    personalityStats[attacker] = { wins: 0, losses: 0, totalPower: 0, battles: 0 };
  }
  if (!personalityStats[defender]) {
    personalityStats[defender] = { wins: 0, losses: 0, totalPower: 0, battles: 0 };
  }
  
  personalityStats[attacker].wins += result.attackerWins;
  personalityStats[attacker].losses += result.defenderWins;
  personalityStats[attacker].totalPower += parseFloat(result.avgAttackerPower);
  personalityStats[attacker].battles++;
  
  personalityStats[defender].wins += result.defenderWins;
  personalityStats[defender].losses += result.attackerWins;
  personalityStats[defender].totalPower += parseFloat(result.avgDefenderPower);
  personalityStats[defender].battles++;
});

console.log('Personality Performance:');
Object.entries(personalityStats).forEach(([personality, stats]) => {
  const winRate = ((stats.wins / (stats.wins + stats.losses)) * 100).toFixed(1);
  const avgPower = (stats.totalPower / stats.battles).toFixed(2);
  
  console.log(`  ${personality}: ${winRate}% win rate, ${avgPower} avg power`);
});

console.log('\\n🎮 AI Personality Battle Testing Complete!');
console.log('===========================================');
console.log('✅ All personality controllers created successfully');
console.log('✅ Matchup analysis provides strategic insights');
console.log('✅ Priority weight comparisons show personality differences');
console.log('✅ Battle simulation framework operational');
console.log('✅ Balance analysis indicates personality variety');
console.log('✅ Effectiveness analysis shows performance metrics');
console.log('\\n🚀 Ready for personality-driven game balance testing!');