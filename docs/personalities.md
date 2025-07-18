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

1. 🗡️ **STRATEGIST**: 63.7% attack win rate (51W-29L) - 20.21 avg power
2. ⚔️ **ADAPTIVE**: 50.0% attack win rate (40W-40L) - 19.69 avg power
3. 🏹 **VETERAN**: 43.8% attack win rate (35W-45L) - 18.75 avg power
4.  **BALANCED**: 42.5% attack win rate (34W-46L) - 18.38 avg power
5.  **BERSERKER**: 41.3% attack win rate (33W-47L) - 18.86 avg power
6.  **SPECIALIST**: 41.3% attack win rate (33W-47L) - 18.75 avg power
7.  **CONSERVATIVE**: 18.8% attack win rate (15W-65L) - 13.43 avg power
8.  **ROOKIE**: 18.8% attack win rate (15W-65L) - 12.32 avg power

#### Defensive Performance
*When this personality is the defender*

1. 🛡️ **STRATEGIST**: 87.5% defense win rate (70W-10L) - 22.51 avg power
2. 🏰 **ADAPTIVE**: 83.8% defense win rate (67W-13L) - 21.80 avg power
3. 🔒 **VETERAN**: 78.8% defense win rate (63W-17L) - 20.82 avg power
4.  **SPECIALIST**: 78.8% defense win rate (63W-17L) - 20.72 avg power
5.  **BERSERKER**: 73.8% defense win rate (59W-21L) - 20.63 avg power
6.  **BALANCED**: 65.0% defense win rate (52W-28L) - 20.13 avg power
7.  **CONSERVATIVE**: 6.3% defense win rate (5W-75L) - 14.55 avg power
8.  **ROOKIE**: 6.3% defense win rate (5W-75L) - 13.36 avg power

### Overall Rankings

#### By Combined Win Rate
1. 🥇 **STRATEGIST**: 63.7% combined win rate (51W-29L)
2. 🥈 **ADAPTIVE**: 50.0% combined win rate (40W-40L)
3. 🥉 **VETERAN**: 43.8% combined win rate (35W-45L)
4.  **BALANCED**: 42.5% combined win rate (34W-46L)
5.  **BERSERKER**: 41.3% combined win rate (33W-47L)
6.  **SPECIALIST**: 41.3% combined win rate (33W-47L)
7.  **CONSERVATIVE**: 18.8% combined win rate (15W-65L)
8.  **ROOKIE**: 18.8% combined win rate (15W-65L)

## Detailed Matchup Matrix

### Win Rate Table
*Each cell shows: **Attacker** win rate vs **Defender** (Attacker-Defender)*

| **ATTACKER** \\ **DEFENDER** | **BERSERKER** | **STRATEGIST** | **CONSERVATIVE** | **BALANCED** | **ROOKIE** | **VETERAN** | **SPECIALIST** | **ADAPTIVE** |
|-------------------------|---|---|---|---|---|---|---|---|
| **BERSERKER** (A) | 100.0% (10-0) | 0.0% (0-10) | 100.0% (10-0) | 30.0% (3-7) | 100.0% (10-0) | 0.0% (0-10) | 0.0% (0-10) | 0.0% (0-10) |
| **STRATEGIST** (A) | 30.0% (3-7) | 100.0% (10-0) | 100.0% (10-0) | 80.0% (8-2) | 100.0% (10-0) | 30.0% (3-7) | 50.0% (5-5) | 20.0% (2-8) |
| **CONSERVATIVE** (A) | 0.0% (0-10) | 0.0% (0-10) | 100.0% (10-0) | 0.0% (0-10) | 50.0% (5-5) | 0.0% (0-10) | 0.0% (0-10) | 0.0% (0-10) |
| **BALANCED** (A) | 20.0% (2-8) | 0.0% (0-10) | 100.0% (10-0) | 100.0% (10-0) | 100.0% (10-0) | 10.0% (1-9) | 0.0% (0-10) | 10.0% (1-9) |
| **ROOKIE** (A) | 0.0% (0-10) | 0.0% (0-10) | 50.0% (5-5) | 0.0% (0-10) | 100.0% (10-0) | 0.0% (0-10) | 0.0% (0-10) | 0.0% (0-10) |
| **VETERAN** (A) | 10.0% (1-9) | 0.0% (0-10) | 100.0% (10-0) | 30.0% (3-7) | 100.0% (10-0) | 100.0% (10-0) | 10.0% (1-9) | 0.0% (0-10) |
| **SPECIALIST** (A) | 20.0% (2-8) | 0.0% (0-10) | 100.0% (10-0) | 0.0% (0-10) | 100.0% (10-0) | 10.0% (1-9) | 100.0% (10-0) | 0.0% (0-10) |
| **ADAPTIVE** (A) | 30.0% (3-7) | 0.0% (0-10) | 100.0% (10-0) | 40.0% (4-6) | 100.0% (10-0) | 20.0% (2-8) | 10.0% (1-9) | 100.0% (10-0) |

