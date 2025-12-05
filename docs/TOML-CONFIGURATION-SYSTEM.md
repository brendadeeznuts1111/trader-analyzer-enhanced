# TOML Configuration System for Thread Manager

This document describes the comprehensive TOML-based configuration system implemented for the Thread Manager, replacing the previous hard-coded singleton approach.

## 🏗️ Architecture Overview

### Configuration Flow
```
config/thread-manager.toml → internal-toml-loader.ts → ThreadManagerClass → Application
```

### Key Components
1. **`config/thread-manager.toml`** - Main configuration file
2. **`src/config/internal-toml-loader.ts`** - TOML parsing and validation
3. **`src/modules/thread-manager/index.ts`** - Central instance management
4. **`src/main.ts`** - Application initialization
5. **`lib/thread-manager.ts`** - Refactored to accept configuration

## 📁 Configuration Structure

### Main Configuration File: `config/thread-manager.toml`

```toml
# Thread Manager Configuration
[threadManager]
persistenceFile = ".thread-manager.json"
autoSave = true
maxTopicsPerChat = 100
cleanupIntervalMs = 300000

[threadManager.topics]
defaultPurpose = "general"
pinRetentionHours = 24
maxTopicNameLength = 100
autoCreateTopics = true

[threadManager.telegram]
superGroups = [8013171035, 8429650235]
defaultPurposes = ["alerts", "trades", "analytics", "general", "system"]
rateLimitPerSecond = 10
maxMessageLength = 4000

[threadManager.pinning]
autoPinNewMessages = false
maxPinsPerPurpose = 1
autoUnpinOlder = true
autoPinDelayMs = 1000

[threadManager.debug]
enableDebugLogging = true
logTopicChanges = true
logPerformanceMetrics = false
```

## 🔧 Configuration Options

### Core Settings
- **`persistenceFile`** - Path to JSON persistence file
- **`autoSave`** - Automatically save state changes
- **`maxTopicsPerChat`** - Maximum topics per chat (0 = unlimited)
- **`cleanupIntervalMs`** - Cleanup interval (0 = disabled)

### Topic Settings
- **`defaultPurpose`** - Default purpose for new topics
- **`pinRetentionHours`** - How long to keep pin information
- **`maxTopicNameLength`** - Maximum topic name length
- **`autoCreateTopics`** - Auto-create topics when registering

### Telegram Settings
- **`superGroups`** - List of super group chat IDs
- **`defaultPurposes`** - Default purposes to initialize
- **`rateLimitPerSecond`** - Rate limiting for operations
- **`maxMessageLength`** - Maximum message length

### Pinning Settings
- **`autoPinNewMessages`** - Auto-pin new messages
- **`maxPinsPerPurpose`** - Maximum pins per purpose
- **`autoUnpinOlder`** - Auto-unpin older messages
- **`autoPinDelayMs`** - Delay before auto-pinning

### Debug Settings
- **`enableDebugLogging`** - Enable debug logging
- **`logTopicChanges`** - Log topic creation/deletion
- **`logPerformanceMetrics`** - Log performance metrics

## 💻 Usage Examples

### 1. Basic Usage with TOML Configuration

```typescript
import { initializeThreadManager, getThreadManager } from './src/modules/thread-manager';

// Initialize with TOML configuration
const threadManager = initializeThreadManager();

// Get configured instance
const manager = getThreadManager();
```

### 2. Custom Configuration Override

```typescript
import { ThreadManagerClass } from './lib/thread-manager';

// Override specific TOML settings
const customConfig = {
  persistenceFile: '.custom-thread-manager.json',
  autoSave: false,
  debug: {
    enableDebugLogging: false
  }
};

const threadManager = new ThreadManagerClass(customConfig);
```

### 3. Configuration Access

```typescript
// Get current configuration
const config = threadManager.getConfig();
console.log('Persistence file:', config.persistenceFile);
console.log('Auto-save:', config.autoSave);
```

### 4. Testing with Custom Configuration

```typescript
import { ThreadManagerClass } from '../lib/thread-manager';
import type { ThreadManagerConfig } from '../src/config/internal-toml-loader';

const testConfig: Partial<ThreadManagerConfig> = {
  persistenceFile: '.test-thread-manager.json',
  autoSave: true,
  cleanupIntervalMs: 0, // Disable cleanup for tests
  debug: {
    enableDebugLogging: false,
    logTopicChanges: false,
    logPerformanceMetrics: false
  }
};

const threadManager = new ThreadManagerClass(testConfig);
```

