'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  AppScreen,
  AryeoAppointment,
  PropertyTier,
  ShootMode,
  PhotographerId,
  ShootRoom,
} from '@/types';
import { useShoot } from '@/lib/hooks/useShoot';
import { generateRoomList } from '@/lib/utils/generate-rooms';
import AppointmentsScreen from '@/components/screens/AppointmentsScreen';
import TierConfirmationScreen from '@/components/screens/TierConfirmationScreen';
import RoomSetupScreen from '@/components/screens/RoomSetupScreen';
import RoomTrackerScreen from '@/components/screens/RoomTrackerScreen';
import QuickCountScreen from '@/components/screens/QuickCountScreen';
import TimerScreen from '@/components/screens/TimerScreen';
import CompletionScreen from '@/components/screens/CompletionScreen';

export default function HomePage(): React.ReactElement {
  const [screen, setScreen] = useState<AppScreen>('appointments');
  const [selectedAppointment, setSelectedAppointment] =
    useState<AryeoAppointment | null>(null);
  const [selectedTier, setSelectedTier] = useState<PropertyTier>('three_two');
  const [selectedMode, setSelectedMode] = useState<ShootMode>('detail');
  const [setupRooms, setSetupRooms] = useState<ShootRoom[]>([]);

  const shootHook = useShoot();
  const activeShoot = shootHook.shoot;

  // Resume active shoot on page load
  useEffect(() => {
    if (activeShoot && activeShoot.status === 'active' && screen === 'appointments') {
      setScreen(activeShoot.mode === 'detail' ? 'room_tracker' : 'quick_count');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        selectedAppointment.shooterIds[0] || 'nick';

      shootHook.startShoot(
        selectedAppointment,
        selectedTier,
        selectedMode,
        photographerId,
        rooms
      );

      setScreen(selectedMode === 'detail' ? 'room_tracker' : 'quick_count');
    },
    [selectedAppointment, selectedTier, selectedMode, shootHook]
  );

  const handleCompleteShoot = useCallback((): void => {
    shootHook.completeShoot();
    setScreen('completion');
  }, [shootHook]);

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
      default:
        setScreen('appointments');
    }
  }, [screen, activeShoot]);

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-md mx-auto">
        {screen === 'appointments' && (
          <AppointmentsScreen
            onSelectAppointment={handleSelectAppointment}
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
      </div>
    </div>
  );
}
