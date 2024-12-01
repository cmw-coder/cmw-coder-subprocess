"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Selection = exports.CaretPosition = exports.NetworkZone = void 0;
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
class CaretPosition {
    constructor(line = -1, character = -1) {
        this.character = character;
        this.line = line;
    }
    get isValid() {
        return this.line >= 0 && this.character >= 0;
    }
    compareTo(other) {
        if (this.line < other.line) {
            return -1;
        }
        else if (this.line > other.line) {
            return 1;
        }
        else if (this.character < other.character) {
            return -1;
        }
        else if (this.character > other.character) {
            return 1;
        }
        else {
            return 0;
        }
    }
}
exports.CaretPosition = CaretPosition;
class Selection {
    constructor(begin = new CaretPosition(), end = new CaretPosition()) {
        this.begin = new CaretPosition();
        this.end = new CaretPosition();
        if (begin.isValid && end.isValid) {
            if (begin.compareTo(end) > 0) {
                this.begin = end;
                this.end = begin;
            }
            else {
                this.begin = begin;
                this.end = end;
            }
        }
    }
    get isValid() {
        return this.begin.isValid && this.end.isValid;
    }
}
exports.Selection = Selection;
