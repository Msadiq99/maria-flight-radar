/**
 * Mode metadata lives in src/lib/radar-engine/modeRegistry.ts and
 * renderProfiles.ts (platform-independent). This module re-exports it
 * for components that only need to reach the registry from within
 * src/components/radar-engine/modes/.
 */
export * from '../../../lib/radar-engine/modeRegistry';
export * from '../../../lib/radar-engine/renderProfiles';
