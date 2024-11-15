import { ChildProcess } from 'child_process';
export interface processMessage {
    id?: string;
    key?: string;
    data?: any;
}
export declare class MessageToMasterProxy<T = {
    [key: string]: (...args: any[]) => Promise<any>;
}> {
    private promiseMap;
    proxyFn: T;
    constructor();
    private sendMessage;
    private receivedMessage;
}
export declare class MessageToChildProxy<T = {
    [key: string]: (...args: any[]) => Promise<any>;
}> {
    private scriptPath;
    private arg;
    private inspectNumber;
    childProcessAlive: boolean;
    private childProcess?;
    private promiseMap;
    proxyFn: T;
    constructor(scriptPath: string, arg: string[], inspectNumber: number);
    initProcess(): ChildProcess;
    get pid(): number | undefined;
    private sendMessage;
    private receivedMessage;
    log(...payloads: any[]): Promise<void>;
}
