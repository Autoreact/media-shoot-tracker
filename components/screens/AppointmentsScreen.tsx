'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AryeoAppointment, PhotographerId, PHOTOGRAPHERS } from '@/types';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface Props {
  onSelectAppointment: (appointment: AryeoAppointment) => void;
  onSettings?: () => void;
  onReports?: () => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getShooterColor(id: PhotographerId): string {
  const p = PHOTOGRAPHERS.find((p) => p.id === id);
  return p?.color || '#635BFF';
}

function getShooterInfo(id: PhotographerId) {
  return PHOTOGRAPHERS.find((p) => p.id === id);
}

export default function AppointmentsScreen({ onSelectAppointment, onSettings, onReports }: Props): React.ReactElement {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<AryeoAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [shooterFilter, setShooterFilter] = useState<PhotographerId | 'all'>('all');
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);

  const fetchAppointments = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const dateStr = currentDate.toISOString().split('T')[0];
      const res = await fetch(`/api/appointments?date=${dateStr}`);
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
        setLastSynced(new Date());
      }
    } catch {
      // Use empty state on error — will show "no shoots" message
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // 5-minute refresh
  useEffect(() => {
    const interval = setInterval(fetchAppointments, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAppointments]);

  const navigateDate = (delta: number): void => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    setCurrentDate(d);
  };

  const isToday =
    currentDate.toDateString() === new Date().toDateString();

  const jumpToToday = (): void => setCurrentDate(new Date());

  // Date pills: show 5 days centered on current
  const datePills = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (i - 2));
    return d;
  });

  // Filter appointments
  const filtered =
    shooterFilter === 'all'
      ? appointments
      : appointments.filter((a) => a.shooterIds.includes(shooterFilter));

  const activeCount = filtered.filter((a) => a.status !== 'CANCELLED').length;

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white dark:bg-neutral-900 pb-2 px-4 pt-4">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">NR</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-950 dark:text-white">Shoots</h1>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onReports}
              className="w-8 h-8 flex items-center justify-center text-neutral-400 dark:text-neutral-500"
            >
              <ChartBarIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onSettings}
              className="w-8 h-8 flex items-center justify-center text-neutral-400 dark:text-neutral-500"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigateDate(-1)}
            className="w-8 h-8 flex items-center justify-center text-neutral-500 dark:text-neutral-400"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h2 className="text-sm font-bold text-neutral-950 dark:text-white">
              {formatDate(currentDate)}
            </h2>
            {!isToday && (
              <button
                onClick={jumpToToday}
                className="text-primary-600 font-semibold text-xs"
              >
                Jump to Today
              </button>
            )}
          </div>
          <button
            onClick={() => navigateDate(1)}
            className="w-8 h-8 flex items-center justify-center text-neutral-500 dark:text-neutral-400"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Date pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {datePills.map((d, i) => {
            const isSelected = d.toDateString() === currentDate.toDateString();
            const isTodayPill = d.toDateString() === new Date().toDateString();
            return (
              <button
                key={i}
                onClick={() => setCurrentDate(new Date(d))}
                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
                  isSelected
                    ? 'bg-neutral-100 dark:bg-neutral-800 border border-primary-600 text-primary-700 dark:text-primary-400 font-semibold'
                    : isTodayPill
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                {formatDateShort(d)}
              </button>
            );
          })}
        </div>

        {/* Shooter Filter */}
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setShooterFilter('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${
              shooterFilter === 'all'
                ? 'bg-primary-500 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            All
          </button>
          {PHOTOGRAPHERS.map((p) => (
            <button
              key={p.id}
              onClick={() => setShooterFilter(p.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 ${
                shooterFilter === p.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                style={{ backgroundColor: p.color }}
              >
                {p.initials[0]}
              </span>
              {p.name}
            </button>
          ))}
        </div>

        {/* Sync indicator */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 pb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-success-500" />
          Synced from Aryeo · {activeCount} shoot{activeCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Appointment List */}
      <div className="flex-1 px-4 pb-24 space-y-2">
        {loading ? (
          <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-sm">
            Loading appointments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 dark:text-neutral-500 text-sm">
            No shoots scheduled for this day
          </div>
        ) : (
          filtered.map((apt) => (
            <AppointmentCard
              key={apt.id}
              appointment={apt}
              onSelect={onSelectAppointment}
            />
          ))
        )}

        {/* Manual Entry */}
        <button
          onClick={() => setShowManualEntry(true)}
          className="w-full p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-600 rounded-xl text-neutral-500 dark:text-neutral-400 text-sm font-medium hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          Manual Entry
        </button>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <ManualEntryModal
          onSubmit={(apt) => {
            setShowManualEntry(false);
            onSelectAppointment(apt);
          }}
          onClose={() => setShowManualEntry(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Appointment Card Component
// ═══════════════════════════════════════════════════════════

function AppointmentCard({
  appointment,
  onSelect,
}: {
  appointment: AryeoAppointment;
  onSelect: (apt: AryeoAppointment) => void;
}): React.ReactElement {
  const isCancelled = appointment.status === 'CANCELLED';

  if (isCancelled) {
    return (
      <div
        className="p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 opacity-60"
      >
        <div className="flex items-start justify-between mb-1.5">
          <div>
            <p className="text-xs text-neutral-400">{formatTime(appointment.startAt)}</p>
            <h3 className="font-bold text-neutral-950 dark:text-white text-[15px] line-through">
              {appointment.address || 'No address'}
            </h3>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-error-100 text-error-500 rounded">
            Cancelled
          </span>
        </div>
        {appointment.shooterIds.length > 0 && (
          <div className="flex gap-1 mt-1.5 opacity-60">
            {appointment.shooterIds.map((sid) => {
              const info = getShooterInfo(sid);
              if (!info) return null;
              return (
                <span
                  key={sid}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-white"
                  style={{ backgroundColor: info.color }}
                >
                  {info.initials}
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(appointment)}
      className="w-full text-left p-3 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-primary-300 dark:hover:border-primary-600 hover:shadow-sm transition-all active:scale-[0.99]"
    >
      <div className="flex items-start justify-between mb-1">
        <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-lg">
          {formatTime(appointment.startAt)}
        </span>
        <div className="flex items-center gap-1">
          {appointment.shooterIds.map((sid) => {
            const info = getShooterInfo(sid);
            if (!info) return null;
            return (
              <span
                key={sid}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
                style={{ backgroundColor: info.color }}
              >
                <span
                  className="w-3 h-3 rounded-full bg-white/30 flex items-center justify-center text-[7px]"
                >
                  {info.initials[0]}
                </span>
                {info.name}
              </span>
            );
          })}
        </div>
      </div>

      {/* Services */}
      {appointment.services.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-1.5">
          {appointment.services.map((s) => (
            <span
              key={s}
              className="px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 text-[10px] font-medium rounded"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Address */}
      <h3 className="font-bold text-neutral-950 dark:text-white text-[17px] mb-1">
        {appointment.address || 'Address TBD'}
      </h3>

      {/* Property stats */}
      <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-2">
        <span>{appointment.beds} bed · {appointment.baths} bath</span>
        {appointment.sqft > 0 && (
          <>
            <span className="text-neutral-300">|</span>
            <span>{appointment.sqft.toLocaleString()} sqft</span>
          </>
        )}
        {!appointment.furnished && (
          <span className="px-1.5 py-0.5 bg-warning-50 text-warning-600 text-[10px] font-medium rounded border border-warning-100">
            Vacant
          </span>
        )}
      </div>

      {/* Agent contact row */}
      {appointment.agentName && (
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-600 flex items-center justify-center text-[9px] font-bold text-neutral-600 dark:text-neutral-200"
          >
            {getInitials(appointment.agentName)}
          </div>
          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 flex-1">
            {appointment.agentName}
          </span>
          {appointment.agentPhone && (
            <a
              href={`tel:${appointment.agentPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center"
            >
              <PhoneIcon className="w-4 h-4 text-success-600" />
            </a>
          )}
          {appointment.agentPhone && (
            <a
              href={`sms:${appointment.agentPhone}`}
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center"
            >
              <ChatBubbleLeftIcon className="w-4 h-4 text-primary-600" />
            </a>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
        <span>Order #{appointment.orderNumber}</span>
        <div className="flex items-center gap-1">
          <span className="font-medium text-primary-500">
            {appointment.beds}/{appointment.baths} tier
          </span>
          <ChevronRightIcon className="w-3 h-3 text-neutral-400" />
        </div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// Manual Entry Modal
// ═══════════════════════════════════════════════════════════

function ManualEntryModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (apt: AryeoAppointment) => void;
  onClose: () => void;
}): React.ReactElement {
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Tallahassee');
  const [beds, setBeds] = useState('3');
  const [baths, setBaths] = useState('2');
  const [sqft, setSqft] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [furnished, setFurnished] = useState(true);
  const [services, setServices] = useState<string[]>(['Photos']);
  const addressRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    addressRef.current?.focus();
  }, []);

  const serviceOptions = ['Photos', 'Drone', '3D Tour', 'Floor Plans', 'Video'];

  const toggleService = (s: string): void => {
    setServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSubmit = (): void => {
    if (!address.trim()) return;

    const apt: AryeoAppointment = {
      id: `manual-${Date.now()}`,
      orderNumber: `M-${Date.now()}`,
      status: 'CONFIRMED',
      address: address.trim(),
      city: city.trim() || 'Tallahassee',
      state: 'FL',
      zip: '',
      startAt: new Date().toISOString(),
      agentName: agentName.trim(),
      agentPhone: agentPhone.trim(),
      agentEmail: '',
      brokerage: '',
      services,
      beds: parseInt(beds) || 0,
      baths: parseInt(baths) || 0,
      sqft: parseInt(sqft) || 0,
      furnished,
      shooterIds: ['nick'],
      notes: '',
    };
    onSubmit(apt);
  };

  const inputCls =
    'w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-950 dark:text-white text-sm focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-400 placeholder:text-neutral-400';
  const labelCls =
    'text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1 block';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-t-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <h3 className="text-lg font-bold text-neutral-950 dark:text-white">
            Manual Entry
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center"
          >
            <XMarkIcon className="w-4 h-4 text-neutral-500" />
          </button>
        </div>

        <div className="px-4 pb-6 space-y-4">
          {/* Address (required) */}
          <div>
            <label className={labelCls}>Address *</label>
            <input
              ref={addressRef}
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St"
              className={inputCls}
            />
          </div>

          {/* City */}
          <div>
            <label className={labelCls}>City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Tallahassee"
              className={inputCls}
            />
          </div>

          {/* Beds / Baths / Sqft row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Beds</label>
              <input
                type="number"
                inputMode="numeric"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Baths</label>
              <input
                type="number"
                inputMode="numeric"
                value={baths}
                onChange={(e) => setBaths(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Sqft</label>
              <input
                type="number"
                inputMode="numeric"
                value={sqft}
                onChange={(e) => setSqft(e.target.value)}
                placeholder="2000"
                className={inputCls}
              />
            </div>
          </div>

          {/* Furnished toggle */}
          <div className="flex items-center justify-between">
            <span className={labelCls}>Furnished</span>
            <button
              onClick={() => setFurnished(!furnished)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                furnished ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  furnished ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Services */}
          <div>
            <label className={labelCls}>Services</label>
            <div className="flex flex-wrap gap-2">
              {serviceOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => toggleService(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    services.includes(s)
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Agent info */}
          <div>
            <label className={labelCls}>Agent Name</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="Optional"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Agent Phone</label>
            <input
              type="tel"
              inputMode="tel"
              value={agentPhone}
              onChange={(e) => setAgentPhone(e.target.value)}
              placeholder="Optional"
              className={inputCls}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!address.trim()}
            className="w-full py-3.5 rounded-xl bg-primary-500 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-600 transition-colors"
          >
            Continue to Tier Selection
          </button>
        </div>
      </div>
    </div>
  );
}
