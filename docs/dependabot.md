# Dependabot Configuration

This document explains the automated dependency management setup for the USS Wasp project.

## Overview

Dependabot is configured to automatically monitor and update dependencies for:

- **GitHub Actions** - Workflow action versions
- **Node.js/TypeScript dependencies** - npm packages and dev tools

## Configuration Details

### Update Schedule

- **GitHub Actions**: Weekly on Mondays at 9:00 AM UTC
- **npm packages**: Weekly on Mondays at 10:00 AM UTC

### Dependency Grouping

To reduce PR noise, related dependencies are grouped together:

- **TypeScript tooling**: `typescript`, `@types/*`, `ts-*`, `tsx`
- **ESLint tooling**: `eslint*`, `@typescript-eslint/*`
- **Testing framework**: `jest`, `@jest/*`, `playwright`, `@playwright/*`
- **Webpack tooling**: `webpack*`, `*-loader`, `html-webpack-plugin`
- **Dev tools**: `husky`, `lint-staged`, `prettier`

### Version Strategy

- **Exact versions**: All dependencies are pinned to exact versions (no `^` or `~`)
- **Grouped updates**: Minor and patch updates are grouped to reduce PR volume
- **Manual review**: Major version updates require manual review and testing

### Ignored Updates

Major version updates are ignored for critical tools that require careful migration:

- `@types/node` - Node.js type definitions
- `eslint` - Linting rules may have breaking changes
- `typescript` - Language updates need careful testing

## Security Updates

Security updates bypass all other settings and are always created immediately to ensure critical patches are not delayed.

## Testing Integration

All Dependabot PRs will trigger the full CI/CD pipeline:

- ✅ TypeScript compilation
- ✅ ESLint linting
- ✅ Prettier formatting
- ✅ Jest unit tests
- ✅ Playwright E2E tests
- ✅ AI system tests
- ✅ Combat validation tests
- ✅ Game simulation tests

## Workflow

1. **Dependabot creates PR** - Grouped updates with clear commit messages
2. **CI validation** - All tests must pass before merge
3. **Manual review** - Reviewer checks for breaking changes
4. **Auto-merge eligible** - Patch/minor updates that pass CI can be auto-merged
5. **Manual merge** - Major updates require careful review and testing

## Maintenance

### Adding New Dependencies

When adding new dependencies:

1. **Pin to exact version**: Use exact versions in `package.json`
2. **Update Dependabot config**: Add to appropriate group if needed
3. **Test thoroughly**: Ensure CI passes and functionality works

### Handling Failed Updates

If a Dependabot PR fails CI:

1. **Check breaking changes**: Review the dependency's changelog
2. **Update code**: Fix any compatibility issues
3. **Update tests**: Adjust tests if needed
4. **Document**: Add notes about any required changes

### Emergency Security Updates

For critical security vulnerabilities:

1. **Dependabot creates immediate PR** - Bypasses normal schedule
2. **Priority review** - Merge as soon as CI passes
3. **Monitor deployment** - Watch for any issues after merge

## Scripts

- `scripts/pin-dependencies.js` - Utility to pin current dependencies to exact versions

## Benefits

- **Automated security updates** - Critical patches applied quickly
- **Reduced maintenance overhead** - Grouped updates minimize PR noise
- **Explicit version tracking** - Exact versions ensure reproducible builds
- **CI validation** - All updates tested before merge
- **Breaking change protection** - Major updates require manual review

## Future Enhancements

- **Auto-merge** - Configure auto-merge for low-risk patch updates
- **Dependency dashboard** - Monitor dependency health and updates
- **Custom grouping** - Refine grouping rules based on usage patterns