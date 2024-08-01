import { v4 as uuidv4 } from 'uuid';

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
            data: payloads,
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
    if (data.id) {
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
    if (id) {
      // 主进程执行结果
      const resolve = this.promiseMap.get(id);
      if (resolve) {
        resolve(data);
        this.promiseMap.delete(id);
      }
    } else {
      // 主进程发送消息给子进程执行
      if (key) {
        // @ts-ignore
        const fn = this[key];
        if (typeof fn === 'function') {
          const result = await fn(data);
          this.sendMessage({
            id,
            data: result,
          });
        }
      }
    }
  }
}
