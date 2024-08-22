"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageToReviewChildProxy = void 0;
const MessageProxy_1 = require("./MessageProxy");
class MessageToReviewChildProxy extends MessageProxy_1.MessageToChildProxy {
    constructor(scriptPath, argv) {
        super(scriptPath, [`--historyDir=${argv.historyDir}`]);
    }
}
exports.MessageToReviewChildProxy = MessageToReviewChildProxy;
