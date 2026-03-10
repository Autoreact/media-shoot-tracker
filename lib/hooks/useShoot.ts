'use client';

import { useCallback } from 'react';
import {
  ShootState,
  ShootRoom,
  PropertyTier,
  ShootMode,
  PhotographerId,
  AryeoAppointment,
} from '@/types';
import { useLocalStorage } from './useLocalStorage';
import { getTierInfo } from '@/lib/data/tier-info';

const INITIAL_STATE: ShootState | null = null;

export function useShoot() {
  const [shoot, setShoot] = useLocalStorage<ShootState | null>(
    'v2-active-shoot',
    INITIAL_STATE
  );

  const startShoot = useCallback(
    (
      appointment: AryeoAppointment,
      tier: PropertyTier,
      mode: ShootMode,
      photographerId: PhotographerId,
      rooms: ShootRoom[]
    ): ShootState => {
      const tierInfo = getTierInfo(tier);
      const fullAddress = [appointment.address, appointment.city, `${appointment.state || 'FL'} ${appointment.zip || ''}`].filter(Boolean).join(', ').trim();
      const dropboxFolderPath = `AutoHDR/${appointment.orderNumber} - ${appointment.agentName} - ${fullAddress}/01-RAW-Photos/`;

      const newShoot: ShootState = {
        aryeoOrderNumber: appointment.orderNumber,
        address: appointment.address,
        city: appointment.city,
        tier,
        mode,
        photographerId,
        agentName: appointment.agentName,
        agentPhone: appointment.agentPhone,
        agentEmail: appointment.agentEmail,
        brokerage: appointment.brokerage,
        beds: appointment.beds ?? 0,
        baths: appointment.baths ?? 0,
        sqft: appointment.sqft,
        furnished: appointment.furnished,
        services: appointment.services,
        rooms,
        shots: 0,
        target: tierInfo.targetShots,
        quickCountTotal: 0,
        timerRunning: false,
        timerSeconds: 0,
        startTime: null,
        endTime: null,
        notes: {},
        globalNotes: '',
        dropboxFolderPath,
        status: 'active',
        startedAt: new Date().toISOString(),
        completedAt: null,
      };

      setShoot(newShoot);
      return newShoot;
    },
    [setShoot]
  );

  // Manual entry — no Aryeo appointment
  const startManualShoot = useCallback(
    (
      address: string,
      tier: PropertyTier,
      mode: ShootMode,
      photographerId: PhotographerId,
      rooms: ShootRoom[]
    ): ShootState => {
      const tierInfo = getTierInfo(tier);
      const orderNumber = `M-${Date.now()}`;
      const dropboxFolderPath = `AutoHDR/${orderNumber} - Manual - ${address}/01-RAW-Photos/`;

      const newShoot: ShootState = {
        aryeoOrderNumber: orderNumber,
        address,
        city: '',
        tier,
        mode,
        photographerId,
        agentName: '',
        agentPhone: '',
        agentEmail: '',
        brokerage: '',
        beds: 0,
        baths: 0,
        sqft: 0,
        furnished: false,
        services: [],
        rooms,
        shots: 0,
        target: tierInfo.targetShots,
        quickCountTotal: 0,
        timerRunning: false,
        timerSeconds: 0,
        startTime: null,
        endTime: null,
        notes: {},
        globalNotes: '',
        dropboxFolderPath,
        status: 'active',
        startedAt: new Date().toISOString(),
        completedAt: null,
      };

      setShoot(newShoot);
      return newShoot;
    },
    [setShoot]
  );

  // Room shot updates
  const updateActualShots = useCallback(
    (roomId: string, actual: number): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map((r) =>
            r.id === roomId ? { ...r, actualShots: Math.max(0, actual) } : r
          ),
        };
      });
    },
    [setShoot]
  );

  const incrementShot = useCallback(
    (roomId: string): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map((r) =>
            r.id === roomId ? { ...r, actualShots: r.actualShots + 1 } : r
          ),
        };
      });
    },
    [setShoot]
  );

  const decrementShot = useCallback(
    (roomId: string): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map((r) =>
            r.id === roomId
              ? { ...r, actualShots: Math.max(0, r.actualShots - 1) }
              : r
          ),
        };
      });
    },
    [setShoot]
  );

  const toggleRoomComplete = useCallback(
    (roomId: string): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map((r) =>
            r.id === roomId ? { ...r, completed: !r.completed } : r
          ),
        };
      });
    },
    [setShoot]
  );

  // Quick Count mode
  const incrementQuickCount = useCallback((): void => {
    setShoot((prev) => {
      if (!prev) return prev;
      return { ...prev, quickCountTotal: prev.quickCountTotal + 1 };
    });
  }, [setShoot]);

  const decrementQuickCount = useCallback((): void => {
    setShoot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        quickCountTotal: Math.max(0, prev.quickCountTotal - 1),
      };
    });
  }, [setShoot]);

  // Room chip toggle (Quick Count)
  const toggleRoomChipDone = useCallback(
    (roomId: string): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map((r) =>
            r.id === roomId ? { ...r, completed: !r.completed } : r
          ),
        };
      });
    },
    [setShoot]
  );

  // Mode switching
  const setMode = useCallback(
    (mode: ShootMode): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        // When switching from detail to quick: quickCountTotal = sum of room actuals
        if (mode === 'quick' && prev.mode === 'detail') {
          const total = prev.rooms.reduce((sum, r) => sum + r.actualShots, 0);
          return { ...prev, mode, quickCountTotal: total };
        }
        return { ...prev, mode };
      });
    },
    [setShoot]
  );

  // Timer
  const startTimer = useCallback((): void => {
    setShoot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        timerRunning: true,
        startTime: prev.startTime || new Date().toISOString(),
      };
    });
  }, [setShoot]);

  const stopTimer = useCallback((): void => {
    setShoot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        timerRunning: false,
        endTime: new Date().toISOString(),
      };
    });
  }, [setShoot]);

  const updateTimerSeconds = useCallback(
    (seconds: number): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        return { ...prev, timerSeconds: seconds };
      });
    },
    [setShoot]
  );

  const adjustStartTime = useCallback(
    (minutesDelta: number): void => {
      setShoot((prev) => {
        if (!prev || !prev.startTime) return prev;
        const d = new Date(prev.startTime);
        d.setMinutes(d.getMinutes() + minutesDelta);
        return { ...prev, startTime: d.toISOString() };
      });
    },
    [setShoot]
  );

  const adjustEndTime = useCallback(
    (minutesDelta: number): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        const d = new Date(prev.endTime || new Date().toISOString());
        d.setMinutes(d.getMinutes() + minutesDelta);
        return { ...prev, endTime: d.toISOString() };
      });
    },
    [setShoot]
  );

  // Notes
  const updateRoomNotes = useCallback(
    (roomId: string, notes: string): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          rooms: prev.rooms.map((r) =>
            r.id === roomId ? { ...r, notes } : r
          ),
        };
      });
    },
    [setShoot]
  );

  const updateGlobalNotes = useCallback(
    (notes: string): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        return { ...prev, globalNotes: notes };
      });
    },
    [setShoot]
  );

  // Add custom room
  const addCustomRoom = useCallback(
    (name: string, category: 'misc' | 'beds_baths' | 'main_living' | 'kitchen_dining' | 'exteriors' | 'twilights' = 'misc'): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        const newRoom: ShootRoom = {
          id: `custom-${Date.now()}`,
          templateId: '',
          name,
          category,
          expectedShots: 3,
          actualShots: 0,
          orientation: 'H',
          completed: false,
          skipped: false,
          notes: '',
          sortOrder: prev.rooms.length,
          isCustom: true,
          enabled: true,
        };
        return { ...prev, rooms: [...prev.rooms, newRoom] };
      });
    },
    [setShoot]
  );

  // Update target
  const updateTarget = useCallback(
    (target: number): void => {
      setShoot((prev) => {
        if (!prev) return prev;
        return { ...prev, target: Math.max(1, target) };
      });
    },
    [setShoot]
  );

  // Complete
  const completeShoot = useCallback((): void => {
    setShoot((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        status: 'completed',
        completedAt: new Date().toISOString(),
        timerRunning: false,
        endTime: prev.endTime || new Date().toISOString(),
      };
    });
  }, [setShoot]);

  const clearShoot = useCallback((): void => {
    setShoot(null);
  }, [setShoot]);

  // Computed totals
  const getTotals = useCallback(() => {
    if (!shoot) {
      return {
        expectedTotal: 0,
        actualTotal: 0,
        variance: 0,
        completedCount: 0,
        skippedCount: 0,
        totalCount: 0,
        progressPercent: 0,
      };
    }
    const enabledRooms = shoot.rooms.filter((r) => r.enabled && !r.skipped);
    const expectedTotal = enabledRooms.reduce(
      (sum, r) => sum + r.expectedShots,
      0
    );
    const actualTotal =
      shoot.mode === 'quick'
        ? shoot.quickCountTotal
        : enabledRooms.reduce((sum, r) => sum + r.actualShots, 0);
    const completedCount = enabledRooms.filter((r) => r.completed).length;
    const skippedCount = shoot.rooms.filter((r) => r.skipped).length;
    const totalCount = enabledRooms.length;
    const progressPercent =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      expectedTotal,
      actualTotal,
      variance: actualTotal - shoot.target,
      completedCount,
      skippedCount,
      totalCount,
      progressPercent,
    };
  }, [shoot]);

  return {
    shoot,
    startShoot,
    startManualShoot,
    updateActualShots,
    incrementShot,
    decrementShot,
    toggleRoomComplete,
    incrementQuickCount,
    decrementQuickCount,
    toggleRoomChipDone,
    setMode,
    addCustomRoom,
    updateTarget,
    startTimer,
    stopTimer,
    updateTimerSeconds,
    adjustStartTime,
    adjustEndTime,
    updateRoomNotes,
    updateGlobalNotes,
    completeShoot,
    clearShoot,
    getTotals,
  };
}
