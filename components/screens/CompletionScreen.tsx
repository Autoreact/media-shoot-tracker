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
  const [droneFiles, setDroneFiles] = useState<
    { id: string; name: string; url: string; thumbnailUrl?: string }[]
  >([]);
  const [lotLineFiles, setLotLineFiles] = useState<
    { id: string; name: string; url: string; thumbnailUrl?: string }[]
  >([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [dropboxCreating, setDropboxCreating] = useState(false);
  const [dropboxError, setDropboxError] = useState<string | null>(null);
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

  // Revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      [...droneFiles, ...lotLineFiles].forEach((f) => {
        if (f.thumbnailUrl?.startsWith('blob:'))
          URL.revokeObjectURL(f.thumbnailUrl);
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const skippedRooms = shoot.rooms.filter(
    (r) => r.skipped || (!r.completed && r.enabled)
  );
  const hasSkipped = skippedRooms.length > 0;

  const durationMinutes = Math.round(shoot.timerSeconds / 60);

  const handleDurationSave = (): void => {
    const val = parseInt(durationInput, 10);
    if (!Number.isNaN(val) && val >= 0) {
      const newSeconds = val * 60;
      shootHook.updateTimerSeconds(newSeconds);
      // Sync updated duration to Toggl if we have an entry
      if (shoot.togglTimeEntryId) {
        fetch('/api/toggl/update', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeEntryId: shoot.togglTimeEntryId,
            duration: newSeconds,
          }),
        }).catch(() => {});
      }
    }
    setEditingDuration(false);
  };

  const handleSendEmail = async (): Promise<void> => {
    setSending(true);
    try {
      // Stop Toggl timer if still running
      if (shoot.togglTimeEntryId && shoot.timerRunning) {
        await fetch('/api/toggl/stop', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timeEntryId: shoot.togglTimeEntryId }),
        }).catch(() => {});
      }

      const res = await fetch(
        `/api/shoots/${shoot.aryeoOrderNumber}/email-summary`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shoot: {
              ...shoot,
              dropboxUrl,
            },
            totals,
            attachmentUrls: [
              ...droneFiles
                .filter((f) => f.url)
                .map((f) => ({ name: f.name, url: f.url, type: 'drone' })),
              ...lotLineFiles
                .filter((f) => f.url)
                .map((f) => ({ name: f.name, url: f.url, type: 'lot_line' })),
            ],
          }),
        }
      );
      if (res.ok) {
        setEmailSent(true);
      }
    } catch {
      // Silent fail — user can retry
    } finally {
      setSending(false);
    }
  };

  const MAX_FILES = 10;

  const handleFileUpload = async (
    files: FileList | null,
    type: 'drone' | 'lot_line'
  ): Promise<void> => {
    if (!files || files.length === 0) return;
    const currentFiles = type === 'drone' ? droneFiles : lotLineFiles;
    const remaining = MAX_FILES - currentFiles.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    // Assign unique IDs so reconciliation survives deletions
    const pending = toUpload.map((file) => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      url: '',
      thumbnailUrl: file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined,
    }));

    const setter = type === 'drone' ? setDroneFiles : setLotLineFiles;
    setter((prev) => [...prev, ...pending]);

    setUploading(type);
    setUploadProgress({ done: 0, total: toUpload.length });

    for (let i = 0; i < toUpload.length; i++) {
      const file = toUpload[i]!;
      const entryId = pending[i]!.id;
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);

        const res = await fetch(
          `/api/shoots/${shoot.aryeoOrderNumber}/upload`,
          { method: 'POST', body: formData }
        );

        if (res.ok) {
          const data = await res.json();
          setter((prev) =>
            prev.map((f) => (f.id === entryId ? { ...f, url: data.url } : f))
          );
        }
      } catch {
        // File shows as thumbnail, just won't have a remote URL
      }
      setUploadProgress({ done: i + 1, total: toUpload.length });
    }

    setUploading(null);
    setUploadProgress(null);
  };

  // Build Dropbox URL — /home/ path with encoded folder path
  const dropboxPath = shoot.dropboxFolderPath.replace(/\/$/, '');
  const dropboxUrl = `https://www.dropbox.com/home/${dropboxPath.split('/').map(encodeURIComponent).join('/')}`;

  // Retry creating Dropbox folder
  const handleCreateDropboxFolder = async (): Promise<void> => {
    setDropboxCreating(true);
    setDropboxError(null);
    try {
      // Extract address from the folder path (format: AutoHDR/{order} - {agent} - {address}/01-RAW-Photos)
      const folderName = shoot.dropboxFolderPath.split('/')[1] || '';
      const parts = folderName.split(' - ');
      const orderNumber = parts[0] || shoot.aryeoOrderNumber;
      const agentName = parts[1] || shoot.agentName;
      // Everything after the second " - " is the address
      const address = parts.slice(2).join(' - ') || shoot.address;

      const res = await fetch('/api/dropbox/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, agentName, address }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log('[Dropbox] Folder created:', data);
        setDropboxError(null);
      } else {
        const data = await res.json().catch(() => ({}));
        setDropboxError(data.error || `Failed (${res.status})`);
      }
    } catch {
      setDropboxError('Network error');
    } finally {
      setDropboxCreating(false);
    }
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
                backgroundColor: [
                  '#635BFF',
                  '#00D924',
                  '#FFBB00',
                  '#E57CD8',
                  '#DF1B41',
                ][i % 5],
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
          <h2 className="text-lg font-bold text-neutral-950 dark:text-white">
            Shoot Complete
          </h2>
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
            <p className="text-3xl font-black text-neutral-950 dark:text-white">
              {totals.actualTotal}
            </p>
          </div>
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
              Target
            </p>
            <p className="text-3xl font-black text-neutral-950 dark:text-white">
              {shoot.target}
            </p>
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
            <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
              Duration
            </p>
            {editingDuration ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={durationInput}
                  onChange={(e) => setDurationInput(e.target.value)}
                  onBlur={handleDurationSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDurationSave();
                  }}
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
                  {skippedRooms.length} room
                  {skippedRooms.length !== 1 ? 's' : ''} incomplete
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

        {/* Dropbox Folder — clickable link + retry */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <a
            href={dropboxUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block hover:opacity-80 transition-opacity"
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
          <button
            onClick={handleCreateDropboxFolder}
            disabled={dropboxCreating}
            className="mt-3 w-full py-2 rounded-lg bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-xs font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
          >
            {dropboxCreating ? 'Creating...' : 'Create Dropbox Folder'}
          </button>
          {dropboxError && (
            <p className="mt-1.5 text-xs text-error-500">{dropboxError}</p>
          )}
        </div>

        {/* File Uploads — Drone + Lot Lines with Thumbnail Grid */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">
            Attachments
          </p>

          {/* Upload progress bar */}
          {uploading && uploadProgress && (
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                <span>
                  Uploading{' '}
                  {uploading === 'drone' ? 'drone photos' : 'lot lines'}...
                </span>
                <span>
                  {uploadProgress.done}/{uploadProgress.total}
                </span>
              </div>
              <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{
                    width: `${(uploadProgress.done / uploadProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Drone Photos */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CameraIcon className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  Drone Photos
                </span>
                {droneFiles.length > 0 && (
                  <span className="text-[10px] font-bold text-primary-500 bg-primary-50 dark:bg-primary-900/30 px-1.5 py-0.5 rounded">
                    {droneFiles.length}/{MAX_FILES}
                  </span>
                )}
              </div>
              <button
                onClick={() => droneInputRef.current?.click()}
                disabled={
                  uploading === 'drone' || droneFiles.length >= MAX_FILES
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 text-sm font-semibold disabled:opacity-40"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                Upload
              </button>
              <input
                ref={droneInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFileUpload(e.target.files, 'drone');
                  e.target.value = '';
                }}
              />
            </div>
            {droneFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {droneFiles.map((f, i) => (
                  <div
                    key={i}
                    className="relative group aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700"
                  >
                    {f.thumbnailUrl ? (
                      <img
                        src={f.thumbnailUrl}
                        alt={f.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <CameraIcon className="w-6 h-6 text-neutral-400" />
                      </div>
                    )}
                    <div className="absolute top-1 right-1">
                      <CheckCircleIcon className="w-5 h-5 text-success-500 drop-shadow" />
                    </div>
                    <button
                      onClick={() =>
                        setDroneFiles((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="w-3 h-3 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                      <p className="text-[9px] text-white truncate">{f.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lot Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MapIcon className="w-5 h-5 text-warning-500" />
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
                  Lot Lines
                </span>
                {lotLineFiles.length > 0 && (
                  <span className="text-[10px] font-bold text-warning-600 bg-warning-50 dark:bg-warning-900/30 px-1.5 py-0.5 rounded">
                    {lotLineFiles.length}/{MAX_FILES}
                  </span>
                )}
              </div>
              <button
                onClick={() => lotLineInputRef.current?.click()}
                disabled={
                  uploading === 'lot_line' || lotLineFiles.length >= MAX_FILES
                }
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning-50 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 text-sm font-semibold disabled:opacity-40"
              >
                <ArrowUpTrayIcon className="w-4 h-4" />
                Upload
              </button>
              <input
                ref={lotLineInputRef}
                type="file"
                accept="image/*,.pdf"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleFileUpload(e.target.files, 'lot_line');
                  e.target.value = '';
                }}
              />
            </div>
            {lotLineFiles.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {lotLineFiles.map((f, i) => (
                  <div
                    key={i}
                    className="relative group aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700"
                  >
                    {f.thumbnailUrl ? (
                      <img
                        src={f.thumbnailUrl}
                        alt={f.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MapIcon className="w-6 h-6 text-neutral-400" />
                      </div>
                    )}
                    <div className="absolute top-1 right-1">
                      <CheckCircleIcon className="w-5 h-5 text-success-500 drop-shadow" />
                    </div>
                    <button
                      onClick={() =>
                        setLotLineFiles((prev) =>
                          prev.filter((_, j) => j !== i)
                        )
                      }
                      className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="w-3 h-3 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                      <p className="text-[9px] text-white truncate">{f.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Notes */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-200 dark:border-neutral-700">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Notes
          </p>
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
                    <span className="text-neutral-500 dark:text-neutral-400">
                      {r.notes}
                    </span>
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
