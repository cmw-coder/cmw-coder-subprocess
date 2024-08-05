import { ReviewProcessArgv } from '../types/argv';
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
    private childProcess;
    private promiseMap;
    proxyFn: T;
    constructor(scriptPath: string, argv: ReviewProcessArgv);
    get pid(): number | undefined;
    private sendMessage;
    private receivedMessage;
}
