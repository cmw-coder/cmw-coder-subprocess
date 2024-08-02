"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeout = void 0;
const timeout = (time = 0) => {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
};
exports.timeout = timeout;
