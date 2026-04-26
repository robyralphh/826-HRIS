import ZKLib from 'zkteco-js';

export class ZKService {
    private ip: string;
    private port: number;
    private zkInstance: any;

    constructor(ip: string, port: number = 4370) {
        this.ip = ip;
        this.port = port;
    }

    async connect() {
        try {
            // Updated timeouts to match official documentation: 5200 for connection, 5000 for data
            this.zkInstance = new ZKLib(this.ip, this.port, 5200, 5000);
            await this.zkInstance.createSocket();
            return true;
        } catch (error) {
            console.error(`Failed to connect to ZK device at ${this.ip}:`, error);
            return false;
        }
    }

    async getInfo() {
        if (!this.zkInstance) await this.connect();
        try {
            return await this.zkInstance.getInfo();
        } catch (error) {
            console.error(`Failed to get info from ZK device at ${this.ip}:`, error);
            return null;
        }
    }

    async setTime(date: Date) {
        if (!this.zkInstance) await this.connect();
        try {
            await this.zkInstance.setTime(date);
            console.log(`[ZKService] Successfully pushed system time (${date.toLocaleString()}) to ${this.ip}`);
            return true;
        } catch (error) {
            console.error(`Failed to sync time to ZK device at ${this.ip}:`, error);
            return false;
        }
    }

    async getAttendanceLogs(): Promise<any[]> {
        if (!this.zkInstance) await this.connect();
        
        try {
            const logs = await this.zkInstance.getAttendances();
            return logs.data || [];
        } catch (error) {
            console.error(`Failed to fetch logs from ZK device at ${this.ip}:`, error);
            throw error;
        }
    }

    async disconnect() {
        if (this.zkInstance) {
            try {
                await this.zkInstance.disconnect();
            } catch (error) {
                console.error(`Error disconnecting from ZK device at ${this.ip}:`, error);
            }
        }
    }
}
