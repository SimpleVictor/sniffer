import {Server as WebSocketServer} from "ws";
import {spawn, ChildProcess} from "child_process";
import {parse as parseURL, Url} from "url";
import {get as httpGet} from "http";
import {get as httpsGet} from "https";
import {createConnection } from "net";
import { config } from './config';


const proxyPort = "5065";
const webProxyPort = "5050";
let commandArgs = [
  "-p",
  proxyPort,
  "--insecure",
  "--anticache",
  "-q",
  "-s",
  process.cwd() + "/mitmscripts/proxy.py"
];

const upstreamProxyUrl = config.proxyUrl;

if(upstreamProxyUrl) {
  const arr = ['-U', upstreamProxyUrl];
  commandArgs = [...arr, ...commandArgs];
}

function waitForPort(port: number, retries = 10, interval = 500): Promise<void> {
  return new Promise<void>((pResolve: any, pReject: any) => {
    let retriesRemaining = retries;
    let retryInterval = interval;
    let timer: any = null;
    let socket: any = null;
    function clearTimerAndDestroySocket(): void {
      clearTimeout(timer);
      timer = null;
      if (socket) {
        socket.destroy();
      }
      socket = null;
    }
    function retry(): void {
      tryToConnect();
    }
    function tryToConnect(): void {
      clearTimerAndDestroySocket();

      if (--retriesRemaining < 0) {
        pReject(new Error("out of retries"));
      }
      socket = createConnection(port, "localhost", (): void => {
        clearTimerAndDestroySocket();
        if (retriesRemaining >= 0) {
          pResolve();
        }
      });
      timer = setTimeout((): void => retry(), retryInterval);
      socket.on("error", (err: any): void => {
        clearTimerAndDestroySocket();
        setTimeout(retry, retryInterval);
      });
    }
    tryToConnect();
  });
}

export type Interceptor = (m: InterceptedHTTPMessage) => void;

export function nopInterceptor(m: InterceptedHTTPMessage): void {
  return;
}

export interface HTTPResponse {
  statusCode: number;
  headers: {[name: string]: string};
  body: Buffer;
}

interface HTTPMessageMetadata {
  request: HTTPRequestMetadata;
  response: HTTPResponseMetadata;
}

export interface HTTPRequestMetadata {
  method: string;
  url: string;
  headers: [string, string][];
}

export interface HTTPResponseMetadata {
  status_code: number;
  headers: [string, string][];
}

export abstract class AbstractHTTPHeaders {
  public _headers: [string, string][];
  public get headers(): [string, string][] {
    return this._headers;
  }
  constructor(headers: [string, string][]) {
    this._headers = headers;
  }
  public _indexOfHeader(name: string): number {
    const headers = this.headers;
    const len = headers.length;
    for (let i = 0; i < len; i++) {
      if (headers[i][0].toLowerCase() === name) {
        return i;
      }
    }
    return -1;
  }

  public getHeader(name: string): string {
    const index = this._indexOfHeader(name.toLowerCase());
    if (index !== -1) {
      return this.headers[index][1];
    }
    return "";
  }

  public setHeader(name: string, value: string): void {
    const index = this._indexOfHeader(name.toLowerCase());
    if (index !== -1) {
      this.headers[index][1] = value;
    } else {
      this.headers.push([name, value]);
    }
  }

  public removeHeader(name: string): void {
    const index = this._indexOfHeader(name.toLowerCase());
    if (index !== -1) {
      this.headers.splice(index, 1);
    }
  }

  public clearHeaders(): void {
    this._headers = [];
  }
}

export class InterceptedHTTPResponse extends AbstractHTTPHeaders {
  public statusCode: number;
  constructor(metadata: HTTPResponseMetadata) {
    super(metadata.headers);
    this.statusCode = metadata.status_code;
    this.removeHeader("transfer-encoding");
    this.removeHeader("content-encoding");
    this.removeHeader("content-security-policy");
    this.removeHeader("x-webkit-csp");
    this.removeHeader("x-content-security-policy");
  }

  public toJSON(): HTTPResponseMetadata {
    return {
      status_code: this.statusCode,
      headers: this.headers
    };
  }
}

