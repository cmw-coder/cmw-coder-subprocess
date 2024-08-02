"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeout = void 0;
exports.getFilesInDirectory = getFilesInDirectory;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const timeout = (time = 0) => {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
};
exports.timeout = timeout;
async function getFilesInDirectory(dir) {
    const files = [];
    const stack = [dir];
    while (stack.length > 0) {
        const currentDir = stack.pop();
        const entries = await fs_1.promises.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
            }
            else {
                files.push(fullPath);
            }
        }
    }
    return files;
}
