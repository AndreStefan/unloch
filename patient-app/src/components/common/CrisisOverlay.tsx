import { useState } from 'react';
import { Phone, MessageSquare, Heart, ShieldCheck } from 'lucide-react';
import { useCrisis } from '../../hooks/useCrisis';

export default function CrisisOverlay() {
  const { confirmSafety } = useCrisis();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-crisis flex flex-col items-center justify-center p-6 text-white animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <Heart size={48} className="mx-auto mb-4 animate-pulse" fill="white" />
        <h1 className="text-2xl font-bold mb-2">You are not alone</h1>
        <p className="text-lg opacity-90">
          Help is available right now.
        </p>
      </div>

      {/* Crisis resources */}
      <div className="w-full max-w-sm space-y-4 mb-8">
        {/* 988 Lifeline */}
        <a
          href="tel:988"
          className="flex items-center gap-4 bg-white/20 hover:bg-white/30 rounded-2xl p-5 transition-colors min-h-[64px]"
        >
          <div className="bg-white/30 rounded-full p-3">
            <Phone size={24} />
          </div>
          <div>
            <div className="font-bold text-lg">Call 988</div>
            <div className="text-sm opacity-90">Suicide & Crisis Lifeline</div>
          </div>
        </a>

        {/* Crisis Text Line */}
        <a
          href="sms:741741&body=HOME"
          className="flex items-center gap-4 bg-white/20 hover:bg-white/30 rounded-2xl p-5 transition-colors min-h-[64px]"
        >
          <div className="bg-white/30 rounded-full p-3">
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="font-bold text-lg">Text HOME to 741741</div>
            <div className="text-sm opacity-90">Crisis Text Line</div>
          </div>
        </a>

        {/* Emergency */}
        <a
          href="tel:911"
          className="flex items-center gap-4 bg-white/10 hover:bg-white/20 rounded-2xl p-5 transition-colors min-h-[64px]"
        >
          <div className="bg-white/20 rounded-full p-3">
            <Phone size={24} />
          </div>
          <div>
            <div className="font-bold">Call 911</div>
            <div className="text-sm opacity-90">Emergency Services</div>
          </div>
        </a>
      </div>

      {/* Therapist notification */}
      <div className="bg-white/15 rounded-xl p-4 mb-8 max-w-sm w-full text-center">
        <ShieldCheck size={20} className="mx-auto mb-2" />
        <p className="text-sm font-medium">
          Your therapist is being notified right now.
        </p>
      </div>

      {/* Deliberate dismiss — requires two-step confirmation */}
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="text-white/60 text-sm underline underline-offset-4 hover:text-white/80 transition-colors min-h-[44px]"
        >
          I'm feeling safer now
        </button>
      ) : (
        <div className="bg-white/20 rounded-2xl p-5 max-w-sm w-full text-center">
          <p className="text-sm mb-4">
            Are you sure you're feeling safe right now?
            <br />
            It's completely okay to keep these resources visible.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 bg-white/20 rounded-xl py-3 text-sm font-medium hover:bg-white/30 transition-colors min-h-[44px]"
            >
              Keep resources
            </button>
            <button
              onClick={confirmSafety}
              className="flex-1 bg-white rounded-xl py-3 text-sm font-medium text-crisis hover:bg-white/90 transition-colors min-h-[44px]"
            >
              Yes, I'm okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
