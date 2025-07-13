# Operation: Beachhead Inferno
## A USS Wasp LHD-1 Tabletop Wargame (Enhanced Digital Implementation)

**Players:** 2 (1 Assault Force Player, 1 Defender Player) or 1 Player vs AI  
**Game Length:** 10-15 Turns (configurable, default 15)  
**Objective:** Asymmetrical amphibious assault with advanced tactical simulation

---

## 🎯 Overview

This enhanced digital implementation of Operation: Beachhead Inferno features comprehensive tactical simulation, advanced AI opponents, and detailed operational systems. While maintaining the core tabletop game mechanics, the implementation adds sophisticated combat calculations, USS Wasp operations management, and multi-layered artificial intelligence.

## 1. Game Components

### Digital Map System
- Configurable hex grid (default 6×6 or 8×8)
- Multiple terrain types with movement and cover effects
- Automated line-of-sight and pathfinding calculations
- Dynamic fog-of-war system

### Force Composition

#### Assault Force (11 Unit Types)
| Unit | MV | ATK | DEF | HP | SP | Cost | Special Capabilities |
|------|----|----|----|----|----|----- |---------------------|
| **USS Wasp** | 1 | 2 | 3 | 10 | 5 | 0 | Flight/Well Deck, C2 Hub, CIWS/RAM, Sea Sparrow |
| **Harrier** | 8 | 4 | 5 | 2 | 3 | 45 | V/STOL Landing, Close Air Support |
| **Osprey** | 10 | 1 | 5 | 3 | 2 | 35 | Rapid Transport (2 squads), Terrain Bonus |
| **Super Stallion** | 6 | 1 | 5 | 4 | 2 | 40 | Heavy Lift (3 squads), Clear LZ Required |
| **Super Cobra** | 7 | 5 | 5 | 2 | 4 | 38 | Tank Hunter (+1 ATK vs vehicles) |
| **LCAC** | 8 | 1 | 4 | 3 | - | 30 | High-speed Amphibious, Heavy Transport |
| **LCU** | 4 | 1 | 4 | 4 | - | 25 | Amphibious Transport |
| **AAV-7** | 4 | 3 | 4 | 3 | - | 20 | Amphibious Vehicle, Marine Transport |
| **Marine Squad** | 3 | 3 | 4 | 2 | - | 15 | Urban Specialists, Breaching Charge |
| **MARSOC** | 4 | 4 | 4 | 2 | - | 25 | Infiltrate, Recon Specialists |
| **Humvee** | 5 | 2 | 4 | 2 | - | 12 | Fast Reconnaissance |

#### Defender Force (9 Unit Types)
| Unit | MV | ATK | DEF | HP | SP | Cost | Special Capabilities |
|------|----|----|----|----|----|----- |---------------------|
| **Infantry Squad** | 3 | 2 | 4 | 2 | - | 10 | Basic infantry tactics |
| **ATGM Team** | 2 | 3 | 4 | 1 | 3 | 18 | Anti-Vehicle (+2 ATK vs vehicles) |
| **AA Team** | 2 | 3 | 4 | 1 | 4 | 20 | Anti-Aircraft (+2 ATK vs helicopters, 3-hex range) |
| **Mortar Team** | 2 | 2 | 4 | 1 | 5 | 16 | Indirect Fire (5-hex range, ignores LOS) |
| **Technical** | 5 | 2 | 5 | 2 | - | 12 | Fast Ambush (move after attacking from hidden) |
| **Militia Squad** | 3 | 1 | 5 | 1 | - | 6 | Low-cost irregulars |
| **Artillery** | 0 | 4 | 3 | 4 | 6 | 35 | Area Barrage (3-hex area, 2 CP) |
| **SAM Site** | 0 | 3 | 2 | 3 | 4 | 25 | Long-range AA (4-hex range vs aircraft/Wasp, 3 CP) |
| **Long Range Artillery** | 0 | 4 | 2 | 3 | - | 30 | Combined artillery/SAM capability |

### Enhanced Game Systems

#### Terrain Types
- **Deep Water** (2 MP, No Cover) - Wasp and amphibious units only
- **Shallow Water** (1 MP, No Cover) - Amphibious units only  
- **Beach** (1 MP, No Cover) - Landing zones
- **Clear** (1 MP, No Cover) - Open ground, aircraft landing
- **Light Woods** (1 MP, +1 DEF) - Light cover, aircraft landing
- **Heavy Woods** (2 MP, +2 DEF) - Heavy cover, blocks LOS
- **Urban** (1 MP, +1 DEF) - Urban combat bonus for Marines
- **Hills** (2 MP, +1 DEF) - Elevated positions
- **Mountains** (3 MP, +2 DEF) - Major terrain obstacle

