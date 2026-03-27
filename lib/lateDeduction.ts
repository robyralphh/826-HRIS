/**
 * Philippine "Late is Late" Deduction Utility
 *
 * Compliant with the Philippine Labor Code – No Work, No Pay principle.
 * - Zero grace period: 1 minute late = 1 minute deducted.
 * - Exact Minute Method: deductions per minute, never rounded to blocks.
 * - Mandatory 1-hour unpaid lunch break excluded to avoid over-deduction.
 * - DOLE-standard annualized daily rate: (Monthly × 12) / factor.
 *   313-day factor = Mon–Sat workers | 261-day factor = Mon–Fri workers.
 * - All intermediate rates carried to 4 decimal places; final output rounded to 2.
 */

export type WorkFactor = 313 | 261;

// ---------------------------------------------------------------------------
// SalaryProfile – the derived rate breakdown for a given monthly basic pay
// ---------------------------------------------------------------------------
export interface SalaryProfile {
  /** Input monthly basic pay (PHP) */
  monthlyBasic: number;
  /** Working-day annualization factor (313 or 261) */
  workFactor: WorkFactor;
  /** (Monthly × 12) / factor — DOLE-standard daily rate */
  dailyRate: number;
  /** dailyRate / 8 */
  hourlyRate: number;
  /** hourlyRate / 60 — all 4 decimal places retained internally */
  minuteRate: number;
}

export interface LateDeductionArgs {
  /** Employee's monthly basic pay in PHP (e.g. 25000) */
  monthlyBasic: number;
  /**
   * Working-day factor used to derive the daily rate.
   * 313 = Mon–Sat schedule (default per PH Supreme Court)
   * 261 = Mon–Fri schedule
   */
  workFactor?: WorkFactor;
  /** Scheduled shift start time as "HH:mm" (e.g. "08:00") */
  shiftStart: string;
  /** Lunch period start as "HH:mm" – defaults to "12:00" */
  lunchStart?: string;
  /** Lunch period end as "HH:mm" – defaults to "13:00" */
  lunchEnd?: string;
  /**
   * Actual clock-in time.
   * Accepts either an ISO 8601 string (from the DB) or a plain "HH:mm" string.
   */
  timeIn: string;
}

