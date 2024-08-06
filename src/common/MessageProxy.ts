import { v4 as uuidv4 } from 'uuid';
import { ChildProcess, fork } from 'child_process';
import { ReviewProcessArgv } from 'types/argv';

export interface processMessage {
  id?: string;
  key?: string;
  data?: any;
}

// 在子进程实例化，用于接受主进程消息
export class MessageToMasterProxy<
  T = {
    [key: string]: (...args: any[]) => Promise<any>;
  },
> {
  private promiseMap = new Map<string, (data: any) => void>();
  proxyFn = new Proxy(
    {},
    {
      get:
        (_, functionName: string) =>
        (...payloads: never[]) =>
          this.sendMessage({
            key: functionName,
            data: payloads[0],
          }),
    },
  ) as T;
  constructor() {
    process.on('message', this.receivedMessage.bind(this));
  }

  private sendMessage(message: processMessage) {
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
    } else {
      // 子进程发送消息给主进程执行
      const _id = uuidv4();
      if (key) {
        process.send({
          id: _id,
          key,
          data,
        });
        return new Promise<any>((resolve) => {
          this.promiseMap.set(_id, resolve);
        });
      }
    }
  }

  private async receivedMessage(message: processMessage) {
    const { id, key, data } = message;
    if (key && id) {
      // 主进程 ---> 子进程执行 (data: 子进程执行参数)
      // @ts-ignore
      const fn = this[key];
      if (typeof fn === 'function') {
        const result = await fn.bind(this)(data);
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

// 在主进程实例化，用于接受子进程消息
export class MessageToChildProxy<
  T = {
    [key: string]: (...args: any[]) => Promise<any>;
  },
> {
  private childProcess: ChildProcess;
  private promiseMap = new Map<string, (data: any) => void>();
  proxyFn = new Proxy(
    {},
    {
      get:
        (_, functionName: string) =>
        (...payloads: never[]) =>
          this.sendMessage({
            key: functionName,
            data: payloads[0],
          }),
    },
  ) as T;

  constructor(
    private scriptPath: string,
    argv: ReviewProcessArgv,
  ) {
    this.childProcess = fork(
      this.scriptPath,
      [`--historyDir=${argv.historyDir}`],
      {
        execArgv: ['--inspect']
      },
    );
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

  private sendMessage(message: processMessage) {
    const { id, key, data } = message;
    if (id) {
      // 主进程执行结果发送给子进程
      this.childProcess.send({
        id,
        data,
      });
    } else {
      // 主进程发送消息给子进程执行
      const _id = uuidv4();
      if (key) {
        this.childProcess.send({
          id: _id,
          key,
          data,
        });
        return new Promise<any>((resolve) => {
          this.promiseMap.set(_id, resolve);
        });
      }
    }
  }

  private async receivedMessage(message: processMessage) {
    const { id, key, data } = message;

    if (key && id) {
      // 子进程 ---> 主进程执行 (data: 主进程执行参数)
      // @ts-ignore
      const fn = this[key];
      if (typeof fn === 'function') {
        const result = await fn.bind(this)(data);
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
