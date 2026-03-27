import { NextResponse } from 'next/server';
import { PrismaClient } from '@/prisma/generated-client';
import { addDays, differenceInMinutes } from 'date-fns';
import { deriveRates, WorkFactor } from '@/lib/lateDeduction';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// PH-time helpers (consistent with my-attendance/route.ts & hr/attendance)
// ---------------------------------------------------------------------------
const PH_OFFSET_MS = 8 * 60 * 60 * 1000;

function toPhDateStr(d: Date): string {
    return new Date(d.getTime() + PH_OFFSET_MS).toISOString().split('T')[0];
}

function toPhWeekday(d: Date): string {
    const phDate = new Date(d.getTime() + PH_OFFSET_MS);
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[phDate.getUTCDay()];
}

// ---------------------------------------------------------------------------
// Build a Date in the PH timezone for a given day + "HH:mm" time string.
// If the resulting time is before `referenceMidnight`, roll forward one day
// (handles overnight / cross-day shifts).
// ---------------------------------------------------------------------------
function buildPhDateTime(phDateStr: string, timeHHmm: string, rollForwardIfBefore?: Date): Date {
    const [h, m] = timeHHmm.split(':').map(Number);
    // Construct the wall-clock time in PH timezone
    const dt = new Date(`${phDateStr}T${timeHHmm.padStart(5, '0')}:00+08:00`);
    if (rollForwardIfBefore && dt <= rollForwardIfBefore) {
        return addDays(dt, 1);
    }
    return dt;
}

// ---------------------------------------------------------------------------
// Count minutes spent in the ND window [ndStart, ndEnd) for a given
// [workStart, workEnd) interval.  ND windows that cross midnight are split.
// ---------------------------------------------------------------------------
function calcNDMinutes(
    workStart: Date,
    workEnd: Date,
    ndStartTime: string, // "HH:mm"
    ndEndTime: string    // "HH:mm"
): number {
    // Build ND windows that straddle the work interval.
    // We check up to 3 calendar dates to handle overnight work + ND wrapping.
    let ndMinutes = 0;

    // The date range we need to cover: one day before workStart → one day after workEnd
    const windowStart = addDays(workStart, -1);
    const windowEnd = addDays(workEnd, 1);

    // Iterate through each potential ND window anchor day
    let anchor = new Date(windowStart);
    while (anchor <= windowEnd) {
        const anchorDateStr = toPhDateStr(anchor);
        const [ndSH, ndSM] = ndStartTime.split(':').map(Number);
        const [ndEH, ndEM] = ndEndTime.split(':').map(Number);

        const ndS = new Date(`${anchorDateStr}T${ndStartTime}:00+08:00`);
        // If ND wraps midnight (e.g. 22:00-06:00), end is next day
        const ndE = (ndEH < ndSH || (ndEH === ndSH && ndEM <= ndSM))
            ? addDays(new Date(`${anchorDateStr}T${ndEndTime}:00+08:00`), 1)
            : new Date(`${anchorDateStr}T${ndEndTime}:00+08:00`);

        // Intersection of [workStart, workEnd) and [ndS, ndE)
        const overlapStart = workStart > ndS ? workStart : ndS;
        const overlapEnd = workEnd < ndE ? workEnd : ndE;
        if (overlapStart < overlapEnd) {
            ndMinutes += differenceInMinutes(overlapEnd, overlapStart);
        }
        anchor = addDays(anchor, 1);
    }
    return ndMinutes;
}

// ---------------------------------------------------------------------------
// Default rates (PH-standard) — used when no override and no DB setting found
// ---------------------------------------------------------------------------
const DEFAULTS = {
    regularOTRate: 1.25,
    nightDiffRate: 0.10,
    ndStartTime: '22:00',
    ndEndTime: '06:00',
    holidayRegularRate: 2.00,
    holidaySpecialRate: 1.30,
    /** DOLE-standard annualization factor: 313 = Mon–Sat, 261 = Mon–Fri */
    workFactor: 313 as WorkFactor,
} as const;

