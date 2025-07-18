# USS Wasp AI Personality System

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

### Berserker
- **Type**: `berserker`
- **Traits**: Aggression 5/5, Planning 1/5, Precision 2/5
- **Behavior**: Highly aggressive, rushes into combat with little planning
- **Mistake Frequency**: 0.45 (lower is better)
- **Tactical Complexity**: 0.19 (higher is better)
- **Risk Tolerance**: 0.95

**Top Tactical Priorities**:
- Inflict Casualties: 14.0
- Secure Objectives: 10.5
- Use Special Abilities: 7.5

### Strategist
- **Type**: `strategist`
- **Traits**: Aggression 2/5, Planning 5/5, Precision 4/5
- **Behavior**: Methodical planner, considers long-term consequences
- **Mistake Frequency**: 0.15 (lower is better)
- **Tactical Complexity**: 0.95 (higher is better)
- **Risk Tolerance**: 0.38

**Top Tactical Priorities**:
- Defend Objectives: 14.5
- Manage Logistics: 14.5
- Secure Objectives: 13.5

### Conservative
- **Type**: `conservative`
- **Traits**: Aggression 1/5, Planning 3/5, Precision 3/5
- **Behavior**: Defensive-minded, prioritizes unit preservation
- **Mistake Frequency**: 0.30 (lower is better)
- **Tactical Complexity**: 0.57 (higher is better)
- **Risk Tolerance**: 0.19

**Top Tactical Priorities**:
- Defend Objectives: 14.0
- Deny Terrain: 11.0
- Manage Logistics: 10.5

### Balanced
- **Type**: `balanced`
- **Traits**: Aggression 3/5, Planning 3/5, Precision 3/5
- **Behavior**: Well-rounded approach to all tactical situations
- **Mistake Frequency**: 0.30 (lower is better)
- **Tactical Complexity**: 0.57 (higher is better)
- **Risk Tolerance**: 0.57

**Top Tactical Priorities**:
- Secure Objectives: 11.5
- Defend Objectives: 11.0
- Inflict Casualties: 10.5

### Rookie
- **Type**: `rookie`
- **Traits**: Aggression 3/5, Planning 1/5, Precision 1/5
- **Behavior**: Inexperienced, makes frequent tactical errors
- **Mistake Frequency**: 0.60 (lower is better)
- **Tactical Complexity**: 0.19 (higher is better)
- **Risk Tolerance**: 0.57

**Top Tactical Priorities**:
- Inflict Casualties: 9.5
- Defend Objectives: 9.0
- Secure Objectives: 8.5

### Veteran
- **Type**: `veteran`
- **Traits**: Aggression 2/5, Planning 4/5, Precision 4/5
- **Behavior**: Experienced and precise, rarely makes mistakes
- **Mistake Frequency**: 0.15 (lower is better)
- **Tactical Complexity**: 0.76 (higher is better)
- **Risk Tolerance**: 0.38

**Top Tactical Priorities**:
- Defend Objectives: 13.5
- Manage Logistics: 13.0
- Secure Objectives: 12.0

### Specialist
- **Type**: `specialist`
- **Traits**: Aggression 2/5, Planning 4/5, Precision 4/5
- **Behavior**: Focuses on specific unit types and abilities
- **Mistake Frequency**: 0.15 (lower is better)
- **Tactical Complexity**: 0.76 (higher is better)
- **Risk Tolerance**: 0.38

**Top Tactical Priorities**:
- Defend Objectives: 13.5
- Manage Logistics: 13.0
- Secure Objectives: 12.0

### Adaptive
- **Type**: `adaptive`
- **Traits**: Aggression 3/5, Planning 4/5, Precision 3/5
- **Behavior**: Changes tactics based on battlefield conditions
- **Mistake Frequency**: 0.30 (lower is better)
- **Tactical Complexity**: 0.76 (higher is better)
- **Risk Tolerance**: 0.57

**Top Tactical Priorities**:
- Secure Objectives: 13.0
- Defend Objectives: 12.0
- Manage Logistics: 12.0

## Performance Analysis

*Based on 10 simulations per matchup (640 total battles)*

### Attack vs Defense Performance

#### Attacking Performance
*When this personality is the attacker*

