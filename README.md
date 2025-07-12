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

- **Phase 0**: Planning & Setup (hex grid, project structure)
- **Phase 1**: Core Simulation Engine (headless game logic)
- **Phase 2**: Basic Playable Interface (visual representation)
- **Phase 3**: Core Game Rules & Interaction (full manual playthrough)
- **Phase 4**: Defender Mechanics & Scenario Customization
- **Phase 5**: Balance & Polish
- **Phase 6**: Release & Future Development

## Getting Started

### Simulation Engine (Console)
```bash
# Install dependencies
npm install

# Run simulation demo
npm run dev

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
│   └── units/      # Unit definitions and abilities
├── simulation/     # AI and automated simulation
├── ui/            # User interface components
└── tests/         # Test files
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