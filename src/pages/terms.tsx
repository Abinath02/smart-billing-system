import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { UtensilsIcon, CheckIcon, ArrowRightIcon } from '../components/common/Icons';

export default function TermsOfServicePage() {
  return (
    <>
      <Head>
        <title>Terms of Service | Spice Garden Smart Billing</title>
        <meta
          name="description"
          content="Terms of Service and Dine-in QR Ordering policies for Spice Garden Restaurant."
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
              <Link href="/privacy" className="text-slate-500 hover:text-slate-900 transition">
                Privacy Policy
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
              <CheckIcon className="w-3.5 h-3.5" />
              <span>Dine-In Service Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mb-2">
              Terms of Service
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Last updated: October 2026 • Governing table QR orders and restaurant POS billing
            </p>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-6 py-10 space-y-8 text-sm leading-relaxed text-slate-700">
          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">1. Dine-In Digital Ordering</h2>
            <p>
              By scanning the Table QR Code at your dining desk and submitting an order, you confirm that you are physically seated at the designated table. All orders placed are dispatched directly to the kitchen display for immediate culinary preparation.
            </p>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">2. Pricing, Taxes &amp; GST Compliance</h2>
            <p>
              All prices listed on the digital menu are in local currency (LKR / INR). Final bills are subject to applicable Goods and Services Tax (GST 5%) and discretionary service charges. Verified receipts display itemized breakdowns for tax audit compliance.
            </p>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">3. Order Modifications &amp; Cancellations</h2>
            <p>
              Once an order has been confirmed by your floor server and marked as &ldquo;Cooking&rdquo; in the kitchen, modifications or cancellations are subject to manager discretion depending on ingredients already prepared.
            </p>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">4. Payment Methods &amp; Bill Settlement</h2>
            <p>
              Guests may settle running bills at the Cashier POS counter or directly at table through supported payment modes including Cash, Credit/Debit Cards, and instant UPI QR scanning. Digital receipts are dispatched immediately upon payment confirmation.
            </p>
          </section>

          <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-3">
            <h2 className="text-lg font-bold text-slate-900">5. Allergens &amp; Dietary Requirements</h2>
            <p>
              Guests with severe food allergies must communicate directly with their floor server or utilize the special instructions input box during checkout to notify the culinary kitchen team before cooking commences.
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
