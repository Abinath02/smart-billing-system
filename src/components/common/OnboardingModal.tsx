import React, { useState } from 'react';
import {
  UtensilsIcon,
  QrCodeIcon,
  ChefIcon,
  CashIcon,
  WaiterIcon,
  ShieldIcon,
  CheckIcon,
  ArrowRightIcon,
  CloseIcon,
} from './Icons';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'Welcome to Spice Garden Smart Billing',
      subtitle: 'Modern Cloud Restaurant POS & Dine-in Ecosystem',
      icon: <UtensilsIcon className="w-8 h-8 text-amber-500" />,
      content: (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Spice Garden integrates your entire restaurant operations into 4 synchronized stations powered by live Supabase Realtime:
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="block text-slate-900 font-bold mb-0.5">1. QR Customer Menu</strong>
              Contactless dining orders directly from desk.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="block text-slate-900 font-bold mb-0.5">2. Waiter Service</strong>
              Table-side verification and order dispatch.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="block text-slate-900 font-bold mb-0.5">3. Kitchen Display (KDS)</strong>
              Cook ticket queue with real-time timers.
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="block text-slate-900 font-bold mb-0.5">4. Cashier POS</strong>
              Instant settlement, Split Pay &amp; WhatsApp receipts.
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Table QR Codes & Contactless Ordering',
      subtitle: 'Table Locking & Fraud Prevention',
      icon: <QrCodeIcon className="w-8 h-8 text-amber-500" />,
      content: (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Each physical dining desk has a dedicated table QR code generated from the <strong>Table QR Codes</strong> tab in the Admin panel.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-[11px]">
            <li>When guests scan a table QR code with their mobile phone, the table number is automatically locked to avoid order mix-ups.</li>
            <li>Guests select appetizers, mains, and beverages, applying live restaurant promotional discounts.</li>
            <li>Round 2 orders are seamlessly appended to the guest&apos;s active running bill.</li>
          </ul>
        </div>
      ),
    },
    {
      title: 'Strict Role-Based Security & Permissions',
      subtitle: 'Isolated Staff Portals & Passwords',
      icon: <ShieldIcon className="w-8 h-8 text-amber-500" />,
      content: (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Public registration is disabled. All staff profiles are securely created and managed by the Administrator:
          </p>
          <div className="space-y-2 text-[11px]">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-amber-50/60 border border-amber-200 text-amber-900">
              <ShieldIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span><strong>Admin:</strong> Full pricing control, staff passwords, backups, and audits.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-900">
              <CashIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span><strong>Cashier:</strong> Settles cash, card, UPI bills, and issues receipts.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-orange-50/60 border border-orange-200 text-orange-900">
              <ChefIcon className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <span><strong>Kitchen:</strong> Tracks live cooking tickets and raw materials.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-50/60 border border-purple-200 text-purple-900">
              <WaiterIcon className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span><strong>Waiter:</strong> Verifies guest orders at desk and serves dishes.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Database Backups & Ready for Service',
      subtitle: 'Enterprise Resilience & 1-Click Backups',
      icon: <CheckIcon className="w-8 h-8 text-emerald-500" />,
      content: (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>
            Your restaurant is fully equipped for peak dining hours:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-[11px]">
            <li><strong>Automated Backups:</strong> Download full JSON database snapshots at any time from the Admin panel.</li>
            <li><strong>Row Level Security:</strong> Strict Postgres rules protect sensitive business metrics and transaction records.</li>
            <li><strong>Digital Receipts:</strong> Guests receive itemized receipts via WhatsApp (+94 Sri Lanka format) and PDF invoices.</li>
          </ul>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const activeStep = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-slate-900 border border-slate-200/80">
        {/* Header Bar */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-inner">
              {activeStep.icon}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                {activeStep.title}
              </h3>
              <p className="text-[11px] font-semibold text-amber-600">
                {activeStep.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
            aria-label="Close onboarding guide"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Step Body */}
        <div className="py-2 min-h-[180px]">
          {activeStep.content}
        </div>

        {/* Footer & Progress Indicators */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-6 bg-amber-500'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
                aria-label={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <span>{currentStep === steps.length - 1 ? 'Finish & Get Started' : 'Next Step'}</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
