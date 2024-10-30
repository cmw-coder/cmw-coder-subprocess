"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageToDiffChildProxy = void 0;
const MessageProxy_1 = require("./MessageProxy");
class MessageToDiffChildProxy extends MessageProxy_1.MessageToChildProxy {
    constructor(scriptPath) {
        super(scriptPath, [], 5872);
    }
}
exports.MessageToDiffChildProxy = MessageToDiffChildProxy;
