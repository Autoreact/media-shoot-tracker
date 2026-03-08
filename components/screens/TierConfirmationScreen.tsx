'use client';

import { useState } from 'react';
import {
  AryeoAppointment,
  PropertyTier,
  ShootMode,
} from '@/types';
import { TIER_INFO, TIER_ORDER, autoSelectTier } from '@/lib/data/tier-info';
import {
  ChevronLeftIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface Props {
  appointment: AryeoAppointment;
  onConfirm: (tier: PropertyTier, mode: ShootMode) => void;
  onBack: () => void;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function TierConfirmationScreen({
  appointment,
  onConfirm,
  onBack,
}: Props): React.ReactElement {
  const suggestedTier = autoSelectTier(appointment.beds, appointment.baths);
  const [selectedTier, setSelectedTier] = useState<PropertyTier>(suggestedTier);
  const [selectedMode, setSelectedMode] = useState<ShootMode>('detail');

  const tierInfo = TIER_INFO[selectedTier];

  return (
    <div className="flex flex-col min-h-screen animate-fade-in">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white px-4 pt-4 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center text-neutral-600"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-neutral-950">Confirm Details</h2>
        </div>
      </div>

      <div className="flex-1 px-4 py-3 space-y-3 pb-24">
        {/* Property Header */}
        <div>
          <h1 className="text-[22px] font-bold text-neutral-950">
            {appointment.address || 'Enter Address'}
          </h1>
          {appointment.city && (
            <p className="text-sm text-neutral-500">
              {appointment.city}, {appointment.state} {appointment.zip}
            </p>
          )}
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Beds', value: appointment.beds || '—' },
            { label: 'Baths', value: appointment.baths || '—' },
            { label: 'Sqft', value: appointment.sqft ? appointment.sqft.toLocaleString() : '—' },
            {
              label: 'Status',
              value: appointment.furnished ? 'Furnished' : 'Vacant',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-neutral-50 rounded-lg p-2 text-center border border-neutral-100"
            >
              <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                {stat.label}
              </p>
              <p className="text-sm font-bold text-neutral-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Agent Contact Card */}
        {appointment.agentName && (
          <div className="bg-white rounded-xl border border-neutral-200 p-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                {getInitials(appointment.agentName)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-neutral-950">
                  {appointment.agentName}
                </p>
                {appointment.brokerage && (
                  <p className="text-xs text-neutral-500">{appointment.brokerage}</p>
                )}
                <p className="text-[10px] text-neutral-400">
                  Order #{appointment.orderNumber}
                </p>
              </div>
              {appointment.agentPhone && (
                <>
                  <a
                    href={`tel:${appointment.agentPhone}`}
                    className="w-10 h-10 rounded-lg bg-success-50 flex items-center justify-center"
                  >
                    <PhoneIcon className="w-5 h-5 text-success-600" />
                  </a>
                  <a
                    href={`sms:${appointment.agentPhone}`}
                    className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"
                  >
                    <ChatBubbleLeftIcon className="w-5 h-5 text-primary-600" />
                  </a>
                </>
              )}
            </div>
          </div>
        )}

        {/* AI Tier Suggestion */}
        <div className="bg-primary-50 rounded-xl p-3 border border-primary-100">
          <div className="flex items-center gap-2 mb-1">
            <SparklesIcon className="w-4 h-4 text-primary-500" />
            <span className="text-xs font-semibold text-primary-700">
              AI Suggested Tier
            </span>
          </div>
          <p className="text-sm text-primary-800">
            Based on {appointment.beds} beds / {appointment.baths} baths →{' '}
            <strong>{TIER_INFO[suggestedTier].displayName}</strong> (~
            {TIER_INFO[suggestedTier].targetShots} shots)
          </p>
        </div>

        {/* Tier Selector */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
            Select Tier
          </p>
          <div className="flex flex-wrap gap-2">
            {TIER_ORDER.map((t) => {
              const info = TIER_INFO[t];
              const isSelected = selectedTier === t;
              const isSuggested = suggestedTier === t;
              return (
                <button
                  key={t}
                  onClick={() => setSelectedTier(t)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {info.displayName}
                  {isSuggested && !isSelected && (
                    <span className="ml-1 text-primary-500">*</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-neutral-400 mt-1.5">
            Target: {tierInfo.targetShots} shots · {tierInfo.description}
          </p>
        </div>

        {/* Mode Selector */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2">
            Tracking Mode
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedMode('detail')}
              className={`p-3 rounded-xl text-left border-2 transition-colors ${
                selectedMode === 'detail'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <p className="text-sm font-bold text-neutral-950">Room Tracker</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Track each room individually
              </p>
            </button>
            <button
              onClick={() => setSelectedMode('quick')}
              className={`p-3 rounded-xl text-left border-2 transition-colors ${
                selectedMode === 'quick'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 bg-white'
              }`}
            >
              <p className="text-sm font-bold text-neutral-950">Quick Count</p>
              <p className="text-xs text-neutral-500 mt-0.5">
                Simple tap counter
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Start Shoot Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-neutral-100">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => onConfirm(selectedTier, selectedMode)}
            className="w-full py-4 bg-primary-500 text-white rounded-xl text-base font-semibold hover:bg-primary-600 active:bg-primary-700 transition-colors"
          >
            Start Shoot — {tierInfo.displayName} ({tierInfo.targetShots} shots)
          </button>
        </div>
      </div>
    </div>
  );
}
