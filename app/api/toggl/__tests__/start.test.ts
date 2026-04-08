import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { POST } from '../start/route';
import type { NextRequest } from 'next/server';

/**
 * Minimal NextRequest stub — the route only calls `await request.json()`.
 */
function makeRequest(body: unknown): NextRequest {
  return {
    json: async () => body,
  } as unknown as NextRequest;
}

const ORIGINAL_TOGGL_TOKEN = process.env.TOGGL_API_TOKEN;
const ORIGINAL_TOGGL_WORKSPACE = process.env.TOGGL_WORKSPACE_ID;

describe('POST /api/toggl/start — photographer → tags', () => {
  beforeEach(() => {
    process.env.TOGGL_API_TOKEN = 'fake-token';
    process.env.TOGGL_WORKSPACE_ID = '12345';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.TOGGL_API_TOKEN = ORIGINAL_TOGGL_TOKEN;
    process.env.TOGGL_WORKSPACE_ID = ORIGINAL_TOGGL_WORKSPACE;
  });

  it('forwards tags:["Jared"] to Toggl when photographer:"Jared" is in the body', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ id: 999, start: '2026-04-07T12:00:00Z' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    const res = await POST(
      makeRequest({
        description: 'Order #12345 — 10 Oak Ln',
        photographer: 'Jared',
      })
    );

    expect(res.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(String(url)).toContain('/workspaces/12345/time_entries');

    const outboundBody = JSON.parse((init as RequestInit).body as string);
    expect(outboundBody.tags).toEqual(['Jared']);
    expect(outboundBody.description).toBe('Order #12345 — 10 Oak Ln');
  });

  it('forwards tags:["Nick"] for photographer:"Nick"', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 1 }), { status: 200 })
      );

    await POST(makeRequest({ description: 'x', photographer: 'Nick' }));

    const [, init] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.tags).toEqual(['Nick']);
  });

  it('returns skipped when Toggl is not configured', async () => {
    delete process.env.TOGGL_API_TOKEN;
    const res = await POST(
      makeRequest({ description: 'x', photographer: 'Jared' })
    );
    const data = await res.json();
    expect(data.skipped).toBe(true);
  });

  it('sends empty tags when photographer is missing (explicit — no surprises)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ id: 2 }), { status: 200 })
      );

    await POST(makeRequest({ description: 'x' }));

    const [, init] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.tags).toEqual([]);
  });
});
