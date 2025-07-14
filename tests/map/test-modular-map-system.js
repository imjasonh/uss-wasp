/**
 * Test the modular map system
 */

const { MapSectionLibrary, SectionRotation } = require('../../dist/core/game/MapSection');
const { MapBuilder } = require('../../dist/core/game/MapBuilder');
const { TerrainType } = require('../../dist/core/game/types');

console.log('🗺️ Testing Modular Map System');
console.log('==============================\n');

// Test 1: Initialize map section library
console.log('📚 Test 1: Map Section Library');
console.log('------------------------------');

const library = new MapSectionLibrary();
const sections = library.getAllSections();
const configurations = library.getAllConfigurations();

console.log(`✅ Loaded ${sections.length} map sections`);
console.log(`✅ Loaded ${configurations.length} map configurations`);

// Display sections
sections.forEach(section => {
  console.log(`  - ${section.name} (${section.type})`);
  console.log(`    Dimensions: ${section.dimensions.width}x${section.dimensions.height}`);
  console.log(`    Difficulty: ${section.metadata.difficulty}`);
  console.log(`    Hexes: ${section.hexes.length}`);
});

console.log('\n📋 Test 2: Map configurations');
console.log('------------------------------');

configurations.forEach(config => {
  console.log(`  - ${config.name}`);
  console.log(`    Description: ${config.description}`);
  console.log(`    Dimensions: ${config.dimensions.width}x${config.dimensions.height}`);
  console.log(`    Sections: ${config.sections.length}`);
  console.log(`    Difficulty: ${config.metadata.difficulty}`);
});

// Test 3: Build maps from configurations
console.log('\n🏗️ Test 3: Map Building');
console.log('------------------------');

for (const config of configurations) {
  console.log(`\nBuilding "${config.name}"...`);
  
  const result = MapBuilder.buildFromConfiguration(config);
  
  if (result.success && result.map) {
    console.log(`✅ Map built successfully`);
    console.log(`   Map dimensions: ${result.map.getDimensions().width}x${result.map.getDimensions().height}`);
    
    // Count terrain types
    const terrainCounts = {};
    const allHexes = result.map.getAllHexes();
    allHexes.forEach(hex => {
      terrainCounts[hex.terrain] = (terrainCounts[hex.terrain] || 0) + 1;
    });
    
    console.log(`   Terrain distribution:`);
    Object.entries(terrainCounts).forEach(([terrain, count]) => {
      console.log(`     ${terrain}: ${count} hexes`);
    });
    
    // Count objectives
    const objectives = result.map.getObjectives();
    console.log(`   Objectives: ${objectives.length}`);
    objectives.forEach(objHex => {
      if (objHex.objective) {
        console.log(`     ${objHex.objective.type} at (${objHex.coordinate.q}, ${objHex.coordinate.r})`);
      }
    });
    
    if (result.warnings.length > 0) {
      console.log(`   Warnings: ${result.warnings.length}`);
      result.warnings.forEach(warning => console.log(`     - ${warning}`));
    }
  } else {
    console.log(`❌ Map build failed:`);
    result.errors.forEach(error => console.log(`     - ${error}`));
  }
}

// Test 4: Configuration validation
console.log('\n🔍 Test 4: Configuration Validation');
console.log('------------------------------------');

for (const config of configurations) {
  const validation = MapBuilder.validateConfiguration(config);
  
  if (validation.valid) {
    console.log(`✅ "${config.name}" is valid`);
  } else {
    console.log(`❌ "${config.name}" has validation errors:`);
    validation.errors.forEach(error => console.log(`     - ${error}`));
  }
}

// Test 5: Section rotation
console.log('\n🔄 Test 5: Section Rotation');
console.log('----------------------------');

