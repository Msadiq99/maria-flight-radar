import { describe, expect, it } from 'vitest';
import {
  computeAnnouncement,
  type RadarAnnouncementInputs,
} from './useRadarAnnouncements';

const base: RadarAnnouncementInputs = {
  mode: 'tactical',
  selectedId: 'AC1',
  selectedCallsign: 'MRA1',
  sourceState: 'DEMO',
};

describe('computeAnnouncement (change-only)', () => {
  it('announces nothing when nothing changes', () => {
    expect(computeAnnouncement(base, base)).toBeNull();
  });

  it('does not announce on position/timestamp-style re-renders (identical inputs)', () => {
    expect(computeAnnouncement(base, { ...base })).toBeNull();
  });

  it('announces a mode change with the mode label', () => {
    expect(computeAnnouncement(base, { ...base, mode: 'classic' })).toBe(
      'Radar mode: Classic Radar'
    );
  });

  it('announces a selection change with the callsign', () => {
    expect(
      computeAnnouncement(base, {
        ...base,
        selectedId: 'AC2',
        selectedCallsign: 'MRA2',
      })
    ).toBe('Selected aircraft: MRA2');
  });

  it('falls back to the id when there is no callsign', () => {
    expect(
      computeAnnouncement(base, {
        ...base,
        selectedId: 'AC9',
        selectedCallsign: null,
      })
    ).toBe('Selected aircraft: AC9');
  });

  it('announces when selection is cleared', () => {
    expect(
      computeAnnouncement(base, {
        ...base,
        selectedId: null,
        selectedCallsign: null,
      })
    ).toBe('Selection cleared');
  });

  it('announces a real source-state transition only', () => {
    expect(computeAnnouncement(base, { ...base, sourceState: 'OFFLINE' })).toBe(
      'Source state: OFFLINE'
    );
  });

  it('prioritizes a mode change over a simultaneous selection change', () => {
    expect(
      computeAnnouncement(base, {
        ...base,
        mode: 'presentation',
        selectedId: 'AC2',
        selectedCallsign: 'MRA2',
      })
    ).toBe('Radar mode: Presentation');
  });
});
