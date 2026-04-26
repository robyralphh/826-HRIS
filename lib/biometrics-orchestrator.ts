import { prisma } from './prisma';
import { ZKService } from './zkteco';

export interface SyncResult {
    deviceId: string;
    deviceName: string;
    status: 'Success' | 'Failed';
    error?: string;
    logsFetched: number;
}

export class BiometricsOrchestration {
    /**
     * Sync all active biometric devices
     */
    static async syncAll(): Promise<SyncResult[]> {
        const devices = await prisma.biometricDevice.findMany({
            where: { 
                status: { in: ['Active', 'Offline'] }
            },
            include: { branch: true }
        });

        const results: SyncResult[] = [];
        for (const device of devices) {
            results.push(await this.syncDevice(device.id));
        }

        return results;
    }

    /**
     * Sync devices for a specific branch
     */
    static async syncBranch(branchId: string): Promise<SyncResult[]> {
        const devices = await prisma.biometricDevice.findMany({
            where: { 
                branchId, 
                status: { in: ['Active', 'Offline'] }
            },
            include: { branch: true }
        });

        const results: SyncResult[] = [];
        for (const device of devices) {
            results.push(await this.syncDevice(device.id));
        }

        return results;
    }

    /**
     * Phase 1: Fetch from device and save immutably to RawBiometricLog
     */
    static async syncDevice(deviceId: string): Promise<SyncResult> {
        const device = await prisma.biometricDevice.findUnique({
            where: { id: deviceId },
            include: { branch: true }
        });

        if (!device) {
            return { deviceId, deviceName: 'Unknown', status: 'Failed', error: 'Device not found', logsFetched: 0 };
        }

        const zk = new ZKService(device.ip, device.port);
        try {
            const connected = await zk.connect();
            if (!connected) throw new Error(`Could not connect to device ${device.name} at ${device.ip}`);

            // Automatically sync device time with server time to prevent clock drift
            await zk.setTime(new Date());
            
            const rawLogs = await zk.getAttendanceLogs();
            let logsFetched = 0;
            
            for (const rawLog of rawLogs) {
                const deviceUserId = rawLog.user_id || rawLog.deviceUserId || rawLog.userId || rawLog.id || rawLog.uid;
                const recordTime = rawLog.record_time || rawLog.recordTime || rawLog.timestamp || rawLog.time;
                let state = rawLog.state !== undefined ? parseInt(rawLog.state) : null;
                
                if (isNaN(state as number)) state = null;

                if (!deviceUserId) continue;
                if (!recordTime || isNaN(new Date(recordTime).getTime())) continue;

                const normalizedDeviceId = deviceUserId.toString().trim();
                const logDate = new Date(recordTime);

                try {
                    // Try to insert the raw log, ignoring duplicates via unique constraint
                    await prisma.rawBiometricLog.create({
                        data: {
                            deviceId: device.id,
                            deviceUserId: normalizedDeviceId,
                            timestamp: logDate,
                            state: state
                        }
                    });
                    logsFetched++;
                } catch (e: any) {
                    // Ignore P2002 Unique constraint failed (duplicate log)
                    if (e.code !== 'P2002') {
                        console.error('Error inserting raw log:', e);
                    }
                }
            }

            // Update device last sync status
            await prisma.biometricDevice.update({
                where: { id: deviceId },
                data: { 
                    lastSync: new Date(),
                    status: 'Active'
                }
            });

            await zk.disconnect();
            return { deviceId, deviceName: device.name, status: 'Success', logsFetched };

        } catch (error: any) {
            console.error(`[Biometrics] Sync failed for ${device.name}:`, error);
            await prisma.biometricDevice.update({
                where: { id: deviceId },
                data: { status: 'Offline' }
            });
            return { deviceId, deviceName: device.name, status: 'Failed', error: error.message, logsFetched: 0 };
        }
    }