export interface LateDeductionResult {
  /** Number of compensable late minutes (always ≥ 0) */
  totalMinutesLate: number;
  /** PHP deduction amount, rounded to 2 decimal places */
  deductionAmount: number;
  /** True when the employee clocked in even 1 minute after shiftStart */
  isLate: boolean;
  /** Plain-language explanation of how the amount was computed */
  breakdown: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Derive the full SalaryProfile from a monthly basic pay and work factor.
 * All rates are stored with 4 decimal places for precision.
 */
export function deriveRates(monthlyBasic: number, workFactor: WorkFactor = 313): SalaryProfile {
  const dailyRate  = parseFloat(((monthlyBasic * 12) / workFactor).toFixed(4));
  const hourlyRate = parseFloat((dailyRate / 8).toFixed(4));
  const minuteRate = parseFloat((hourlyRate / 60).toFixed(4));
  return { monthlyBasic, workFactor, dailyRate, hourlyRate, minuteRate };
}

/** Parse "HH:mm" → total minutes since midnight */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Extract the wall-clock "HH:mm" portion from an ISO string or passthrough */
function extractHHMM(value: string): string {
  // If it looks like an ISO timestamp, convert to local PH "HH:mm"
  if (value.includes('T') || value.includes('Z') || value.includes('+')) {
    const d = new Date(value);
    // Format in PH timezone (UTC+8)
    const phStr = d.toLocaleString('sv-SE', { timeZone: 'Asia/Manila' });
    // sv-SE gives "YYYY-MM-DD HH:MM:SS"
    return phStr.slice(11, 16); // "HH:MM"
  }
  // Already "HH:mm"
  return value.slice(0, 5);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * calculateDeduction — primary named export per the PH Payroll spec.
 * Also exported as `calcLateDeduction` for backward compatibility.
 */
export function calculateDeduction(args: LateDeductionArgs): LateDeductionResult {
  const {
    monthlyBasic,
    workFactor = 313,
    shiftStart,
    lunchStart = '12:00',
    lunchEnd = '13:00',
    timeIn,
  } = args;

  // ── Rate derivation (DOLE annualized formula, 4 decimal precision) ───────
  const { dailyRate, hourlyRate, minuteRate: perMinuteRate } = deriveRates(monthlyBasic, workFactor);

  // ── Parse times (all in minutes-since-midnight) ──────────────────────────
  const shiftStartMin = toMinutes(shiftStart);
  const lunchStartMin = toMinutes(lunchStart);
  const lunchEndMin = toMinutes(lunchEnd);
  const lunchDurationMin = lunchEndMin - lunchStartMin; // always 60

  const timeInHHMM = extractHHMM(timeIn);
  const timeInMin = toMinutes(timeInHHMM);

  // ── Not late at all ───────────────────────────────────────────────────────
  if (timeInMin <= shiftStartMin) {
    return {
      totalMinutesLate: 0,
      deductionAmount: 0,
      isLate: false,
      breakdown: `Clocked in at ${timeInHHMM}, on or before shift start (${shiftStart}). No deduction.`,
    };
  }

  // ── Employee arrived during the lunch window ─────────────────────────────
  // Per PH practice, the lunch period is unpaid non-working time.
  // If the employee arrives at 12:30, they have not missed any *working* time
  // (morning block already ended at 12:00), so no lateness applies for
  // those minutes. We treat arrival-during-lunch as arrival at lunchEnd.
  if (timeInMin >= lunchStartMin && timeInMin <= lunchEndMin) {
    // They still missed the morning block (shiftStart → lunchStart)
    const minutesLate = lunchStartMin - shiftStartMin; // e.g. 12:00 - 08:00 = 240 mins
    const deductionAmount = parseFloat((minutesLate * perMinuteRate).toFixed(2));
    return {
      totalMinutesLate: minutesLate,
      deductionAmount,
      isLate: true,
      breakdown:
        `Arrived at ${timeInHHMM} (during the ${lunchStart}–${lunchEnd} lunch window). ` +
        `Missed the full morning block (${shiftStart}–${lunchStart}) = ${minutesLate} mins. ` +
        `Rate: ₱${perMinuteRate.toFixed(4)}/min → ₱${deductionAmount.toFixed(2)}.`,
    };
  }

  // ── Employee arrived after lunch ─────────────────────────────────────────
  // The 60-minute lunch period is unpaid, so it must NOT be counted as work lost.
  // e.g. arrives at 13:15 → elapsed since shift start = 315 mins
  //      but 60 of those mins are the unpaid lunch → 315 − 60 = 255 mins late
  let minutesLate: number;
  let breakdownNote: string;

  if (timeInMin > lunchEndMin) {
    minutesLate = timeInMin - shiftStartMin - lunchDurationMin;
    breakdownNote =
      `Arrived at ${timeInHHMM}, after the lunch window. ` +
      `Elapsed since ${shiftStart}: ${timeInMin - shiftStartMin} mins, ` +
      `minus ${lunchDurationMin}-min unpaid lunch = ${minutesLate} compensable mins.`;
  } else {
    // timeInMin > shiftStartMin and < lunchStartMin  (standard late, pre-lunch)
    minutesLate = timeInMin - shiftStartMin;
    breakdownNote =
      `Arrived at ${timeInHHMM}, before the lunch window. ` +
      `Late by ${minutesLate} mins from shift start (${shiftStart}).`;
  }

  minutesLate = Math.max(0, minutesLate);
  const deductionAmount = parseFloat((minutesLate * perMinuteRate).toFixed(2));

  return {
    totalMinutesLate: minutesLate,
    deductionAmount,
    isLate: minutesLate > 0,
    breakdown:
      `${breakdownNote} ` +
      `Daily Rate (${workFactor}-day factor): ₱${dailyRate.toFixed(4)}, ` +
      `Per-min rate: ₱${perMinuteRate.toFixed(4)} → Deduction: ₱${deductionAmount.toFixed(2)}.`,
  };
}

/** @deprecated Use `calculateDeduction` instead. Kept for backward compatibility. */
export const calcLateDeduction = calculateDeduction;