### Combat Power Comparison
*Format: Attacker Power vs Defender Power*

| **ATTACKER** \\ **DEFENDER** | **BERSERKER** | **STRATEGIST** | **CONSERVATIVE** | **BALANCED** | **ROOKIE** | **VETERAN** | **SPECIALIST** | **ADAPTIVE** |
|-------------------------|---|---|---|---|---|---|---|---|
| **BERSERKER** (A) | 19.41 vs 20.52 | 18.88 vs 22.56 | 18.71 vs 14.67 | 18.97 vs 19.79 | 18.81 vs 13.01 | 18.90 vs 21.09 | 18.53 vs 20.61 | 18.66 vs 21.72 |
| **STRATEGIST** (A) | 20.23 vs 20.74 | 20.31 vs 22.55 | 19.99 vs 14.19 | 20.37 vs 19.84 | 19.98 vs 12.73 | 20.19 vs 20.61 | 20.50 vs 20.48 | 20.13 vs 21.96 |
| **CONSERVATIVE** (A) | 13.28 vs 20.47 | 13.77 vs 22.00 | 13.68 vs 15.31 | 13.70 vs 19.75 | 13.32 vs 13.37 | 13.07 vs 21.35 | 12.89 vs 21.53 | 13.71 vs 22.21 |
| **BALANCED** (A) | 18.65 vs 20.39 | 18.19 vs 22.42 | 18.42 vs 14.56 | 19.05 vs 20.10 | 18.11 vs 13.58 | 18.33 vs 20.30 | 17.56 vs 21.10 | 18.76 vs 21.67 |
| **ROOKIE** (A) | 12.58 vs 20.78 | 11.65 vs 22.35 | 13.13 vs 14.09 | 12.05 vs 20.50 | 12.95 vs 13.71 | 11.98 vs 20.61 | 11.95 vs 21.04 | 12.26 vs 21.55 |
| **VETERAN** (A) | 18.81 vs 21.32 | 18.69 vs 22.61 | 18.23 vs 14.48 | 18.81 vs 19.96 | 18.50 vs 12.23 | 18.98 vs 21.19 | 18.66 vs 20.41 | 19.31 vs 21.84 |
| **SPECIALIST** (A) | 18.83 vs 20.47 | 18.92 vs 22.95 | 18.69 vs 14.72 | 18.97 vs 20.53 | 18.30 vs 14.34 | 18.82 vs 20.77 | 19.05 vs 19.76 | 18.43 vs 21.91 |
| **ADAPTIVE** (A) | 19.97 vs 20.37 | 19.73 vs 22.65 | 20.04 vs 14.36 | 19.41 vs 20.60 | 19.21 vs 13.89 | 19.57 vs 20.67 | 19.91 vs 20.80 | 19.69 vs 21.54 |

## Balance Analysis

### Attack vs Defense Specialists

#### Best Attackers
*Personalities that excel when attacking*

1. **STRATEGIST**: 63.7% attack vs 87.5% defense (-23.8% attack advantage)
2. **ADAPTIVE**: 50.0% attack vs 83.8% defense (-33.8% attack advantage)
3. **VETERAN**: 43.8% attack vs 78.8% defense (-35.0% attack advantage)
4. **BALANCED**: 42.5% attack vs 65.0% defense (-22.5% attack advantage)
5. **BERSERKER**: 41.3% attack vs 73.8% defense (-32.5% attack advantage)

#### Best Defenders
*Personalities that excel when defending*

1. **STRATEGIST**: 87.5% defense vs 63.7% attack (+23.8% defense advantage)
2. **ADAPTIVE**: 83.8% defense vs 50.0% attack (+33.8% defense advantage)
3. **VETERAN**: 78.8% defense vs 43.8% attack (+35.0% defense advantage)
4. **SPECIALIST**: 78.8% defense vs 41.3% attack (+37.5% defense advantage)
5. **BERSERKER**: 73.8% defense vs 41.3% attack (+32.5% defense advantage)

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
- **SPECIALIST** (defender) vs **BALANCED** (attacker): 100.0% (10-0)
- **BERSERKER** (defender) vs **ROOKIE** (attacker): 100.0% (10-0)
- **STRATEGIST** (defender) vs **ROOKIE** (attacker): 100.0% (10-0)
- **BALANCED** (defender) vs **ROOKIE** (attacker): 100.0% (10-0)

### Most Balanced Matchups
*Matchups with 40-60% win rate (attacker perspective)*

- **STRATEGIST** (attacker) vs **SPECIALIST** (defender): 50.0% (5-5)
- **CONSERVATIVE** (attacker) vs **ROOKIE** (defender): 50.0% (5-5)
- **ROOKIE** (attacker) vs **CONSERVATIVE** (defender): 50.0% (5-5)
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

*Report generated on 7/18/2025, 4:49:19 PM*