1. 🗡️ **STRATEGIST**: 62.5% attack win rate (50W-30L) - 20.54 avg power
2. ⚔️ **SPECIALIST**: 46.3% attack win rate (37W-43L) - 18.97 avg power
3. 🏹 **ADAPTIVE**: 46.3% attack win rate (37W-43L) - 19.90 avg power
4.  **BERSERKER**: 42.5% attack win rate (34W-46L) - 18.96 avg power
5.  **VETERAN**: 42.5% attack win rate (34W-46L) - 18.85 avg power
6.  **BALANCED**: 41.3% attack win rate (33W-47L) - 18.44 avg power
7.  **CONSERVATIVE**: 20.0% attack win rate (16W-64L) - 13.25 avg power
8.  **ROOKIE**: 15.0% attack win rate (12W-68L) - 12.36 avg power

#### Defensive Performance
*When this personality is the defender*

1. 🛡️ **STRATEGIST**: 87.5% defense win rate (70W-10L) - 22.44 avg power
2. 🏰 **ADAPTIVE**: 85.0% defense win rate (68W-12L) - 21.65 avg power
3. 🔒 **SPECIALIST**: 81.3% defense win rate (65W-15L) - 20.99 avg power
4.  **VETERAN**: 78.8% defense win rate (63W-17L) - 20.95 avg power
5.  **BERSERKER**: 73.8% defense win rate (59W-21L) - 20.84 avg power
6.  **BALANCED**: 62.5% defense win rate (50W-30L) - 20.10 avg power
7.  **CONSERVATIVE**: 10.0% defense win rate (8W-72L) - 14.46 avg power
8.  **ROOKIE**: 5.0% defense win rate (4W-76L) - 13.53 avg power

### Overall Rankings

#### By Combined Win Rate
1. 🥇 **STRATEGIST**: 62.5% combined win rate (50W-30L)
2. 🥈 **SPECIALIST**: 46.3% combined win rate (37W-43L)
3. 🥉 **ADAPTIVE**: 46.3% combined win rate (37W-43L)
4.  **BERSERKER**: 42.5% combined win rate (34W-46L)
5.  **VETERAN**: 42.5% combined win rate (34W-46L)
6.  **BALANCED**: 41.3% combined win rate (33W-47L)
7.  **CONSERVATIVE**: 20.0% combined win rate (16W-64L)
8.  **ROOKIE**: 15.0% combined win rate (12W-68L)

## Detailed Matchup Matrix

### Win Rate Table
*Each cell shows: **Attacker** win rate vs **Defender** (Attacker-Defender)*

| **ATTACKER** \\ **DEFENDER** | **BERSERKER** | **STRATEGIST** | **CONSERVATIVE** | **BALANCED** | **ROOKIE** | **VETERAN** | **SPECIALIST** | **ADAPTIVE** |
|-------------------------|---|---|---|---|---|---|---|---|
| **BERSERKER** (A) | 100.0% (10-0) | 0.0% (0-10) | 100.0% (10-0) | 40.0% (4-6) | 100.0% (10-0) | 0.0% (0-10) | 0.0% (0-10) | 0.0% (0-10) |
| **STRATEGIST** (A) | 60.0% (6-4) | 100.0% (10-0) | 100.0% (10-0) | 70.0% (7-3) | 100.0% (10-0) | 40.0% (4-6) | 10.0% (1-9) | 20.0% (2-8) |
| **CONSERVATIVE** (A) | 0.0% (0-10) | 0.0% (0-10) | 100.0% (10-0) | 0.0% (0-10) | 60.0% (6-4) | 0.0% (0-10) | 0.0% (0-10) | 0.0% (0-10) |
| **BALANCED** (A) | 20.0% (2-8) | 0.0% (0-10) | 100.0% (10-0) | 100.0% (10-0) | 100.0% (10-0) | 0.0% (0-10) | 10.0% (1-9) | 0.0% (0-10) |
| **ROOKIE** (A) | 0.0% (0-10) | 0.0% (0-10) | 20.0% (2-8) | 0.0% (0-10) | 100.0% (10-0) | 0.0% (0-10) | 0.0% (0-10) | 0.0% (0-10) |
| **VETERAN** (A) | 10.0% (1-9) | 0.0% (0-10) | 100.0% (10-0) | 10.0% (1-9) | 100.0% (10-0) | 100.0% (10-0) | 20.0% (2-8) | 0.0% (0-10) |
| **SPECIALIST** (A) | 20.0% (2-8) | 0.0% (0-10) | 100.0% (10-0) | 40.0% (4-6) | 100.0% (10-0) | 10.0% (1-9) | 100.0% (10-0) | 0.0% (0-10) |
| **ADAPTIVE** (A) | 0.0% (0-10) | 0.0% (0-10) | 100.0% (10-0) | 40.0% (4-6) | 100.0% (10-0) | 20.0% (2-8) | 10.0% (1-9) | 100.0% (10-0) |

