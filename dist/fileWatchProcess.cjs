/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it uses a non-standard name for the exports (exports).
(() => {
var exports = __webpack_exports__;

Object.defineProperty(exports, "__esModule", ({ value: true }));
// 冒泡排序
function bubbleSort2(arr) {
    const len = arr.length;
    for (let i = 0; i < len; i++) {
        for (let j = 0; j < len - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}
const arr = [1, 4, 2, 3, 5];
console.log(bubbleSort2(arr));
exports["default"] = bubbleSort2;

})();

module.exports = __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=fileWatchProcess.cjs.map