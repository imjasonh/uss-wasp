# Branch Protection Configuration

This document describes the recommended branch protection settings for the `main` branch.

## Required Status Checks

The following status checks should be required before merging:

### CI Pipeline
- `ci / ci` - Comprehensive CI checks including:
  - Linting and formatting validation
  - TypeScript type checking
  - Build verification (TypeScript compilation)
  - Unit tests with coverage
  - Security audit
  - Large file detection
  - Quick AI validation
  - Commit message validation (PRs only)

### AI System Validation
- `ai-comprehensive-tests / ai-comprehensive-tests` - Extended AI system testing
- `combat-validation / combat-validation` - Combat mechanics validation

## Branch Protection Rules

### Settings to Enable:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners (if CODEOWNERS file exists)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - ✅ Status checks required (see list above)

- ✅ **Require conversation resolution before merging**

- ✅ **Require signed commits** (recommended for security)

- ✅ **Require linear history** (prevents merge commits)

- ✅ **Do not allow bypassing the above settings**
  - ❌ Allow force pushes
  - ❌ Allow deletions

### Administrative Settings:
- ✅ **Restrict pushes that create files that are larger than 100 MB**
- ✅ **Include administrators** (administrators must follow the same rules)

## GitHub Repository Settings

### General Settings:
- ✅ **Automatically delete head branches** (clean up after PR merge)
- ✅ **Allow squash merging** (preferred merge method)
- ❌ **Allow merge commits** (disabled for linear history)
- ❌ **Allow rebase merging** (disabled to prevent complexity)

### Security Settings:
- ✅ **Enable Dependabot alerts**
- ✅ **Enable Dependabot security updates** 
- ✅ **Enable private vulnerability reporting**
- ✅ **Require two-factor authentication for contributors**

## Setup Instructions

1. **Navigate to Repository Settings**
   - Go to Settings → Branches
   - Click "Add rule" for `main` branch

2. **Configure Branch Protection**
   - Apply the settings listed above
   - Add required status checks as they become available

3. **Set up Dependabot**
   - Go to Settings → Code security and analysis
   - Enable Dependabot alerts and security updates

4. **Configure Merge Settings**
   - Go to Settings → General → Pull Requests
   - Configure merge options as described above

## Status Check Names

When configuring required status checks, use these exact names:

```
ci
ai-comprehensive-tests
combat-validation
```

## Enforcement Timeline

1. **Phase 1**: Enable basic CI checks (lint, test, build)
2. **Phase 2**: Add AI system validation 
3. **Phase 3**: Enable security scanning
4. **Phase 4**: Enforce all checks with no bypassing

This ensures a smooth transition while maintaining code quality standards.