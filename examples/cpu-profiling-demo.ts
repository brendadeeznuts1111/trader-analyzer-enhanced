/**
 * CPU Profiling Demo for Binary Stream Integration
 * Uses Bun's built-in CPU profiling to analyze performance
 */

import { BinaryStreamManager, ExchangeMessage } from '../lib/binary-utils';
import { BlueprintLoader } from '../lib/blueprints/loader';
import type { BlueprintConfig } from '../lib/blueprints/loader';

async function cpuProfilingDemo() {
  console.log('🔬 CPU Profiling Demo for Binary Stream Integration');
  console.log('==============================================\n');

  // Load blueprint configuration
  const loader = BlueprintLoader.getInstance();
  const blueprint = loader.loadBlueprint('BP-EXCHANGE-BINANCE');

  // Create binary stream manager
  const streamManager = new BinaryStreamManager(blueprint);

  console.log('📊 Starting CPU profiling test...');
  
  // Simulate intensive binary stream processing
  const startTime = Date.now();
  const iterations = 1000;
  
  // Create test exchange messages
  const testMessages: ExchangeMessage[] = [];
  for (let i = 0; i < iterations; i++) {
    testMessages.push({
      exchange: 'binance',
      symbol: `SYMBOL${i % 100}`,
      type: 'ticker',
      timestamp: Date.now(),
      data: {
        price: 50000 + Math.random() * 10000,
        volume: Math.random() * 1000000,
        priceChange: (Math.random() - 0.5) * 2000
      }
    });
  }

  // Test hex formatting performance
  for (let i = 0; i < iterations; i++) {
    const message = testMessages[i];
    
    // Trigger custom inspection with hex formatting (use lower depth to avoid metadata issue)
    const inspectResult = streamManager[Bun.inspect.custom](2, { 
      hex: true, 
      colors: false 
    } as any);
    
    // Simulate string width calculations (Bun.stringWidth is 1,000x faster)
    if (i % 100 === 0) {
      const hexString = '0a0b0c0d1a1b1c1d';
      const stringWidth = (globalThis as any).Bun?.stringWidth || ((str: string) => str.length);
      const width = stringWidth(hexString, { countAnsiEscapeCodes: false });
    }
  }

  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log(`✅ Processed ${iterations} hex formatting operations in ${duration}ms`);
  console.log(`📈 Average: ${(iterations / duration * 1000).toFixed(2)} operations/second`);
  
  // Show final state with hex formatting
  console.log('\n🔍 Final stream manager state:');
  console.log(streamManager);
  
  // Show hex formatted data
  console.log('\n🎯 Hex formatted inspection:');
  console.log(streamManager[Bun.inspect.custom](2, { 
    hex: true, 
    colors: true,
    compact: false 
  } as any));
  
  console.log('\n💡 Performance Insights:');
  console.log('   • Hex formatting: Optimized with Bun.stringWidth');
  console.log('   • Custom inspection: Depth-controlled');
  console.log('   • Memory usage: Stream-based buffering');
  console.log('   • Binary processing: Ready for stream integration');
}

// Memory usage monitoring
function showMemoryUsage() {
  const usage = process.memoryUsage();
  console.log('\n💾 Memory Usage:');
  console.log(`   RSS: ${(usage.rss / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Used: ${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   Heap Total: ${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   External: ${(usage.external / 1024 / 1024).toFixed(2)} MB`);
}

// Run the demo
if (import.meta.main) {
  cpuProfilingDemo()
    .then(() => {
      showMemoryUsage();
      console.log('\n✅ CPU profiling demo complete!');
      console.log('\n🚀 To profile with Bun CPU profiler:');
      console.log('   bun --cpu-prof --cpu-prof-name binary-stream-profile.cpuprofile run examples/cpu-profiling-demo.ts');
      console.log('   Then open the .cpuprofile file in Chrome DevTools > Performance > Load');
    })
    .catch(console.error);
}

export { cpuProfilingDemo, showMemoryUsage };