export class InterceptedHTTPRequest extends AbstractHTTPHeaders {
  public method: string;
  public rawUrl: string;
  public url: Url;

  constructor(metadata: HTTPRequestMetadata) {
    super(metadata.headers);
    this.method = metadata.method.toLowerCase();
    this.rawUrl = metadata.url;
    this.url = parseURL(this.rawUrl);
  }
}

export class InterceptedHTTPMessage {
  public readonly request: InterceptedHTTPRequest;
  public readonly response: InterceptedHTTPResponse;
  public readonly requestBody: Buffer;
  public _responseBody: Buffer;

  public static FromBuffer(b: Buffer): InterceptedHTTPMessage {
    const metadataSize = b.readInt32LE(0);
    const requestSize = b.readInt32LE(4);
    const responseSize = b.readInt32LE(8);
    const metadata: HTTPMessageMetadata = JSON.parse(b.toString("utf8", 12, 12 + metadataSize));
    return new InterceptedHTTPMessage(
      new InterceptedHTTPRequest(metadata.request),
      new InterceptedHTTPResponse(metadata.response),
      b.slice(12 + metadataSize, 12 + metadataSize + requestSize),
      b.slice(12 + metadataSize + requestSize, 12 + metadataSize + requestSize + responseSize)
    );
  }

  constructor(request: InterceptedHTTPRequest, response: InterceptedHTTPResponse, requestBody: Buffer, responseBody: Buffer) {
    this.request = request;
    this.response = response;
    this.requestBody = requestBody;
    this._responseBody = responseBody;
  }

  public get responseBody(): Buffer {
    return this._responseBody;
  }

  public setStatusCode(status: number): void {
    this.response.statusCode = status;
  }

  public addNewHeader(name: string, value: string): void {
    this.response.setHeader(name, value);
  }

  public setResponseBody(b: Buffer): void {
    this._responseBody = b;
    this.response.setHeader("content-length", `${b.length}`);
  }

  public toBuffer(): Buffer {
    const metadata = Buffer.from(JSON.stringify(this.response), "utf8");
    const metadataLength = metadata.length;
    const responseLength = this._responseBody.length;
    const rv = Buffer.alloc(8 + metadataLength + responseLength);
    rv.writeInt32LE(metadataLength, 0);
    rv.writeInt32LE(responseLength, 4);
    metadata.copy(rv, 8);
    this._responseBody.copy(rv, 8 + metadataLength);
    return rv;
  }

}

export class StashedItem {
  constructor(
    public readonly rawUrl: string,
    public readonly mimeType: string,
    public readonly data: Buffer) {}

  public get shortMimeType(): string {
    let mime = this.mimeType.toLowerCase();
    if (mime.indexOf(";") !== -1) {
      mime = mime.slice(0, mime.indexOf(";"));
    }
    return mime;
  }

  public get isHtml(): boolean {
    return this.shortMimeType === "text/html";
  }

  public get isJavaScript(): boolean {
    switch (this.shortMimeType) {
      case "text/javascript":
      case "application/javascript":
      case "text/x-javascript":
      case "application/x-javascript":
        return true;
      default:
        return false;
    }
  }
}

export class MITMProxy {
  private static _activeProcesses: ChildProcess[] = [];
  private static _cleanupCalled: any = false;

  public cb: Interceptor;
  public _mitmError: any;

  private _stashEnabled: any = false;
  private _mitmProcess: any = null;
  private _wss: WebSocketServer = null;
  private _stash: any = new Map<string, StashedItem>();

  public static async Create(cb: Interceptor = nopInterceptor): Promise<MITMProxy> {
    const wss = new WebSocketServer({ port: Number(webProxyPort) });
    const proxyConnected = new Promise<void>((pResolve: any, pReject: any) => {
      wss.once("connection", () => {
        pResolve();
      });
    });
    const mp = new MITMProxy(cb);
    mp._initializeWSS(wss);
    await new Promise<void>((pResolve: any, pReject: any) => {
      wss.once("listening", () => {
        wss.removeListener("error", pReject);
        pResolve();
      });
      wss.once("error", pReject);
    });

    try {
      await waitForPort(Number(proxyPort), 1);
      console.log(`MITMProxy already running.`);
    } catch (e) {
      console.log(`MITMProxy not running; starting up mitmproxy.`);
      const mitmProcess = spawn("mitmdump", commandArgs, {
        stdio: "inherit"
      });
      if (MITMProxy._activeProcesses.push(mitmProcess) === 1) {
        process.on("SIGINT", MITMProxy._cleanup);
        process.on("exit", MITMProxy._cleanup);
      }
      mp._initializeMITMProxy(mitmProcess);
      await waitForPort(Number(proxyPort));
    }
    await proxyConnected;

    return mp;
  }

