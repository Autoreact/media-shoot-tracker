import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShoot, ShootInProgressError } from '../useShoot';
import type {
  AryeoAppointment,
  ShootRoom,
  PropertyTier,
  ShootMode,
  PhotographerId,
} from '@/types';

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeAppointment(overrides: Partial<AryeoAppointment> = {}): AryeoAppointment {
  return {
    id: 'apt-a',
    orderNumber: '12345',
    status: 'CONFIRMED',
    address: '123 Main St',
    fullAddress: '123 Main St, Tallahassee, FL 32308',
    city: 'Tallahassee',
    state: 'FL',
    zip: '32308',
    startAt: '2026-04-07T14:00:00Z',
    agentName: 'Jane Agent',
    agentPhone: '555-0100',
    agentEmail: 'jane@example.com',
    brokerage: 'Acme Realty',
    services: ['Photos'],
    beds: 3,
    baths: 2,
    sqft: 1800,
    furnished: true,
    shooterIds: ['nick'],
    ...overrides,
  };
}

function makeRoom(id: string, name: string): ShootRoom {
  return {
    id,
    templateId: `tmpl-${id}`,
    name,
    category: 'main_living',
    expectedShots: 3,
    actualShots: 0,
    orientation: 'H',
    completed: false,
    skipped: false,
    notes: '',
    sortOrder: 0,
    isCustom: false,
    enabled: true,
  };
}

const DEFAULT_TIER: PropertyTier = 'three_two';
const DEFAULT_MODE: ShootMode = 'detail';
const DEFAULT_PHOTOGRAPHER: PhotographerId = 'nick';

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  window.localStorage.clear();
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('useShoot.startShoot() — guard logic', () => {
  it('starts a fresh shoot when none is active', () => {
    const { result } = renderHook(() => useShoot());

    expect(result.current.shoot).toBeNull();

    const apt = makeAppointment({ orderNumber: '10001', address: '10 Oak Ln' });
    const rooms = [makeRoom('r1', 'Living Room')];

    let returned: ReturnType<typeof result.current.startShoot> | undefined;
    act(() => {
      returned = result.current.startShoot(
        apt,
        DEFAULT_TIER,
        DEFAULT_MODE,
        DEFAULT_PHOTOGRAPHER,
        rooms
      );
    });

    expect(returned).toBeDefined();
    expect(returned!.status).toBe('active');
    expect(returned!.aryeoOrderNumber).toBe('10001');
    expect(returned!.address).toBe('10 Oak Ln');
    expect(returned!.rooms).toHaveLength(1);
    expect(result.current.shoot?.aryeoOrderNumber).toBe('10001');
  });

  it('returns the existing shoot (and preserves mutations) when the same order is started again', () => {
    const { result } = renderHook(() => useShoot());

    const apt = makeAppointment({ orderNumber: '20002', address: '20 Pine Rd' });
    const rooms = [makeRoom('r1', 'Kitchen'), makeRoom('r2', 'Bedroom')];

    // Seed a fresh shoot
    act(() => {
      result.current.startShoot(
        apt,
        DEFAULT_TIER,
        DEFAULT_MODE,
        DEFAULT_PHOTOGRAPHER,
        rooms
      );
    });

    // Mutate state to prove resume doesn't clobber
    act(() => {
      result.current.incrementShot('r1');
      result.current.incrementShot('r1');
      result.current.incrementShot('r2');
    });

    expect(result.current.shoot?.rooms.find((r) => r.id === 'r1')?.actualShots).toBe(2);
    expect(result.current.shoot?.rooms.find((r) => r.id === 'r2')?.actualShots).toBe(1);

    // Start the SAME order again — must resume, not reset
    let returned: ReturnType<typeof result.current.startShoot> | undefined;
    act(() => {
      returned = result.current.startShoot(
        apt,
        DEFAULT_TIER,
        DEFAULT_MODE,
        DEFAULT_PHOTOGRAPHER,
        [makeRoom('r3', 'Fresh Room From Reset')] // these rooms must be ignored
      );
    });

    expect(returned).toBeDefined();
    expect(returned!.aryeoOrderNumber).toBe('20002');
    // Mutations preserved — not a fresh shoot
    expect(returned!.rooms.find((r) => r.id === 'r1')?.actualShots).toBe(2);
    expect(returned!.rooms.find((r) => r.id === 'r2')?.actualShots).toBe(1);
    // The "fresh" rooms from the second call must NOT have replaced the existing list
    expect(returned!.rooms.find((r) => r.id === 'r3')).toBeUndefined();

    // State in the hook is still the same shoot
    expect(result.current.shoot?.aryeoOrderNumber).toBe('20002');
    expect(result.current.shoot?.rooms.find((r) => r.id === 'r1')?.actualShots).toBe(2);
  });

  it('throws ShootInProgressError when a different order is started while one is active', () => {
    const { result } = renderHook(() => useShoot());

    const aptA = makeAppointment({ orderNumber: '30003', address: '30 Maple Dr' });
    const aptB = makeAppointment({
      id: 'apt-b',
      orderNumber: '30004',
      address: '40 Elm St',
    });

    act(() => {
      result.current.startShoot(
        aptA,
        DEFAULT_TIER,
        DEFAULT_MODE,
        DEFAULT_PHOTOGRAPHER,
        [makeRoom('r1', 'Living')]
      );
    });

    expect(result.current.shoot?.aryeoOrderNumber).toBe('30003');

    // Attempt to start a different order — must throw, must NOT clobber state
    let caught: unknown;
    act(() => {
      try {
        result.current.startShoot(
          aptB,
          DEFAULT_TIER,
          DEFAULT_MODE,
          DEFAULT_PHOTOGRAPHER,
          [makeRoom('r9', 'Other')]
        );
      } catch (err) {
        caught = err;
      }
    });

    expect(caught).toBeInstanceOf(ShootInProgressError);
    const err = caught as ShootInProgressError;
    expect(err.address).toBe('30 Maple Dr');
    expect(err.orderNumber).toBe('30003');

    // Existing shoot is untouched
    expect(result.current.shoot?.aryeoOrderNumber).toBe('30003');
    expect(result.current.shoot?.address).toBe('30 Maple Dr');
  });
});
