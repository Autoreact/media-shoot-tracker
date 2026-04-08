import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PATCH } from '../stop/route';
import type { NextRequest } from 'next/server';

function makeRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

const ORIGINAL_TOKEN = process.env.TOGGL_API_TOKEN;
const ORIGINAL_WORKSPACE = process.env.TOGGL_WORKSPACE_ID;

describe('PATCH /api/toggl/stop — returns {duration, start, stop}', () => {
  beforeEach(() => {
    process.env.TOGGL_API_TOKEN = 'fake-token';
    process.env.TOGGL_WORKSPACE_ID = '12345';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.TOGGL_API_TOKEN = ORIGINAL_TOKEN;
    process.env.TOGGL_WORKSPACE_ID = ORIGINAL_WORKSPACE;
  });

  it('returns duration, start, and stop from the Toggl response body', async () => {
    const togglResponse = {
      id: 42,
      duration: 7200,
      start: '2026-04-07T12:00:00+00:00',
      stop: '2026-04-07T14:00:00+00:00',
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(togglResponse), { status: 200 })
    );

    const res = await PATCH(makeRequest({ timeEntryId: 42 }));
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.duration).toBe(7200);
    expect(data.start).toBe('2026-04-07T12:00:00+00:00');
    expect(data.stop).toBe('2026-04-07T14:00:00+00:00');
  });

  it('400s when timeEntryId is missing', async () => {
    const res = await PATCH(makeRequest({}));
    expect(res.status).toBe(400);
  });
});
