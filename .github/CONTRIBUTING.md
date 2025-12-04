# [CONTRIBUTING] Contributing to Trader Analyzer

Thank you for your interest in contributing to Trader Analyzer! This document provides guidelines and information for contributors.

## [DEV-SETUP] Development Setup

### Prerequisites

- [Bun](https://bun.sh/) runtime (v1.3.2+)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) for Cloudflare Workers
- Cloudflare account with Workers enabled

### Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/trader-analyzer.git
cd trader-analyzer

# Install dependencies
bun install

# Start development
bun run dev:full

# Run tests
bun test

# Deploy to staging
bun run deploy:workers
```

## [DEV-WORKFLOW] Development Workflow

### 1. Choose an Issue

- Check [GitHub Issues](https://github.com/your-org/trader-analyzer/issues) for open tasks
- Comment on the issue to indicate you're working on it
- Create a feature branch: `git checkout -b feature/your-feature-name`

### 2. Code Development

- Follow the existing code style and conventions
- Write tests for new functionality
- Update documentation as needed
- Ensure TypeScript types are correct

### 3. Testing

```bash
# Run all tests
bun test

# Run with coverage
bun run test:coverage

# Test API endpoints
bun run test:api
```

### 4. Commit and Push

```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add new trading strategy analysis

- Implement XYZ algorithm for strategy detection
- Add comprehensive test coverage
- Update API documentation"

# Push to your branch
git push origin feature/your-feature-name
```

### 5. Create Pull Request

- Open a PR against the `main` branch
- Fill out the PR template completely
- Request review from maintainers
- Address any feedback promptly

## [CODE-STYLE] Code Style Guidelines

### TypeScript

- Use strict TypeScript settings
- Avoid `any` types - use proper type definitions
- Export interfaces and types for public APIs

### Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `trading-strategy.ts`)
- **Classes**: `PascalCase` (e.g., `TradingStrategy`)
- **Functions/Variables**: `camelCase` (e.g., `calculateReturns`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_TIMEFRAME`)

### Documentation

- Add JSDoc comments for public APIs
- Include [#REF] tags for technical references
- Update API documentation for endpoint changes

## [TESTING-REQS] Testing Requirements

### Unit Tests

- Test all public functions and methods
- Mock external dependencies (APIs, databases)
- Aim for 80%+ code coverage

### Integration Tests

- Test API endpoints with realistic data
- Verify error handling and edge cases
- Test WebSocket connections and fallbacks

### E2E Tests

- Test complete user workflows
- Verify frontend-backend integration
- Test deployment scenarios

## [API-DESIGN] API Design Guidelines

### RESTful Endpoints

- Use consistent URL patterns
- Support pagination for list endpoints
- Include proper HTTP status codes
- Implement ETag caching where appropriate

### WebSocket Protocol

- Use structured message types
- Include timestamps and sequence numbers
- Handle connection drops gracefully
- Provide polling fallbacks

### Error Handling

- Return consistent error response format
- Include helpful error messages
- Log errors for debugging
- Don't expose sensitive information

## [DEPLOYMENT] Deployment

### Staging Deployment

```bash
bun run deploy:workers
```

### Production Deployment

```bash
bun run deploy:workers:prod
```

### Rollback

```bash
# Cloudflare Workers support instant rollbacks
wrangler deployments list
wrangler deployments rollback <deployment-id>
```

## [GETTING-HELP] Getting Help

- **Documentation**: Check `docs/` directory
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **Discord**: Join our community Discord

## [RECOGNITION] Recognition

Contributors will be recognized in:

- GitHub repository contributors list
- Changelog entries
- Project documentation

Thank you for contributing to Trader Analyzer! 🚀
