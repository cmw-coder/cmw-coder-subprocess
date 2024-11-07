"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageToChildProxy = exports.MessageToMasterProxy = void 0;
const uuid_1 = require("uuid");
const child_process_1 = require("child_process");
// 在子进程实例化，用于接受主进程消息
class MessageToMasterProxy {
    constructor() {
        this.promiseMap = new Map();
        this.proxyFn = new Proxy({}, {
            get: (_, functionName) => (...payloads) => this.sendMessage({
                key: functionName,
                data: payloads,
            }),
        });
        process.on('message', this.receivedMessage.bind(this));
    }
    sendMessage(message) {
        if (!process.send) {
            throw new Error('process.send is not defined');
        }
        const { id, key, data } = message;
        if (id) {
            // 子进程执行结果发送给主进程
            process.send({
                id,
                data,
            });
        }
        else {
            // 子进程发送消息给主进程执行
            const _id = (0, uuid_1.v4)();
            if (key) {
                process.send({
                    id: _id,
                    key,
                    data,
                });
                return new Promise((resolve) => {
                    this.promiseMap.set(_id, resolve);
                });
            }
        }
    }
    async receivedMessage(message) {
        const { id, key, data } = message;
        if (key && id) {
            // 主进程 ---> 子进程执行 (data: 子进程执行参数)
            // @ts-ignore
            const fn = this[key];
            if (typeof fn === 'function') {
                const result = await fn.bind(this)(...data);
                this.sendMessage({
                    id,
                    data: result,
                });
            }
        }
        if (!key && id) {
            // 主进程 ---> 子进程  (data: 主进程执行结果)
            const resolve = this.promiseMap.get(id);
            if (resolve) {
                resolve(data);
                this.promiseMap.delete(id);
            }
        }
    }
}
exports.MessageToMasterProxy = MessageToMasterProxy;
// 在主进程实例化，用于接受子进程消息
class MessageToChildProxy {
    constructor(scriptPath, arg, inspectNumber) {
        this.scriptPath = scriptPath;
        this.promiseMap = new Map();
        this.proxyFn = new Proxy({}, {
            get: (_, functionName) => (...payloads) => this.sendMessage({
                key: functionName,
                data: payloads,
            }),
        });
        this.childProcess = (0, child_process_1.fork)(this.scriptPath, arg, {
            execArgv: [`--inspect=${inspectNumber}`],
        });
        console.log(`[${this.childProcess.pid}]  ${scriptPath}`);
        this.childProcess.on('close', (code) => {
            console.log(`[${this.childProcess.pid}]  exit with code ${code}`);
        });
        this.childProcess.on('message', this.receivedMessage.bind(this));
        this.childProcess.on('error', (err) => {
            console.error(`[${this.childProcess.pid}]  error`, err);
        });
    }
    get pid() {
        return this.childProcess.pid;
    }
    sendMessage(message) {
        const { id, key, data } = message;
        if (id) {
            // 主进程执行结果发送给子进程
            this.childProcess.send({
                id,
                data,
            });
        }
        else {
            // 主进程发送消息给子进程执行
            const _id = (0, uuid_1.v4)();
            if (key) {
                this.childProcess.send({
                    id: _id,
                    key,
                    data,
                });
                return new Promise((resolve) => {
                    this.promiseMap.set(_id, resolve);
                });
            }
        }
    }
    async receivedMessage(message) {
        const { id, key, data } = message;
        if (key && id) {
            // 子进程 ---> 主进程执行 (data: 主进程执行参数)
            // @ts-ignore
            const fn = this[key];
            if (typeof fn === 'function') {
                const result = await fn.bind(this)(...data);
                this.sendMessage({
                    id,
                    data: result,
                });
            }
        }
        if (!key && id) {
            // 子进程 ---> 主进程  (data: 子进程执行结果)
            const resolve = this.promiseMap.get(id);
            if (resolve) {
                resolve(data);
                this.promiseMap.delete(id);
            }
        }
    }
}
exports.MessageToChildProxy = MessageToChildProxy;
