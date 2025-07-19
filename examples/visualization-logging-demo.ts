/**
 * Demonstration of Enhanced Game Visualization Logging
 * Shows how to use the new logging system for rich game replay data
 */

import { GameEngine } from '../src/core/game/GameEngine';
import { GameState } from '../src/core/game/GameState';
import { GameMap } from '../src/core/game/Map';
import { Player } from '../src/core/game/Player';
import { Unit } from '../src/core/game/Unit';
import { PlayerSide, UnitType, ActionType, TurnPhase } from '../src/core/game/types';
import { Hex } from '../src/core/hex';
import { UNIT_DEFINITIONS } from '../src/core/units/UnitDefinitions';
import { GameVisualizationLogger } from '../src/core/logging/GameVisualizationLogger';
import { initializeGameLogger } from '../src/core/logging/GameLogger';

/**
 * Demo: Complete game with visualization logging
 */
async function demonstrateVisualizationLogging() {
  console.log('🎮 GAME VISUALIZATION LOGGING DEMONSTRATION');
  console.log('===========================================');

  // 1. Create game setup
  console.log('\n📋 Setting up game...');
  const map = new GameMap(8, 8);
  const gameState = new GameState('demo-game-viz', map, 10);
  
  // Create players
  const assaultPlayer = new Player('player1', PlayerSide.Assault);
  const defenderPlayer = new Player('player2', PlayerSide.Defender);
  
  // Add command points
  assaultPlayer.commandPoints = 20;
  defenderPlayer.commandPoints = 15;
  
  gameState.addPlayer(assaultPlayer);
  gameState.addPlayer(defenderPlayer);

  // 2. Initialize standard logger first
  console.log('\n📝 Initializing logging systems...');
  const standardLogger = initializeGameLogger('demo-game-viz');
  
  // 3. Create game engine and enable visualization logging
  const gameEngine = new GameEngine(gameState);
  const vizLogger = gameEngine.enableVisualizationLogging('demo-game-viz');
  
  console.log(`✅ Visualization logging enabled: ${gameEngine.isVisualizationEnabled()}`);

  // 4. Create some units for the demo
  console.log('\n🪖 Deploying units...');
  const marinePosition = new Hex(1, 1, -2);
  const marineSquad = new Unit(
    'marine1',
    UnitType.MARINE_SQUAD,
    PlayerSide.Assault,
    UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].stats,
    UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].categories,
    UNIT_DEFINITIONS[UnitType.MARINE_SQUAD].specialAbilities,
    marinePosition
  );
  
  const defenderPosition = new Hex(5, 3, -8);
  const defenderInfantry = new Unit(
    'infantry1', 
    UnitType.INFANTRY_SQUAD,
    PlayerSide.Defender,
    UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].stats,
    UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].categories,
    UNIT_DEFINITIONS[UnitType.INFANTRY_SQUAD].specialAbilities,
    defenderPosition
  );

  assaultPlayer.addUnit(marineSquad);
  defenderPlayer.addUnit(defenderInfantry);

  // 5. Set game to action phase
  gameState.phase = TurnPhase.ACTION;
  gameState.turn = 1;

  console.log('🎯 Units deployed:');
  console.log(`  - Marine Squad at (${marineSquad.state.position.q}, ${marineSquad.state.position.r})`);
  console.log(`  - Infantry Squad at (${defenderInfantry.state.position.q}, ${defenderInfantry.state.position.r})`);

  // 6. Execute a series of actions to demonstrate logging
  console.log('\n⚔️  Executing tactical actions...');

  // Action 1: Move marine squad
  console.log('\n📍 Action 1: Marine squad movement');
  const moveAction = {
    type: ActionType.MOVE,
    playerId: assaultPlayer.id,
    unitId: marineSquad.id,
    targetPosition: new Hex(3, 2, -5)
  };
  
  const moveResult = gameEngine.executeAction(moveAction);
  console.log(`  Result: ${moveResult.success ? '✅' : '❌'} ${moveResult.message}`);

  // Action 2: Attack (if in range)
  if (moveResult.success) {
    console.log('\n💥 Action 2: Combat engagement');
    const attackAction = {
      type: ActionType.ATTACK,
      playerId: assaultPlayer.id,
      unitId: marineSquad.id,
      targetId: defenderInfantry.id
    };
    
    const attackResult = gameEngine.executeAction(attackAction);
    console.log(`  Result: ${attackResult.success ? '✅' : '❌'} ${attackResult.message}`);
  }

  // Action 3: Use special ability (if available)
  console.log('\n⚡ Action 3: Special ability demonstration');
  const specialAction = {
    type: ActionType.SPECIAL_ABILITY,
    playerId: assaultPlayer.id,
    unitId: marineSquad.id,
    data: { abilityName: 'suppressive_fire', targetHex: { q: 5, r: 3, s: -8 } }
  };
  
  const specialResult = gameEngine.executeAction(specialAction);
  console.log(`  Result: ${specialResult.success ? '✅' : '❌'} ${specialResult.message}`);

  // 7. Demonstrate different export formats
  console.log('\n📊 Generating visualization data...');
  
  try {
    // Export complete visualization log
    const fullLog = vizLogger.exportVisualizationLog();
    console.log(`✅ Full visualization log generated:`);
    console.log(`  - Game ID: ${fullLog.gameId}`);
    console.log(`  - Total actions logged: ${fullLog.logs.length}`);
    console.log(`  - Hex activities tracked: ${fullLog.hexActivity.length}`);
    console.log(`  - Major events: ${fullLog.gameFlow.majorEvents.length}`);
    console.log(`  - Game duration: ${fullLog.metadata.endTime - fullLog.metadata.startTime}ms`);

    // Export standard logs for comparison
    const standardLogs = vizLogger.exportLogs();
    const standardData = JSON.parse(standardLogs);
    console.log(`✅ Standard logs also available:`);
    console.log(`  - Total log entries: ${standardData.logs.length}`);
    console.log(`  - Game snapshots: ${standardData.snapshots.length}`);

    // Show visualization summary
    console.log(`\n📈 Visualization Summary:`);
    console.log(`  - Total actions: ${fullLog.summary.totalActions}`);
    console.log(`  - Combat engagements: ${fullLog.summary.combatEngagements}`);
    console.log(`  - Movement actions: ${fullLog.summary.movementActions}`);
    console.log(`  - AI decisions: ${fullLog.summary.aiDecisions}`);
    console.log(`  - Major events: ${fullLog.summary.majorEvents}`);

    // 8. Demonstrate JSON export for visualization tools
    console.log('\n💾 Exporting for visualization tools...');
    
    // Save full log (in a real implementation, this would go to a file)
    const fullLogJson = JSON.stringify(fullLog, null, 2);
    console.log(`✅ Full visualization log (${fullLogJson.length} characters)`);
    
    // Save optimized replay log
    const replayLog = {
      gameId: fullLog.gameId,
      metadata: fullLog.metadata,
      actions: fullLog.logs.map(log => ({
        turn: log.turn,
        phase: log.phase,
        timestamp: log.timestamp,
        action: log.data?.action,
        result: log.data?.result,
        spatialContext: log.spatialContext,
        visualEffects: log.visualEffects,
        movementPath: log.movementPath
      })),
      summary: fullLog.summary
    };
    
    const replayLogJson = JSON.stringify(replayLog, null, 2);
    console.log(`✅ Optimized replay log (${replayLogJson.length} characters)`);

    // Show sample log entry structure
    if (fullLog.logs.length > 0) {
      console.log('\n🔍 Sample visualization log entry structure:');
      const sampleEntry = fullLog.logs[0];
      console.log(`  - ID: ${sampleEntry.id}`);
      console.log(`  - Turn: ${sampleEntry.turn}, Phase: ${sampleEntry.phase}`);
      console.log(`  - Spatial context: ${sampleEntry.spatialContext.nearbyUnits.length} nearby units`);
      console.log(`  - Visual effects: Priority ${sampleEntry.visualEffects.attentionPriority}`);
      console.log(`  - Before/after state: ${sampleEntry.beforeState.length}/${sampleEntry.afterState.length} units`);
      if (sampleEntry.movementPath) {
        console.log(`  - Movement path: ${sampleEntry.movementPath.hexPath.length} hexes`);
      }
      if (sampleEntry.combatVisualization) {
        console.log(`  - Combat visualization: ${sampleEntry.combatVisualization.damage} damage`);
      }
    }

  } catch (error) {
    console.error('❌ Error generating visualization data:', error);
  }

  // 9. Cleanup and final notes
  console.log('\n🏁 Demonstration complete!');
  console.log('\n📋 Key Features Demonstrated:');
  console.log('  ✅ Enhanced action logging with spatial context');
  console.log('  ✅ Movement path tracking with terrain analysis');
  console.log('  ✅ Combat visualization with tactical situation');
  console.log('  ✅ Visual effects and animation metadata');
  console.log('  ✅ Before/after unit state snapshots');
  console.log('  ✅ Hex activity tracking for heatmaps');
  console.log('  ✅ Game flow analysis and major events');
  console.log('  ✅ Multiple export formats for different tools');
  
  console.log('\n🎨 Visualization Applications:');
  console.log('  🎬 Cinematic game replays');
  console.log('  📊 Advanced tactical analysis');
  console.log('  🤖 AI behavior visualization');
  console.log('  📚 Training and educational tools');
  console.log('  🎮 Content creation and streaming');

  return {
    fullLog: vizLogger.exportVisualizationLog(),
    standardLog: vizLogger.exportLogs(),
    gameEngine,
    vizLogger
  };
}