#### Status Effects
- **Suppressed** (1 token): -1 ATK, -1 MV next turn
- **Pinned** (2 tokens): Cannot move or attack next turn
- **Hidden**: Unit placed as marker, +1 ATK when revealing to attack
- **Dummy**: Deception marker (no unit present)

## 2. Enhanced Game Setup

### Force Selection
**Standard Game:** Use predefined balanced forces  
**Points Game:** Build custom forces within point limits
- Assault Force Budget: 300 points
- Defender Force Budget: 250 points
- USS Wasp is free for Assault Force

### Deployment System

#### Assault Deployment
- USS Wasp placed in offshore zone (edge hexes)
- All other units begin aboard USS Wasp or offshore
- No units may start on land initially

#### Defender Deployment  
- All infantry units deploy as hidden markers
- Up to 5 dummy markers may be placed
- Artillery units may deploy as hidden or revealed
- Deployment within 5 hexes of objectives or designated zones

### USS Wasp Initial Status
All systems begin at **Operational** status:
- **Flight Deck**: Can launch 2 aircraft per turn
- **Well Deck**: Can launch 1 LCAC or 2 AAVs per turn  
- **C2 System**: Generates 3 Command Points per turn
- **Structural Integrity**: 10 Hit Points
- **Defensive Ammo**: 6 rounds for CIWS/RAM/Sea Sparrow

## 3. Enhanced Combat System

### Combat Resolution Process
1. **Declare Attack**: Specify attacker, target, confirm range and LOS
2. **Calculate Base Dice**: Attacker's ATK stat (modified by suppression)
3. **Apply Modifiers**:
   - **Terrain Cover**: +1 or +2 DEF based on terrain
   - **Flanking**: +1 ATK if attacking from adjacent hex
   - **Ambush**: +1 ATK if hidden unit revealing to attack
   - **Special Abilities**: Unit-specific bonuses (see unit tables)
4. **Roll Attack Dice**: D6 equal to modified ATK value
5. **Determine Hits**: Each roll ≥ target's modified DEF scores 1 hit
6. **Apply Damage**: Each hit removes 1 HP
7. **Apply Effects**:
   - If unit survives: +1 Suppression token
   - If unit destroyed: Remove from play
   - Attacker consumes 1 SP (if applicable)

### Advanced Combat Rules

#### Range System
- **Melee**: Adjacent hexes only (most ground units)
- **Short Range**: 2 hexes (some vehicles)
- **Medium Range**: 3 hexes (AA teams, aircraft weapons)
- **Long Range**: 4-5 hexes (SAM sites, mortars, USS Wasp)

#### Line of Sight
- Automatically calculated by the system
- Heavy Woods and Mountains block LOS
- Hills provide elevated firing positions

#### Suppression Mechanics
- **0 Tokens**: Normal operation
- **1 Token**: -1 ATK, -1 MV (Suppressed)
- **2 Tokens**: Cannot act (Pinned)
- Remove 1 token at turn end if unit didn't attack

## 4. Turn Structure (6 Phases)

### A. Event Phase
- Advance turn counter
- Process environmental effects (future expansion)
- Check turn limit for victory conditions

### B. Command Phase
**Command Point Generation:**
- **Assault**: 3 CP (2 if C2 Limited, 0 if C2 Offline)
- **Defender**: 2 CP

**Command Point Usage:**
- **Artillery Barrage** (2 CP): 3-hex area attack with Artillery
- **SAM Strike** (3 CP): Single target attack vs aircraft/Wasp
- **Special Abilities** (varies): Unit-specific capabilities
- **Force March** (1 CP): +2 movement to any unit

### C. Deployment Phase (Assault Only)
**USS Wasp Launch Operations:**
- **Flight Deck Launch**: Up to 2 aircraft (based on status)
- **Well Deck Launch**: 1 LCAC or 2 AAVs (based on status)
- **Initial Movement**: Launched units may immediately move

### D. Movement Phase
**Order of Movement:**
1. Assault Aircraft → 2. Defender Ground Units → 3. Assault Ground/Amphibious

