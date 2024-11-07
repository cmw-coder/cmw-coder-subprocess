"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageToSimilarSnippetsChildProxy = void 0;
const MessageProxy_1 = require("./MessageProxy");
class MessageToSimilarSnippetsChildProxy extends MessageProxy_1.MessageToChildProxy {
    constructor(scriptPath) {
        super(scriptPath, [], 5869);
    }
}
exports.MessageToSimilarSnippetsChildProxy = MessageToSimilarSnippetsChildProxy;
