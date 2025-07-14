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

1. 🗡️ **STRATEGIST**: 63.7% attack win rate (51W-29L) - 20.20 avg power
2. ⚔️ **ADAPTIVE**: 52.5% attack win rate (42W-38L) - 19.92 avg power
3. 🏹 **SPECIALIST**: 43.8% attack win rate (35W-45L) - 18.69 avg power
4.  **BERSERKER**: 42.5% attack win rate (34W-46L) - 19.00 avg power
5.  **VETERAN**: 42.5% attack win rate (34W-46L) - 19.09 avg power
6.  **BALANCED**: 40.0% attack win rate (32W-48L) - 18.30 avg power
7.  **CONSERVATIVE**: 17.5% attack win rate (14W-66L) - 13.42 avg power
8.  **ROOKIE**: 13.8% attack win rate (11W-69L) - 12.54 avg power

#### Defensive Performance
*When this personality is the defender*

1. 🛡️ **STRATEGIST**: 86.3% defense win rate (69W-11L) - 22.75 avg power
2. 🏰 **ADAPTIVE**: 85.0% defense win rate (68W-12L) - 21.89 avg power
3. 🔒 **SPECIALIST**: 76.3% defense win rate (61W-19L) - 20.82 avg power
4.  **VETERAN**: 73.8% defense win rate (59W-21L) - 20.79 avg power
5.  **BALANCED**: 72.5% defense win rate (58W-22L) - 20.25 avg power
6.  **BERSERKER**: 71.3% defense win rate (57W-23L) - 20.75 avg power
7.  **CONSERVATIVE**: 11.3% defense win rate (9W-71L) - 14.46 avg power
8.  **ROOKIE**: 7.5% defense win rate (6W-74L) - 13.75 avg power

### Overall Rankings

#### By Combined Win Rate
1. 🥇 **STRATEGIST**: 63.7% combined win rate (51W-29L)
2. 🥈 **ADAPTIVE**: 52.5% combined win rate (42W-38L)
3. 🥉 **SPECIALIST**: 43.8% combined win rate (35W-45L)
4.  **BERSERKER**: 42.5% combined win rate (34W-46L)
5.  **VETERAN**: 42.5% combined win rate (34W-46L)
6.  **BALANCED**: 40.0% combined win rate (32W-48L)
7.  **CONSERVATIVE**: 17.5% combined win rate (14W-66L)
8.  **ROOKIE**: 13.8% combined win rate (11W-69L)

## Detailed Matchup Matrix

### Win Rate Table
*Each cell shows: **Attacker** win rate vs **Defender** (Attacker-Defender)*

| **ATTACKER** \\ **DEFENDER** | **BERSERKER** | **STRATEGIST** | **CONSERVATIVE** | **BALANCED** | **ROOKIE** | **VETERAN** | **SPECIALIST** | **ADAPTIVE** |
|-------------------------|---|---|---|---|---|---|---|---|
| **BERSERKER** (A) | 100.0% (10-0) | 0.0% (0-10) | 100.0% (10-0) | 0.0% (0-10) | 100.0% (10-0) | 10.0% (1-9) | 20.0% (2-8) | 10.0% (1-9) |
| **STRATEGIST** (A) | 60.0% (6-4) | 100.0% (10-0) | 100.0% (10-0) | 40.0% (4-6) | 100.0% (10-0) | 50.0% (5-5) | 50.0% (5-5) | 10.0% (1-9) |
| **CONSERVATIVE** (A) | 0.0% (0-10) | 0.0% (0-10) | 100.0% (10-0) | 0.0% (0-10) | 40.0% (4-6) | 0.0% (0-10) | 0.0% (0-10) | 0.0% (0-10) |
| **BALANCED** (A) | 10.0% (1-9) | 0.0% (0-10) | 100.0% (10-0) | 100.0% (10-0) | 100.0% (10-0) | 0.0% (0-10) | 10.0% (1-9) | 0.0% (0-10) |
| **ROOKIE** (A) | 0.0% (0-10) | 0.0% (0-10) | 10.0% (1-9) | 0.0% (0-10) | 100.0% (10-0) | 0.0% (0-10) | 0.0% (0-10) | 0.0% (0-10) |
| **VETERAN** (A) | 20.0% (2-8) | 0.0% (0-10) | 100.0% (10-0) | 20.0% (2-8) | 100.0% (10-0) | 100.0% (10-0) | 0.0% (0-10) | 0.0% (0-10) |
| **SPECIALIST** (A) | 10.0% (1-9) | 0.0% (0-10) | 100.0% (10-0) | 20.0% (2-8) | 100.0% (10-0) | 20.0% (2-8) | 100.0% (10-0) | 0.0% (0-10) |
| **ADAPTIVE** (A) | 30.0% (3-7) | 10.0% (1-9) | 100.0% (10-0) | 40.0% (4-6) | 100.0% (10-0) | 30.0% (3-7) | 10.0% (1-9) | 100.0% (10-0) |

