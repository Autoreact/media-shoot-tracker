'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  AppScreen,
  AryeoAppointment,
  PropertyTier,
  ShootMode,
  PhotographerId,
  ShootRoom,
} from '@/types';
import { useShoot } from '@/lib/hooks/useShoot';
import { useShootSync } from '@/lib/hooks/useShootSync';
import { useSettings } from '@/lib/hooks/useSettings';
import { generateRoomList } from '@/lib/utils/generate-rooms';
import AppointmentsScreen from '@/components/screens/AppointmentsScreen';
import TierConfirmationScreen from '@/components/screens/TierConfirmationScreen';
import RoomSetupScreen from '@/components/screens/RoomSetupScreen';
import RoomTrackerScreen from '@/components/screens/RoomTrackerScreen';
import QuickCountScreen from '@/components/screens/QuickCountScreen';
import TimerScreen from '@/components/screens/TimerScreen';
import CompletionScreen from '@/components/screens/CompletionScreen';
import SettingsScreen from '@/components/screens/SettingsScreen';
import ReportsScreen from '@/components/screens/ReportsScreen';

export default function HomePage(): React.ReactElement {
  const [screen, setScreen] = useState<AppScreen>('appointments');
  const [selectedAppointment, setSelectedAppointment] =
    useState<AryeoAppointment | null>(null);
  const [selectedTier, setSelectedTier] = useState<PropertyTier>('three_two');
  const [selectedMode, setSelectedMode] = useState<ShootMode>('detail');
  const [setupRooms, setSetupRooms] = useState<ShootRoom[]>([]);

  const shootHook = useShoot();
  const { syncShoot, syncNow } = useShootSync();
  const { settings, update: updateSettings } = useSettings();
  const activeShoot = shootHook.shoot;

  // Resume active shoot on page load — route to the last-used in-shoot screen
  useEffect(() => {
    if (
      activeShoot &&
      activeShoot.status === 'active' &&
      screen === 'appointments'
    ) {
      const fallback: AppScreen =
        activeShoot.mode === 'detail' ? 'room_tracker' : 'quick_count';
      setScreen(activeShoot.currentScreen ?? fallback);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist currentScreen into the shoot payload on every in-shoot navigation,
  // so reloads restore the exact screen the photographer was on.
  useEffect(() => {
    if (!activeShoot || activeShoot.status !== 'active') return;
    if (screen === 'appointments' || screen === 'settings' || screen === 'reports') {
      return;
    }
    if (activeShoot.currentScreen !== screen) {
      shootHook.setCurrentScreen(screen);
    }
  }, [screen, activeShoot, shootHook]);

  // Background sync to Supabase on every state change
  useEffect(() => {
    if (activeShoot) {
      syncShoot(activeShoot);
    }
  }, [activeShoot, syncShoot]);

  // Background timer — keeps ticking even when not on Timer screen
  const bgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgSecondsRef = useRef(0);
  // Always sync ref from state, but reset to 0 when a fresh shoot starts
  if (activeShoot) {
    bgSecondsRef.current = activeShoot.timerSeconds;
  }

  useEffect(() => {
    if (activeShoot?.timerRunning && screen !== 'timer') {
      bgTimerRef.current = setInterval(() => {
        bgSecondsRef.current += 1;
        shootHook.updateTimerSeconds(bgSecondsRef.current);
      }, 1000);
    }
    return () => {
      if (bgTimerRef.current) {
        clearInterval(bgTimerRef.current);
        bgTimerRef.current = null;
      }
    };
  }, [activeShoot?.timerRunning, screen, shootHook]);

  const handleSelectAppointment = useCallback(
    (appointment: AryeoAppointment): void => {
      setSelectedAppointment(appointment);
      setScreen('tier_confirmation');
    },
    []
  );

  // Resume the in-progress shoot from the Appointments screen sticky banner
  // or from the "Resume" button in the conflict AlertDialog.
  const handleResumeActiveShoot = useCallback((): void => {
    if (!activeShoot || activeShoot.status !== 'active') return;
    const fallback: AppScreen =
      activeShoot.mode === 'detail' ? 'room_tracker' : 'quick_count';
    setScreen(activeShoot.currentScreen ?? fallback);
  }, [activeShoot]);

  // "End & Start New" from the conflict AlertDialog — clear the old shoot and
  // proceed into the normal new-shoot flow for the tapped appointment.
  const handleEndAndStartNew = useCallback(
    (appointment: AryeoAppointment): void => {
      shootHook.clearShoot();
      setSelectedAppointment(appointment);
      setScreen('tier_confirmation');
    },
    [shootHook]
  );

  const handleTierConfirmed = useCallback(
    (tier: PropertyTier, mode: ShootMode): void => {
      setSelectedTier(tier);
      setSelectedMode(mode);
      const rooms = generateRoomList(tier);
      setSetupRooms(rooms);
      setScreen('room_setup');
    },
    []
  );

  const handleRoomSetupComplete = useCallback(
    (rooms: ShootRoom[]): void => {
      if (!selectedAppointment) return;

      const photographerId: PhotographerId =
        selectedAppointment.shooterIds[0] || settings.defaultPhotographer;

      const newShoot = shootHook.startShoot(
        selectedAppointment,
        selectedTier,
        selectedMode,
        photographerId,
        rooms
      );

      // Timer auto-starts inside startShoot — just fire Toggl
      const photographerNames: Record<string, string> = {
        nick: 'Nick',
        jared: 'Jared',
        ben: 'Ben',
      };
      const pName = photographerNames[photographerId] || photographerId;
      fetch('/api/toggl/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `Order #${selectedAppointment.orderNumber} — ${selectedAppointment.address} — ${pName}`,
          tags: ['323media', selectedTier, photographerId],
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            if (data.id) shootHook.setTogglTimeEntryId(data.id);
          }
        })
        .catch(() => {});

      // Immediate sync on shoot start + trigger Dropbox folder creation
      syncNow(newShoot);
      // Use fullAddress from Aryeo (includes city/state/zip), fallback to constructing it
      const dropboxAddress =
        selectedAppointment.fullAddress ||
        [
          selectedAppointment.address,
          selectedAppointment.city,
          `${selectedAppointment.state || 'FL'} ${selectedAppointment.zip || ''}`,
        ]
          .filter(Boolean)
          .join(', ')
          .trim();
      fetch('/api/dropbox/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: selectedAppointment.orderNumber,
          agentName: selectedAppointment.agentName,
          address: dropboxAddress,
        }),
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            console.log('[Dropbox] Folder created:', data.dropboxUrl);
          } else {
            console.error('[Dropbox] Folder creation failed:', res.status);
          }
        })
        .catch((err) => console.error('[Dropbox] Network error:', err));

      setScreen(selectedMode === 'detail' ? 'room_tracker' : 'quick_count');
    },
    [
      selectedAppointment,
      selectedTier,
      selectedMode,
      shootHook,
      syncNow,
      settings.defaultPhotographer,
    ]
  );

  const handleCompleteShoot = useCallback((): void => {
    // Stop timer if still running
    if (activeShoot?.timerRunning) {
      shootHook.stopTimer();
    }
    // Stop Toggl entry if one exists
    if (activeShoot?.togglTimeEntryId) {
      fetch('/api/toggl/stop', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timeEntryId: activeShoot.togglTimeEntryId }),
      }).catch(() => {});
    }
    shootHook.completeShoot();
    // Save to shoot history for reports + mark as completed on appointments screen
    if (activeShoot) {
      try {
        const stored = localStorage.getItem('v2-shoot-history');
        const history = stored ? JSON.parse(stored) : [];
        const completed = {
          ...activeShoot,
          status: 'completed',
          completedAt: new Date().toISOString(),
        };
        // Deduplicate by order number
        const filtered = history.filter(
          (s: { aryeoOrderNumber: string }) =>
            s.aryeoOrderNumber !== activeShoot.aryeoOrderNumber
        );
        filtered.unshift(completed);
        localStorage.setItem('v2-shoot-history', JSON.stringify(filtered));

        // Auto-mark as completed on appointments screen
        const completedOrders = localStorage.getItem('v2-completed-orders');
        const orders: string[] = completedOrders
          ? JSON.parse(completedOrders)
          : [];
        if (!orders.includes(activeShoot.aryeoOrderNumber)) {
          orders.push(activeShoot.aryeoOrderNumber);
          localStorage.setItem('v2-completed-orders', JSON.stringify(orders));
        }
      } catch {
        // Silent fail
      }
    }
    setScreen('completion');
  }, [shootHook, activeShoot]);

  const handleNewShoot = useCallback(async (): Promise<void> => {
    // Ensure final state is persisted to Supabase before clearing
    if (activeShoot) {
      const completed = {
        ...activeShoot,
        status: 'completed' as const,
        completedAt: activeShoot.completedAt || new Date().toISOString(),
      };
      await syncNow(completed);
    }
    shootHook.clearShoot();
    setSelectedAppointment(null);
    setScreen('appointments');
  }, [shootHook, activeShoot, syncNow]);

  const goBack = useCallback((): void => {
    switch (screen) {
      case 'tier_confirmation':
        setScreen('appointments');
        break;
      case 'room_setup':
        setScreen('tier_confirmation');
        break;
      case 'room_tracker':
      case 'quick_count':
        setScreen('room_setup');
        break;
      case 'timer':
        setScreen(
          activeShoot?.mode === 'detail' ? 'room_tracker' : 'quick_count'
        );
        break;
      case 'completion':
        setScreen(
          activeShoot?.mode === 'detail' ? 'room_tracker' : 'quick_count'
        );
        break;
      case 'settings':
      case 'reports':
        setScreen('appointments');
        break;
      default:
        setScreen('appointments');
    }
  }, [screen, activeShoot]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0F0F1A]">
      <div className="max-w-md mx-auto">
        {screen === 'appointments' && (
          <AppointmentsScreen
            onSelectAppointment={handleSelectAppointment}
            onSettings={() => setScreen('settings')}
            onReports={() => setScreen('reports')}
            activeShoot={activeShoot}
            onResumeActiveShoot={handleResumeActiveShoot}
            onEndAndStartNew={handleEndAndStartNew}
          />
        )}

        {screen === 'tier_confirmation' && selectedAppointment && (
          <TierConfirmationScreen
            appointment={selectedAppointment}
            onConfirm={handleTierConfirmed}
            onBack={goBack}
          />
        )}

        {screen === 'room_setup' && (
          <RoomSetupScreen
            rooms={setupRooms}
            tier={selectedTier}
            onComplete={handleRoomSetupComplete}
            onBack={goBack}
            onUpdateRooms={setSetupRooms}
          />
        )}

        {screen === 'room_tracker' && activeShoot && (
          <RoomTrackerScreen
            shoot={activeShoot}
            shootHook={shootHook}
            onComplete={handleCompleteShoot}
            onTimer={() => setScreen('timer')}
            onSwitchMode={() => {
              shootHook.setMode('quick');
              setScreen('quick_count');
            }}
          />
        )}

        {screen === 'quick_count' && activeShoot && (
          <QuickCountScreen
            shoot={activeShoot}
            shootHook={shootHook}
            onComplete={handleCompleteShoot}
            onTimer={() => setScreen('timer')}
            onSwitchMode={() => {
              shootHook.setMode('detail');
              setScreen('room_tracker');
            }}
          />
        )}

        {screen === 'timer' && activeShoot && (
          <TimerScreen
            shoot={activeShoot}
            shootHook={shootHook}
            onBack={goBack}
          />
        )}

        {screen === 'completion' && activeShoot && (
          <CompletionScreen
            shoot={activeShoot}
            shootHook={shootHook}
            onNewShoot={handleNewShoot}
            onBack={goBack}
          />
        )}

        {screen === 'settings' && (
          <SettingsScreen
            settings={settings}
            onUpdate={updateSettings}
            onBack={goBack}
          />
        )}

        {screen === 'reports' && <ReportsScreen onBack={goBack} />}
      </div>
    </div>
  );
}