/**
 * Usage examples for different scenarios
 */
function showUsageExamples() {
  console.log('\n📖 USAGE EXAMPLES');
  console.log('==================');

  console.log('\n🎯 Example 1: Enable visualization for a tournament game');
  console.log(`
const gameEngine = new GameEngine(gameState);
const vizLogger = gameEngine.enableVisualizationLogging('tournament-game-001');

// ... play the game ...

const fullLog = vizLogger.exportVisualizationLog();
await saveToFile('tournament-game-001-full.json', fullLog);
  `);

  console.log('\n🎯 Example 2: Export optimized replay data');
  console.log(`
const replayData = {
  gameId: fullLog.gameId,
  metadata: fullLog.metadata,
  actions: fullLog.logs.map(log => ({
    turn: log.turn,
    action: log.data?.action,
    spatialContext: log.spatialContext,
    visualEffects: log.visualEffects
  }))
};
await uploadToReplayService(replayData);
  `);

  console.log('\n🎯 Example 3: Generate heatmap data');
  console.log(`
const heatmapData = fullLog.hexActivity.map(activity => ({
  position: activity.position,
  intensity: activity.combatEvents + activity.movementEvents,
  strategicValue: activity.strategicImportance
}));
generateHeatmapVisualization(heatmapData);
  `);

  console.log('\n🎯 Example 4: AI decision analysis');
  console.log(`
const aiDecisions = fullLog.logs
  .filter(log => log.aiDecisionVisualization)
  .map(log => log.aiDecisionVisualization);
  
analyzeAIBehaviorPatterns(aiDecisions);
  `);
}

// Run the demonstration
if (require.main === module) {
  demonstrateVisualizationLogging()
    .then(() => {
      showUsageExamples();
      console.log('\n🎉 Visualization logging system ready for use!');
    })
    .catch(error => {
      console.error('❌ Demo failed:', error);
    });
}

export { demonstrateVisualizationLogging, showUsageExamples };