import { ChildProcess, fork } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// 在主进程实例化，用于接受子进程消息
export class ChildProcessMessage {
  private childProcess: ChildProcess;
  private promiseMap = new Map<string, (value: any) => void>();

  constructor(private scriptPath: string) {
    this.childProcess = fork(this.scriptPath, {
      ...process.env,
      // @ts-ignore
      ELECTRON_RUN_AS_NODE: '',
      useNodeIpc: '',
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

  sendMessage<T>(key: string, data: any) {
    return new Promise<T>((resolve) => {
      const id = uuidv4();
      this.childProcess.send({
        id,
        key,
        data,
      });
      this.promiseMap.set(id, resolve);
    });
  }

  receivedMessage({ id, data }: { id: string; data: any }) {
    const resolve = this.promiseMap.get(id);
    if (resolve) {
      resolve(data);
      this.promiseMap.delete(id);
    }
  }
}