**Movement Rules:**
- Move up to MV hexes (modified by terrain cost)
- Suppressed units: -1 MV
- Cannot move through enemy units or impassable terrain
- Aircraft require valid landing zones

### E. Action Phase
**Alternating Activation:**
- Players alternate activating one unit at a time
- Each unit may perform one action per turn:
  - **Attack**: Combat against enemy unit
  - **Load/Unload**: Cargo operations
  - **Special Ability**: Unit-specific actions
  - **Secure Objective**: Capture/hold objectives
  - **Reveal**: Hidden units reveal their identity

### F. End Phase
- **Victory Check**: Automatic victory condition evaluation
- **Resupply**: Units aboard USS Wasp or secured facilities restore SP
- **Suppression Removal**: Units that didn't attack remove 1 token
- **Turn Reset**: Clear Command Points, reset unit action status

## 5. USS Wasp Operations (Enhanced System)

### Operational Status Levels
Each USS Wasp system has detailed status tracking:

| Status | Flight Deck | Well Deck | C2 System | Effects |
|--------|-------------|-----------|-----------|---------|
| **Operational** | 2 aircraft/turn | 1 LCAC or 2 AAVs | 3 CP/turn | Full capability |
| **Limited** | 1 aircraft/turn | 1 AAV only | 2 CP/turn | Reduced capacity |
| **Damaged** | 0 launches | 0 launches | 2 CP/turn | Critical systems offline |
| **Offline** | 0 launches | 0 launches | 0 CP/turn | System completely disabled |

### Damage and Status Degradation
- **1-3 Damage**: Systems operate normally
- **4-5 Damage**: One system becomes Limited (random)
- **6-7 Damage**: Additional system Limited, first becomes Damaged
- **8-9 Damage**: Systems progress to Damaged/Offline
- **10 Damage**: USS Wasp destroyed (Defender victory)

### Defensive Systems

#### CIWS/RAM (Reactive Defense)
- **Trigger**: When USS Wasp targeted by missiles or air strikes
- **Effect**: Roll 3 D6, each 5+ negates 1 hit
- **Usage**: Once per attack
- **Ammo**: Consumes 1 defensive ammunition

#### Sea Sparrow (Active Defense)  
- **Target**: 1 enemy air unit within 5 hexes
- **Attack**: 2 ATK dice vs DEF 4
- **Usage**: Once per turn
- **Ammo**: Consumes 1 defensive ammunition

### Transport and Cargo Operations

#### Loading Capacity
- **Flight Deck**: Aircraft only
- **Well Deck**: LCACs, AAVs, and cargo
- **Cargo Limits**: Each transport has specific capacity

#### Loading/Unloading Rules
- **Loading**: Unit must be adjacent to USS Wasp, costs 1 action
- **Unloading**: Automatic placement in adjacent hex, costs 1 action  
- **Requirements**: Appropriate system must be Operational or Limited

## 6. Special Unit Abilities (Fully Implemented)

### Aircraft Capabilities

#### AV-8B Harrier II
- **V/STOL Landing**: Land in Clear or Light Woods to embark/disembark Marines
- **Close Air Support**: +1 ATK when attacking ground units after moving adjacent

#### MV-22 Osprey  
- **Rapid Transport**: Carry 2 Marine Squads or 1 Humvee
- **Terrain Bonus**: Ignore first 1 MP cost of difficult terrain

#### CH-53 Super Stallion
- **Heavy Lift**: Carry 3 Marine Squads or mixed loads
- **Clear LZ Required**: Can only land in Clear terrain

#### AH-1W Super Cobra
- **Tank Hunter**: +1 ATK when targeting vehicles

### Ground Force Capabilities

#### Marine Squad
- **Urban Specialists**: +1 ATK when attacking enemies in Urban hexes
- **Breaching Charge**: Destroy fortifications in adjacent hex (1 action)

#### MARSOC Team
- **Infiltrate**: Deploy anywhere as hidden unit during setup
- **Recon Specialists**: Detect hidden units within 2 hexes when revealing
- **Counter-Recon**: +1 ATK vs units that just revealed

### Defender Specialists

#### ATGM Team
- **Anti-Vehicle Specialist**: +2 ATK when targeting vehicles (AAV, Humvee, Technical)

#### AA Team  
- **Anti-Aircraft Focus**: Can only attack aircraft
- **Helicopter Specialist**: +2 ATK when attacking helicopters
- **Extended Range**: 3-hex attack range

