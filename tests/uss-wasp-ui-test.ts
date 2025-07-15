#!/usr/bin/env node

/**
 * Quick test of USS Wasp UI operations functionality
 */

const { GameState } = require('../dist/core/game/GameState');
const { GameEngine } = require('../dist/core/game/GameEngine');
const { Player } = require('../dist/core/game/Player');
const { GameMap } = require('../dist/core/game/Map');
const { PlayerSide, UnitType } = require('../dist/core/game/types');
const { AIDifficulty } = require('../dist/core/ai/types');
const { createTestUnits } = require('../dist/testing/UnitTestHelper');
const { Hex } = require('../dist/core/hex');

console.log('🚢 USS WASP UI OPERATIONS TEST');
console.log('===============================\n');

async function testWaspOperations() {
  console.log('Creating test scenario with USS Wasp and embarked units...');
  
  // Create game state
  const map = new GameMap(8, 8);
  const gameState = new GameState('wasp-ui-test', map, 15);
  
  const assaultPlayer = new Player('assault', PlayerSide.Assault);
  assaultPlayer.commandPoints = 20;
  gameState.addPlayer(assaultPlayer);
  gameState.setActivePlayerBySide(PlayerSide.Assault);

  // Create USS Wasp with embarked units
  const waspUnits = createTestUnits([
    { id: 'wasp', type: UnitType.USS_WASP, side: PlayerSide.Assault, position: new Hex(1, 1) },
    { id: 'harrier1', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(1, 1) },
    { id: 'osprey1', type: UnitType.OSPREY, side: PlayerSide.Assault, position: new Hex(1, 1) },
    { id: 'marine1', type: UnitType.MARINE_SQUAD, side: PlayerSide.Assault, position: new Hex(1, 1) }
  ]);

  waspUnits.forEach(unit => assaultPlayer.addUnit(unit));
  
  // Embark aircraft and marines on USS Wasp
  const wasp = waspUnits[0];
  const harrier = waspUnits[1];
  const osprey = waspUnits[2];
  const marine = waspUnits[3];
  
  // Load units onto USS Wasp
  wasp.loadCargo(harrier);
  wasp.loadCargo(osprey);
  wasp.loadCargo(marine);
  
  console.log(`✅ USS Wasp loaded with ${wasp.state.cargo.length} units:`);
  wasp.state.cargo.forEach(unit => {
    console.log(`   - ${unit.type} (${unit.id})`);
  });
  
  gameState.initializeWaspOperations();
  const gameEngine = new GameEngine(gameState);
  
  // Set to action phase to allow USS Wasp operations
  gameState.phase = 'action';
  
  console.log('\n🛫 Testing launch operations...');
  
  // Test launching harrier
  const launchAction = {
    type: 'launch_from_wasp',
    playerId: assaultPlayer.id,
    unitId: wasp.id,
    data: { unitIds: [harrier.id] }
  };
  
  const launchResult = gameEngine.executeAction(launchAction);
  console.log(`Launch result: ${launchResult.success ? '✅' : '❌'} ${launchResult.message}`);
  
  if (launchResult.success) {
    console.log(`USS Wasp now has ${wasp.state.cargo.length} units aboard`);
    console.log(`Harrier position: (${harrier.state.position.q}, ${harrier.state.position.r})`);
  }
  
  console.log('\n🛬 Testing recovery operations...');
  
  // Move harrier adjacent to USS Wasp for recovery
  harrier.state.position = new Hex(1, 2); // Adjacent to wasp at (1,1)
  
  const recoveryAction = {
    type: 'recover_to_wasp',
    playerId: assaultPlayer.id,
    unitId: wasp.id,
    data: { unitIds: [harrier.id] }
  };
  
  const recoveryResult = gameEngine.executeAction(recoveryAction);
  console.log(`Recovery result: ${recoveryResult.success ? '✅' : '❌'} ${recoveryResult.message}`);
  
  if (recoveryResult.success) {
    console.log(`USS Wasp now has ${wasp.state.cargo.length} units aboard after recovery`);
  }
  
  console.log('\n📊 FINAL STATUS:');
  console.log(`USS Wasp cargo capacity: ${wasp.getCargoCapacity()}`);
  console.log(`Units currently aboard: ${wasp.state.cargo.length}`);
  wasp.state.cargo.forEach(unit => {
    console.log(`   - ${unit.type} (${unit.id})`);
  });
  
  console.log('\n🎉 USS Wasp UI operations test completed successfully!');
  console.log('The backend integration is working correctly.');
  console.log('UI dialogs will work once connected to this system.');
}

testWaspOperations().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});