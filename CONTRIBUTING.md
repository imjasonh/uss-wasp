# Contributing to USS Wasp: Operation Beachhead Inferno

Thank you for your interest in contributing to this project! This document outlines the development workflow and contribution guidelines.

## Development Workflow

### 1. Setting Up Your Development Environment

```bash
# Clone the repository
git clone https://github.com/imjasonh/uss-wasp.git
cd uss-wasp

# Install dependencies
npm install

# Install pre-commit hooks
npm run prepare
```

### 2. Making Changes

1. **Create a feature branch** from main:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following the code style guidelines

3. **Run quality checks** before committing:
   ```bash
   npm run lint          # Check for linting issues
   npm run typecheck     # TypeScript type checking
   npm run test          # Run unit tests
   npm run build         # Ensure project builds
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: descriptive commit message"
   ```
   
   Pre-commit hooks will automatically:
   - Run ESLint and fix issues
   - Format code with Prettier
   - Ensure TypeScript compilation

### 3. Creating a Pull Request

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a PR** against the `main` branch

3. **PR Requirements**:
   - All CI checks must pass
   - Code coverage should not decrease significantly
   - AI system tests must pass
   - No security vulnerabilities introduced

## Code Quality Standards

### TypeScript Standards
- Strict TypeScript configuration is enforced
- No `any` types in production code (limited exceptions in tests)
- Explicit function return types required
- All class members must have accessibility modifiers

### Testing Requirements
- Unit tests for new functionality
- AI system integration tests for game mechanics
- Maintain or improve test coverage
- Tests must pass strict linting rules

### Code Style
- ESLint with strict TypeScript rules
- Prettier for formatting
- Consistent naming conventions
- Comprehensive JSDoc comments for public APIs

## AI System Development

When working on AI features:

1. **Test with gap analysis**:
   ```bash
   node test-ai-system-gaps.js
   ```

2. **Validate with battle tests**:
   ```bash
   node quick-battle-test.js
   ```

3. **Performance benchmarking**:
   ```bash
   node run-optimized-battles.js
   ```

## Commit Message Guidelines

Follow conventional commits format:
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation changes
- `style:` formatting, missing semicolons, etc.
- `refactor:` code restructuring
- `test:` adding/updating tests
- `chore:` maintenance tasks

## CI/CD Pipeline

### Automated Checks
- **Linting**: ESLint with strict TypeScript rules
- **Type Checking**: Full TypeScript compilation
- **Testing**: Jest unit tests with coverage
- **Building**: Both Node.js and web bundles
- **Security**: Dependency audits and CodeQL scanning
- **AI Validation**: Comprehensive AI system tests

### Branch Protection
Main branch is protected with required status checks:
- All CI tests must pass
- Pre-commit hooks must succeed
- Security scans must clear
- AI system validation must pass

## Getting Help

- **Documentation**: Check existing docs in `/docs`
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions
- **AI Debugging**: Use the extensive logging system and test utilities

## Release Process

1. Features are merged to `main` via PR
2. AI system tests run automatically
3. Security scans validate dependencies
4. Version bumping and releases are manual
5. Full game simulations run on schedule

## Performance Considerations

- AI decisions should complete within reasonable time limits
- Memory usage is monitored in long-running simulations
- Battle tests validate performance regressions
- Pathfinding algorithms are optimized for map sizes

Thank you for contributing to the USS Wasp project!