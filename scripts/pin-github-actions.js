#!/usr/bin/env node

/**
 * Script to pin GitHub Actions to commit SHAs with version comments
 * This enhances security by ensuring immutable action references
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workflowsDir = path.join(__dirname, '..', '.github', 'workflows');

console.log('🔐 Pinning GitHub Actions to commit SHAs for enhanced security...');

/**
 * Fetch the latest release and commit SHA for a GitHub Action
 */
async function getActionInfo(owner, repo) {
  try {
    // Get latest release info
    const releaseCmd = `curl -s "https://api.github.com/repos/${owner}/${repo}/releases/latest"`;
    const releaseData = JSON.parse(execSync(releaseCmd, { encoding: 'utf8' }));
    const version = releaseData.tag_name;
    
    // Get commit SHA for this version
    const shaCmd = `curl -s "https://api.github.com/repos/${owner}/${repo}/git/refs/tags/${version}"`;
    const shaData = JSON.parse(execSync(shaCmd, { encoding: 'utf8' }));
    const sha = shaData.object.sha;
    
    return { version, sha };
  } catch (error) {
    console.error(`❌ Failed to fetch info for ${owner}/${repo}:`, error.message);
    return null;
  }
}

/**
 * Update workflow file to pin actions to commit SHAs
 */
function updateWorkflowFile(filePath) {
  console.log(`\n📝 Processing ${path.basename(filePath)}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern to match action references without commit SHAs
  const actionPattern = /uses:\s+([^\/]+\/[^@\s]+)@(v[\d\.]+)/g;
  
  let match;
  while ((match = actionPattern.exec(content)) !== null) {
    const [fullMatch, actionName, version] = match;
    
    // Skip if already pinned to SHA
    if (version.length === 40 && /^[a-f0-9]+$/.test(version)) {
      continue;
    }
    
    const [owner, repo] = actionName.split('/');
    
    console.log(`  🔍 Found: ${actionName}@${version}`);
    
    try {
      // Get SHA for this version
      const shaCmd = `curl -s "https://api.github.com/repos/${owner}/${repo}/git/refs/tags/${version}"`;
      const shaData = JSON.parse(execSync(shaCmd, { encoding: 'utf8' }));
      const sha = shaData.object.sha;
      
      if (sha && sha.length === 40) {
        const replacement = `uses: ${actionName}@${sha} # ${version}`;
        content = content.replace(fullMatch, replacement);
        console.log(`  ✅ Pinned to: ${sha.substring(0, 8)}... # ${version}`);
        modified = true;
      } else {
        console.log(`  ⚠️  Could not find SHA for ${version}`);
      }
    } catch (error) {
      console.log(`  ❌ Error fetching SHA: ${error.message}`);
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`  💾 Updated ${path.basename(filePath)}`);
  } else {
    console.log(`  ✨ Already up to date`);
  }
  
  return modified;
}

/**
 * Main execution
 */
function main() {
  if (!fs.existsSync(workflowsDir)) {
    console.error('❌ No .github/workflows directory found');
    process.exit(1);
  }
  
  const workflowFiles = fs.readdirSync(workflowsDir)
    .filter(file => file.endsWith('.yml') || file.endsWith('.yaml'))
    .map(file => path.join(workflowsDir, file));
  
  if (workflowFiles.length === 0) {
    console.log('ℹ️  No workflow files found');
    return;
  }
  
  console.log(`Found ${workflowFiles.length} workflow files to process:`);
  workflowFiles.forEach(file => console.log(`  - ${path.basename(file)}`));
  
  let totalModified = 0;
  
  for (const filePath of workflowFiles) {
    if (updateWorkflowFile(filePath)) {
      totalModified++;
    }
  }
  
  console.log(`\n🎉 Processing complete!`);
  console.log(`Modified ${totalModified} of ${workflowFiles.length} workflow files`);
  console.log('\nNext steps:');
  console.log('1. Review the changes with: git diff');
  console.log('2. Test workflows still function correctly');
  console.log('3. Commit the pinned actions');
  console.log('4. Dependabot will now update SHAs and version comments automatically');
}

main();