  private static _cleanup(): void {
    if (MITMProxy._cleanupCalled) {
      return;
    }
    MITMProxy._cleanupCalled = true;
    MITMProxy._activeProcesses.forEach((p: any) => {
      p.kill("SIGKILL");
    });
  }

  constructor(cb: Interceptor) {
    this.cb = cb;
  }

  public get stashEnabled(): boolean {
    return this._stashEnabled;
  }
  public set stashEnabled(v: boolean) {
    if (!v) {
      this._stash.clear();
    }
    this._stashEnabled = v;
  }

  public getFromStash(url: string): StashedItem {
    return this._stash.get(url);
  }

  public forEachStashItem(cb: (value: StashedItem, url: string) => void): void {
    this._stash.forEach(cb);
  }

  public async proxyGet(urlString: string): Promise<HTTPResponse> {
    const url = parseURL(urlString);
    const get: any = url.protocol === "http:" ? httpGet : httpsGet;
    return new Promise<HTTPResponse>((pResolve: any, pReject: any) => {
      const req = get({
        url: urlString,
        headers: {
          host: url.host
        },
        host: "localhost",
        port: Number(proxyPort),
        path: urlString
      }, (res: any) => {
        const data = new Array<Buffer>();
        res.on("data", (chunk: Buffer) => {
          data.push(chunk);
        });
        res.on("end", () => {
          const d = Buffer.concat(data);
          pResolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: d
          });
        });
        res.once("error", pReject);
      });
      req.once("error", pReject);
    });
  }

  public async shutdown(): Promise<void> {
    return new Promise<void>((pResolve: any, pReject: any) => {
      const closeWSS = () => {
        this._wss.close((err: any): void => {
          if (err) {
            pReject(err);
          } else {
            pResolve();
          }
        });
      };

      if (this._mitmProcess && this._mitmProcess.connected) {
        this._mitmProcess.once("exit", (code: any, signal: any) => {
          closeWSS();
        });
        this._mitmProcess.kill();
      } else {
        closeWSS();
      }
    });
  }

  public async shutDownWebSocket(): Promise<void> {
    return new Promise<void>((wsResolve: any, wsReject: any) => {
      this._wss.close((err: any): void => {
        if (err) {
          wsReject(err);
        } else {
          wsResolve();
        }
      });
    })
  }

  private _initializeWSS(wss: WebSocketServer): void {
    this._wss = wss;
    this._wss.on("connection", (ws: any) => {
      ws.on("message", (message: Buffer) => {
        const original = InterceptedHTTPMessage.FromBuffer(message);
        this.cb(original);
        if (this._stashEnabled) {
          this._stash.set(original.request.rawUrl,
            new StashedItem(original.request.rawUrl, original.response.getHeader("content-type"), original.responseBody));
        }
        ws.send(original.toBuffer());
      });
    });
  }

  private _initializeMITMProxy(mitmProxy: ChildProcess): void {
    this._mitmProcess = mitmProxy;
    this._mitmProcess.on("exit", (code: any, signal: any) => {
      const index = MITMProxy._activeProcesses.indexOf(this._mitmProcess);
      if (index !== -1) {
        MITMProxy._activeProcesses.splice(index, 1);
      }
      if (code !== null) {
        if (code !== 0) {
          this._mitmError = new Error(`Process exited with code ${code}.`);
        }
      } else {
        this._mitmError = new Error(`Process exited due to signal ${signal}.`);
      }
    });
    this._mitmProcess.on("error", (err: any) => {
      this._mitmError = err;
    });
  }
}
