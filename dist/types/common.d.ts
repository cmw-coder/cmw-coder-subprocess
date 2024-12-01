export declare enum NetworkZone {
    Normal = "Normal",
    Public = "Public",
    Secure = "Secure",
    Unknown = "Unknown"
}
export interface AppConfig {
    networkZone: NetworkZone;
    baseServerUrl: string;
    username: string;
    token: string;
    refreshToken: string;
    activeTemplate: string;
    activeModel: string;
    activeModelKey: string;
    activeChat: string;
    locale: string;
    useMultipleChat: boolean;
    useEnterSend: boolean;
    darkMode: boolean;
    developerMode: boolean;
    showSelectedTipsWindow: boolean;
    completionConfigs: any;
}
export declare class CaretPosition {
    readonly character: number;
    readonly line: number;
    constructor(line?: number, character?: number);
    get isValid(): boolean;
    compareTo(other: CaretPosition): -1 | 0 | 1;
}
export declare class Selection {
    readonly begin: CaretPosition;
    readonly end: CaretPosition;
    constructor(begin?: CaretPosition, end?: CaretPosition);
    get isValid(): boolean;
}
