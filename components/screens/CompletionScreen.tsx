'use client';

import { useState, useEffect, useRef } from 'react';
import { ShootState } from '@/types';
import { useShoot } from '@/lib/hooks/useShoot';
import { getTierInfo } from '@/lib/data/tier-info';
import { hapticComplete } from '@/lib/utils/haptics';
import {
  ChevronLeftIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FolderIcon,
  CameraIcon,
  MapIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

interface Props {
  shoot: ShootState;
  shootHook: ReturnType<typeof useShoot>;
  onNewShoot: () => void;
  onBack: () => void;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function CompletionScreen({
  shoot,
  shootHook,
  onNewShoot,
  onBack,
}: Props): React.ReactElement {
  const [showConfetti, setShowConfetti] = useState(true);
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [droneFiles, setDroneFiles] = useState<{ name: string; url: string }[]>([]);
  const [lotLineFiles, setLotLineFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const droneInputRef = useRef<HTMLInputElement>(null);
  const lotLineInputRef = useRef<HTMLInputElement>(null);

  // Duration editing — click-to-type
  const [editingDuration, setEditingDuration] = useState(false);
  const [durationInput, setDurationInput] = useState('');

  const totals = shootHook.getTotals();
  const tierInfo = getTierInfo(shoot.tier);

  // Confetti + haptic on mount
  useEffect(() => {
    hapticComplete();
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const skippedRooms = shoot.rooms.filter((r) => r.skipped || (!r.completed && r.enabled));
  const hasSkipped = skippedRooms.length > 0;

  const durationMinutes = Math.round(shoot.timerSeconds / 60);

  const handleDurationSave = (): void => {
    const val = parseInt(durationInput);
    if (val && val >= 0) {
      shootHook.updateTimerSeconds(val * 60);
    }
    setEditingDuration(false);
  };

  const handleSendEmail = async (): Promise<void> => {
    setSending(true);
    try {
      const res = await fetch(`/api/shoots/${shoot.aryeoOrderNumber}/email-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shoot, totals }),
      });
      if (res.ok) {
        setEmailSent(true);
      }
    } catch {
      // Silent fail — user can retry
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (
    files: FileList | null,
    type: 'drone' | 'lot_line'
  ): Promise<void> => {
    if (!files || files.length === 0) return;
    setUploading(type);

    const uploaded: { name: string; url: string }[] = [];
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const res = await fetch(`/api/shoots/${shoot.aryeoOrderNumber}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          uploaded.push({ name: file.name, url: data.url });
        }
      } catch {
        // Skip failed files
      }
    }

    if (type === 'drone') {
      setDroneFiles((prev) => [...prev, ...uploaded]);
    } else {
      setLotLineFiles((prev) => [...prev, ...uploaded]);
    }
    setUploading(null);
  };

  // Build Dropbox URL — use search to find the folder (works for both personal and team Dropbox)
  const folderName = shoot.dropboxFolderPath.split('/').filter(Boolean).slice(0, -1).join('/');
  const dropboxSearchUrl = `https://www.dropbox.com/search/personal?query=${encodeURIComponent(shoot.aryeoOrderNumber + ' ' + shoot.address)}`;

  return (
    <div className="flex flex-col min-h-screen animate-fade-in relative">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: ['#635BFF', '#00D924', '#FFBB00', '#E57CD8', '#DF1B41'][
                  i % 5
                ],
                animation: `confetti-fall ${1.5 + Math.random() * 2}s ease-in forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"
          >
            <ChevronLeftIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          </button>
          <h2 className="text-lg font-bold text-neutral-950 dark:text-white">Shoot Complete</h2>
        </div>
      </div>

      {/* Scrollable content — extra bottom padding so notes aren't hidden behind fixed buttons */}
      <div className="flex-1 px-4 py-3 space-y-4 pb-44 overflow-y-auto">
        {/* Success Banner */}
        <div className="bg-success-50 dark:bg-success-900/20 rounded-xl p-5 border border-success-500/20 text-center">
          <CheckCircleIcon className="w-12 h-12 text-success-500 mx-auto mb-2" />
          <h3 className="text-lg font-bold text-success-900 dark:text-success-400">
            Shoot Complete!
          </h3>
          <p className="text-sm text-success-700 dark:text-success-500 mt-0.5">
            {shoot.address} · {tierInfo.displayName}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Shots
            </p>
            <p className="text-3xl font-black text-neutral-950 dark:text-white">{totals.actualTotal}</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Target
            </p>
            <p className="text-3xl font-black text-neutral-950 dark:text-white">{shoot.target}</p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Variance
            </p>
            <p
              className={`text-3xl font-black ${
                totals.variance >= 0 ? 'text-success-600' : 'text-error-500'
              }`}
            >
              {totals.variance >= 0 ? '+' : ''}
              {totals.variance}
            </p>
          </div>
        </div>

        {/* Duration Editor — click to type */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Duration</p>
            {editingDuration ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  onBlur={handleDurationSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleDurationSave(); }}
                  autoFocus
                  className="w-20 text-center text-lg font-bold text-neutral-950 dark:text-white bg-neutral-100 dark:bg-neutral-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="min"
                />
                <span className="text-sm text-neutral-400">min</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  setDurationInput(String(durationMinutes));
                  setEditingDuration(true);
                }}
                className="text-2xl font-bold text-neutral-950 dark:text-white hover:text-primary-500 transition-colors tabular-nums"
              >
                {formatDuration(shoot.timerSeconds)}
              </button>
            )}
          </div>
        </div>

        {/* Skipped Rooms Warning */}
        {hasSkipped && (
          <div className="bg-warning-50 dark:bg-warning-900/20 rounded-xl p-4 border border-warning-500/20">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-warning-800 dark:text-warning-400">
                  {skippedRooms.length} room{skippedRooms.length !== 1 ? 's' : ''} incomplete
                </p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {skippedRooms.map((r) => (
                    <span
                      key={r.id}
                      className="px-2 py-0.5 bg-warning-100 dark:bg-warning-900/40 text-warning-700 dark:text-warning-400 text-[10px] font-medium rounded"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>
                <button
                  onClick={onBack}
                  className="text-sm font-semibold text-primary-600 dark:text-primary-400 mt-2"
                >
                  Go back and shoot these
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dropbox Folder — clickable link */}
        <a
          href={dropboxSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <FolderIcon className="w-5 h-5 text-primary-500" />
            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 flex-1">
              Dropbox Auto HDR
            </span>
            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-primary-500" />
          </div>
          <p className="text-xs text-primary-600 dark:text-primary-400 font-mono break-all underline underline-offset-2">
            {shoot.dropboxFolderPath}
          </p>
        </a>

        {/* File Uploads — Drone + Lot Lines */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Attachments</p>

          {/* Drone Photos */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CameraIcon className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Drone Photos</span>
              </div>
              <button
                onClick={() => droneInputRef.current?.click()}
                disabled={uploading === 'drone'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-semibold"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                {uploading === 'drone' ? 'Uploading...' : 'Upload'}
              </button>
              <input
                ref={droneInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, 'drone')}
              />
            </div>
            {droneFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {droneFiles.map((f, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-lg flex items-center gap-1"
                  >
                    {f.name}
                    <button
                      onClick={() =>
                        setDroneFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Lot Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-warning-500" />
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">Lot Lines</span>
              </div>
              <button
                onClick={() => lotLineInputRef.current?.click()}
                disabled={uploading === 'lot_line'}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning-50 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 text-sm font-semibold"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                {uploading === 'lot_line' ? 'Uploading...' : 'Upload'}
              </button>
              <input
                ref={lotLineInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files, 'lot_line')}
              />
            </div>
            {lotLineFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {lotLineFiles.map((f, i) => (
                  <span
                    key={i}
                    className="px-2 py-1 bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 text-xs font-medium rounded-lg flex items-center gap-1"
                  >
                    {f.name}
                    <button
                      onClick={() =>
                        setLotLineFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Notes */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Notes</p>
          <textarea
            value={shoot.globalNotes}
            onChange={(e) => shootHook.updateGlobalNotes(e.target.value)}
            placeholder="Add notes for this shoot..."
            className="w-full p-3 text-sm border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white rounded-xl resize-none h-24 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400"
          />
        </div>

        {/* Room notes summary */}
        {shoot.rooms.some((r) => r.notes) && (
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Room Notes
            </p>
            <div className="space-y-1.5">
              {shoot.rooms
                .filter((r) => r.notes)
                .map((r) => (
                  <div key={r.id} className="text-sm">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {r.name}:
                    </span>{' '}
                    <span className="text-neutral-500 dark:text-neutral-400">{r.notes}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions — bigger buttons with more spacing */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
        <div className="max-w-md mx-auto space-y-3">
          <button
            onClick={handleSendEmail}
            disabled={emailSent || sending}
            className={`w-full py-4 rounded-xl text-base font-bold transition-colors ${
              emailSent
                ? 'bg-success-500 text-white'
                : 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700'
            }`}
          >
            {emailSent
              ? 'Email Sent'
              : sending
              ? 'Sending...'
              : 'Save & Email Summary'}
          </button>
          <button
            onClick={onNewShoot}
            className="w-full py-4 rounded-xl text-base font-semibold text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            Start New Shoot
          </button>
        </div>
      </div>
    </div>
  );
}