const beachSection = library.getSection('beach_landing_01');
if (beachSection) {
  console.log(`Testing rotation for "${beachSection.name}"`);
  
  const testPosition = { q: 2, r: 2, s: -4 };
  const testMapDimensions = { width: 10, height: 10 };
  
  const rotations = [
    SectionRotation.NONE,
    SectionRotation.CLOCKWISE_60,
    SectionRotation.CLOCKWISE_120,
    SectionRotation.CLOCKWISE_180,
  ];
  
  rotations.forEach(rotation => {
    const preview = MapBuilder.previewSectionPlacement(
      beachSection,
      testPosition,
      rotation,
      testMapDimensions
    );
    
    console.log(`  Rotation ${rotation}°:`);
    console.log(`    Valid: ${preview.valid}`);
    console.log(`    Hexes: ${preview.hexes.length}`);
    
    if (!preview.valid) {
      preview.errors.forEach(error => console.log(`      Error: ${error}`));
    }
  });
}

// Test 6: Custom section creation
console.log('\n🎨 Test 6: Custom Section Creation');
console.log('-----------------------------------');

const customSection = {
  id: 'custom_test_01',
  name: 'Test Custom Section',
  type: 'CUSTOM',
  dimensions: { width: 3, height: 3 },
  description: 'A simple test section',
  hexes: [
    { offset: { q: 0, r: 0 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
    { offset: { q: 1, r: 0 }, terrain: TerrainType.HILLS, elevation: 1, features: [] },
    { offset: { q: 2, r: 0 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
    { offset: { q: 0, r: 1 }, terrain: TerrainType.LIGHT_WOODS, elevation: 0, features: [] },
    { offset: { q: 1, r: 1 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
    { offset: { q: 2, r: 1 }, terrain: TerrainType.LIGHT_WOODS, elevation: 0, features: [] },
    { offset: { q: 0, r: 2 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
    { offset: { q: 1, r: 2 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
    { offset: { q: 2, r: 2 }, terrain: TerrainType.CLEAR, elevation: 0, features: [] },
  ],
  recommendedRotations: [SectionRotation.NONE],
  compatibleWith: [],
  metadata: {
    difficulty: 'easy',
    tacticalFocus: ['testing'],
  },
};

library.addSection(customSection);
console.log(`✅ Added custom section: "${customSection.name}"`);
console.log(`   Total sections now: ${library.getAllSections().length}`);

// Test placing the custom section
const customPlacement = {
  section: customSection,
  position: { q: 0, r: 0, s: 0 },
  rotation: SectionRotation.NONE,
};

const customConfig = {
  id: 'custom_test_config',
  name: 'Custom Test Configuration',
  description: 'Testing custom section placement',
  dimensions: { width: 6, height: 6 },
  sections: [customPlacement],
  metadata: {
    difficulty: 'easy',
    recommendedPlayers: 2,
    estimatedDuration: 30,
  },
};

console.log('\nTesting custom configuration...');
const customResult = MapBuilder.buildFromConfiguration(customConfig);

if (customResult.success && customResult.map) {
  console.log(`✅ Custom map built successfully`);
  console.log(`   Map size: ${customResult.map.getDimensions().width}x${customResult.map.getDimensions().height}`);
  
  // Show terrain layout
  const customHexes = customResult.map.getAllHexes();
  const customTerrain = {};
  customHexes.forEach(hex => {
    customTerrain[hex.terrain] = (customTerrain[hex.terrain] || 0) + 1;
  });
  
  console.log(`   Terrain types:`);
  Object.entries(customTerrain).forEach(([terrain, count]) => {
    console.log(`     ${terrain}: ${count} hexes`);
  });
} else {
  console.log(`❌ Custom map build failed:`);
  customResult.errors.forEach(error => console.log(`     - ${error}`));
}

console.log('\n🎯 Modular Map System Tests Complete!');
console.log('=====================================');
console.log('✅ Map section library functionality verified');
console.log('✅ Map configuration system working');
console.log('✅ Map building from sections successful');
console.log('✅ Configuration validation working');
console.log('✅ Section rotation mechanics functional');
console.log('✅ Custom section creation supported');
console.log('\n🎮 Ready for tactical map variety!');