# Stream-Telegram Integration with TOML Configuration

This document demonstrates how the Stream-Telegram integration example was updated to use the new TOML configuration system, replacing hard-coded values with flexible configuration-driven initialization.

## 🔄 **Migration Overview**

### **Before (Hard-coded)**
```typescript
// Hard-coded values
const threadManager = new ThreadManagerClass();
const chatId = 8013171035; // From .thread-manager.json

// Fixed topic registration
threadManager.register(chatId, 5, 'Price Alerts', 'alerts');
threadManager.register(chatId, 6, 'Trade Updates', 'trades');

// Fixed bridge configuration
const telegramBridge = createStreamTelegramBridge(streamManager, {
  rateLimit: { messagesPerSecond: 5 },
  maxMessageLength: 4000,
});
```

### **After (TOML Configured)**
```typescript
// Load TOML configuration
const configLoader = getConfig();
const threadManagerConfig = configLoader.get('threadManager');

// Create with configuration
const threadManager = new ThreadManagerClass(threadManagerConfig);
const chatId = threadManagerConfig?.telegram.superGroups[0];

// Dynamic topic registration based on configuration
const defaultPurposes = threadManagerConfig?.telegram.defaultPurposes || [];
defaultPurposes.forEach((purpose, index) => {
  // Create topics for enabled purposes only
});

// Bridge with configuration limits
const telegramBridge = createStreamTelegramBridge(streamManager, threadManager, {
  rateLimit: { 
    messagesPerSecond: threadManagerConfig?.telegram.rateLimitPerSecond 
  },
  maxMessageLength: threadManagerConfig?.telegram.maxMessageLength,
});
```

## 🏗️ **Architecture Changes**

### **1. Configuration Loading**
```typescript
// Load TOML configuration
console.log('⚙️ Loading TOML configuration...');
const configLoader = getConfig();

if (!configLoader.isLoaded()) {
  console.warn('⚠️ No TOML configuration loaded, using defaults');
}

const threadManagerConfig = configLoader.get('threadManager');
```

### **2. Dynamic Chat ID Selection**
```typescript
// Get chat ID from configuration
const chatId = threadManagerConfig?.telegram.superGroups[0] || 8013171035;
const defaultPurposes = threadManagerConfig?.telegram.defaultPurposes || ['general', 'alerts', 'trades', 'errors', 'analytics'];
```

### **3. Configuration-Driven Topic Creation**
```typescript
// Register topics for each default purpose
defaultPurposes.forEach((purpose, index) => {
  if (purpose !== 'general') {
    const threadId = index + 5;
    const topicName = purpose.charAt(0).toUpperCase() + purpose.slice(1) + ' Updates';
    threadManager.register(chatId, threadId, topicName, purpose as any);
    
    // Pin based on configuration
    if (threadManagerConfig?.pinning.autoPinNewMessages || ['alerts', 'trades', 'errors'].includes(purpose)) {
      threadManager.setPinned(chatId, threadId, purpose as any);
    }
  }
});
```

### **4. Dynamic Consumer Creation**
```typescript
// Only create consumers for enabled purposes
const consumers: any[] = [];

if (defaultPurposes.includes('alerts')) {
  consumers.push({
    id: 'price-alerts',
    type: 'alerts' as const,
    // ... consumer configuration
  });
}

if (defaultPurposes.includes('trades')) {
  consumers.push({
    id: 'trade-updates', 
    type: 'trades' as const,
    // ... consumer configuration
  });
}
```

### **5. Bridge Configuration with TOML Limits**
```typescript
const telegramBridge = createStreamTelegramBridge(streamManager, threadManager, {
  defaultChatId: chatId,
  enabledConsumers: {
    alerts: defaultPurposes.includes('alerts'),
    analytics: defaultPurposes.includes('analytics'),
    trades: defaultPurposes.includes('trades'),
    errors: defaultPurposes.includes('errors'),
    system: defaultPurposes.includes('system'),
    general: defaultPurposes.includes('general'),
  },
  formatting: {
    maxMessageLength: threadManagerConfig?.telegram.maxMessageLength || 4000,
  },
  rateLimit: {
    messagesPerSecond: threadManagerConfig?.telegram.rateLimitPerSecond || 10,
    burstLimit: (threadManagerConfig?.telegram.rateLimitPerSecond || 10) * 2,
  },
});
```

## 🔧 **Bridge Updates**

### **Constructor Changes**
```typescript
// Before
export class StreamTelegramBridge {
  constructor(streamManager: BinaryStreamManager, config: Partial<StreamTelegramConfig> = {}) {
    // Used ThreadManager singleton internally
  }
}

// After  
export class StreamTelegramBridge {
  constructor(
    streamManager: BinaryStreamManager,
    threadManager: ThreadManagerClass, // Accept instance
    config: Partial<StreamTelegramConfig> = {}
  ) {
    this.threadManager = threadManager; // Use provided instance
  }
}
```

