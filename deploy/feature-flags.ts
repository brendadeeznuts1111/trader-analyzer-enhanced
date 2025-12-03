/**
 * Feature Flags Configuration
 * [[TECH][GLOBAL][CONFIG][META:{blueprint=BP-FEATURE-FLAGS@1.0.0;status=active}]
 * [PROPERTIES:{polyEnabled=false;kalshiEnabled=false;deployment=blue-green}]
 * [CLASS:FeatureFlags][#REF:v-0.1.9.BP.CONFIG.1.0.A.1.1]]
 */

export interface BlueprintVersions {
  [key: string]: string;
}

export interface ResolutionModes {
  static: string[]; // Resolved at startup
  dynamic: string[]; // Resolved at mount
  volatile: string[]; // Resolved at call-time
}

export interface DeploymentConfig {
  current: 'blue' | 'green';
  next: 'blue' | 'green';
  rollbackThreshold: number;
  healthCheckEndpoint: string;
}

export interface FeatureFlags {
  polyEnabled: boolean;
  kalshiEnabled: boolean;
  blueprintVersions: BlueprintVersions;
  resolutionModes: ResolutionModes;
  deployment: DeploymentConfig;
}

export const featureFlags: FeatureFlags = {
  // Exchange feature flags (default: false for safe rollout)
  polyEnabled: process.env.POLY_ENABLED === 'true' || false,
  kalshiEnabled: process.env.KALSHI_ENABLED === 'true' || false,

  // Blueprint versions pinned for deployment
  blueprintVersions: {
    'BP-INTEGRATION-POLY': '^0.1.0',
    'BP-EXCHANGE-POLYMARKET': '^0.1.0',
    'BP-POLY-MARKETS': '^0.1.0',
    'BP-NORMALIZE': '^0.1.0',
    'BP-RUNTIME-BUN': '^1.3.3',
    'BP-WS-OPTIMIZATION': '^0.1.0',
    // Kalshi (v0.2.0 - queued)
    'BP-INTEGRATION-KALSHI': '^0.1.0',
    'BP-EXCHANGE-KALSHI': '^0.1.0',
  },

  // Runtime resolution modes
  resolutionModes: {
    static: ['endpoints', 'schemas', 'baseUrl'], // Resolved at startup
    dynamic: ['auth_keys', 'config', 'apiKey'], // Resolved at mount
    volatile: ['rate_limits', 'certificates', 'rateLimit'], // Resolved at call-time
  },

  // Blue-green deployment configuration
  deployment: {
    current: 'blue',
    next: 'green',
    rollbackThreshold: 0.05, // 5% error rate triggers rollback
    healthCheckEndpoint: '/api/health/blueprint',
  },
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(
  feature: keyof Pick<FeatureFlags, 'polyEnabled' | 'kalshiEnabled'>
): boolean {
  return featureFlags[feature];
}

/**
 * Get pinned blueprint version
 */
export function getBlueprintVersion(blueprintId: string): string | undefined {
  return featureFlags.blueprintVersions[blueprintId];
}

/**
 * Check if property should be resolved at a specific mode
 */
export function getResolutionMode(
  propertyKey: string
): 'static' | 'dynamic' | 'volatile' | 'unknown' {
  if (featureFlags.resolutionModes.static.includes(propertyKey)) return 'static';
  if (featureFlags.resolutionModes.dynamic.includes(propertyKey)) return 'dynamic';
  if (featureFlags.resolutionModes.volatile.includes(propertyKey)) return 'volatile';
  return 'unknown';
}

/**
 * Check if rollback should be triggered
 */
export function shouldRollback(errorRate: number): boolean {
  return errorRate > featureFlags.deployment.rollbackThreshold;
}

/**
 * Get current deployment slot
 */
export function getCurrentDeployment(): 'blue' | 'green' {
  return featureFlags.deployment.current;
}

/**
 * Rollback conditions
 */
export const rollbackConditions = {
  errorRateThreshold: 0.01, // 1% error rate for 5 minutes
  latencyP95Threshold: 5, // 5ms p95 latency
  cacheHitRatioThreshold: 0.6, // 60% cache hit ratio
  monitoringWindowMs: 300000, // 5 minutes
};

/**
 * Key metrics to monitor
 */
export const monitoringConfig = {
  metrics: {
    resolutionLatency: { p50: 1, p95: 3 }, // ms thresholds
    cacheHitRatio: 0.8, // >80% target
    errorRate: 0.001, // <0.1% target
    sqliteQueryTime: 10, // <10ms target
  },
  alertChannels: ['prometheus', 'grafana'],
  dashboardUrl: process.env.GRAFANA_URL || 'http://localhost:3000/d/blueprint',
};