    /**
     * Phase 2: Compute Attendance from unprocessed RawBiometricLogs
     */
    static async processRawLogs() {
        const unprocessedLogs = await prisma.rawBiometricLog.findMany({
            where: { isProcessed: false },
            orderBy: { timestamp: 'asc' } // Process chronological order
        });

        const results = { processed: 0, errors: 0 };

        for (const log of unprocessedLogs) {
            try {
                // 1. Find Employee
                const employee = await (prisma.employee as any).findFirst({
                    where: {
                        OR: [
                            { biometricId: log.deviceUserId },
                            { employeeNo: log.deviceUserId }
                        ]
                    }
                });

                if (!employee) {
                    await prisma.rawBiometricLog.update({
                        where: { id: log.id },
                        data: { isProcessed: true, processNote: "Employee not found for deviceUserId: " + log.deviceUserId }
                    });
                    results.errors++;
                    continue;
                }

                // 2. Determine Logical Shift Date (Midnight of the day in PH Context)
                const phParts = new Intl.DateTimeFormat('en-GB', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    timeZone: 'Asia/Manila'
                }).formatToParts(log.timestamp);
                
                const day = parseInt(phParts.find(p => p.type === 'day')?.value || '1');
                const month = parseInt(phParts.find(p => p.type === 'month')?.value || '1') - 1; // 0-based
                const year = parseInt(phParts.find(p => p.type === 'year')?.value || '1970');
                
                const dateOnly = new Date(Date.UTC(year, month, day)); // Store as UTC midnight for consistent querying

                // Find existing record
                const existingRecord = await prisma.attendance.findFirst({
                    where: {
                        employeeId: employee.id,
                        date: dateOnly
                    }
                });

                if (!existingRecord) {
                    // Create new record
                    // If log explicitly says Out (1), we still log it but might want to flag it in a robust system
                    await prisma.attendance.create({
                        data: {
                            employeeId: employee.id,
                            date: dateOnly,
                            timeIn: log.state === 1 ? null : log.timestamp, // If explicit OUT and no IN, leave IN null
                            timeOut: log.state === 1 ? log.timestamp : null,
                            status: 'Present'
                        }
                    });
                } else {
                    // Update existing record
                    const timeIn = existingRecord.timeIn ? new Date(existingRecord.timeIn) : null;
                    const timeOut = existingRecord.timeOut ? new Date(existingRecord.timeOut) : null;

                    // 5 min buffer to prevent double dipping on the device scanner
                    const FIVE_MINUTES = 5 * 60 * 1000;

                    const dataToUpdate: any = {};

                    if (log.state === 0) { // Explicit Check-In
                        if (!timeIn) dataToUpdate.timeIn = log.timestamp;
                    } 
                    else if (log.state === 1) { // Explicit Check-Out
                        // Only update if no existing timeout or latest time
                        if (!timeOut || log.timestamp.getTime() > timeOut.getTime()) {
                            dataToUpdate.timeOut = log.timestamp;
                        }
                    } 
                    else { // Unknown state
                        // Fallback logic
                        if (timeIn && log.timestamp.getTime() > timeIn.getTime() + FIVE_MINUTES) {
                            if (!timeOut || log.timestamp.getTime() > timeOut.getTime()) {
                                dataToUpdate.timeOut = log.timestamp;
                            }
                        } else if (!timeIn) {
                            dataToUpdate.timeIn = log.timestamp;
                        }
                    }

                    if (Object.keys(dataToUpdate).length > 0) {
                        await prisma.attendance.update({
                            where: { id: existingRecord.id },
                            data: dataToUpdate
                        });
                    }
                }

                // Mark processed
                await prisma.rawBiometricLog.update({
                    where: { id: log.id },
                    data: { isProcessed: true, processNote: 'Success' }
                });
                results.processed++;

            } catch (err: any) {
                console.error("Error processing log", log.id, err);
                await prisma.rawBiometricLog.update({
                    where: { id: log.id },
                    data: { isProcessed: true, processNote: err.message || "Unknown error" }
                });
                results.errors++;
            }
        }

        return results;
    }
}

