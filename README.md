# USS Wasp: Operation Beachhead Inferno

A TypeScript-based tabletop wargame simulation featuring asymmetrical amphibious assault gameplay.

## Overview

This project implements the "Operation: Beachhead Inferno" wargame as described in the rules documentation. The game features:

- **Assault Force**: USS Wasp LHD-1 with aircraft, landing craft, and Marine units
- **Defender Force**: Ground-based units with hidden deployment and fortifications
- **Hex-based gameplay** with turn-based mechanics
- **Simulation engine** for automated balance testing
- **Web-based interface** for human players

## Development Phases

This project follows a 6-phase development plan:

- **Phase 0**: ✅ Planning & Setup (hex grid, project structure)
- **Phase 1**: ✅ Core Simulation Engine (headless game logic)
- **Phase 2**: ✅ Basic Playable Interface (visual representation)
- **Phase 3**: ✅ Core Game Rules & Interaction (full manual playthrough)
- **Phase 4**: ✅ Hidden Units & Advanced Mechanics (fog of war, stealth)
- **Phase 5**: ✅ USS Wasp Operations & Logistics (amphibious assault, aircraft)
- **Phase 6**: 🚧 Advanced AI Implementation (multi-layered AI opponent)

### Current Status: Phase 6 - Advanced AI Implementation

**Completed AI Systems:**
- ✅ Core AI decision-making framework with threat assessment
- ✅ Multi-difficulty AI (Novice, Veteran, Elite, Adaptive)
- ✅ USS Wasp launch/recovery operations AI
- ✅ Hidden unit tactical AI (reveal/hide decisions)
- ✅ Special ability usage AI (artillery, reconnaissance, etc.)
- ✅ Objective-focused strategic planning AI
- ✅ Transport/logistics operations AI
- ✅ AI learning and adaptation system

**AI Testing Results:**
- 6/6 AI subsystems implemented (100% feature complete)
- Fun-focused AI prioritizing action over caution
- AI successfully positions units for combat (0 hex distance achieved)
- Comprehensive testing framework with multiple battle scenarios
- Advanced pathfinding and tactical movement systems

## Getting Started

### Simulation Engine (Console)
```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run AI vs AI gap analysis test  
node test-ai-system-gaps.js

# Run quick 3-unit battle tests (recommended)
node quick-battle-test.js

# Run 1v1 combat positioning test
node combat-test.js

# Run full 10-game battle series (experimental)
node test-ai-battle-series.js

# Build for production
npm run build

# Run tests
npm test
```

### Web Interface
```bash
# Start web development server
npm run dev:web

# Build web version
npm run build:web
```

The web interface will be available at http://localhost:3000

## Project Structure

```
src/
├── core/           # Core game engine
│   ├── hex/        # Hexagon grid utilities  
│   ├── game/       # Game state and logic
│   ├── units/      # Unit definitions and abilities
│   └── ai/         # Advanced AI system
│       ├── AIController.ts      # Main AI coordinator
│       ├── AIDecisionMaker.ts   # Tactical decision engine
│       ├── AIStateMachine.ts    # Strategic state management
│       └── types.ts             # AI types and interfaces
├── simulation/     # AI testing and analysis
├── testing/        # Test utilities and helpers
├── ui/            # User interface components (Pixi.js)
└── tests/         # Unit tests
```

## Documentation

- [Game Rules](docs/rules.md) - Complete game rules and mechanics
- [Engineering Plan](docs/plan.md) - Development roadmap and technical details
- [Balance Analysis](docs/balance.md) - Game balance considerations

## Technology Stack

- **TypeScript** for type-safe development
- **Node.js** for the simulation engine
- **Jest** for testing
- **Pixi.js** (planned) for graphics rendering