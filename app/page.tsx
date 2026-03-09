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

  // Resume active shoot on page load
  useEffect(() => {
    if (activeShoot && activeShoot.status === 'active' && screen === 'appointments') {
      setScreen(activeShoot.mode === 'detail' ? 'room_tracker' : 'quick_count');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Background sync to Supabase on every state change
  useEffect(() => {
    if (activeShoot) {
      syncShoot(activeShoot);
    }
  }, [activeShoot, syncShoot]);

  // Background timer — keeps ticking even when not on Timer screen
  const bgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgSecondsRef = useRef(activeShoot?.timerSeconds ?? 0);
  bgSecondsRef.current = activeShoot?.timerSeconds ?? 0;

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

      // Immediate sync on shoot start + trigger Dropbox folder creation
      syncNow(newShoot);
      fetch('/api/dropbox/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: selectedAppointment.orderNumber,
          agentName: selectedAppointment.agentName,
          address: selectedAppointment.address,
        }),
      }).catch(() => {}); // Fire and forget

      setScreen(selectedMode === 'detail' ? 'room_tracker' : 'quick_count');
    },
    [selectedAppointment, selectedTier, selectedMode, shootHook, syncNow, settings.defaultPhotographer]
  );

  const handleCompleteShoot = useCallback((): void => {
    shootHook.completeShoot();
    // Save to shoot history for reports
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
      } catch {
        // Silent fail
      }
    }
    setScreen('completion');
  }, [shootHook, activeShoot]);

  const handleNewShoot = useCallback((): void => {
    shootHook.clearShoot();
    setSelectedAppointment(null);
    setScreen('appointments');
  }, [shootHook]);

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
        setScreen(activeShoot?.mode === 'detail' ? 'room_tracker' : 'quick_count');
        break;
      case 'completion':
        setScreen(activeShoot?.mode === 'detail' ? 'room_tracker' : 'quick_count');
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

        {screen === 'reports' && (
          <ReportsScreen onBack={goBack} />
        )}
      </div>
    </div>
  );
}
