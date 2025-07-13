#!/usr/bin/env node

/**
 * DEBUG AA TARGETING
 * Why aren't AA units engaging aircraft?
 */

const { createTestUnits } = require('./dist/testing/UnitTestHelper.js');
const { PlayerSide, UnitType } = require('./dist/core/game/types.js');
const { Hex } = require('./dist/core/hex/Hex.js');

function debugAATargeting() {
    console.log('🎯 DEBUG AA TARGETING');
    console.log('======================\n');
    
    // Create test units
    const aaTeam = createTestUnits([
        { id: 'aa', type: UnitType.AA_TEAM, side: PlayerSide.Defender, position: new Hex(3, 5) }
    ])[0];
    
    const harrier = createTestUnits([
        { id: 'harrier', type: UnitType.HARRIER, side: PlayerSide.Assault, position: new Hex(1, 6) }
    ])[0];
    
    console.log('UNIT POSITIONS:');
    console.log(`  AA Team: (${aaTeam.state.position.q}, ${aaTeam.state.position.r})`);
    console.log(`  Harrier: (${harrier.state.position.q}, ${harrier.state.position.r})`);
    
    // Calculate distance manually
    const distance = Math.max(
        Math.abs(aaTeam.state.position.q - harrier.state.position.q),
        Math.abs(aaTeam.state.position.r - harrier.state.position.r),
        Math.abs(aaTeam.state.position.s - harrier.state.position.s)
    ) / 2;
    
    console.log(`  Distance: ${distance} hexes`);
    
    // Check unit categories
    console.log('\nUNIT CATEGORIES:');
    console.log(`  AA Team type: ${aaTeam.type}`);
    console.log(`  AA Team categories: ${aaTeam.categories}`);
    console.log(`  Harrier type: ${harrier.type}`);
    console.log(`  Harrier categories: ${harrier.categories}`);
    console.log(`  Harrier has AIRCRAFT category: ${harrier.hasCategory('aircraft')}`);
    
    // Test range logic
    console.log('\nRANGE TESTING:');
    console.log(`  AA Team range should be: 3 hexes`);
    console.log(`  Distance to target: ${distance} hexes`);
    console.log(`  Should be in range: ${distance <= 3}`);
    
    // Check if AA team can target aircraft
    console.log('\nTARGETING LOGIC:');
    const canTargetAircraft = aaTeam.type === 'aa_team';
    console.log(`  AA Team can target aircraft: ${canTargetAircraft}`);
    
    if (distance <= 3 && canTargetAircraft) {
        console.log('  ✅ AA TEAM SHOULD BE ABLE TO ENGAGE HARRIER!');
    } else {
        console.log('  ❌ AA Team cannot engage - investigating why...');
        
        if (distance > 3) {
            console.log('    - Distance too far');
        }
        if (!canTargetAircraft) {
            console.log('    - AA Team not configured for air targets');
        }
    }
}

debugAATargeting();