// ---------------------------------------------------------------------------
// POST /api/payroll/process/[id]
// Body (all optional): { overrides: { workFactor, regularOTRate, nightDiffRate,
//                                     ndStartTime, ndEndTime, holidayRegularRate,
//                                     holidaySpecialRate } }
// ---------------------------------------------------------------------------
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id: periodId } = await params;

    try {
        // 1. Fetch period
        const period = await prisma.payrollPeriod.findUnique({ where: { id: periodId } });
        if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

        // 2. Resolve rates: override → DB setting → hard-coded default
        const body = await req.json().catch(() => ({}));
        const ov = body?.overrides ?? {};

        const ndSetting = await prisma.payrollSetting.findUnique({ where: { name: 'Night Differential' } });

        const rates = {
            /** 313 (Mon–Sat) or 261 (Mon–Fri) – drives all DOLE daily/hourly/minute rates */
            workFactor: (ov.workFactor === 261 ? 261 : DEFAULTS.workFactor) as WorkFactor,
            regularOTRate: ov.regularOTRate ?? DEFAULTS.regularOTRate,
            nightDiffRate: ov.nightDiffRate ?? (ndSetting?.isActive ? ndSetting.percentage / 100 : DEFAULTS.nightDiffRate),
            ndStartTime: ov.ndStartTime ?? ndSetting?.startTime ?? DEFAULTS.ndStartTime,
            ndEndTime: ov.ndEndTime ?? ndSetting?.endTime ?? DEFAULTS.ndEndTime,
            holidayRegularRate: ov.holidayRegularRate ?? DEFAULTS.holidayRegularRate,
            holidaySpecialRate: ov.holidaySpecialRate ?? DEFAULTS.holidaySpecialRate,
        };

        // 3. Fetch all active employees with schedules + approved leaves
        const employees = await prisma.employee.findMany({
            where: { status: 'active' },
            include: {
                schedule: {
                    include: {
                        monday: true, tuesday: true, wednesday: true,
                        thursday: true, friday: true, saturday: true, sunday: true
                    }
                },
                leaveRequests: {
                    where: {
                        status: 'Approved',
                        startDate: { lte: period.endDate },
                        endDate: { gte: period.startDate }
                    }
                }
            }
        });
        // sssStatus, philHealthStatus, pagIbigStatus are scalar fields — included automatically

        // Holiday map for the period (extend as needed)
        const holidays: Record<string, { name: string; type: 'Regular' | 'Special' }> = {
            '2026-03-24': { name: 'Sample Regular Holiday', type: 'Regular' },
            '2026-03-25': { name: 'Sample Special Holiday', type: 'Special' },
        };

        const records = [];

        for (const employee of employees) {

            // Expand the query range safely since 'toPhDateStr' does the exact daily matching
            const queryStart = new Date(period.startDate.getTime() - 14 * 60 * 60 * 1000);
            const queryEnd = new Date(period.endDate.getTime() + 24 * 60 * 60 * 1000);

            // Fetch this employee's attendance + approved OT for the period
            const attendances = await prisma.attendance.findMany({
                where: {
                    employeeId: employee.id,
                    date: { gte: queryStart, lte: queryEnd }
                }
            });

            const overtimes = await prisma.timeRequest.findMany({
                where: {
                    employeeId: employee.id,
                    type: 'Overtime',
                    status: 'Approved',
                    date: { gte: queryStart, lte: queryEnd }
                }
            });

            // Accumulators
            let totalRegularHours = 0;
            let totalNDHours = 0;
            let totalOTHours = 0;
            let totalLateHours = 0;
            let totalUndertimeHours = 0;
            let totalAbsentDays = 0;
            let totalLeaveDays = 0;
            let totalRegHolidayDays = 0;
            let totalSpecHolidayDays = 0;
            let totalScheduledHours = 0;
            let totalScheduledDays = 0;

            // Iterate each calendar day in the period
            const current = new Date(period.startDate);
            const end = new Date(period.endDate);

            while (current <= end) {
                const dayStr = toPhDateStr(current);
                const dayOfWeek = toPhWeekday(current);
                const shift = employee.schedule ? (employee.schedule as any)[dayOfWeek] : null;
                const holiday = holidays[dayStr];

                if (holiday) {
                    if (holiday.type === 'Regular') totalRegHolidayDays += 1;
                    else totalSpecHolidayDays += 1;
                }

                if (shift && shift.startTime && shift.endTime) {
                    // --- Determine scheduled hours for this day ---
                    const isFlexi = Boolean(shift.isFlexi);
                    let shiftHours: number;

                    if (isFlexi) {
                        shiftHours = shift.flexiHours ?? 8;
                    } else {
                        const shiftStart = buildPhDateTime(dayStr, shift.startTime);
                        const shiftEnd = buildPhDateTime(dayStr, shift.endTime, shiftStart);
                        let rawMins = differenceInMinutes(shiftEnd, shiftStart);
                        if (rawMins > 300) rawMins -= 60; // lunch deduction for shifts > 5 h
                        shiftHours = rawMins / 60;
                    }

                    totalScheduledHours += shiftHours;
                    totalScheduledDays += 1;

                    // --- Match attendance for this day ---
                    const dayAttendance = attendances.find(a => toPhDateStr(a.date) === dayStr);

                    const hasLeave = employee.leaveRequests.some(l => {
                        const ls = toPhDateStr(new Date(l.startDate));
                        const le = toPhDateStr(new Date(l.endDate));
                        return dayStr >= ls && dayStr <= le;
                    });

                    if (hasLeave) {
                        totalLeaveDays += 1;
                    } else if (!dayAttendance || dayAttendance.status === 'Absent') {
                        totalAbsentDays += 1;
                    } else if (dayAttendance.timeIn && dayAttendance.timeOut) {
                        const timeIn = new Date(dayAttendance.timeIn);
                        const timeOut = new Date(dayAttendance.timeOut);

                        if (isFlexi) {
                            // Flexi: credit actual minutes, capped at required hours
                            let mins = differenceInMinutes(timeOut, timeIn);
                            if (mins > 300) mins -= 60; // lunch
                            const creditedHours = Math.max(0, mins / 60);
                            totalRegularHours += Math.min(creditedHours, shiftHours);
                            if (creditedHours < shiftHours) {
                                totalUndertimeHours += shiftHours - creditedHours;
                            }
                            // Overtime must be explicitly filed via myESS time requests;
                            // we no longer auto-credit excess flexi hours.
                        } else {
                            // Fixed shift: use shift boundaries as credit limits
                            const shiftStart = buildPhDateTime(dayStr, shift.startTime);
                            const shiftEnd = buildPhDateTime(dayStr, shift.endTime, shiftStart);

                            const creditStart = timeIn > shiftStart ? timeIn : shiftStart;
                            const creditEnd = timeOut < shiftEnd ? timeOut : shiftEnd;

                            let creditedMins = differenceInMinutes(creditEnd, creditStart);
                            if (creditedMins < 0) creditedMins = 0;
                            if (creditedMins > 300) creditedMins -= 60; // lunch
                            const creditedHours = creditedMins / 60;

                            totalRegularHours += Math.min(creditedHours, shiftHours);

                            // Undertime
                            if (creditedHours < shiftHours) {
                                totalUndertimeHours += shiftHours - creditedHours;
                            }

                            // Late: employee clocked in after shift start
                            if (timeIn > shiftStart) {
                                totalLateHours += differenceInMinutes(timeIn, shiftStart) / 60;
                            }

                            // OT: employee worked beyond shift end (approved via timeRequests)
                            // Handled below via overtimes array
                        }

                        // Night Differential for this day's work window
                        const ndMins = calcNDMinutes(timeIn, timeOut, rates.ndStartTime, rates.ndEndTime);
                        totalNDHours += ndMins / 60;

                    } else if (dayAttendance) {
                        // Incomplete DTR (missing timeIn or timeOut) → absent
                        totalAbsentDays += 1;
                    }
                }

                current.setDate(current.getDate() + 1);
            }

            // Approved overtime requests
            for (const ot of overtimes) {
                const [sh, sm] = ot.startTime.split(':').map(Number);
                const [eh, em] = ot.endTime.split(':').map(Number);
                let dur = (eh + em / 60) - (sh + sm / 60);
                if (dur <= 0) dur += 24; // overnight OT
                totalOTHours += Math.max(0, dur);
            }

            // ─── Rate derivation (DOLE annualized formula via deriveRates) ────────────
            // Each employee can have their own workFactor (313=Mon–Sat, 261=Mon–Fri)
            // stored on the employee record. Fall back to the global override/default
            // if the employee field is missing (e.g. legacy records).
            const empWorkFactor: WorkFactor =
                (employee as any).workFactor === 261 ? 261
                    : (employee as any).workFactor === 313 ? 313
                        : rates.workFactor;

            let canonicalMonthly: number;
            if (employee.salaryType === 'Monthly') {
                canonicalMonthly = employee.baseSalary;
            } else if (employee.salaryType === 'Daily') {
                // reverse: monthly = (daily × factor) / 12
                canonicalMonthly = (employee.baseSalary * empWorkFactor) / 12;
            } else {
                // Hourly: monthly = (hourly × 8 × factor) / 12
                canonicalMonthly = (employee.baseSalary * 8 * empWorkFactor) / 12;
            }

            const empRates = deriveRates(canonicalMonthly, empWorkFactor);
            const monthlyRate = empRates.monthlyBasic;
            const dailyRate = empRates.dailyRate;
            const hourlyRate = empRates.hourlyRate;

            // ─── Base pay per cut-off ────────────────────────────────────────────────
            let basePay: number;
            if (employee.salaryType === 'Monthly') {
                basePay = monthlyRate / 2;
            } else if (employee.salaryType === 'Daily') {
                basePay = totalScheduledDays * dailyRate;
            } else {
                basePay = totalScheduledHours * hourlyRate;
            }

            // ─── Deductions ─────────────────────────────────────────────────────────
            const lateDeduction = totalLateHours * hourlyRate;
            const undertimeDeduction = totalUndertimeHours * hourlyRate;
            const absenceDeduction = totalAbsentDays * dailyRate;
            const leavePay = totalLeaveDays * dailyRate;
            const adjustment = 0;

            const rawDeductions = lateDeduction + undertimeDeduction + absenceDeduction;
            let totalBasicPay = Math.max(0, basePay - rawDeductions + leavePay + adjustment);

            // ─── Positive Crediting Fallback ─────────────────────────────────────────
            // For Monthly/fixed-pay employees with extreme absences, deducting daily 
            // rates from a fixed semi-monthly cap penalizes them mathematically beyond
            // their actual days worked (due to the 313 annualized divisor limit).
            // We use standard DOLE Positive Crediting: if paying them strictly for 
            // the days they *did* work yields a higher amount, we use that instead.
            const actualDaysWorked = Math.max(0, totalScheduledDays - totalAbsentDays);
            const positiveBasicPay = (actualDaysWorked * dailyRate) - lateDeduction - undertimeDeduction + leavePay + adjustment;

            // Use the higher value, but strictly cap at their theoretical maximum basePay
            let isPositiveCrediting = false;
            if (positiveBasicPay > totalBasicPay && totalAbsentDays > 0) {
                totalBasicPay = Math.min(basePay + leavePay + adjustment, Math.max(0, positiveBasicPay));
                isPositiveCrediting = true;
            }

            // Back-calculate the effective deductions so the payslip breakdown balances
            // perfectly on the UI: (Base Pay - Absences - Undertime - Late = Total Basic Pay)
            const effectiveDeductions = Math.max(0, basePay + leavePay + adjustment - totalBasicPay);

            // Distribute the effectiveDeductions proportionally across the three buckets
            const capRatio = rawDeductions > 0 ? effectiveDeductions / rawDeductions : 0;
            const cappedLateDeduction      = lateDeduction      * capRatio;
            const cappedUndertimeDeduction = undertimeDeduction * capRatio;
            const cappedAbsenceDeduction   = absenceDeduction   * capRatio;

            // ─── Holiday pay ─────────────────────────────────────────────────────────
            const regHolidayBonus = totalRegHolidayDays * dailyRate * (rates.holidayRegularRate - 1); // extra on top of regular pay
            const specHolidayBonus = totalSpecHolidayDays * dailyRate * (rates.holidaySpecialRate - 1);
            const holidayPay = regHolidayBonus + specHolidayBonus;

            // ─── Special pays ────────────────────────────────────────────────────────
            const ndPay = totalNDHours * (hourlyRate * rates.nightDiffRate);
            const otPay = totalOTHours * (hourlyRate * rates.regularOTRate);

            // ─── Government contributions ─────────────────────────────────────────────
            const periodStartDay = period.startDate.getDate();
            const isFirstCutOff = periodStartDay <= 15;
            const periodDays = Math.round((period.endDate.getTime() - period.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const standardPeriodDays = isFirstCutOff ? 15 : 16;

            let prorationFactor = 1;
            if (employee.dateHired) {
                const hiredDate = new Date(employee.dateHired);
                if (hiredDate >= period.startDate && hiredDate <= period.endDate) {
                    const daysWorked = Math.round((period.endDate.getTime() - hiredDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    prorationFactor = Math.min(1, daysWorked / standardPeriodDays);
                }
            }

            // monthlyGross for govt contribution brackets uses the same canonical
            // monthly derived above — consistent with the DOLE annualized formula.
            const monthlyGross = canonicalMonthly;

            // snapshot the per-employee factor for later reference
            const resolvedWorkFactor = empWorkFactor;

            // ── Government mandatory benefit deductions ──────────────────────────────
            // Each benefit is only deducted when the employee's corresponding status
            // is exactly 'Active'. 'Pending' and 'Exempt' employees are skipped.

            // SSS
            const sssActive = employee.sssStatus === 'Active';
            const msc = Math.min(monthlyGross, 35000);
            const sssMonthlyEE = sssActive ? msc * 0.05 : 0;
            const sssDeduction = sssActive ? (sssMonthlyEE / 2) * prorationFactor : 0;

            // PhilHealth
            const phicActive = employee.philHealthStatus === 'Active';
            const phicBasis = Math.min(monthlyGross, 100000);
            const phicMonthlyEE = phicActive ? (phicBasis * 0.05) / 2 : 0;
            const phicDeduction = phicActive ? (phicMonthlyEE / 2) * prorationFactor : 0;

            // Pag-IBIG
            const hdmfActive = employee.pagIbigStatus === 'Active';
            const hdmfBasis = Math.min(monthlyGross, 10000);
            const hdmfMonthlyEE = hdmfActive ? hdmfBasis * 0.02 : 0;
            const hdmfDeduction = hdmfActive ? (hdmfMonthlyEE / 2) * prorationFactor : 0;
            const hdmf2Deduction = 0;

            const subTotalGovtDues = sssDeduction + phicDeduction + hdmfDeduction + hdmf2Deduction;

            // ─── Tax ──────────────────────────────────────────────────────────────────
            const grossTaxableIncome = Math.max(0, totalBasicPay + ndPay + otPay + holidayPay);

            function computeSemiMonthlyTax(b: number): number {
                if (b <= 10417) return 0;
                if (b <= 16667) return (b - 10417) * 0.15;
                if (b <= 33333) return 937.50 + (b - 16667) * 0.20;
                if (b <= 83333) return 4270.83 + (b - 33333) * 0.25;
                if (b <= 333333) return 16770.83 + (b - 83333) * 0.30;
                return 91770.83 + (b - 333333) * 0.35;
            }

            let taxDeduction = 0;
            if (isFirstCutOff) {
                const halfGovt = (sssMonthlyEE + phicMonthlyEE + hdmfMonthlyEE) / 2 / 2;
                taxDeduction = computeSemiMonthlyTax(Math.max(0, grossTaxableIncome - halfGovt));
            } else {
                const periodMonth = period.startDate.getMonth();
                const periodYear = period.startDate.getFullYear();
                const firstCutOffPeriod = await prisma.payrollPeriod.findFirst({
                    where: {
                        status: 'Completed',
                        AND: [
                            { startDate: { gte: new Date(periodYear, periodMonth, 1) } },
                            { startDate: { lte: new Date(periodYear, periodMonth, 15) } }
                        ]
                    }
                });

                if (firstCutOffPeriod) {
                    const firstRecord = await prisma.payrollRecord.findUnique({
                        where: {
                            payrollPeriodId_employeeId: {
                                payrollPeriodId: firstCutOffPeriod.id,
                                employeeId: employee.id
                            }
                        },
                        select: { taxDeduction: true, grossTaxableIncome: true }
                    });
                    const firstTax = firstRecord?.taxDeduction ?? 0;
                    const firstGross = firstRecord?.grossTaxableIncome ?? grossTaxableIncome;
                    const fullGross = firstGross + grossTaxableIncome;
                    const fullGovt = sssMonthlyEE + phicMonthlyEE + hdmfMonthlyEE;
                    const fullTax = computeSemiMonthlyTax(Math.max(0, fullGross - fullGovt) / 2) * 2;
                    taxDeduction = Math.max(0, fullTax - firstTax);
                } else {
                    const halfGovt = (sssMonthlyEE + phicMonthlyEE + hdmfMonthlyEE) / 2 / 2;
                    taxDeduction = computeSemiMonthlyTax(Math.max(0, grossTaxableIncome - halfGovt));
                }
            }

            const subTotalDeductions = taxDeduction; // extend to include loans etc.
            const diemAllowance = 0;
            const allowance = 0;
            const subTotalAdditions = diemAllowance + allowance;
            const grossPay = grossTaxableIncome + subTotalAdditions;
            const netPay = Math.max(0, grossPay - subTotalGovtDues - subTotalDeductions);

            // ─── Persist record (including rate snapshot) ────────────────────────────
            const sharedData = {
                salaryType: employee.salaryType,
                baseRate: canonicalMonthly,   // always the monthly equivalent
                totalHours: totalRegularHours,
                ndHours: totalNDHours,
                otHours: totalOTHours,
                lateHours: totalLateHours,
                undertimeHours: totalUndertimeHours,
                absentDays: totalAbsentDays,
                leaveDays: totalLeaveDays,
                basePay,
                absenceDeduction:   cappedAbsenceDeduction,
                undertimeDeduction: cappedUndertimeDeduction,
                lateDeduction:      cappedLateDeduction,
                leavePay,
                adjustment,
                totalBasicPay,
                isPositiveCrediting,
                sssDeduction,
                phicDeduction,
                hdmfDeduction,
                hdmf2Deduction,
                subTotalGovtDues,
                ndPay,
                otPay,
                holidayPay,
                grossTaxableIncome,
                taxDeduction,
                hmoDeduction: 0,
                sssLoan: 0,
                hdmfLoan: 0,
                companyLoan: 0,
                otherDeduction: 0,
                subTotalDeductions,
                diemAllowance,
                allowance,
                subTotalAdditions,
                grossPay,
                netPay,
                // ── Rate snapshot ───────────────────────────────────────────────────
                regularOTRate: rates.regularOTRate,
                nightDiffRate: rates.nightDiffRate,
                ndStartTime: rates.ndStartTime,
                ndEndTime: rates.ndEndTime,
                holidayRegularRate: rates.holidayRegularRate,
                holidaySpecialRate: rates.holidaySpecialRate,
                workFactor: resolvedWorkFactor,
            };

            const record = await prisma.payrollRecord.upsert({
                where: {
                    payrollPeriodId_employeeId: {
                        payrollPeriodId: periodId,
                        employeeId: employee.id
                    }
                },
                update: sharedData,
                create: {
                    payrollPeriodId: periodId,
                    employeeId: employee.id,
                    ...sharedData,
                }
            });

            records.push(record);
        }

        await prisma.payrollPeriod.update({
            where: { id: periodId },
            data: { status: 'Completed' }
        });

        return NextResponse.json({
            message: 'Payroll processed successfully',
            count: records.length,
            rates,   // Echo back the resolved rates for transparency
        });

    } catch (error: any) {
        console.error('Error processing payroll:', error);
        return NextResponse.json({ error: 'Failed to process payroll', details: error.message }, { status: 500 });
    }
}
