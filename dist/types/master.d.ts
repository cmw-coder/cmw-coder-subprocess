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
export declare class Position {
    readonly line: number;
    readonly character: number;
    constructor(line: number, character: number);
    /**
     * Create a new position from this position.
     *
     * @param newLineNumber new line number
     * @param newColumn new character
     */
    with(newLineNumber?: number, newColumn?: number): Position;
    /**
     * Convert to a human-readable representation.
     */
    toString(): string;
}
export declare class Range {
    readonly start: Position;
    readonly end: Position;
    constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number);
}
