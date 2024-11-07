"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Feedback = exports.ReviewType = exports.reviewStateIconMap = exports.ReviewState = exports.SymbolType = void 0;
var SymbolType;
(function (SymbolType) {
    SymbolType["Enum"] = "Enum";
    SymbolType["Function"] = "Function";
    SymbolType["Macro"] = "Macro";
    SymbolType["Reference"] = "Reference";
    SymbolType["Struct"] = "Struct";
    SymbolType["Unknown"] = "Unknown";
    SymbolType["Variable"] = "Variable";
})(SymbolType || (exports.SymbolType = SymbolType = {}));
var ReviewState;
(function (ReviewState) {
    ReviewState["Queue"] = "Queue";
    ReviewState["Ready"] = "Ready";
    ReviewState[ReviewState["References"] = 0] = "References";
    ReviewState[ReviewState["Start"] = 1] = "Start";
    /**
     * @deprecated
     */
    ReviewState[ReviewState["First"] = 2] = "First";
    /**
     * @deprecated
     */
    ReviewState[ReviewState["Second"] = 3] = "Second";
    /**
     * @deprecated
     */
    ReviewState[ReviewState["Third"] = 4] = "Third";
    ReviewState[ReviewState["Finished"] = 100] = "Finished";
    ReviewState[ReviewState["Error"] = -1] = "Error";
})(ReviewState || (exports.ReviewState = ReviewState = {}));
exports.reviewStateIconMap = {
    [ReviewState.Queue]: {
        color: 'gray-6',
        icon: 'mdi-human-queue',
    },
    [ReviewState.Ready]: {
        color: 'blue-6',
        icon: 'mdi-comment-text-outline',
    },
    [ReviewState.References]: {
        color: 'cyan-6',
        icon: 'mdi-robot-mower-outline',
    },
    [ReviewState.Start]: {
        color: 'blue-6',
        icon: 'mdi-clock-outline',
    },
    [ReviewState.Finished]: {
        color: 'green-8',
        icon: 'mdi-check-circle-outline',
    },
    [ReviewState.Error]: {
        color: 'red-8',
        icon: 'mdi-alert-circle-outline',
    },
    [ReviewState.First]: {
        color: 'blue-6',
        icon: 'mdi-comment-text-outline',
    },
    [ReviewState.Second]: {
        color: 'blue-6',
        icon: 'mdi-comment-text-outline',
    },
    [ReviewState.Third]: {
        color: 'blue-6',
        icon: 'mdi-comment-text-outline',
    },
};
var ReviewType;
(function (ReviewType) {
    ReviewType["File"] = "File";
    ReviewType["Function"] = "Function";
})(ReviewType || (exports.ReviewType = ReviewType = {}));
var Feedback;
(function (Feedback) {
    Feedback["None"] = "None";
    Feedback["Helpful"] = "Helpful";
    Feedback["NotHelpful"] = "NotHelpful";
})(Feedback || (exports.Feedback = Feedback = {}));
