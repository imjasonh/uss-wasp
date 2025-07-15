# USS Wasp (LHD-1) - Amphibious Assault Rules Engine

[![CI](https://github.com/imjasonh/uss-wasp/actions/workflows/ci.yml/badge.svg)](https://github.com/imjasonh/uss-wasp/actions/workflows/ci.yml)

This repo contains experimental [rules](./docs/rules.md) for a tabletop wargame on a hex grid, simulating an amphibious assault against entrenched defenders on land.

One side plays the attackers, deploying from a [USS Wasp](https://en.wikipedia.org/wiki/USS_Wasp_(LHD-1)) amphibious assault ship with Marines, aircraft and landing craft.

The other side plays the defenders, deployed in hidden locations on land with surface-to-air missles and basic military units.

The repo contains a TypeScript-based rules engine and simulation framework for the game, in order to model the rules and hopefully achieve a balanced and fun gameplay experience.

-----

## Overview

The USS Wasp project simulates modern amphibious assault operations featuring:

- **Asymmetric Warfare**: USS Wasp assault forces vs. entrenched defenders
- **Complex Unit Interactions**: Aircraft, helicopters, landing craft, infantry, and vehicles
- **Advanced AI**: Multiple difficulty levels with tactical decision-making
- **Realistic Operations**: Launch/recovery, cargo transport, special abilities
- **Balance Testing**: Comprehensive simulation framework for gameplay balance

## Key Features

### 🎯 Core Rules Engine
- Hex-based tactical grid system
- Turn-based gameplay with multiple phases
- Unit stats, categories, and special abilities
- Combat resolution with terrain modifiers
- Victory conditions and scoring

### 🤖 Advanced AI System
- **Multi-layered AI**: Decision maker, state machine, and tactical priorities
- **Difficulty Levels**: Novice, Veteran, Elite, and Adaptive
- **Military Operations**: USS Wasp operations, artillery, special forces
- **Tactical Behaviors**: Hidden units, ambush tactics, objective control

### ⚖️ Balance Testing Framework
- Automated game simulation
- Statistical analysis of win rates
- Performance metrics and balance assessment
- AI vs AI battle testing

### 🚢 USS Wasp Operations
- Aircraft launch and recovery operations
- Cargo capacity management
- Damage states affecting operational capability
- Integration with assault tactics

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
git clone https://github.com/imjasonh/uss-wasp.git
cd uss-wasp
npm install
```

### Running Simulations
```bash
# Run basic game simulation
npm run simulate

# Run balance testing suite
npm run test:balance

# Run AI validation tests
npm run test:ai:comprehensive

# Run specific number of games with AI difficulty
npm run simulate 50 elite detailed
```

### Development
```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Build project
npm run build

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Architecture

### Core Components

```
src/
├── core/
│   ├── game/           # Game state, rules, and engine
│   ├── ai/             # AI controllers and decision making
│   ├── hex/            # Hex grid system and utilities
│   └── units/          # Unit definitions and behaviors
├── simulation/         # Game simulation framework
└── tests/              # Unit tests
```

### Key Classes

- **GameEngine**: Core rules processing and action resolution
- **GameState**: Game state management and player tracking
- **AIController**: AI decision making and tactical planning
- **Unit**: Individual unit behavior and capabilities
- **GameMap**: Hex grid terrain and objectives

## Game Rules

### Turn Structure
1. **Event Phase**: Random events and fog of war updates
2. **Command Phase**: Generate command points
3. **Deployment Phase**: Launch units and place hidden forces
4. **Movement Phase**: Unit movement actions
5. **Action Phase**: Combat, special abilities, objective control
6. **End Phase**: Victory checks and cleanup

### Unit Categories
- **Aircraft**: Harrier, Osprey (air superiority, transport)
- **Helicopters**: Super Stallion, Super Cobra (transport, attack)
- **Landing Craft**: LCAC, LCU (amphibious assault)
- **Ground Units**: Marines, MARSOC, Infantry (assault, defense)
- **Vehicles**: Humvee, AAV-7, Technical (transport, support)
- **Special Units**: USS Wasp, Artillery, ATGM teams

### Victory Conditions
- **Elimination**: Destroy all enemy units
- **USS Wasp**: Sink the USS Wasp (defender victory)
- **Objectives**: Control key terrain features
- **Turn Limit**: Highest score after maximum turns

## AI System

### Decision Making
The AI uses a utility-based system with tactical priorities:

1. **Threat Assessment**: Evaluate unit vulnerabilities
2. **Tactical Planning**: Generate context-aware decisions
3. **Action Execution**: Convert decisions to game actions
4. **Learning**: Track performance for adaptation

### AI Subsystems
- **USS Wasp Operations**: Launch/recovery planning
- **Hidden Unit Tactics**: Ambush and stealth operations
- **Special Abilities**: Artillery, air support, reconnaissance
- **Objective Control**: Strategic point capture
- **Transport Logistics**: Cargo management and deployment

## Balance Testing

### Test Categories
- **Standard Balance**: Basic win rate analysis
- **AI Difficulty**: Performance across skill levels
- **Game Length**: Turn count and resolution speed
- **Unit Effectiveness**: Individual unit performance

### Metrics
- Win rates by faction
- Average game length
- Unit survival rates
- Objective control patterns
- AI decision quality

### Running Balance Tests
```bash
# Full balance suite
npm run test:balance

# Quick balance check
npm run simulate 20 veteran minimal

# Extended analysis
npm run simulate 100 elite detailed
```

## Development History

This project completed a 6-phase development plan:

- **Phase 0**: ✅ Planning & Setup (hex grid, project structure)
- **Phase 1**: ✅ Core Simulation Engine (headless game logic)
- **Phase 2**: ✅ Basic Playable Interface (visual representation)
- **Phase 3**: ✅ Core Game Rules & Interaction (full manual playthrough)
- **Phase 4**: ✅ Hidden Units & Advanced Mechanics (fog of war, stealth)
- **Phase 5**: ✅ USS Wasp Operations & Logistics (amphibious assault, aircraft)
- **Phase 6**: ✅ Advanced AI Implementation (multi-layered AI opponent)

**Final Implementation Results:**
- 6/6 AI subsystems implemented (100% feature complete)
- Comprehensive logging system with state snapshots and replay
- 10-game battle validation with performance analytics  
- Advanced pathfinding and tactical movement systems
- Complete rule enforcement and automated victory detection

## Testing

### Unit Tests
```bash
npm test                    # Run all unit tests
npm run test:watch          # Watch mode for development
```

### AI Tests
```bash
npm run test:ai             # Basic AI functionality
npm run test:ai:strict      # Strict regression tests
npm run test:ai:gaps        # System completeness check
```

### Balance Tests
```bash
npm run test:balance        # Full balance suite
npm run simulate 50         # Custom simulation
```

## Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-rules`
3. Make changes and add tests
4. Run test suite: `npm test`
5. Submit pull request

### Code Standards
- TypeScript strict mode
- ESLint configuration enforced
- Unit tests for new features
- Balance tests for rule changes

### Areas for Contribution
- New unit types and abilities
- Enhanced AI behaviors
- Additional balance tests
- Performance optimizations
- Documentation improvements

## Documentation

- [Game Rules](rules.md) - Complete game rules and mechanics
- [Engineering Plan](docs/plan.md) - Development roadmap and technical details
- [Balance Analysis](docs/balance.md) - Game balance considerations

## Technology Stack

- **TypeScript** for type-safe development
- **Node.js** for the simulation engine
- **Jest** for testing
- **ESLint & Prettier** for code quality

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Military tactical doctrine and amphibious assault operations
- Hex-based wargaming systems and conventions
- AI and game balance research in strategy games

---

*This project focuses on the rules engine and simulation aspects of the USS Wasp wargame. The emphasis is on accurate modeling of military operations, sophisticated AI behavior, and comprehensive balance testing rather than graphical presentation.*