### Combat Power Comparison
*Format: Attacker Power vs Defender Power*

| **ATTACKER** \\ **DEFENDER** | **BERSERKER** | **STRATEGIST** | **CONSERVATIVE** | **BALANCED** | **ROOKIE** | **VETERAN** | **SPECIALIST** | **ADAPTIVE** |
|-------------------------|---|---|---|---|---|---|---|---|
| **BERSERKER** (A) | 19.07 vs 20.87 | 19.36 vs 22.39 | 19.27 vs 14.24 | 18.96 vs 20.20 | 19.28 vs 13.70 | 18.67 vs 21.49 | 18.48 vs 21.71 | 18.62 vs 21.21 |
| **STRATEGIST** (A) | 20.75 vs 20.13 | 20.96 vs 22.01 | 20.86 vs 14.89 | 20.12 vs 19.53 | 20.88 vs 13.18 | 20.14 vs 20.33 | 20.17 vs 21.04 | 20.45 vs 21.27 |
| **CONSERVATIVE** (A) | 13.14 vs 20.61 | 13.17 vs 22.94 | 12.85 vs 14.65 | 13.58 vs 20.17 | 13.44 vs 12.72 | 13.54 vs 20.82 | 13.10 vs 21.05 | 13.15 vs 21.76 |
| **BALANCED** (A) | 18.54 vs 21.41 | 18.67 vs 23.17 | 17.45 vs 13.94 | 18.23 vs 20.51 | 18.40 vs 13.63 | 19.05 vs 21.58 | 18.71 vs 20.94 | 18.46 vs 21.93 |
| **ROOKIE** (A) | 12.79 vs 20.56 | 11.78 vs 21.91 | 12.56 vs 14.53 | 12.14 vs 19.29 | 12.85 vs 14.45 | 12.17 vs 20.68 | 11.93 vs 20.22 | 12.67 vs 22.14 |
| **VETERAN** (A) | 18.87 vs 21.03 | 18.85 vs 22.03 | 19.07 vs 14.00 | 19.01 vs 20.53 | 18.35 vs 13.33 | 19.04 vs 20.35 | 18.79 vs 20.20 | 18.84 vs 21.45 |
| **SPECIALIST** (A) | 18.58 vs 20.56 | 18.06 vs 22.38 | 19.51 vs 14.83 | 19.11 vs 20.28 | 18.85 vs 13.27 | 19.89 vs 20.97 | 18.98 vs 21.43 | 18.81 vs 21.62 |
| **ADAPTIVE** (A) | 20.12 vs 21.59 | 20.17 vs 22.67 | 19.95 vs 14.59 | 19.95 vs 20.32 | 19.74 vs 13.96 | 19.91 vs 21.34 | 19.38 vs 21.34 | 20.00 vs 21.81 |

## Balance Analysis

### Attack vs Defense Specialists

#### Best Attackers
*Personalities that excel when attacking*

1. **STRATEGIST**: 62.5% attack vs 87.5% defense (-25.0% attack advantage)
2. **SPECIALIST**: 46.3% attack vs 81.3% defense (-35.0% attack advantage)
3. **ADAPTIVE**: 46.3% attack vs 85.0% defense (-38.7% attack advantage)
4. **BERSERKER**: 42.5% attack vs 73.8% defense (-31.3% attack advantage)
5. **VETERAN**: 42.5% attack vs 78.8% defense (-36.3% attack advantage)

#### Best Defenders
*Personalities that excel when defending*

1. **STRATEGIST**: 87.5% defense vs 62.5% attack (+25.0% defense advantage)
2. **ADAPTIVE**: 85.0% defense vs 46.3% attack (+38.7% defense advantage)
3. **SPECIALIST**: 81.3% defense vs 46.3% attack (+35.0% defense advantage)
4. **VETERAN**: 78.8% defense vs 42.5% attack (+36.3% defense advantage)
5. **BERSERKER**: 73.8% defense vs 42.5% attack (+31.3% defense advantage)

