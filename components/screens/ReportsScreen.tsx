'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShootState, PHOTOGRAPHERS, PhotographerId } from '@/types';
import { getTierInfo } from '@/lib/data/tier-info';
import {
  ChevronLeftIcon,
  ChartBarIcon,
  ClockIcon,
  CameraIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface Props {
  onBack: () => void;
}

interface ShootHistory {
  shoots: ShootState[];
  loading: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getShooterInfo(id: PhotographerId) {
  return PHOTOGRAPHERS.find((p) => p.id === id);
}

export default function ReportsScreen({ onBack }: Props): React.ReactElement {
  const [history, setHistory] = useState<ShootHistory>({
    shoots: [],
    loading: true,
  });
  const [filter, setFilter] = useState<PhotographerId | 'all'>('all');

  // Load shoot history from localStorage
  const loadHistory = useCallback((): void => {
    try {
      const stored = localStorage.getItem('v2-shoot-history');
      const shoots: ShootState[] = stored ? JSON.parse(stored) : [];
      // Also check if there's a current active shoot that's completed
      const active = localStorage.getItem('v2-active-shoot');
      if (active) {
        const activeShoot: ShootState = JSON.parse(active);
        if (activeShoot.status === 'completed') {
          const exists = shoots.find(
            (s) => s.aryeoOrderNumber === activeShoot.aryeoOrderNumber
          );
          if (!exists) {
            shoots.unshift(activeShoot);
            localStorage.setItem('v2-shoot-history', JSON.stringify(shoots));
          }
        }
      }
      // Sort by date, newest first
      shoots.sort((a, b) => {
        const da = a.startedAt || a.completedAt || '';
        const db = b.startedAt || b.completedAt || '';
        return db.localeCompare(da);
      });
      setHistory({ shoots, loading: false });
    } catch {
      setHistory({ shoots: [], loading: false });
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const filtered =
    filter === 'all'
      ? history.shoots
      : history.shoots.filter((s) => s.photographerId === filter);

  // Stats
  const totalShoots = filtered.length;
  const totalShots = filtered.reduce((sum, s) => {
    const actual =
      s.mode === 'quick'
        ? s.quickCountTotal
        : s.rooms.reduce((rs, r) => rs + r.actualShots, 0);
    return sum + actual;
  }, 0);
  const avgShots = totalShoots > 0 ? Math.round(totalShots / totalShoots) : 0;
  const totalDuration = filtered.reduce((sum, s) => sum + s.timerSeconds, 0);
  const avgDuration =
    totalShoots > 0 ? Math.round(totalDuration / totalShoots) : 0;

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 px-4 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center text-neutral-600 dark:text-neutral-400"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-neutral-950 dark:text-white">
            Reports
          </h2>
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4">
        {/* Photographer Filter */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
              filter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
            }`}
          >
            All
          </button>
          {PHOTOGRAPHERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setFilter(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 ${
                filter === p.id
                  ? 'text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
              }`}
              style={filter === p.id ? { backgroundColor: p.color } : undefined}
            >
              <span
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] font-bold text-white"
                style={
                  filter !== p.id ? { backgroundColor: p.color } : { backgroundColor: 'rgba(255,255,255,0.3)' }
                }
              >
                {p.initials[0]}
              </span>
              {p.name}
            </button>
          ))}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-1">
              <CameraIcon className="w-4 h-4 text-primary-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Total Shoots
              </span>
            </div>
            <p className="text-2xl font-black text-neutral-950 dark:text-white">
              {totalShoots}
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-1">
              <ChartBarIcon className="w-4 h-4 text-success-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Avg Shots
              </span>
            </div>
            <p className="text-2xl font-black text-neutral-950 dark:text-white">
              {avgShots}
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-1">
              <ClockIcon className="w-4 h-4 text-warning-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Avg Duration
              </span>
            </div>
            <p className="text-2xl font-black text-neutral-950 dark:text-white">
              {formatDuration(avgDuration)}
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2 mb-1">
              <UserIcon className="w-4 h-4 text-toggl-pink" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Total Shots
              </span>
            </div>
            <p className="text-2xl font-black text-neutral-950 dark:text-white">
              {totalShots.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Shoot History */}
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
            Recent Shoots
          </h3>

          {history.loading ? (
            <div className="text-center py-8 text-neutral-400 text-sm">
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-neutral-400 text-sm">No shoots yet</p>
              <p className="text-neutral-300 dark:text-neutral-600 text-xs mt-1">
                Completed shoots will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((shoot) => {
                const actual =
                  shoot.mode === 'quick'
                    ? shoot.quickCountTotal
                    : shoot.rooms.reduce((s, r) => s + r.actualShots, 0);
                const variance = actual - shoot.target;
                const tierInfo = getTierInfo(shoot.tier);
                const shooter = getShooterInfo(shoot.photographerId);

                return (
                  <div
                    key={shoot.aryeoOrderNumber}
                    className="bg-white dark:bg-neutral-800 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700"
                  >
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-neutral-950 dark:text-white truncate">
                          {shoot.address || 'Manual Entry'}
                        </h4>
                        <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                          {shoot.startedAt ? formatDate(shoot.startedAt) : '—'} ·{' '}
                          {tierInfo.displayName}
                        </p>
                      </div>
                      {shooter && (
                        <span
                          className="ml-2 w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: shooter.color }}
                        >
                          {shooter.initials}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-neutral-600 dark:text-neutral-300">
                        <strong>{actual}</strong>/{shoot.target} shots
                      </span>
                      <span
                        className={`font-bold ${
                          variance >= 0
                            ? 'text-success-600'
                            : variance >= -5
                            ? 'text-warning-600'
                            : 'text-error-500'
                        }`}
                      >
                        {variance >= 0 ? '+' : ''}
                        {variance}
                      </span>
                      {shoot.timerSeconds > 0 && (
                        <span className="text-neutral-400">
                          {formatDuration(shoot.timerSeconds)}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400">
                        {shoot.mode === 'quick' ? 'Quick' : 'Detail'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
