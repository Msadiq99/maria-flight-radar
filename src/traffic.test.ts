import { describe, expect, it } from 'vitest';
import { isSimulationFeed, snapshotToTrafficFeed } from './traffic';

describe('snapshotToTrafficFeed', () => {
  it('maps hybrid radar snapshots into the existing traffic feed shape', () => {
    const feed = snapshotToTrafficFeed(
      {
        activeSourceMode: 'hybrid',
        generatedAt: '2026-07-17T10:00:00.000Z',
        effectiveSources: ['local_adsb', 'opensky'],
        nextRefreshSeconds: 8,
        sourceHealth: [
          {
            source: 'local_adsb',
            enabled: true,
            status: 'healthy',
            aircraftCount: 1,
          },
        ],
        aircraft: [
          {
            id: 'abc123',
            icao24: 'abc123',
            callsign: 'MARIA1',
            registration: 'N123MA',
            aircraftType: 'A320',
            latitude: 24.7136,
            longitude: 46.6753,
            altitudeMeters: 12000,
            groundSpeedMps: 140,
            headingDegrees: 92,
            verticalRateMps: -1.5,
            source: 'local_adsb',
            receivedAt: '2026-07-17T09:59:58.000Z',
          },
        ],
      },
      'auto'
    );

    expect(feed.source).toBe('local_adsb');
    expect(feed.requested_source).toBe('hybrid');
    expect(feed.aircraft).toHaveLength(1);
    expect(feed.aircraft[0]).toMatchObject({
      id: 'abc123',
      callsign: 'MARIA1',
      tail_number: 'N123MA',
      aircraft_type: 'A320',
      velocity_kmph: 504,
      source: 'local_adsb',
    });
    expect(feed.sourceHealth?.[0].status).toBe('healthy');
    expect(feed.nextRefreshSeconds).toBe(8);
  });

  it('identifies simulator tracks delivered through the local ADS-B adapter', () => {
    const feed = snapshotToTrafficFeed(
      {
        generatedAt: '2026-07-18T10:00:00.000Z',
        effectiveSources: ['local_adsb'],
        aircraft: [
          {
            id: 'sim1',
            icao24: 'sim1',
            callsign: 'SIM1',
            latitude: 0,
            longitude: 0,
            altitudeMeters: 1000,
            groundSpeedMps: 100,
            headingDegrees: 90,
            verticalRateMps: 0,
            source: 'local_adsb',
            category: 'simulator',
            receivedAt: '2026-07-18T10:00:00.000Z',
          },
        ],
      },
      'auto'
    );

    expect(isSimulationFeed(feed)).toBe(true);
  });
});
