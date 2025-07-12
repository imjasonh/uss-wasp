# Engineering Plan for "Operation: Beachhead Inferno"

An ambitious but achievable goal! Here's an engineering plan for "Operation: Beachhead Inferno," broken down into phases with milestones, deliverables, and estimated timelines. This plan assumes a single dedicated developer (or small team with clearly defined roles) and a focus on incremental delivery.

**Overall Goal:** Develop a playable and simulatable TypeScript-based tabletop wargame for "Operation: Beachhead Inferno" within 5-6 months.

## Technology Stack

- **Backend/Simulation:** Node.js, TypeScript
- **Frontend/Rendering:** HTML5 Canvas or Pixi.js (recommended for better performance/features), TypeScript, Webpack/Vite for bundling.
- **Version Control:** Git (e.g., GitHub, GitLab)

## Phase 0: Planning & Setup (1 week)

**Goal:** Establish foundational project structure and tools.

### Milestones
- Project repository initialized.
- Basic dev environment configured.
- Core Hexagon library integrated/implemented.

### Deliverables
- Git repository with README.md, .gitignore, tsconfig.json.
- Initial index.html (for frontend) and app.ts (or similar for backend).
- Hex grid utility functions (from Redblobgames) implemented in TypeScript (e.g., hex_add, hex_distance, hex_to_pixel, pixel_to_hex).
- Basic Hex class/interface.

### Timeline
- **Day 1-2:** Project setup, dev environment.
- **Day 3-5:** Hex grid implementation.

## Phase 1: Core Simulation Engine (4 weeks)

**Goal:** Implement the game's core logic as a headless simulation that can run without a UI. This is crucial for early balance testing.

### Milestones
- All core data structures defined.
- Basic movement and combat resolved programmatically.
- Basic turn flow (without UI interaction).
- A simple simulation loop established.

### Deliverables

**Data Models:** Unit (with stats, position, owner), Player, GameState (map, units, turn, CP, Wasp status, objectives).

**Map Generation:** Function to generate a simple fixed map (e.g., 5x5 hexes with mixed terrain).

**Movement System:**
- `calculatePath(start, end, unitType)`: A* or Dijkstra's algorithm for pathfinding based on TerrainMPC.
- `moveUnit(unitId, path)`: Updates unit position in GameState.

**Combat System:**
- `calculateLOS(hex1, hex2, map)`: Basic LOS ignoring terrain elevation initially.
- `resolveCombat(attackerId, defenderId)`: Takes units, applies dice rolls, modifiers, updates HP/Suppression.

**Core Game Loop:** Functions for `initializeGame()`, `runTurn()`, `checkVictoryConditions()`.

**Simple AI:** Placeholder `takeTurn()` methods for AssaultAI and DefenderAI that can move a random unit or attack a visible one.

**Test Suite:** Unit tests for hex grid, movement, combat. Integration tests for `runTurn()`.

### Timeline
- **Week 1:** Data models, map generation, basic unit placement.
- **Week 2:** Movement system (pathfinding, execution).
- **Week 3:** Combat system (LOS, dice, damage, suppression).
- **Week 4:** Core game loop, simple AI, initial simulation test run.

## Phase 2: Basic Playable Interface (4 weeks)

**Goal:** Get a visual representation of the game state and allow basic player input.

### Milestones
- Game board rendered accurately.
- Units rendered on hexes.
- Basic unit selection and movement via UI.
- Core UI elements displayed.

### Deliverables

**Rendering Engine Choice:** Pixi.js setup.

**Map Renderer:** Draws hexes, terrain types (color-coded initially), grid lines.

**Unit Renderer:** Draws simple shapes/placeholders for units at their hex positions.

**Input Handling:** Click events for hexes to select units.

**Unit Interaction:**
- Display valid move paths on unit selection.
- Click-to-move functionality.

**Basic UI Overlay:** Displays current turn, CP values, player turn indicator.

**Integration:** Connect UI actions to the underlying game engine (GameState updates).

### Timeline
- **Week 1-2:** Pixi.js setup, map rendering, hex-to-pixel conversions, basic unit rendering.
- **Week 3:** Unit selection, movement path highlighting, click-to-move implementation.
- **Week 4:** Basic UI elements, integrate input with game state updates.

## Phase 3: Core Game Rules & Interaction (6 weeks)

**Goal:** Implement all primary game rules, allowing a full, but still basic, manual playthrough.

