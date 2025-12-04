## [BRIEF-OVERVIEW] Brief overview

This rule file outlines the development approach, coding conventions, and best practices for building exchange integration systems in financial trading applications. These guidelines are based on the comprehensive exchange integration project completed for the Trader Role-Play Analyzer, covering multi-exchange support, sports trading, P2P markets, and advanced monitoring systems.

## [COMMUNICATION-STYLE] Communication style

- Prefer concise, technical communication focused on implementation details
- Use clear, structured responses with bullet points for complex information
- Provide comprehensive status updates with progress tracking
- Include specific examples and code snippets when explaining concepts
- Maintain professional tone with technical precision

## [DEV-WORKFLOW] Development workflow

- Follow iterative development approach: analyze → plan → implement → test → document
- Create comprehensive task checklists with clear progress tracking
- Implement core interfaces first, then build specific adapters
- Use TypeScript for type safety and comprehensive error handling
- Develop mock implementations before real API integration
- Build comprehensive test suites alongside implementation

## [CODING-PRACTICES] Coding best practices

- Use TypeScript with strict typing and interfaces for all data structures
- Implement comprehensive error handling with specific error types
- Create unified base interfaces for extensible adapter patterns
- Use async/await pattern for all API and exchange operations
- Implement health monitoring and performance tracking for production systems
- Add comprehensive JSDoc documentation for all public methods
- Follow consistent naming conventions (camelCase for variables, PascalCase for classes)

## [EXCHANGE-PATTERNS] Exchange integration patterns

- Create base exchange interface defining common operations
- Implement exchange-specific adapters extending base interface
- Use exchange manager for centralized exchange routing
- Add health monitoring and statistics tracking to all adapters
- Implement rate limiting and connection pooling for production use
- Support multiple exchange types: crypto, sports, p2p, prediction, trading_desk

## [API-DESIGN] API design principles

- Use RESTful API design with clear endpoint separation
- Implement comprehensive request validation
- Return consistent response formats with success/error indicators
- Add detailed error messages and status codes
- Support multiple operation types through single endpoints
- Implement proper authentication and credential handling

## [TESTING-STRATEGIES] Testing strategies

- Create comprehensive test suites covering all exchange operations
- Include mock implementations for testing without real API dependencies
- Test error handling scenarios and edge cases
- Validate health monitoring and statistics accuracy
- Implement performance benchmarking and load testing
- Add integration tests for UI and API connectivity

## [UI-INTEGRATION] UI integration approach

- Design clean, intuitive exchange selection interfaces
- Provide visual feedback for connection status and health
- Implement responsive error handling with user-friendly messages
- Add loading states and progress indicators
- Support exchange-specific symbol and market selection
- Integrate health monitoring visualizations

## [DOCS-STANDARDS] Documentation standards

- Maintain comprehensive API documentation with request/response examples
- Document all data structures and interfaces
- Include usage examples and best practices
- Add error handling guidelines and recovery strategies
- Provide performance optimization recommendations
- Keep documentation updated with implementation changes

## [PROJECT-CONTEXT] Project context

- Financial trading application with multi-exchange support
- Sports trading integration by sport, region, and market
- P2P trading with escrow and multiple payment methods
- Prediction markets for event-based trading
- Crypto futures trading with margin support
- Production-grade reliability and monitoring requirements

## [PERFORMANCE-OPTIMIZATION] Performance optimization

- Implement rate limiting and request throttling
- Use connection pooling for efficient API connections
- Add caching strategies for frequent requests
- Implement batch processing for large datasets
- Optimize memory usage and resource management
- Add load balancing awareness for distributed systems

## [ERROR-HANDLING] Error handling guidelines

- Create specific error types for different failure scenarios
- Implement graceful degradation and fallback mechanisms
- Add comprehensive error recovery strategies
- Provide detailed error messages with context
- Implement health-based error classification
- Support exchange-specific error handling patterns

## [SECURITY] Security considerations

- Use read-only API keys for trading analysis
- Implement proper credential management
- Add input validation and sanitization
- Support HTTPS and secure connections
- Implement rate limiting to prevent abuse
- Add authentication for sensitive operations

## [CODE-ORGANIZATION] Code organization

- Separate core interfaces from implementation adapters
- Use clear directory structure (lib/exchanges/, app/api/)
- Maintain consistent file naming conventions
- Group related functionality in logical modules
- Keep test files separate but parallel to implementation
- Use clear import/export patterns for TypeScript modules

## [DEV-TOOLS] Development tools

- Next.js for React frontend development
- TypeScript for type-safe implementation
- Comprehensive ESLint configuration
- Tailwind CSS for UI styling
- Lightweight Charts for financial visualization
- CCXT library for exchange connectivity

## [MONITORING] Monitoring and observability

- Implement real-time health monitoring
- Track performance statistics and trends
- Add system stability indicators
- Implement exchange quality metrics
- Support API reliability tracking
- Enable performance trend analysis

## [DEPLOYMENT-READINESS] Deployment readiness

- Ensure production-grade error handling
- Implement comprehensive logging
- Add system stability monitoring
- Support graceful degradation patterns
- Enable performance optimization features
- Include enterprise-level monitoring capabilities