### Combat Power Comparison
*Format: Attacker Power vs Defender Power*

| **ATTACKER** \\ **DEFENDER** | **BERSERKER** | **STRATEGIST** | **CONSERVATIVE** | **BALANCED** | **ROOKIE** | **VETERAN** | **SPECIALIST** | **ADAPTIVE** |
|-------------------------|---|---|---|---|---|---|---|---|
| **BERSERKER** (A) | 19.20 vs 20.44 | 18.73 vs 23.12 | 18.75 vs 14.80 | 18.75 vs 20.51 | 19.09 vs 14.13 | 19.11 vs 20.78 | 19.45 vs 20.77 | 18.89 vs 22.07 |
| **STRATEGIST** (A) | 20.61 vs 20.70 | 20.13 vs 22.15 | 19.72 vs 14.77 | 19.93 vs 20.82 | 20.63 vs 13.92 | 20.39 vs 20.73 | 19.98 vs 20.46 | 20.21 vs 22.43 |
| **CONSERVATIVE** (A) | 13.59 vs 20.58 | 13.04 vs 23.22 | 13.53 vs 14.29 | 13.40 vs 20.66 | 13.40 vs 13.83 | 13.64 vs 20.85 | 13.57 vs 20.79 | 13.22 vs 21.84 |
| **BALANCED** (A) | 18.58 vs 20.99 | 17.84 vs 22.29 | 18.69 vs 14.33 | 18.19 vs 20.17 | 17.95 vs 13.55 | 18.40 vs 21.02 | 18.42 vs 20.60 | 18.34 vs 22.10 |
| **ROOKIE** (A) | 12.13 vs 20.25 | 11.85 vs 22.82 | 12.65 vs 14.43 | 13.24 vs 19.77 | 12.45 vs 13.39 | 12.56 vs 20.41 | 12.22 vs 21.17 | 13.23 vs 21.82 |
| **VETERAN** (A) | 19.23 vs 20.68 | 18.93 vs 23.06 | 19.52 vs 14.07 | 18.65 vs 20.22 | 19.06 vs 14.22 | 19.39 vs 20.20 | 19.26 vs 20.88 | 18.67 vs 22.01 |
| **SPECIALIST** (A) | 18.74 vs 21.36 | 18.62 vs 22.49 | 18.85 vs 14.21 | 18.36 vs 19.58 | 18.99 vs 13.11 | 19.11 vs 20.99 | 18.67 vs 20.57 | 18.17 vs 21.28 |
| **ADAPTIVE** (A) | 19.57 vs 20.98 | 19.92 vs 22.86 | 19.97 vs 14.77 | 20.02 vs 20.29 | 20.12 vs 13.88 | 20.12 vs 21.30 | 19.75 vs 21.32 | 19.88 vs 21.58 |

## Balance Analysis

### Attack vs Defense Specialists

#### Best Attackers
*Personalities that excel when attacking*

1. **STRATEGIST**: 63.7% attack vs 86.3% defense (-22.6% attack advantage)
2. **ADAPTIVE**: 52.5% attack vs 85.0% defense (-32.5% attack advantage)
3. **SPECIALIST**: 43.8% attack vs 76.3% defense (-32.5% attack advantage)
4. **BERSERKER**: 42.5% attack vs 71.3% defense (-28.8% attack advantage)
5. **VETERAN**: 42.5% attack vs 73.8% defense (-31.3% attack advantage)

#### Best Defenders
*Personalities that excel when defending*

1. **STRATEGIST**: 86.3% defense vs 63.7% attack (+22.6% defense advantage)
2. **ADAPTIVE**: 85.0% defense vs 52.5% attack (+32.5% defense advantage)
3. **SPECIALIST**: 76.3% defense vs 43.8% attack (+32.5% defense advantage)
4. **VETERAN**: 73.8% defense vs 42.5% attack (+31.3% defense advantage)
5. **BALANCED**: 72.5% defense vs 40.0% attack (+32.5% defense advantage)

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
- **BALANCED** (defender) vs **BERSERKER** (attacker): 100.0% (10-0)
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
- **BALANCED** (defender) vs **ROOKIE** (attacker): 100.0% (10-0)
- **VETERAN** (defender) vs **ROOKIE** (attacker): 100.0% (10-0)

### Most Balanced Matchups
*Matchups with 40-60% win rate (attacker perspective)*

- **STRATEGIST** (attacker) vs **VETERAN** (defender): 50.0% (5-5)
- **STRATEGIST** (attacker) vs **SPECIALIST** (defender): 50.0% (5-5)
- **STRATEGIST** (attacker) vs **BERSERKER** (defender): 60.0% (6-4)
- **STRATEGIST** (attacker) vs **BALANCED** (defender): 40.0% (4-6)
- **CONSERVATIVE** (attacker) vs **ROOKIE** (defender): 40.0% (4-6)
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

*Report generated on 7/14/2025, 3:54:10 PM*
