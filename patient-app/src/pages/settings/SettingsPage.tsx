import { useState } from 'react';
import { Bell, Clock, PauseCircle, Phone, LogOut, Heart } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function SettingsPage() {
  const { patient, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [dailyCheckIn, setDailyCheckIn] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);

  return (
    <div className="px-4 pt-6 pb-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-navy">Settings</h1>
        <p className="text-sm text-warm-gray mt-1">
          Customize your experience.
        </p>
      </div>

      {/* Profile */}
      <section className="bg-white rounded-2xl p-5 shadow-soft">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-sage/20 flex items-center justify-center">
            <span className="text-sage-dark font-bold text-lg">
              {patient?.firstName?.[0]}{patient?.lastName?.[0]}
            </span>
          </div>
          <div>
            <p className="font-semibold text-navy">
              {patient?.firstName} {patient?.lastName}
            </p>
            <p className="text-sm text-warm-gray">{patient?.email}</p>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white rounded-2xl p-5 shadow-soft space-y-4">
        <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
          <Bell size={16} className="text-sage" />
          Notifications
        </h2>

        <ToggleRow
          label="Push notifications"
          description="Messages from your care plan"
          checked={notifications}
          onChange={setNotifications}
        />

        <ToggleRow
          label="Daily mood check-in"
          description="Gentle daily reminder at 6 PM"
          checked={dailyCheckIn}
          onChange={setDailyCheckIn}
          icon={<Clock size={16} className="text-warm-gray-light" />}
        />
      </section>

      {/* Crisis contact */}
      <section className="bg-white rounded-2xl p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-3">
          <Phone size={16} className="text-sage" />
          Crisis contacts
        </h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center py-2">
            <span className="text-navy">988 Suicide & Crisis Lifeline</span>
            <a href="tel:988" className="text-sage-dark font-medium">Call 988</a>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-navy">Crisis Text Line</span>
            <span className="text-sage-dark font-medium">741741</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-navy">Emergency Services</span>
            <a href="tel:911" className="text-sage-dark font-medium">Call 911</a>
          </div>
        </div>
      </section>

      {/* Pause Unloch */}
      <section className="bg-white rounded-2xl p-5 shadow-soft">
        <h2 className="text-sm font-semibold text-navy flex items-center gap-2 mb-3">
          <PauseCircle size={16} className="text-warm-gray" />
          Pause Unloch
        </h2>
        {!showPauseConfirm ? (
          <>
            <p className="text-sm text-warm-gray mb-3">
              Need a break? Pausing stops all automated messages. Your data stays safe.
            </p>
            <button
              onClick={() => setShowPauseConfirm(true)}
              className="text-sm font-medium text-warm-gray hover:text-navy transition-colors min-h-[44px]"
            >
              Pause support
            </button>
          </>
        ) : (
          <div className="bg-cream rounded-xl p-4">
            <p className="text-sm text-navy mb-3">
              Are you sure? Your therapist will be notified. You can resume anytime.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowPauseConfirm(false)}
                className="flex-1 bg-white border border-cream-dark rounded-xl py-2.5 text-sm font-medium text-navy hover:bg-cream-dark transition-colors min-h-[44px]"
              >
                Keep active
              </button>
              <button className="flex-1 bg-warm-gray text-white rounded-xl py-2.5 text-sm font-medium hover:bg-warm-gray/90 transition-colors min-h-[44px]">
                Pause
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Sign out */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-warm-gray hover:text-crisis transition-colors min-h-[48px]"
      >
        <LogOut size={16} />
        Sign out
      </button>

      {/* Footer */}
      <div className="text-center pb-4">
        <div className="flex items-center justify-center gap-1 text-xs text-warm-gray-light">
          <Heart size={10} />
          <span>Unloch — Between-session support</span>
        </div>
      </div>
    </div>
  );
}

// Toggle row component
function ToggleRow({
  label,
  description,
  checked,
  onChange,
  icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm font-medium text-navy">{label}</p>
          <p className="text-[10px] text-warm-gray">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors min-h-[24px] ${
          checked ? 'bg-sage' : 'bg-cream-dark'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}