### Milestones
- All unit stats and special abilities (passive) implemented.
- Full turn phase management via UI.
- Combat initiated and displayed via UI.
- Hidden units and fog of war implemented.
- Wasp deployment and status tracking.

### Deliverables

**Detailed Unit Data Cards:** Populate all stats and specialAbilities for all unit types.

**Complex Movement:** Implement specific movement rules for each unit type (AAV amphibious, Harrier V/STOL, LCAC/LCU rules).

**Full Combat System:**
- Target selection via UI.
- Dynamic modifier application (terrain cover, flank).
- Suppression visualization.

**Turn Phase Buttons:** UI buttons to advance through Event, Command, Deployment, Movement, Action, End phases.

**Hidden Units/Fog of War:**
- Defender places Hidden Unit Markers during setup (UI).
- Units are revealed on detection/action.
- UI only shows visible enemy units.

**Wasp Specifics:**
- Implement Flight Deck and Well Deck capacities for deployment.
- Implement Wasp Status Track and its effects on CP/deployment.
- Implement CIWS/RAM/Sea Sparrow defensive rolls.

**Resource Management:** CP generation and spending via UI.

**Victory Conditions:** Logic for checking and declaring game end.

### Timeline
- **Week 1-2:** Implement detailed unit stats, specific movement rules, and Wasp deployment.
- **Week 3-4:** Full combat system integration with UI, targeting, modifiers, and suppression.
- **Week 5-6:** Turn phase management, hidden units/fog of war, Wasp status tracking, victory conditions.

## Phase 4: Defender Mechanics & Scenario Customization (4 weeks)

**Goal:** Fully implement the Defender's unique mechanics and make map/scenario setup flexible.

### Milestones
- Defender's secret deployment fully functional.
- Fortification placement.
- Event Card system implemented.
- Modular map loading.

### Deliverables

**Defender Setup UI:** Tool for Defender to secretly place Hidden Unit Markers and Dummy Tokens.

**Fortification System:** UI for placing Fortification Markers and logic for their effects on movement/combat.

**Long-Range Artillery/SAM Battery:** Implement Artillery Barrage and SAM Strike abilities (off-board unit).

**Event Card System:** UI to display Event Cards, and logic to apply effects.

**Modular Map Loading:** Implement loading map sections and allowing rotation/arrangement during setup.

**Scenario Card Logic:** Implement loading different primary/secondary objectives for varied games.

### Timeline
- **Week 1-2:** Defender secret setup, fortification placement logic and UI.
- **Week 3:** Event card system, Long-Range Artillery/SAM.
- **Week 4:** Modular map and scenario loading, initial scenario balance.

## Phase 5: Balance & Polish (4 weeks)

**Goal:** Refine gameplay, improve user experience, and begin statistical balance testing.

### Milestones
- All known bugs fixed.
- Basic sound and visual effects added.
- Simulation AI improved for testing.
- Initial balance adjustments made based on simulation results.

### Deliverables

**Bug Fixing:** Address all identified bugs.

**UI/UX Improvements:** Enhance visual feedback (animations, clearer highlights), improve button layouts, better info displays.

**Sound Effects:** Basic sound effects for movement, attacks, hits, UI clicks.

**Basic Visual Effects:** Simple particle effects for explosions, hits, unit launch.

**Improved Simulation AI:** Refine AI to make more strategic choices (e.g., prioritize objectives, target high-threat units, manage CP more effectively).

**Simulation Runner:** Script to run multiple games automatically and log results (wins/losses, casualties).

**Balance Iteration:** Adjust unit stats, CP rates, objective values based on simulation data and manual playtesting.

**Documentation:** Basic player instructions, rule clarifications.

### Timeline
- **Week 1-2:** Bug fixing, UI/UX polish, sound/visual effects.
- **Week 3-4:** AI refinement, extensive simulation runs, balance adjustments.

## Phase 6: Release & Future Development (Ongoing)

**Goal:** Prepare for public release (if desired) and plan for continued iteration.

### Milestones
- Game ready for internal testing/sharing.
- Feedback loop established.

### Deliverables
- Deployable web build.
- Feedback mechanism (e.g., Google Form, Discord channel).
- Roadmap for future features (e.g., advanced AI, multiplayer, more scenarios, unit expansions).

## Total Estimated Timeline: 23-24 weeks (approx. 5-6 months)

This plan is aggressive but structured. The key is to build iteratively, always ensuring a stable base before adding new features. The early focus on the headless simulation engine (Phase 1) is crucial for rapidly testing balance changes without the overhead of manual playtesting. Good luck!