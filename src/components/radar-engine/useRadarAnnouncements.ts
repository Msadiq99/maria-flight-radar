import { useEffect, useRef, useState } from 'react';
import { getRenderProfile } from '../../lib/radar-engine/modeRegistry';
import type { RadarRenderMode } from '../../lib/radar-engine/types';
import type { SourceState } from '../../missionControlState';

export type RadarAnnouncementInputs = {
  mode: RadarRenderMode;
  selectedId: string | null;
  selectedCallsign: string | null;
  sourceState: SourceState;
};

/**
 * Pure announcement logic: returns the message to announce given the
 * previous and current inputs, or null when nothing meaningful changed.
 * Precedence when several change at once: mode → selection → source
 * state. Position/timestamp changes are not inputs here, so they never
 * produce an announcement.
 */
export function computeAnnouncement(
  previous: RadarAnnouncementInputs,
  current: RadarAnnouncementInputs
): string | null {
  if (current.mode !== previous.mode) {
    return `Radar mode: ${getRenderProfile(current.mode).label}`;
  }
  if (current.selectedId !== previous.selectedId) {
    return current.selectedId
      ? `Selected aircraft: ${current.selectedCallsign || current.selectedId}`
      : 'Selection cleared';
  }
  if (current.sourceState !== previous.sourceState) {
    return `Source state: ${current.sourceState}`;
  }
  return null;
}

/**
 * Produces a single polite aria-live message that updates ONLY on an
 * actual change to the render mode, the selected aircraft, or the source
 * state — never on ordinary re-renders, position updates, or timestamp
 * ticks. The initial mount is not announced. Callers render the returned
 * string into an `aria-live="polite"` region.
 */
export function useRadarAnnouncements({
  renderMode,
  selectedId,
  selectedCallsign,
  sourceState,
}: {
  renderMode: RadarRenderMode;
  selectedId: string | null;
  selectedCallsign: string | null;
  sourceState: SourceState;
}): string {
  const [announcement, setAnnouncement] = useState('');
  const prev = useRef<RadarAnnouncementInputs | null>(null);

  useEffect(() => {
    const current: RadarAnnouncementInputs = {
      mode: renderMode,
      selectedId,
      selectedCallsign,
      sourceState,
    };
    // Skip the first run so nothing is announced on initial load.
    if (prev.current === null) {
      prev.current = current;
      return;
    }
    const message = computeAnnouncement(prev.current, current);
    if (message !== null) setAnnouncement(message);
    prev.current = current;
  }, [renderMode, selectedId, selectedCallsign, sourceState]);

  return announcement;
}