## 🔄 Migration from Hard-coded Singleton

### Before (Hard-coded)
```typescript
// Old approach - hard-coded singleton
import { ThreadManager } from './lib/thread-manager';
const manager = ThreadManager; // Fixed configuration
```

### After (TOML Configured)
```typescript
// New approach - configured instances
import { initializeThreadManager, getThreadManager } from './src/modules/thread-manager';

// Initialize with TOML configuration
initializeThreadManager();

// Get configured instance
const manager = getThreadManager();
```

## 🧪 Testing and Validation

### Run Configuration Demo
```bash
bun run examples/toml-config-demo.ts
```

### Run Thread Manager Tests
```bash
bun test tests/thread-manager-edge-cases.test.ts
```

### Expected Output
```
✅ TOML loading: Working
✅ Configuration parsing: Working
✅ Thread Manager initialization: Working
✅ Basic functionality: Working
✅ Configuration access: Working
```

## 📁 File Structure

```
trader-analyzer/
├── config/
│   └── thread-manager.toml          # Main configuration
├── src/
│   ├── config/
│   │   └── internal-toml-loader.ts  # TOML parsing system
│   ├── modules/
│   │   └── thread-manager/
│   │       └── index.ts             # Central instance management
│   └── main.ts                      # Application initialization
├── lib/
│   └── thread-manager.ts            # Refactored ThreadManagerClass
├── examples/
│   └── toml-config-demo.ts          # Configuration demo
└── tests/
    └── thread-manager-edge-cases.test.ts  # Updated tests
```

## 🎯 Benefits

### 1. **Configuration Flexibility**
- Environment-specific settings
- Easy parameter tuning
- No code changes for configuration updates

### 2. **Better Testing**
- Isolated test configurations
- Override specific settings per test
- Clean separation of config and logic

### 3. **Production Readiness**
- Centralized configuration management
- Validation and defaults
- Debug and performance controls

### 4. **Maintainability**
- Clear configuration structure
- Type-safe configuration interfaces
- Comprehensive documentation

## 🚀 Production Deployment

### Environment-Specific Configurations

```bash
# Development
cp config/thread-manager.toml config/thread-manager.dev.toml

# Production  
cp config/thread-manager.toml config/thread-manager.prod.toml

# Testing
cp config/thread-manager.toml config/thread-manager.test.toml
```

### Runtime Configuration Loading

```typescript
// Load environment-specific config
const env = process.env.NODE_ENV || 'development';
const configFile = `thread-manager.${env}.toml`;

// Update config loader to use environment file
const config = new TomlConfigLoader(`config/${configFile}`);
```

## 🔍 Troubleshooting

### Common Issues

1. **Configuration Not Loading**
   - Check file path and permissions
   - Verify TOML syntax
   - Check console warnings

2. **Invalid Configuration Values**
   - Review configuration interfaces
   - Check value ranges and types
   - Use validation functions

3. **Thread Manager Not Initialized**
   - Call `initializeThreadManager()` first
   - Check for initialization errors
   - Verify configuration loading

### Debug Mode

Enable debug logging in configuration:
```toml
[threadManager.debug]
enableDebugLogging = true
logTopicChanges = true
logPerformanceMetrics = true
```

## 📚 API Reference

### Main Classes and Functions

- **`TomlConfigLoader`** - TOML file parsing and management
- **`ThreadManagerClass`** - Configurable thread manager
- **`initializeThreadManager()`** - Initialize with configuration
- **`getThreadManager()`** - Get configured instance
- **`getConfig()`** - Get configuration loader

### Configuration Interfaces

- **`ThreadManagerConfig`** - Main configuration interface
- **`TomlConfig`** - Root configuration interface

## 🎉 Conclusion

The TOML configuration system provides:
- ✅ **Flexible configuration management**
- ✅ **Type-safe configuration interfaces**
- ✅ **Environment-specific settings**
- ✅ **Comprehensive testing support**
- ✅ **Production-ready defaults**
- ✅ **Clear documentation and examples**

**The Thread Manager is now fully configurable and ready for production deployment!** 🚀
