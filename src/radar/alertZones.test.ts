import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ALERT_ZONES,
  classifyAlertZone,
  sanitizeAlertZones,
  validateAlertZones,
} from './alertZones';

describe('alert zones', () => {
  it('classifies exact threshold boundaries', () => {
    expect(classifyAlertZone(5, DEFAULT_ALERT_ZONES)).toBe('critical');
    expect(classifyAlertZone(15, DEFAULT_ALERT_ZONES)).toBe('warning');
    expect(classifyAlertZone(30, DEFAULT_ALERT_ZONES)).toBe('advisory');
    expect(classifyAlertZone(30.1, DEFAULT_ALERT_ZONES)).toBe('normal');
  });

  it('classifies normal, advisory, warning, and critical zones', () => {
    expect(classifyAlertZone(2, DEFAULT_ALERT_ZONES)).toBe('critical');
    expect(classifyAlertZone(10, DEFAULT_ALERT_ZONES)).toBe('warning');
    expect(classifyAlertZone(20, DEFAULT_ALERT_ZONES)).toBe('advisory');
    expect(classifyAlertZone(40, DEFAULT_ALERT_ZONES)).toBe('normal');
  });

  it('rejects invalid threshold order', () => {
    expect(validateAlertZones({ criticalKm: 0, warningKm: 15, advisoryKm: 30 }, 50)).toMatch(
      /greater/
    );
    expect(validateAlertZones({ criticalKm: 15, warningKm: 5, advisoryKm: 30 }, 50)).toMatch(
      /Critical/
    );
    expect(validateAlertZones({ criticalKm: 5, warningKm: 30, advisoryKm: 15 }, 50)).toMatch(
      /Warning/
    );
  });

  it('rejects advisory threshold larger than active range', () => {
    expect(validateAlertZones(DEFAULT_ALERT_ZONES, 25)).toMatch(/active radar range/);
  });

  it('resets invalid stored values to defaults', () => {
    expect(sanitizeAlertZones({ criticalKm: 10, warningKm: 5, advisoryKm: 30 }, 50)).toEqual(
      DEFAULT_ALERT_ZONES
    );
  });
});
