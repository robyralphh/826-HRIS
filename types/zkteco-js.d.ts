declare module 'zkteco-js' {
    export default class ZKLib {
        constructor(ip: string, port: number, timeout: number, inport: number);
        createSocket(): Promise<void>;
        getAttendances(): Promise<{ data: any[] }>;
        disconnect(): Promise<void>;
        
        // Newer methods from documentation
        setTime(dateTime: Date): Promise<void>;
        getTime(): Promise<Date>;
        getUsers(): Promise<{ data: any[] }>;
        setUser(uid: number, userid: string, name: string, password: string, role?: number, cardno?: number): Promise<void>;
        deleteUser(uid: number): Promise<void>;
        getAttendanceSize(): Promise<number>;
        getDeviceName(): Promise<string>;
        getDeviceVersion(): Promise<string>;
    }
}
