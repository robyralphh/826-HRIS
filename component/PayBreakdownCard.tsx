'use client';

/**
 * PayBreakdownCard
 *
 * A self-contained "Pay Calculator" UI card that:
 *   1. Shows the employee's Monthly, Daily, Hourly, and Minute rates derived
 *      from their monthly basic pay using the DOLE-standard annualized formula:
 *        Daily Rate = (Monthly × 12) / factor
 *   2. Lets HR switch the work factor between 313 (Mon–Sat) and 261 (Mon–Fri).
 *   3. Provides a "Live Preview" where entering a Clock-In time instantly
 *      calculates and displays the real-time PHP late deduction.
 *
 * Usage:
 *   <PayBreakdownCard monthlyBasic={employee.baseSalary} />
 */

import React, { useState, useMemo } from 'react';
import { deriveRates, calculateDeduction, WorkFactor } from '@/lib/lateDeduction';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface PayBreakdownCardProps {
  /** Monthly basic pay in PHP */
  monthlyBasic: number;
  /** Employee name — shown in the card header */
  employeeName?: string;
  /** Default shift start in "HH:mm"; defaults to "08:00" */
  defaultShiftStart?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatPHP(value: number, decimals = 2): string {
  return `₱${value.toLocaleString('en-PH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function formatRate(value: number): string {
  // Show 4 decimal places for rate breakdown to be transparent about precision
  return `₱${value.toFixed(4)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function PayBreakdownCard({
  monthlyBasic,
  employeeName,
  defaultShiftStart = '08:00',
}: PayBreakdownCardProps) {
  const [workFactor, setWorkFactor]   = useState<WorkFactor>(313);
  const [shiftStart, setShiftStart]   = useState(defaultShiftStart);
  const [liveTimeIn, setLiveTimeIn]   = useState('');

  // ── Rate derivation (recomputes when monthlyBasic or workFactor changes) ─
  const rates = useMemo(
    () => deriveRates(monthlyBasic, workFactor),
    [monthlyBasic, workFactor]
  );

  // ── Live deduction preview ────────────────────────────────────────────────
  const preview = useMemo(() => {
    if (!liveTimeIn) return null;
    return calculateDeduction({
      monthlyBasic,
      workFactor,
      shiftStart,
      timeIn: liveTimeIn,
    });
  }, [liveTimeIn, monthlyBasic, workFactor, shiftStart]);

  // ── Derived helpers ───────────────────────────────────────────────────────
  const annualGross = monthlyBasic * 12;

  return (
    <div className="w-full max-w-lg font-sans select-none">
      {/* ── Card ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Pay Breakdown</p>
              <h2 className="text-2xl font-black tracking-tight">
                {formatPHP(monthlyBasic)}
                <span className="text-indigo-200 text-sm font-bold ml-1">/ month</span>
              </h2>
              {employeeName && (
                <p className="text-indigo-200 text-sm mt-1 font-medium">{employeeName}</p>
              )}
            </div>
            {/* Annual gross pill */}
            <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-3 py-2 text-center border border-white/20">
              <p className="text-[10px] text-indigo-200 uppercase font-black tracking-wider">Annual Gross</p>
              <p className="text-white font-black text-sm">{formatPHP(annualGross)}</p>
            </div>
          </div>

          {/* Work Factor Toggle */}
          <div className="mt-5">
            <p className="text-[10px] text-indigo-200 uppercase font-black tracking-widest mb-2">
              Work Factor (PH Annualization)
            </p>
            <div className="flex gap-2">
              {([313, 261] as WorkFactor[]).map(f => (
                <button
                  key={f}
                  onClick={() => setWorkFactor(f)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-black transition-all border ${
                    workFactor === f
                      ? 'bg-white text-indigo-700 border-white shadow-md'
                      : 'bg-white/10 text-indigo-100 border-white/20 hover:bg-white/20'
                  }`}
                >
                  {f}-day · {f === 313 ? 'Mon–Sat' : 'Mon–Fri'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-indigo-300 mt-2 font-medium">
              Daily = (Monthly × 12) ÷ {workFactor} &nbsp;|&nbsp; Hourly = Daily ÷ 8 &nbsp;|&nbsp; Minute = Hourly ÷ 60
            </p>
          </div>
        </div>

        {/* Rate Breakdown Grid */}
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
          {[
            { label: 'Daily Rate',   value: formatRate(rates.dailyRate),   sub: `(÷${workFactor})`,  icon: '📅', color: 'text-violet-600' },
            { label: 'Hourly Rate',  value: formatRate(rates.hourlyRate),  sub: '(÷8)',              icon: '⏰', color: 'text-indigo-600' },
            { label: 'Minute Rate',  value: formatRate(rates.minuteRate),  sub: '(÷60)',             icon: '⏱️', color: 'text-sky-600'    },
            { label: 'Annual Gross', value: formatPHP(annualGross, 2),     sub: '(×12)',             icon: '📊', color: 'text-emerald-600' },
          ].map(({ label, value, sub, icon, color }) => (
            <div key={label} className="p-5 flex flex-col gap-1">
              <span className="text-xl">{icon}</span>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
              <p className={`text-lg font-black tabular-nums ${color}`}>{value}</p>
              <p className="text-[10px] text-slate-400 font-medium">{sub}</p>
            </div>
          ))}
        </div>

        {/* Live Preview Section */}
        <div className="border-t border-slate-100 p-6 bg-slate-50/60">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
            Live Late Deduction Preview
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Shift Start
              </label>
              <input
                type="time"
                value={shiftStart}
                onChange={e => setShiftStart(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                Clock-In Time
              </label>
              <input
                type="time"
                value={liveTimeIn}
                onChange={e => setLiveTimeIn(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Enter clock-in"
              />
            </div>
          </div>

          {/* Result display */}
          {!liveTimeIn ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center text-slate-400 text-sm font-medium">
              Enter a clock-in time above to see the deduction
            </div>
          ) : preview && !preview.isLate ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-black text-emerald-700 text-sm">On Time — No Deduction</p>
                <p className="text-xs text-emerald-500 mt-0.5">{preview.breakdown}</p>
              </div>
            </div>
          ) : preview ? (
            <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-red-700 text-sm flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 bg-red-200 text-red-700 rounded text-[10px] uppercase tracking-wider font-black">Tardy</span>
                      {preview.totalMinutesLate} min late
                    </span>
                    <span className="text-xl font-black text-red-600 tabular-nums">
                      {formatPHP(preview.deductionAmount)}
                    </span>
                  </div>
                  <p className="text-[11px] text-red-500 leading-relaxed">{preview.breakdown}</p>
                </div>
              </div>

              {/* Rate pill row */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: 'Daily',  value: formatRate(rates.dailyRate)  },
                  { label: 'Hourly', value: formatRate(rates.hourlyRate) },
                  { label: '/min',   value: formatRate(rates.minuteRate) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white/70 rounded-xl p-2 text-center border border-red-100">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-[11px] font-black text-slate-700 tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Compliance note */}
          <p className="text-[10px] text-slate-400 mt-4 text-center font-medium leading-relaxed">
            Computed under PH Labor Code Art. 113 (No Work, No Pay) &nbsp;·&nbsp; Lunch: 12:00–13:00 (unpaid, excluded from deduction)
          </p>
        </div>
      </div>
    </div>
  );
}
