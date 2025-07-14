/**
 * Generate enhanced personality documentation with attack/defense analysis
 */

const fs = require('fs');
const path = require('path');

// Load analysis data
const dataPath = path.join(__dirname, '../docs/personality-analysis-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const { PersonalityFactory } = require('../dist/core/ai/PersonalityFactory');
const { AIPersonalityType } = require('../dist/core/ai/types');

// Generate enhanced markdown report with attack/defense analysis
function generateEnhancedMarkdownReport() {
  const { personalities, battleMatrix, detailedResults, personalityStats, metadata } = data;
  
  // Calculate attack vs defense statistics
  const attackStats = {};
  const defenseStats = {};
  
  personalities.forEach(personality => {
    let attackWins = 0;
    let attackLosses = 0;
    let defenseWins = 0;
    let defenseLosses = 0;
    let attackPower = 0;
    let defensePower = 0;
    
    // As attacker
    personalities.forEach(opponent => {
      const result = detailedResults.find(r => r.attacker === personality && r.defender === opponent);
      attackWins += result.attackerWins;
      attackLosses += result.defenderWins;
      attackPower += parseFloat(result.avgAttackerPower);
    });
    
    // As defender
    personalities.forEach(opponent => {
      const result = detailedResults.find(r => r.attacker === opponent && r.defender === personality);
      defenseWins += result.defenderWins;
      defenseLosses += result.attackerWins;
      defensePower += parseFloat(result.avgDefenderPower);
    });
    
    attackStats[personality] = {
      wins: attackWins,
      losses: attackLosses,
      winRate: ((attackWins / (attackWins + attackLosses)) * 100).toFixed(1),
      avgPower: (attackPower / personalities.length).toFixed(2)
    };
    
    defenseStats[personality] = {
      wins: defenseWins,
      losses: defenseLosses,
      winRate: ((defenseWins / (defenseWins + defenseLosses)) * 100).toFixed(1),
      avgPower: (defensePower / personalities.length).toFixed(2)
    };
  });

  let md = `# USS Wasp AI Personality System

## Overview

The USS Wasp AI Personality System provides diverse behavioral patterns for AI opponents, creating varied and engaging tactical experiences. The system is built on three core personality dimensions that influence decision-making and combat effectiveness.

## Personality Dimensions

### 1. Aggression Scale (0-5)
- **0-1 (Conservative)**: Prioritizes unit preservation, defensive positioning
- **2-3 (Moderate)**: Balanced approach between offense and defense  
- **4-5 (Aggressive)**: Seeks combat opportunities, takes calculated risks

### 2. Forward-Looking Scale (0-5)
- **0-1 (Naive)**: Focuses on immediate threats and opportunities
- **2-3 (Experienced)**: Considers short-term tactical consequences
- **4-5 (Strategic)**: Plans multiple turns ahead, considers long-term implications

### 3. Precision Scale (0-5)
- **0-1 (Error-prone)**: Makes frequent tactical mistakes, poor coordination
- **2-3 (Competent)**: Moderate decision quality and unit coordination
- **4-5 (Precise)**: Optimal decision-making, excellent unit coordination

## Available Personalities

`;

  // Add personality details
  personalities.forEach(personalityType => {
    const personality = PersonalityFactory.createPersonality(personalityType);
    const description = PersonalityFactory.getPersonalityDescription(personalityType);
    
    md += `### ${personality.name}
- **Type**: \`${personalityType}\`
- **Traits**: Aggression ${personality.aggression}/5, Planning ${personality.forwardLooking}/5, Precision ${personality.mistakes}/5
- **Behavior**: ${description}
- **Mistake Frequency**: ${personality.mistakeFrequency.toFixed(2)} (lower is better)
- **Tactical Complexity**: ${personality.tacticalComplexity.toFixed(2)} (higher is better)
- **Risk Tolerance**: ${personality.riskTolerance.toFixed(2)}

**Top Tactical Priorities**:
`;
    
    // Show top 3 tactical priorities
    const topPriorities = Object.entries(personality.priorityWeights)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    topPriorities.forEach(([priority, weight]) => {
      md += `- ${priority.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${weight.toFixed(1)}\n`;
    });
    
    md += '\n';
  });

  // Add performance analysis with attack/defense breakdown
  md += `## Performance Analysis

*Based on ${metadata.simulationsPerMatchup} simulations per matchup (${metadata.totalBattles} total battles)*

### Attack vs Defense Performance

#### Attacking Performance
*When this personality is the attacker*

`;

  const sortedAttackers = Object.entries(attackStats)
    .sort(([,a], [,b]) => parseFloat(b.winRate) - parseFloat(a.winRate));

  sortedAttackers.forEach(([personality, stats], index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🗡️' : rank === 2 ? '⚔️' : rank === 3 ? '🏹' : '';
    md += `${rank}. ${medal} **${personality.toUpperCase()}**: ${stats.winRate}% attack win rate (${stats.wins}W-${stats.losses}L) - ${stats.avgPower} avg power\n`;
  });

  md += '\n#### Defensive Performance\n*When this personality is the defender*\n\n';

  const sortedDefenders = Object.entries(defenseStats)
    .sort(([,a], [,b]) => parseFloat(b.winRate) - parseFloat(a.winRate));

  sortedDefenders.forEach(([personality, stats], index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🛡️' : rank === 2 ? '🏰' : rank === 3 ? '🔒' : '';
    md += `${rank}. ${medal} **${personality.toUpperCase()}**: ${stats.winRate}% defense win rate (${stats.wins}W-${stats.losses}L) - ${stats.avgPower} avg power\n`;
  });

  md += '\n### Overall Rankings\n\n#### By Combined Win Rate\n';

  const sortedStats = Object.entries(personalityStats)
    .sort(([,a], [,b]) => parseFloat(b.winRate) - parseFloat(a.winRate));

  sortedStats.forEach(([personality, stats], index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    md += `${rank}. ${medal} **${personality.toUpperCase()}**: ${stats.winRate}% combined win rate (${stats.wins}W-${stats.losses}L)\n`;
  });

  // Add detailed matchup matrix with clearer attacker/defender labels
  md += `\n## Detailed Matchup Matrix

### Win Rate Table
*Each cell shows: **Attacker** win rate vs **Defender** (Attacker-Defender)*

| **ATTACKER** \\\\ **DEFENDER** | ${personalities.map(p => `**${p.toUpperCase()}**`).join(' | ')} |
|${'-'.repeat(25)}|${personalities.map(() => '---').join('|')}|
`;

  personalities.forEach(attacker => {
    const row = personalities.map(defender => {
      const matchup = detailedResults.find(r => r.attacker === attacker && r.defender === defender);
      return `${matchup.winRate}% (${matchup.attackerWins}-${matchup.defenderWins})`;
    });
    md += `| **${attacker.toUpperCase()}** (A) | ${row.join(' | ')} |\n`;
  });

  md += `\n### Combat Power Comparison
*Format: Attacker Power vs Defender Power*

| **ATTACKER** \\\\ **DEFENDER** | ${personalities.map(p => `**${p.toUpperCase()}**`).join(' | ')} |
|${'-'.repeat(25)}|${personalities.map(() => '---').join('|')}|
`;

  personalities.forEach(attacker => {
    const row = personalities.map(defender => {
      const matchup = detailedResults.find(r => r.attacker === attacker && r.defender === defender);
      return `${matchup.avgAttackerPower} vs ${matchup.avgDefenderPower}`;
    });
    md += `| **${attacker.toUpperCase()}** (A) | ${row.join(' | ')} |\n`;
  });

  // Enhanced balance analysis with attack/defense context
  md += `\n## Balance Analysis

### Attack vs Defense Specialists

#### Best Attackers
*Personalities that excel when attacking*

`;

  sortedAttackers.slice(0, 5).forEach((entry, index) => {
    const [personality, stats] = entry;
    const defenseRate = defenseStats[personality].winRate;
    const attackAdvantage = (parseFloat(stats.winRate) - parseFloat(defenseRate)).toFixed(1);
    md += `${index + 1}. **${personality.toUpperCase()}**: ${stats.winRate}% attack vs ${defenseRate}% defense (${attackAdvantage > 0 ? '+' : ''}${attackAdvantage}% attack advantage)\n`;
  });

  md += '\n#### Best Defenders\n*Personalities that excel when defending*\n\n';

  sortedDefenders.slice(0, 5).forEach((entry, index) => {
    const [personality, stats] = entry;
    const attackRate = attackStats[personality].winRate;
    const defenseAdvantage = (parseFloat(stats.winRate) - parseFloat(attackRate)).toFixed(1);
    md += `${index + 1}. **${personality.toUpperCase()}**: ${stats.winRate}% defense vs ${attackRate}% attack (${defenseAdvantage > 0 ? '+' : ''}${defenseAdvantage}% defense advantage)\n`;
  });

  md += '\n### Most Attacking Matchups\n*Matchups where attacker has >70% win rate*\n\n';

  const attackingMatchups = detailedResults
    .filter(result => parseFloat(result.winRate) > 70)
    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

  attackingMatchups.slice(0, 15).forEach(result => {
    md += `- **${result.attacker.toUpperCase()}** (attacker) vs **${result.defender.toUpperCase()}** (defender): ${result.winRate}% (${result.attackerWins}-${result.defenderWins})\n`;
  });

  md += '\n### Most Defensive Matchups\n*Matchups where defender has >70% win rate*\n\n';

  const defensiveMatchups = detailedResults
    .filter(result => parseFloat(result.winRate) < 30)
    .sort((a, b) => parseFloat(a.winRate) - parseFloat(b.winRate));

  defensiveMatchups.slice(0, 15).forEach(result => {
    const defenderWinRate = (100 - parseFloat(result.winRate)).toFixed(1);
    md += `- **${result.defender.toUpperCase()}** (defender) vs **${result.attacker.toUpperCase()}** (attacker): ${defenderWinRate}% (${result.defenderWins}-${result.attackerWins})\n`;
  });

  md += '\n### Most Balanced Matchups\n*Matchups with 40-60% win rate (attacker perspective)*\n\n';

  const balancedMatchups = detailedResults
    .filter(result => {
      const winRate = parseFloat(result.winRate);
      return winRate >= 40 && winRate <= 60;
    })
    .sort((a, b) => Math.abs(50 - parseFloat(a.winRate)) - Math.abs(50 - parseFloat(b.winRate)));

  balancedMatchups.slice(0, 15).forEach(result => {
    md += `- **${result.attacker.toUpperCase()}** (attacker) vs **${result.defender.toUpperCase()}** (defender): ${result.winRate}% (${result.attackerWins}-${result.defenderWins})\n`;
  });

  // Enhanced strategic insights
  md += `\n## Strategic Insights

### Attack vs Defense Analysis

#### Key Findings

1. **Aggressive personalities** (Berserker, Berserker-type) tend to perform better as attackers
2. **Defensive personalities** (Conservative, Strategist) can be strong defenders but struggle on attack
3. **Balanced personalities** show less variation between attack and defense performance
4. **Planning-focused** personalities (Strategist, Adaptive) excel in both roles but favor defense

#### Tactical Recommendations

**When Attacking:**
- Use aggressive personalities (Berserker, Adaptive) for assault operations
- Apply early pressure against defensive personalities (Conservative, Strategist)
- Exploit the mobility and initiative advantages of the attacking role

**When Defending:**
- Deploy strategic personalities (Strategist, Veteran) for defensive operations
- Use terrain and positioning advantages effectively
- Focus on counter-attacks when aggressive personalities overextend

### Personality-Specific Strategies

#### Against Aggressive Attackers (Berserker, Adaptive)
- **As Defender**: Use defensive terrain, create chokepoints, counter-attack overextensions
- **As Attacker**: Match their aggression or use superior planning to outmaneuver

#### Against Defensive Specialists (Conservative, Strategist)  
- **As Attacker**: Apply constant pressure, use mobility to avoid defensive positions
- **As Defender**: Contest objectives early, don't let them establish defensive lines

#### Against Balanced Personalities (Balanced, Veteran)
- **Either Role**: Exploit their lack of specialization with focused strategies
- Adapt tactics based on terrain and objective requirements

### Force Composition Recommendations

**Assault Forces**: Berserker (spearhead) + Adaptive (support) + Strategist (command)
**Defense Forces**: Conservative (anchor) + Strategist (command) + Specialist (counter-attack)
**Balanced Forces**: Balanced (core) + Veteran (experience) + Adaptive (flexibility)

## Technical Implementation

### Usage Examples

\`\`\`typescript
// Create assault AI team
const assaultAI = new AIController('assault_ai', AIPersonalityType.BERSERKER);

// Create defensive AI team  
const defenseAI = new AIController('defense_ai', AIPersonalityType.CONSERVATIVE);

// Create adaptive AI for uncertain situations
const adaptiveAI = new AIController('adaptive_ai', AIPersonalityType.ADAPTIVE);

// Create custom personality for specific scenarios
const customAI = new AIController('custom_ai', 
  PersonalityFactory.createCustomPersonality('Aggressive Defender', 4, 3, 4)
);
\`\`\`

### Scenario-Based AI Selection

\`\`\`typescript
// Select AI based on tactical situation
function selectAIPersonality(role: 'attacker' | 'defender', difficulty: 'easy' | 'medium' | 'hard') {
  if (role === 'attacker') {
    switch (difficulty) {
      case 'easy': return AIPersonalityType.ROOKIE;
      case 'medium': return AIPersonalityType.BERSERKER;
      case 'hard': return AIPersonalityType.ADAPTIVE;
    }
  } else {
    switch (difficulty) {
      case 'easy': return AIPersonalityType.CONSERVATIVE;
      case 'medium': return AIPersonalityType.STRATEGIST;
      case 'hard': return AIPersonalityType.VETERAN;
    }
  }
}
\`\`\`

### Priority Weight System

Each personality has unique tactical priority weights that influence decision-making:

- **Combat Priorities**: INFLICT_CASUALTIES, PRESERVE_FORCE
- **Territorial Priorities**: DEFEND_OBJECTIVES, SECURE_OBJECTIVES, DENY_TERRAIN  
- **Support Priorities**: GATHER_INTELLIGENCE, MANAGE_LOGISTICS
- **Special Priorities**: WASP_OPERATIONS, HIDDEN_OPERATIONS, USE_SPECIAL_ABILITIES

The system dynamically adjusts these weights based on:
- Personality traits (aggression, planning, precision)
- Current battlefield situation
- Attack vs defense role

*Report generated on ${new Date(metadata.generatedAt).toLocaleString()}*
`;

  return md;
}

// Generate and save the enhanced report
const report = generateEnhancedMarkdownReport();
const outputPath = path.join(__dirname, '../docs/personalities.md');

fs.writeFileSync(outputPath, report);

console.log('📋 Enhanced personality documentation generated successfully!');
console.log(`📄 Report saved to: ${outputPath}`);
console.log('🎯 Now includes detailed attack vs defense analysis!');
console.log('⚔️ Shows which personalities excel as attackers vs defenders');
console.log('🛡️ Provides tactical recommendations for different roles');