#### Mortar Team
- **Indirect Fire**: Attack any hex within 5 hexes, ignoring LOS
- **Area Suppression**: Always place suppression token on target hex
- **No Close Combat**: Cannot attack adjacent hexes

#### Technical
- **Fast Ambush**: Move full MA after attacking, if started hidden

### Artillery Systems

#### Artillery/Long Range Artillery  
- **Barrage** (2 CP): Target 3 adjacent hexes, 2 ATK dice vs all units
- **Area Suppression**: All units in target area receive suppression

#### SAM Site
- **Long Range Strike** (3 CP): 4-hex range vs aircraft or USS Wasp
- **High Penetration**: 3 ATK dice, designed to counter air power

## 7. Victory Conditions

### Assault Force Victory
- **Primary Objectives Complete**: Achieve all scenario-specific objectives
- **Defender Collapse**: Enemy has no active units remaining

### Defender Force Victory  
- **Assault Stalled**: Turn limit reached without assault completing objectives
- **USS Wasp Disabled**: Wasp structural integrity reaches 0
- **Assault Annihilation**: Assault force has fewer than 3 active units

### Automatic Victory Checking
The system automatically evaluates victory conditions each turn and declares winners immediately when conditions are met.

## 8. Enhanced Features (Digital Implementation)

### Advanced AI System
- **Multiple Difficulty Levels**: Novice, Veteran, Elite, Adaptive
- **Tactical Decision Making**: Multi-layered AI with threat assessment
- **Strategic State Management**: AI adapts strategy based on game state
- **Learning Capability**: AI improves based on game outcomes

### Fog of War System
- **Hidden Unit Management**: Defender units deploy as identical markers
- **Dummy Markers**: Deception markers with no actual units
- **Automatic Revelation**: Units reveal when attacking or moving visibly
- **Line of Sight Tracking**: Units only see enemies within LOS range

### Game State Management
- **Comprehensive Logging**: Every action, combat, and decision recorded
- **State Snapshots**: Save/load game states at any point
- **Replay System**: Review complete game history
- **Balance Analysis**: Automated testing for game balance

### Pathfinding and Movement
- **Automatic Path Calculation**: Optimal movement paths computed automatically
- **Terrain Cost Integration**: Movement costs calculated with terrain effects
- **Obstacle Avoidance**: Automatic routing around impassable terrain
- **Range Validation**: Attack ranges automatically validated

### Combat Automation
- **Dice Rolling**: Automated D6 rolling with full transparency
- **Modifier Calculation**: All combat bonuses/penalties applied automatically  
- **Damage Resolution**: Automatic HP reduction and status effect application
- **Supply Tracking**: Ammunition consumption tracked automatically

---

## 🎮 Getting Started

### Single Player vs AI
```bash
npm run build
node test-ai-system-gaps.js      # Validate AI systems
node quick-battle-test.js        # Quick 3v3 battles  
node run-optimized-battles.js    # Full battle series
```

### Development and Testing
```bash
npm run build                    # Compile TypeScript
npm test                        # Run unit tests
node test-logging-system.js     # Test logging features
```

### Web Interface (Planned)
```bash
npm run dev:web                 # Start development server
npm run build:web              # Build for production
```

---

## ⚖️ Balance Notes

This enhanced implementation includes extensive balance testing through automated AI vs AI battles. Unit point costs and capabilities have been fine-tuned through hundreds of simulated engagements to ensure competitive gameplay.

**Key Balance Principles:**
- Assault force has mobility and firepower advantage
- Defender force has defensive positioning and cost efficiency
- USS Wasp provides force multiplication but creates single point of failure
- Point costs reflect tactical value and versatility

---

## 🔧 Technical Implementation

**Core Technologies:**
- TypeScript for type-safe development
- Hex-based coordinate system with advanced pathfinding
- Event-driven architecture for game state management
- Comprehensive logging and replay system
- Multi-layered AI with learning capabilities

**Simulation Features:**
- Automated balance testing through AI vs AI campaigns
- Statistical analysis of unit effectiveness
- Performance metrics and tactical pattern recognition
- Extensive debugging and visualization tools

---

*This enhanced digital implementation preserves the tactical depth and asymmetrical gameplay of the original tabletop design while adding sophisticated simulation capabilities, advanced AI opponents, and comprehensive operational systems.*