### Most Attacking Matchups
*Matchups where attacker has >70% win rate*

- **BERSERKER** (attacker) vs **BERSERKER** (defender): 100.0% (10-0)
- **BERSERKER** (attacker) vs **CONSERVATIVE** (defender): 100.0% (10-0)
- **BERSERKER** (attacker) vs **ROOKIE** (defender): 100.0% (10-0)
- **STRATEGIST** (attacker) vs **STRATEGIST** (defender): 100.0% (10-0)
- **STRATEGIST** (attacker) vs **CONSERVATIVE** (defender): 100.0% (10-0)
- **STRATEGIST** (attacker) vs **ROOKIE** (defender): 100.0% (10-0)
- **CONSERVATIVE** (attacker) vs **CONSERVATIVE** (defender): 100.0% (10-0)
- **BALANCED** (attacker) vs **CONSERVATIVE** (defender): 100.0% (10-0)
- **BALANCED** (attacker) vs **BALANCED** (defender): 100.0% (10-0)
- **BALANCED** (attacker) vs **ROOKIE** (defender): 100.0% (10-0)
- **ROOKIE** (attacker) vs **ROOKIE** (defender): 100.0% (10-0)
- **VETERAN** (attacker) vs **CONSERVATIVE** (defender): 100.0% (10-0)
- **VETERAN** (attacker) vs **ROOKIE** (defender): 100.0% (10-0)
- **VETERAN** (attacker) vs **VETERAN** (defender): 100.0% (10-0)
- **SPECIALIST** (attacker) vs **CONSERVATIVE** (defender): 100.0% (10-0)

### Most Defensive Matchups
*Matchups where defender has >70% win rate*

- **STRATEGIST** (defender) vs **BERSERKER** (attacker): 100.0% (10-0)
- **VETERAN** (defender) vs **BERSERKER** (attacker): 100.0% (10-0)
- **SPECIALIST** (defender) vs **BERSERKER** (attacker): 100.0% (10-0)
- **ADAPTIVE** (defender) vs **BERSERKER** (attacker): 100.0% (10-0)
- **BERSERKER** (defender) vs **CONSERVATIVE** (attacker): 100.0% (10-0)
- **STRATEGIST** (defender) vs **CONSERVATIVE** (attacker): 100.0% (10-0)
- **BALANCED** (defender) vs **CONSERVATIVE** (attacker): 100.0% (10-0)
- **VETERAN** (defender) vs **CONSERVATIVE** (attacker): 100.0% (10-0)
- **SPECIALIST** (defender) vs **CONSERVATIVE** (attacker): 100.0% (10-0)
- **ADAPTIVE** (defender) vs **CONSERVATIVE** (attacker): 100.0% (10-0)
- **STRATEGIST** (defender) vs **BALANCED** (attacker): 100.0% (10-0)
- **VETERAN** (defender) vs **BALANCED** (attacker): 100.0% (10-0)
- **ADAPTIVE** (defender) vs **BALANCED** (attacker): 100.0% (10-0)
- **BERSERKER** (defender) vs **ROOKIE** (attacker): 100.0% (10-0)
- **STRATEGIST** (defender) vs **ROOKIE** (attacker): 100.0% (10-0)

### Most Balanced Matchups
*Matchups with 40-60% win rate (attacker perspective)*

- **BERSERKER** (attacker) vs **BALANCED** (defender): 40.0% (4-6)
- **STRATEGIST** (attacker) vs **BERSERKER** (defender): 60.0% (6-4)
- **STRATEGIST** (attacker) vs **VETERAN** (defender): 40.0% (4-6)
- **CONSERVATIVE** (attacker) vs **ROOKIE** (defender): 60.0% (6-4)
- **SPECIALIST** (attacker) vs **BALANCED** (defender): 40.0% (4-6)
- **ADAPTIVE** (attacker) vs **BALANCED** (defender): 40.0% (4-6)

## Strategic Insights

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

```typescript
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
```

### Scenario-Based AI Selection

```typescript
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
```

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

*Report generated on 7/18/2025, 5:24:52 PM*
