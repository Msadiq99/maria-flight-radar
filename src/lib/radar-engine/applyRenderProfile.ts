import type { RadarRenderProfile, RadarScene, RadarSceneTarget } from './types';

/**
 * Derives the scene that a mode actually renders by enforcing its
 * profile's density caps. Pure, deterministic, and immutable: it never
 * mutates the input scene, its targets, or their trail arrays — it
 * returns fresh objects.
 *
 * The single point where target/label/trail caps are applied, so no
 * layer component needs cap logic. `scene.targets` is already sorted by
 * priority (selected > critical > warning > nearby > normal > stale) by
 * the scene builder, so "keep the first N" preserves both the highest
 * priorities and a stable order. The selected target is additionally
 * force-kept even in the pathological case of a zero or tiny limit.
 */
export function applyRenderProfile(
  scene: RadarScene,
  profile: RadarRenderProfile
): RadarScene {
  const retained = capTargets(scene.targets, profile.targetLimit);
  const labelled = capLabels(retained, profile.labelLimit);
  const trimmed = labelled.map((target) =>
    capTrail(target, profile.trailPointLimit)
  );

  const alertCount = trimmed.filter(
    (target) =>
      target.alertState === 'critical' || target.alertState === 'warning'
  ).length;

  return {
    ...scene,
    targets: trimmed,
    statistics: {
      // totalCount stays the true in-range/visible count from the builder;
      // visibleCount reflects what this profile actually renders.
      totalCount: scene.statistics.totalCount,
      visibleCount: trimmed.length,
      alertCount,
    },
  };
}

function capTargets(
  targets: RadarSceneTarget[],
  limit: number | null
): RadarSceneTarget[] {
  if (limit === null || targets.length <= limit) return targets.slice();
  const kept = targets.slice(0, Math.max(0, limit));
  // Guarantee the selected target survives even a very small cap.
  if (!kept.some((target) => target.selected)) {
    const selected = targets.find((target) => target.selected);
    if (selected) {
      if (kept.length >= limit && kept.length > 0) kept.pop();
      kept.unshift(selected);
    }
  }
  return kept;
}

function capLabels(
  targets: RadarSceneTarget[],
  limit: number | null
): RadarSceneTarget[] {
  if (limit === null) return targets.map((target) => ({ ...target }));
  let shown = 0;
  return targets.map((target) => {
    // Labels follow the same priority order as the target list; the
    // selected target is always allowed a label regardless of the cap.
    const allow = target.labelVisible && (target.selected || shown < limit);
    if (allow) shown += 1;
    return { ...target, labelVisible: allow };
  });
}

function capTrail(target: RadarSceneTarget, limit: number): RadarSceneTarget {
  if (target.trailPoints.length <= limit) return { ...target };
  // Preserve the newest points (trail arrays run oldest → newest).
  return { ...target, trailPoints: target.trailPoints.slice(-limit) };
}
