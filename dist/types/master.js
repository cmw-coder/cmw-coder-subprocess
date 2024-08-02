"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Range = exports.Position = exports.NetworkZone = void 0;
var NetworkZone;
(function (NetworkZone) {
    // 红区
    NetworkZone["Normal"] = "Normal";
    // 黄、绿区
    NetworkZone["Public"] = "Public";
    // 路由红区
    NetworkZone["Secure"] = "Secure";
    // 未知 -- 默认值
    NetworkZone["Unknown"] = "Unknown";
})(NetworkZone || (exports.NetworkZone = NetworkZone = {}));
class Position {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
    /**
     * Create a new position from this position.
     *
     * @param newLineNumber new line number
     * @param newColumn new character
     */
    with(newLineNumber = this.line, newColumn = this.character) {
        if (newLineNumber === this.line && newColumn === this.character) {
            return this;
        }
        else {
            return new Position(newLineNumber, newColumn);
        }
    }
    /**
     * Convert to a human-readable representation.
     */
    toString() {
        return '(' + this.line + ',' + this.character + ')';
    }
}
exports.Position = Position;
class Range {
    constructor(startLine, startCharacter, endLine, endCharacter) {
        if (startLine > endLine ||
            (startLine === endLine && startCharacter > endCharacter)) {
            this.start = new Position(endLine, endCharacter);
            this.end = new Position(startLine, startCharacter);
        }
        else {
            this.start = new Position(startLine, startCharacter);
            this.end = new Position(endLine, endCharacter);
        }
    }
}
exports.Range = Range;
