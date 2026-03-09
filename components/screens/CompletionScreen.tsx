'use client';

import { useState, useEffect, useRef } from 'react';
import { ShootState } from '@/types';
import { useShoot } from '@/lib/hooks/useShoot';
import { getTierInfo } from '@/lib/data/tier-info';
import { hapticComplete } from '@/lib/utils/haptics';
import {
  ChevronLeftIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  FolderIcon,
  CameraIcon,
  MapIcon,
  ArrowUpTrayIcon,
  XMarkIcon,
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

  // Duration editing
  const [editingDuration, setEditingDuration] = useState(false);
  const durationMinutes = Math.round(shoot.timerSeconds / 60);

  const adjustDuration = (delta: number): void => {
    const newSeconds = Math.max(0, shoot.timerSeconds + delta * 60);
    shootHook.updateTimerSeconds(newSeconds);
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
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center text-neutral-600"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-neutral-950">Shoot Complete</h2>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-3 pb-24">
        {/* Success Banner */}
        <div className="bg-success-50 rounded-xl p-4 border border-success-500/20 text-center">
          <CheckCircleIcon className="w-10 h-10 text-success-500 mx-auto mb-2" />
          <h3 className="text-base font-bold text-success-900">
            Shoot Complete!
          </h3>
          <p className="text-xs text-success-700 mt-0.5">
            {shoot.address} · {tierInfo.displayName}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl p-3 border border-neutral-200 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Shots
            </p>
            <p className="text-2xl font-black text-neutral-950">{totals.actualTotal}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-neutral-200 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Target
            </p>
            <p className="text-2xl font-black text-neutral-950">{shoot.target}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-neutral-200 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
              Variance
            </p>
            <p
              className={`text-2xl font-black ${
                totals.variance >= 0 ? 'text-success-600' : 'text-error-500'
              }`}
            >
              {totals.variance >= 0 ? '+' : ''}
              {totals.variance}
            </p>
          </div>
        </div>

        {/* Duration Editor */}
        <div className="bg-white rounded-xl p-3 border border-neutral-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-neutral-700">Duration</p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => adjustDuration(-5)}
                className="w-7 h-7 rounded bg-neutral-100 flex items-center justify-center"
              >
                <ChevronDownIcon className="w-3 h-3 text-neutral-600" />
              </button>
              <span className="text-lg font-bold text-neutral-950 min-w-[4rem] text-center tabular-nums">
                {formatDuration(shoot.timerSeconds)}
              </span>
              <button
                onClick={() => adjustDuration(5)}
                className="w-7 h-7 rounded bg-neutral-100 flex items-center justify-center"
              >
                <ChevronUpIcon className="w-3 h-3 text-neutral-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Skipped Rooms Warning */}
        {hasSkipped && (
          <div className="bg-warning-50 rounded-xl p-3 border border-warning-500/20">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-warning-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-warning-800">
                  {skippedRooms.length} room{skippedRooms.length !== 1 ? 's' : ''} incomplete
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {skippedRooms.map((r) => (
                    <span
                      key={r.id}
                      className="px-1.5 py-0.5 bg-warning-100 text-warning-700 text-[10px] font-medium rounded"
                    >
                      {r.name}
                    </span>
                  ))}
                </div>
                <button
                  onClick={onBack}
                  className="text-xs font-semibold text-primary-600 mt-1.5"
                >
                  Go back and shoot these →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dropbox Folder */}
        <div className="bg-white rounded-xl p-3 border border-neutral-200">
          <div className="flex items-center gap-2 mb-1">
            <FolderIcon className="w-4 h-4 text-primary-500" />
            <span className="text-xs font-semibold text-neutral-700">
              Dropbox Auto HDR
            </span>
            <span className="px-1.5 py-0.5 bg-success-50 text-success-700 text-[9px] font-medium rounded">
              auto-created
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 font-mono break-all">
            {shoot.dropboxFolderPath}
          </p>
        </div>

        {/* File Uploads — Drone + Lot Lines */}
        <div className="bg-white rounded-xl p-3 border border-neutral-200">
          <p className="text-xs font-semibold text-neutral-700 mb-2">Attachments</p>

          {/* Drone Photos */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <CameraIcon className="w-4 h-4 text-primary-500" />
                <span className="text-xs text-neutral-600">Drone Photos</span>
              </div>
              <button
                onClick={() => droneInputRef.current?.click()}
                disabled={uploading === 'drone'}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-50 text-primary-600 text-[10px] font-semibold"
              >
                <ArrowUpTrayIcon className="w-3 h-3" />
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
              <div className="flex flex-wrap gap-1">
                {droneFiles.map((f, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 bg-primary-50 text-primary-700 text-[10px] font-medium rounded flex items-center gap-1"
                  >
                    {f.name}
                    <button
                      onClick={() =>
                        setDroneFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <XMarkIcon className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Lot Lines */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <MapIcon className="w-4 h-4 text-warning-500" />
                <span className="text-xs text-neutral-600">Lot Lines</span>
              </div>
              <button
                onClick={() => lotLineInputRef.current?.click()}
                disabled={uploading === 'lot_line'}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-warning-50 text-warning-600 text-[10px] font-semibold"
              >
                <ArrowUpTrayIcon className="w-3 h-3" />
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
              <div className="flex flex-wrap gap-1">
                {lotLineFiles.map((f, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 bg-warning-50 text-warning-700 text-[10px] font-medium rounded flex items-center gap-1"
                  >
                    {f.name}
                    <button
                      onClick={() =>
                        setLotLineFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                    >
                      <XMarkIcon className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Notes */}
        <div className="bg-white rounded-xl p-3 border border-neutral-200">
          <p className="text-xs font-semibold text-neutral-700 mb-1.5">Notes</p>
          <textarea
            value={shoot.globalNotes}
            onChange={(e) => shootHook.updateGlobalNotes(e.target.value)}
            placeholder="Add notes for this shoot..."
            className="w-full p-2 text-xs border border-neutral-200 rounded-lg resize-none h-20 focus:outline-none focus:border-primary-400"
          />
        </div>

        {/* Room notes summary */}
        {shoot.rooms.some((r) => r.notes) && (
          <div className="bg-white rounded-xl p-3 border border-neutral-200">
            <p className="text-xs font-semibold text-neutral-700 mb-1.5">
              Room Notes
            </p>
            <div className="space-y-1">
              {shoot.rooms
                .filter((r) => r.notes)
                .map((r) => (
                  <div key={r.id} className="text-xs">
                    <span className="font-semibold text-neutral-700">
                      {r.name}:
                    </span>{' '}
                    <span className="text-neutral-500">{r.notes}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-100">
        <div className="max-w-md mx-auto space-y-2">
          <button
            onClick={handleSendEmail}
            disabled={emailSent || sending}
            className={`w-full py-4 rounded-xl text-base font-semibold transition-colors ${
              emailSent
                ? 'bg-success-500 text-white'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }`}
          >
            {emailSent
              ? '✓ Email Sent'
              : sending
              ? 'Sending...'
              : 'Save & Email Summary'}
          </button>
          <button
            onClick={onNewShoot}
            className="w-full py-3 rounded-xl text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors"
          >
            Start New Shoot
          </button>
        </div>
      </div>
    </div>
  );
}
