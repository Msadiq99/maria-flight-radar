import type { RadarSnapshot, RadarTimelineFrame } from './types';

/**
 * Builds timeline frames from snapshots in capture order. Pure; the
 * caller supplies frame durations (defaulting to a fixed step) — no
 * clock is read here. Frame `timestamp` is the snapshot's sceneTimestamp.
 */
export function createTimeline(
  snapshots: readonly RadarSnapshot[],
  frameDurationMs = 1000
): RadarTimelineFrame[] {
  return snapshots.map((snapshot, index) => ({
    index,
    timestamp: snapshot.sceneTimestamp,
    snapshot,
    durationMs: frameDurationMs,
  }));
}

/**
 * Stable sort of frames by timestamp. Ties keep their original relative
 * order (by original index), so sorting is deterministic.
 */
export function sortTimelineFrames(
  frames: readonly RadarTimelineFrame[]
): RadarTimelineFrame[] {
  return frames
    .map((frame, order) => ({ frame, order }))
    .sort((a, b) => a.frame.timestamp - b.frame.timestamp || a.order - b.order)
    .map(({ frame }, index) => ({ ...frame, index }));
}

/**
 * Index of the frame nearest a target timestamp. Deterministic: on an
 * exact tie between two frames, the earlier (lower-index) frame wins.
 * Returns -1 for an empty timeline. Assumes frames are already sorted by
 * timestamp (see sortTimelineFrames).
 */
export function nearestFrameIndex(
  frames: readonly RadarTimelineFrame[],
  timestamp: number
): number {
  if (frames.length === 0) return -1;
  let bestIndex = 0;
  let bestDelta = Math.abs(frames[0].timestamp - timestamp);
  for (let i = 1; i < frames.length; i += 1) {
    const delta = Math.abs(frames[i].timestamp - timestamp);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = i;
    }
  }
  return bestIndex;
}
