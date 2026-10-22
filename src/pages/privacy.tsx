import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { UtensilsIcon, ShieldIcon, ArrowRightIcon } from '../components/common/Icons';

export default function PrivacyPolicyPage() {
  return (
    <>
      <Head>
        <title>Privacy Policy | Spice Garden Smart Billing</title>
        <meta
          name="description"
          content="Privacy Policy for Spice Garden Restaurant Smart Billing and Dine-In QR Ordering System."
        />
      </Head>

      <div className="min-h-screen bg-slate-50 text-slate-800">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 shadow-sm">
                <UtensilsIcon className="w-4 h-4 text-slate-950" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900">
                Spice Garden Smart Billing
              </span>
            </Link>

            <div className="flex items-center gap-4 text-xs font-semibold">
              <Link href="/terms" className="text-slate-500 hover:text-slate-900 transition">
                Terms of Service
              </Link>
              <Link
                href="/"
                className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-1.5"
              >
                <span>Back to Menu</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Banner */}
        <div className="bg-slate-900 text-white py-12 px-6 border-b border-slate-800">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldIcon className="w-3.5 h-3.5" />
              <span>Customer Data Protection</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Last updated: October 2026 • Effective for all dine-in guests and staff portals
            </p>
          </div>
        </div>

        {/* Main Legal Content */}
        <main className="max-w-4xl mx-auto px-6 py-10 space-y-8 text-sm leading-relaxed text-slate-700">
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Information We Collect</h2>
            <p>
              When dining at Spice Garden or placing orders through our QR Smart Menu, we collect only the essential details necessary to fulfill your dining experience and deliver digital receipts:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li><strong>Table Identifier:</strong> Scanned table number to route culinary preparation to the correct station.</li>
              <li><strong>Contact Information:</strong> Customer phone number (for instant WhatsApp receipt delivery) and optional email address.</li>
              <li><strong>Customer Name:</strong> Provided during table check-in for server recognition.</li>
              <li><strong>Order History:</strong> Dish selection, preparation notes, and bill totals for settlement audit.</li>
            </ul>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. How We Use Your Data</h2>
            <p>Your dining information is strictly utilized for operational restaurant workflows:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 text-xs sm:text-sm">
              <li>Transmitting order tickets in real-time to the Kitchen Display System (KDS).</li>
              <li>Dispersing digital receipts and tax-compliant GST invoices to your WhatsApp or email.</li>
              <li>Verifying food allergen notes and chef instructions.</li>
              <li>We do not sell, rent, or distribute personal guest contact details to third-party marketing brokers.</li>
            </ul>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Payment &amp; Cardholder Security</h2>
            <p>
              Spice Garden Smart Billing does not store credit card numbers, debit card PINs, or CVV codes on our servers. All card transactions are processed via approved external payment terminals (POS) or direct UPI QR payment intents.
            </p>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Data Retention &amp; Security Controls</h2>
            <p>
              All dining records and system accounts are stored in an encrypted PostgreSQL database protected by strict Row Level Security (RLS) policies. Only authenticated restaurant management personnel have audited access to transaction history for tax accounting and daily reconciliation.
            </p>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Guest Inquiries &amp; Deletion Requests</h2>
            <p>
              Guests may request the removal of their contact record from past receipt histories by contacting the restaurant manager on duty or emailing{' '}
              <a href="mailto:support@spicegarden.restaurant" className="text-amber-600 underline font-semibold">
                support@spicegarden.restaurant
              </a>.
            </p>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Spice Garden Restaurant. All rights reserved.</p>
        </footer>
      </div>
    </>
  );
}
