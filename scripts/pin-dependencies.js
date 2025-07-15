#!/usr/bin/env node

/**
 * Script to pin all dependencies to exact versions in package.json
 * This helps ensure reproducible builds and makes Dependabot updates more explicit
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

console.log('📌 Pinning dependencies to exact versions...');

// Get currently installed versions
const npmList = execSync('npm list --depth=0 --json', { encoding: 'utf8' });
const installedPackages = JSON.parse(npmList);

function pinVersions(depsObject, installedDeps) {
  if (!depsObject) return;
  
  const pinned = [];
  
  for (const [name, currentRange] of Object.entries(depsObject)) {
    if (installedDeps[name]) {
      const installedVersion = installedDeps[name].version;
      if (currentRange !== installedVersion) {
        depsObject[name] = installedVersion;
        pinned.push(`${name}: ${currentRange} → ${installedVersion}`);
      }
    }
  }
  
  return pinned;
}

const dependenciesPinned = pinVersions(packageJson.dependencies, installedPackages.dependencies) || [];
const devDependenciesPinned = pinVersions(packageJson.devDependencies, installedPackages.dependencies) || [];

if (dependenciesPinned.length > 0) {
  console.log('\n📦 Dependencies pinned:');
  dependenciesPinned.forEach(change => console.log(`  ${change}`));
}

if (devDependenciesPinned.length > 0) {
  console.log('\n🔧 Dev dependencies pinned:');
  devDependenciesPinned.forEach(change => console.log(`  ${change}`));
}

const totalPinned = dependenciesPinned.length + devDependenciesPinned.length;

if (totalPinned > 0) {
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`\n✅ Successfully pinned ${totalPinned} dependencies in package.json`);
} else {
  console.log('\n✅ All dependencies are already pinned to exact versions');
}

console.log('\nNext steps:');
console.log('1. Run `npm ci` to verify the lockfile matches the pinned versions');
console.log('2. Commit the updated package.json');
console.log('3. Dependabot will now create PRs for explicit version updates');