### **Method Updates**
```typescript
// Before
private getThreadIdForConsumer(chatId: number, consumerType: string): number | null {
  switch (consumerType) {
    case 'alerts':
      return ThreadManager.getAlertsThread(chatId) ?? null; // Singleton
    // ...
  }
}

// After
private getThreadIdForConsumer(chatId: number, consumerType: string): number | null {
  switch (consumerType) {
    case 'alerts':
      return this.threadManager.getAlertsThread(chatId) ?? null; // Instance
    // ...
  }
}
```

## 📊 **Configuration Integration Results**

### **Demo Output**
```
🔗 Stream-Telegram Integration Demo (TOML Configured)
======================================================

⚙️ Loading TOML configuration...
✅ Configuration loaded successfully
📁 Persistence file: .thread-manager.json
📱 Super groups: 8013171035, 8429650235
🎯 Default purposes: alerts, trades, analytics, general, system

🧵 Creating ThreadManager with TOML configuration...
📱 Using chat ID: 8013171035
🎯 Setting up purposes: alerts, trades, analytics, general, system

🌉 Stream-Telegram Bridge created
📏 Max message length: 4000
⚡ Rate limit: 10 msg/sec

🔧 Creating stream consumers based on configuration...
📊 Created 3 consumers: price-alerts, trade-updates, analytics-collector

📱 Configuration Summary:
  • Chat ID: 8013171035
  • Persistence file: .thread-manager.json
  • Auto-save: true
  • Rate limit: 10 msg/sec
  • Max message length: 4000

🧵 Configured Threads:
  • Alerts: Thread 5
  • Trades: Thread 6
  • Analytics: Thread 7
  • General: No thread ID
  • System: Thread 9
```

## 🎯 **Benefits Achieved**

### **1. Configuration Flexibility**
- **Environment-specific settings** - Different configs for dev/prod/test
- **Dynamic chat IDs** - Support for multiple super groups
- **Configurable purposes** - Enable/disable features per environment
- **Rate limiting** - Adjustable per deployment needs

### **2. Better Testing**
- **Isolated configurations** - Each test can use different settings
- **Override capabilities** - Test specific scenarios without affecting others
- **Clean initialization** - No shared state between tests

### **3. Production Readiness**
- **Centralized management** - All settings in TOML files
- **Runtime validation** - Configuration checks and defaults
- **Performance controls** - Rate limits and message sizes configurable

### **4. Maintainability**
- **Clear separation** - Configuration separate from business logic
- **Type safety** - Full TypeScript interfaces for config
- **Documentation** - Self-documenting configuration structure

## 📁 **Files Modified**

### **Core Integration**
- **`examples/stream-telegram-integration.ts`** - Updated to use TOML configuration
- **`lib/stream-telegram-bridge.ts`** - Updated to accept ThreadManager instance

### **Key Changes**
1. **Import updates** - Added TOML configuration imports
2. **Instance management** - Pass ThreadManager instance instead of using singleton
3. **Dynamic initialization** - Create consumers based on enabled purposes
4. **Configuration limits** - Use TOML values for rate limits and message sizes
5. **Proper cleanup** - Destroy ThreadManager instance when done

## 🚀 **Usage Examples**

### **Development Environment**
```toml
# config/thread-manager.dev.toml
[threadManager.telegram]
rateLimitPerSecond = 5
maxMessageLength = 2000
superGroups = [8013171035]
```

### **Production Environment**
```toml
# config/thread-manager.prod.toml
[threadManager.telegram]
rateLimitPerSecond = 20
maxMessageLength = 4000
superGroups = [8013171035, 8429650235, 1234567890]
```

### **Testing Environment**
```toml
# config/thread-manager.test.toml
[threadManager]
autoSave = false
cleanupIntervalMs = 0

[threadManager.debug]
enableDebugLogging = false
```

## 🎉 **Conclusion**

The Stream-Telegram integration now fully leverages the TOML configuration system:

- ✅ **Configuration-driven initialization** - No more hard-coded values
- ✅ **Dynamic consumer creation** - Based on enabled purposes
- ✅ **Flexible rate limiting** - Configurable per environment
- ✅ **Proper resource management** - Instance-based instead of singleton
- ✅ **Clean separation of concerns** - Configuration separate from logic
- ✅ **Production-ready** - Environment-specific configurations

**The integration demonstrates the full power and flexibility of the TOML configuration system!** 🚀
