'use client';

import { useCallback, useRef } from 'react';
import { ShootState, ShootRoom } from '@/types';
import { supabase } from '@/lib/supabase';

/**
 * Syncs shoot state to Supabase in the background.
 * Offline-first: localStorage is source of truth, Supabase is backup.
 * Debounced to avoid hammering the DB on every shot increment.
 */
export function useShootSync() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncRef = useRef<string | null>(null);

  /** Save shoot session + rooms to Supabase */
  const saveToSupabase = useCallback(async (shoot: ShootState): Promise<void> => {
    try {
      // Upsert session (order number is unique key)
      const { data: session, error: sessionError } = await supabase
        .from('shoot_sessions')
        .upsert(
          {
            aryeo_order_number: shoot.aryeoOrderNumber,
            photographer_id: shoot.photographerId,
            address: shoot.address,
            city: shoot.city,
            state: 'FL',
            beds: shoot.beds,
            baths: shoot.baths,
            sqft: shoot.sqft,
            furnished: shoot.furnished,
            agent_name: shoot.agentName,
            agent_phone: shoot.agentPhone,
            agent_email: shoot.agentEmail,
            brokerage: shoot.brokerage,
            tier: shoot.tier,
            mode: shoot.mode,
            target_shots: shoot.target,
            services: shoot.services,
            actual_shots: shoot.rooms.reduce((sum, r) => sum + r.actualShots, 0),
            quick_count_total: shoot.quickCountTotal,
            timer_seconds: shoot.timerSeconds,
            start_time: shoot.startTime,
            end_time: shoot.endTime,
            global_notes: shoot.globalNotes,
            dropbox_folder_path: shoot.dropboxFolderPath,
            status: shoot.status,
            started_at: shoot.startedAt,
            completed_at: shoot.completedAt,
          },
          { onConflict: 'aryeo_order_number' }
        )
        .select('id')
        .single();

      if (sessionError) {
        console.error('[Sync] Session upsert error:', sessionError);
        return;
      }

      if (!session) return;

      // Delete existing rooms and re-insert (simpler than diffing)
      await supabase
        .from('shoot_rooms')
        .delete()
        .eq('session_id', session.id);

      const roomRows = shoot.rooms.map((room: ShootRoom, index: number) => ({
        session_id: session.id,
        template_id: room.templateId,
        name: room.name,
        category: room.category,
        orientation: room.orientation,
        expected_shots: room.expectedShots,
        actual_shots: room.actualShots,
        completed: room.completed,
        skipped: room.skipped,
        enabled: room.enabled,
        is_custom: room.isCustom,
        notes: room.notes,
        sort_order: index,
      }));

      if (roomRows.length > 0) {
        const { error: roomsError } = await supabase
          .from('shoot_rooms')
          .insert(roomRows);

        if (roomsError) {
          console.error('[Sync] Rooms insert error:', roomsError);
        }
      }

      lastSyncRef.current = new Date().toISOString();
    } catch (err) {
      console.error('[Sync] Error:', err);
    }
  }, []);

  /** Debounced sync — waits 2s after last change before syncing */
  const syncShoot = useCallback(
    (shoot: ShootState | null): void => {
      if (!shoot) return;

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        saveToSupabase(shoot);
      }, 2000);
    },
    [saveToSupabase]
  );

  /** Immediate sync — use for shoot start and completion */
  const syncNow = useCallback(
    async (shoot: ShootState): Promise<void> => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      await saveToSupabase(shoot);
    },
    [saveToSupabase]
  );

  return {
    syncShoot,
    syncNow,
    lastSynced: lastSyncRef.current,
  };
}
