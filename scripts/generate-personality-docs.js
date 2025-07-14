/**
 * Generate comprehensive personality documentation
 */

const fs = require('fs');
const path = require('path');

// Load analysis data
const dataPath = path.join(__dirname, '../docs/personality-analysis-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const { PersonalityFactory } = require('../dist/core/ai/PersonalityFactory');
const { AIPersonalityType } = require('../dist/core/ai/types');

// Generate comprehensive markdown report
function generateMarkdownReport() {
  const { personalities, battleMatrix, detailedResults, personalityStats, metadata } = data;
  
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

  // Add performance summary
  md += `## Performance Analysis

*Based on ${metadata.simulationsPerMatchup} simulations per matchup (${metadata.totalBattles} total battles)*

### Overall Rankings

#### By Win Rate
`;

  const sortedStats = Object.entries(personalityStats)
    .sort(([,a], [,b]) => parseFloat(b.winRate) - parseFloat(a.winRate));

  sortedStats.forEach(([personality, stats], index) => {
    const rank = index + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
    md += `${rank}. ${medal} **${personality.toUpperCase()}**: ${stats.winRate}% win rate (${stats.wins}W-${stats.losses}L)\n`;
  });

  md += '\n#### By Average Combat Power\n';
  
  const sortedPower = Object.entries(personalityStats)
    .sort(([,a], [,b]) => parseFloat(b.avgPower) - parseFloat(a.avgPower));

  sortedPower.forEach(([personality, stats], index) => {
    const rank = index + 1;
    md += `${rank}. **${personality.toUpperCase()}**: ${stats.avgPower} average power\n`;
  });

  // Add detailed matchup matrix
  md += `\n## Detailed Matchup Matrix

### Win Rate Table
*Each cell shows Attacker win rate vs Defender*

| Attacker \\\\ Defender | ${personalities.map(p => p.toUpperCase()).join(' | ')} |
|${'-'.repeat(20)}|${personalities.map(() => '---').join('|')}|
`;

  personalities.forEach(attacker => {
    const row = personalities.map(defender => {
      const matchup = detailedResults.find(r => r.attacker === attacker && r.defender === defender);
      return `${matchup.winRate}%`;
    });
    md += `| **${attacker.toUpperCase()}** | ${row.join(' | ')} |\n`;
  });

  md += `\n### Combat Power Table
*Each cell shows Attacker average combat power vs Defender*

| Attacker \\\\ Defender | ${personalities.map(p => p.toUpperCase()).join(' | ')} |
|${'-'.repeat(20)}|${personalities.map(() => '---').join('|')}|
`;

  personalities.forEach(attacker => {
    const row = personalities.map(defender => {
      const matchup = detailedResults.find(r => r.attacker === attacker && r.defender === defender);
      return matchup.avgAttackerPower;
    });
    md += `| **${attacker.toUpperCase()}** | ${row.join(' | ')} |\n`;
  });

  // Add balance analysis
  md += `\n## Balance Analysis

### Most Dominant Matchups
*Matchups with >80% win rate for attacker*

`;

  const dominantMatchups = detailedResults
    .filter(result => parseFloat(result.winRate) > 80)
    .sort((a, b) => parseFloat(b.winRate) - parseFloat(a.winRate));

  dominantMatchups.slice(0, 15).forEach(result => {
    md += `- **${result.attacker.toUpperCase()}** vs ${result.defender.toUpperCase()}: ${result.winRate}% (${result.attackerWins}-${result.defenderWins})\n`;
  });

  md += `\n### Most Balanced Matchups
*Matchups with 40-60% win rate (most competitive)*

`;

  const balancedMatchups = detailedResults
    .filter(result => {
      const winRate = parseFloat(result.winRate);
      return winRate >= 40 && winRate <= 60;
    })
    .sort((a, b) => Math.abs(50 - parseFloat(a.winRate)) - Math.abs(50 - parseFloat(b.winRate)));

  balancedMatchups.slice(0, 15).forEach(result => {
    md += `- **${result.attacker.toUpperCase()}** vs ${result.defender.toUpperCase()}: ${result.winRate}% (${result.attackerWins}-${result.defenderWins})\n`;
  });

  // Add strategic insights
  md += `\n## Strategic Insights

### Tier Analysis

#### S-Tier (Dominant)
- **Strategist**: Highest win rate (${personalityStats.strategist.winRate}%) due to superior planning and precision
- **Adaptive**: Strong overall performance (${personalityStats.adaptive.winRate}%) with good adaptability

#### A-Tier (Competitive)  
- **Specialist**: Solid performance (${personalityStats.specialist.winRate}%) with focused tactics
- **Berserker**: High power but inconsistent (${personalityStats.berserker.winRate}%) due to reckless aggression
- **Veteran**: Experienced but sometimes overcautious (${personalityStats.veteran.winRate}%)

#### B-Tier (Balanced)
- **Balanced**: Moderate performance (${personalityStats.balanced.winRate}%) across all scenarios

#### C-Tier (Struggles)
- **Conservative**: Low aggression limits effectiveness (${personalityStats.conservative.winRate}%)
- **Rookie**: High mistake rate significantly impacts performance (${personalityStats.rookie.winRate}%)

### Key Findings

1. **Planning Dominance**: Forward-looking personalities (Strategist, Adaptive) perform best
2. **Aggression Balance**: Moderate aggression (2-3) seems optimal; extreme aggression can backfire
3. **Precision Impact**: High precision (low mistakes) is crucial for consistent performance
4. **Defensive Weakness**: Overly conservative play is punished in this tactical environment

### Recommendations for Players

- **Against Strategist**: Use aggressive early pressure to disrupt long-term plans
- **Against Berserker**: Maintain defensive positions and exploit reckless attacks
- **Against Conservative**: Apply constant pressure; they struggle with initiative
- **Against Rookie**: Focus on complex maneuvers they may mishandle

## Technical Implementation

### Usage Examples

\`\`\`typescript
// Create AI with specific personality
const strategicAI = new AIController('player_ai', AIPersonalityType.STRATEGIST);

// Create custom personality
const customAI = new AIController('custom_ai', 
  PersonalityFactory.createCustomPersonality('Cautious Aggressor', 4, 2, 3)
);

// Get personality information
const personality = strategicAI.getPersonality();
console.log(personality.priorityWeights);
\`\`\`

### Priority Weight System

Each personality has unique tactical priority weights that influence decision-making:

- **Combat Priorities**: INFLICT_CASUALTIES, PRESERVE_FORCE
- **Territorial Priorities**: DEFEND_OBJECTIVES, SECURE_OBJECTIVES, DENY_TERRAIN  
- **Support Priorities**: GATHER_INTELLIGENCE, MANAGE_LOGISTICS
- **Special Priorities**: WASP_OPERATIONS, HIDDEN_OPERATIONS, USE_SPECIAL_ABILITIES

*Report generated on ${new Date(metadata.generatedAt).toLocaleString()}*
`;

  return md;
}

// Generate and save the report
const report = generateMarkdownReport();
const outputPath = path.join(__dirname, '../docs/personalities.md');

fs.writeFileSync(outputPath, report);

console.log('📋 Personality documentation generated successfully!');
console.log(`📄 Report saved to: ${outputPath}`);
console.log(`📊 Based on ${data.metadata.totalBattles} total battles`);
console.log('🎯 Ready for review and integration!');