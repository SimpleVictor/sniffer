"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = require("ws");
const child_process_1 = require("child_process");
const url_1 = require("url");
const http_1 = require("http");
const https_1 = require("https");
const net_1 = require("net");
const config_1 = require("./config");
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
const upstreamProxyUrl = config_1.config.proxyUrl;
if (upstreamProxyUrl) {
    const arr = ['-U', upstreamProxyUrl];
    commandArgs = [...arr, ...commandArgs];
}
function waitForPort(port, retries = 10, interval = 500) {
    return new Promise((pResolve, pReject) => {
        let retriesRemaining = retries;
        let retryInterval = interval;
        let timer = null;
        let socket = null;
        function clearTimerAndDestroySocket() {
            clearTimeout(timer);
            timer = null;
            if (socket) {
                socket.destroy();
            }
            socket = null;
        }
        function retry() {
            tryToConnect();
        }
        function tryToConnect() {
            clearTimerAndDestroySocket();
            if (--retriesRemaining < 0) {
                pReject(new Error("out of retries"));
            }
            socket = net_1.createConnection(port, "localhost", () => {
                clearTimerAndDestroySocket();
                if (retriesRemaining >= 0) {
                    pResolve();
                }
            });
            timer = setTimeout(() => retry(), retryInterval);
            socket.on("error", (err) => {
                clearTimerAndDestroySocket();
                setTimeout(retry, retryInterval);
            });
        }
        tryToConnect();
    });
}
function nopInterceptor(m) {
    return;
}
exports.nopInterceptor = nopInterceptor;
class AbstractHTTPHeaders {
    get headers() {
        return this._headers;
    }
    constructor(headers) {
        this._headers = headers;
    }
    _indexOfHeader(name) {
        const headers = this.headers;
        const len = headers.length;
        for (let i = 0; i < len; i++) {
            if (headers[i][0].toLowerCase() === name) {
                return i;
            }
        }
        return -1;
    }
    getHeader(name) {
        const index = this._indexOfHeader(name.toLowerCase());
        if (index !== -1) {
            return this.headers[index][1];
        }
        return "";
    }
    setHeader(name, value) {
        const index = this._indexOfHeader(name.toLowerCase());
        if (index !== -1) {
            this.headers[index][1] = value;
        }
        else {
            this.headers.push([name, value]);
        }
    }
    removeHeader(name) {
        const index = this._indexOfHeader(name.toLowerCase());
        if (index !== -1) {
            this.headers.splice(index, 1);
        }
    }
    clearHeaders() {
        this._headers = [];
    }
}
exports.AbstractHTTPHeaders = AbstractHTTPHeaders;
class InterceptedHTTPResponse extends AbstractHTTPHeaders {
    constructor(metadata) {
        super(metadata.headers);
        this.statusCode = metadata.status_code;
        this.removeHeader("transfer-encoding");
        this.removeHeader("content-encoding");
        this.removeHeader("content-security-policy");
        this.removeHeader("x-webkit-csp");
        this.removeHeader("x-content-security-policy");
    }
    toJSON() {
        return {
            status_code: this.statusCode,
            headers: this.headers
        };
    }
}
exports.InterceptedHTTPResponse = InterceptedHTTPResponse;
class InterceptedHTTPRequest extends AbstractHTTPHeaders {
    constructor(metadata) {
        super(metadata.headers);
        this.method = metadata.method.toLowerCase();
        this.rawUrl = metadata.url;
        this.url = url_1.parse(this.rawUrl);
    }
}
exports.InterceptedHTTPRequest = InterceptedHTTPRequest;
class InterceptedHTTPMessage {
    static FromBuffer(b) {
        const metadataSize = b.readInt32LE(0);
        const requestSize = b.readInt32LE(4);
        const responseSize = b.readInt32LE(8);
        const metadata = JSON.parse(b.toString("utf8", 12, 12 + metadataSize));
        return new InterceptedHTTPMessage(new InterceptedHTTPRequest(metadata.request), new InterceptedHTTPResponse(metadata.response), b.slice(12 + metadataSize, 12 + metadataSize + requestSize), b.slice(12 + metadataSize + requestSize, 12 + metadataSize + requestSize + responseSize));
    }
    constructor(request, response, requestBody, responseBody) {
        this.request = request;
        this.response = response;
        this.requestBody = requestBody;
        this._responseBody = responseBody;
    }
    get responseBody() {
        return this._responseBody;
    }
    setStatusCode(status) {
        this.response.statusCode = status;
    }
    addNewHeader(name, value) {
        this.response.setHeader(name, value);
    }
    setResponseBody(b) {
        this._responseBody = b;
        this.response.setHeader("content-length", `${b.length}`);
    }
    toBuffer() {
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
exports.InterceptedHTTPMessage = InterceptedHTTPMessage;
class StashedItem {
    constructor(rawUrl, mimeType, data) {
        this.rawUrl = rawUrl;
        this.mimeType = mimeType;
        this.data = data;
    }
    get shortMimeType() {
        let mime = this.mimeType.toLowerCase();
        if (mime.indexOf(";") !== -1) {
            mime = mime.slice(0, mime.indexOf(";"));
        }
        return mime;
    }
    get isHtml() {
        return this.shortMimeType === "text/html";
    }
    get isJavaScript() {
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
exports.StashedItem = StashedItem;
class MITMProxy {
    constructor(cb) {
        this._stashEnabled = false;
        this._mitmProcess = null;
        this._wss = null;
        this._stash = new Map();
        this.cb = cb;
    }
    static Create(cb = nopInterceptor) {
        return __awaiter(this, void 0, void 0, function* () {
            const wss = new ws_1.Server({ port: Number(webProxyPort) });
            const proxyConnected = new Promise((pResolve, pReject) => {
                wss.once("connection", () => {
                    pResolve();
                });
            });
            const mp = new MITMProxy(cb);
            mp._initializeWSS(wss);
            yield new Promise((pResolve, pReject) => {
                wss.once("listening", () => {
                    wss.removeListener("error", pReject);
                    pResolve();
                });
                wss.once("error", pReject);
            });
            try {
                yield waitForPort(Number(proxyPort), 1);
                console.log(`MITMProxy already running.`);
            }
            catch (e) {
                console.log(`MITMProxy not running; starting up mitmproxy.`);
                const mitmProcess = child_process_1.spawn("mitmdump", commandArgs, {
                    stdio: "inherit"
                });
                if (MITMProxy._activeProcesses.push(mitmProcess) === 1) {
                    process.on("SIGINT", MITMProxy._cleanup);
                    process.on("exit", MITMProxy._cleanup);
                }
                mp._initializeMITMProxy(mitmProcess);
                yield waitForPort(Number(proxyPort));
            }
            yield proxyConnected;
            return mp;
        });
    }
    static _cleanup() {
        if (MITMProxy._cleanupCalled) {
            return;
        }
        MITMProxy._cleanupCalled = true;
        MITMProxy._activeProcesses.forEach((p) => {
            p.kill("SIGKILL");
        });
    }
    get stashEnabled() {
        return this._stashEnabled;
    }
    set stashEnabled(v) {
        if (!v) {
            this._stash.clear();
        }
        this._stashEnabled = v;
    }
    getFromStash(url) {
        return this._stash.get(url);
    }
    forEachStashItem(cb) {
        this._stash.forEach(cb);
    }
    proxyGet(urlString) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = url_1.parse(urlString);
            const get = url.protocol === "http:" ? http_1.get : https_1.get;
            return new Promise((pResolve, pReject) => {
                const req = get({
                    url: urlString,
                    headers: {
                        host: url.host
                    },
                    host: "localhost",
                    port: Number(proxyPort),
                    path: urlString
                }, (res) => {
                    const data = new Array();
                    res.on("data", (chunk) => {
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
        });
    }
    shutdown() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((pResolve, pReject) => {
                const closeWSS = () => {
                    this._wss.close((err) => {
                        if (err) {
                            pReject(err);
                        }
                        else {
                            pResolve();
                        }
                    });
                };
                if (this._mitmProcess && this._mitmProcess.connected) {
                    this._mitmProcess.once("exit", (code, signal) => {
                        closeWSS();
                    });
                    this._mitmProcess.kill();
                }
                else {
                    closeWSS();
                }
            });
        });
    }
    shutDownWebSocket() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((wsResolve, wsReject) => {
                this._wss.close((err) => {
                    if (err) {
                        wsReject(err);
                    }
                    else {
                        wsResolve();
                    }
                });
            });
        });
    }
    _initializeWSS(wss) {
        this._wss = wss;
        this._wss.on("connection", (ws) => {
            ws.on("message", (message) => {
                const original = InterceptedHTTPMessage.FromBuffer(message);
                this.cb(original);
                if (this._stashEnabled) {
                    this._stash.set(original.request.rawUrl, new StashedItem(original.request.rawUrl, original.response.getHeader("content-type"), original.responseBody));
                }
                ws.send(original.toBuffer());
            });
        });
    }
    _initializeMITMProxy(mitmProxy) {
        this._mitmProcess = mitmProxy;
        this._mitmProcess.on("exit", (code, signal) => {
            const index = MITMProxy._activeProcesses.indexOf(this._mitmProcess);
            if (index !== -1) {
                MITMProxy._activeProcesses.splice(index, 1);
            }
            if (code !== null) {
                if (code !== 0) {
                    this._mitmError = new Error(`Process exited with code ${code}.`);
                }
            }
            else {
                this._mitmError = new Error(`Process exited due to signal ${signal}.`);
            }
        });
        this._mitmProcess.on("error", (err) => {
            this._mitmError = err;
        });
    }
}
MITMProxy._activeProcesses = [];
MITMProxy._cleanupCalled = false;
exports.MITMProxy = MITMProxy;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2Vic29ja2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwyQkFBNkM7QUFDN0MsaURBQWtEO0FBQ2xELDZCQUEyQztBQUMzQywrQkFBb0M7QUFDcEMsaUNBQXNDO0FBQ3RDLDZCQUFzQztBQUN0QyxxQ0FBa0M7QUFHbEMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDO0FBQ3pCLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQztBQUM1QixJQUFJLFdBQVcsR0FBRztJQUNoQixJQUFJO0lBQ0osU0FBUztJQUNULFlBQVk7SUFDWixhQUFhO0lBQ2IsSUFBSTtJQUNKLElBQUk7SUFDSixPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsdUJBQXVCO0NBQ3hDLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLGVBQU0sQ0FBQyxRQUFRLENBQUM7QUFFekMsSUFBRyxnQkFBZ0IsRUFBRTtJQUNuQixNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3JDLFdBQVcsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUM7Q0FDeEM7QUFFRCxTQUFTLFdBQVcsQ0FBQyxJQUFZLEVBQUUsT0FBTyxHQUFHLEVBQUUsRUFBRSxRQUFRLEdBQUcsR0FBRztJQUM3RCxPQUFPLElBQUksT0FBTyxDQUFPLENBQUMsUUFBYSxFQUFFLE9BQVksRUFBRSxFQUFFO1FBQ3ZELElBQUksZ0JBQWdCLEdBQUcsT0FBTyxDQUFDO1FBQy9CLElBQUksYUFBYSxHQUFHLFFBQVEsQ0FBQztRQUM3QixJQUFJLEtBQUssR0FBUSxJQUFJLENBQUM7UUFDdEIsSUFBSSxNQUFNLEdBQVEsSUFBSSxDQUFDO1FBQ3ZCLFNBQVMsMEJBQTBCO1lBQ2pDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwQixLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ2IsSUFBSSxNQUFNLEVBQUU7Z0JBQ1YsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ2xCO1lBQ0QsTUFBTSxHQUFHLElBQUksQ0FBQztRQUNoQixDQUFDO1FBQ0QsU0FBUyxLQUFLO1lBQ1osWUFBWSxFQUFFLENBQUM7UUFDakIsQ0FBQztRQUNELFNBQVMsWUFBWTtZQUNuQiwwQkFBMEIsRUFBRSxDQUFDO1lBRTdCLElBQUksRUFBRSxnQkFBZ0IsR0FBRyxDQUFDLEVBQUU7Z0JBQzFCLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7YUFDdEM7WUFDRCxNQUFNLEdBQUcsc0JBQWdCLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxHQUFTLEVBQUU7Z0JBQ3RELDBCQUEwQixFQUFFLENBQUM7Z0JBQzdCLElBQUksZ0JBQWdCLElBQUksQ0FBQyxFQUFFO29CQUN6QixRQUFRLEVBQUUsQ0FBQztpQkFDWjtZQUNILENBQUMsQ0FBQyxDQUFDO1lBQ0gsS0FBSyxHQUFHLFVBQVUsQ0FBQyxHQUFTLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxhQUFhLENBQUMsQ0FBQztZQUN2RCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQVEsRUFBUSxFQUFFO2dCQUNwQywwQkFBMEIsRUFBRSxDQUFDO2dCQUM3QixVQUFVLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBQ25DLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUNELFlBQVksRUFBRSxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUlELFNBQWdCLGNBQWMsQ0FBQyxDQUF5QjtJQUN0RCxPQUFPO0FBQ1QsQ0FBQztBQUZELHdDQUVDO0FBd0JELE1BQXNCLG1CQUFtQjtJQUV2QyxJQUFXLE9BQU87UUFDaEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQ3ZCLENBQUM7SUFDRCxZQUFZLE9BQTJCO1FBQ3JDLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO0lBQzFCLENBQUM7SUFDTSxjQUFjLENBQUMsSUFBWTtRQUNoQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzdCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFDM0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUM1QixJQUFJLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3hDLE9BQU8sQ0FBQyxDQUFDO2FBQ1Y7U0FDRjtRQUNELE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFDWixDQUFDO0lBRU0sU0FBUyxDQUFDLElBQVk7UUFDM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN0RCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRTtZQUNoQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDL0I7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNaLENBQUM7SUFFTSxTQUFTLENBQUMsSUFBWSxFQUFFLEtBQWE7UUFDMUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUN0RCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRTtZQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQztTQUNoQzthQUFNO1lBQ0wsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztTQUNsQztJQUNILENBQUM7SUFFTSxZQUFZLENBQUMsSUFBWTtRQUM5QixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFO1lBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztTQUMvQjtJQUNILENBQUM7SUFFTSxZQUFZO1FBQ2pCLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ3JCLENBQUM7Q0FDRjtBQTlDRCxrREE4Q0M7QUFFRCxNQUFhLHVCQUF3QixTQUFRLG1CQUFtQjtJQUU5RCxZQUFZLFFBQThCO1FBQ3hDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDbEMsSUFBSSxDQUFDLFlBQVksQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFTSxNQUFNO1FBQ1gsT0FBTztZQUNMLFdBQVcsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUM1QixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87U0FDdEIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQWxCRCwwREFrQkM7QUFFRCxNQUFhLHNCQUF1QixTQUFRLG1CQUFtQjtJQUs3RCxZQUFZLFFBQTZCO1FBQ3ZDLEtBQUssQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVDLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQztRQUMzQixJQUFJLENBQUMsR0FBRyxHQUFHLFdBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbkMsQ0FBQztDQUNGO0FBWEQsd0RBV0M7QUFFRCxNQUFhLHNCQUFzQjtJQU0xQixNQUFNLENBQUMsVUFBVSxDQUFDLENBQVM7UUFDaEMsTUFBTSxZQUFZLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLFdBQVcsR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsTUFBTSxRQUFRLEdBQXdCLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQzVGLE9BQU8sSUFBSSxzQkFBc0IsQ0FDL0IsSUFBSSxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQzVDLElBQUksdUJBQXVCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUM5QyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxZQUFZLEVBQUUsRUFBRSxHQUFHLFlBQVksR0FBRyxXQUFXLENBQUMsRUFDM0QsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsWUFBWSxHQUFHLFdBQVcsRUFBRSxFQUFFLEdBQUcsWUFBWSxHQUFHLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FDekYsQ0FBQztJQUNKLENBQUM7SUFFRCxZQUFZLE9BQStCLEVBQUUsUUFBaUMsRUFBRSxXQUFtQixFQUFFLFlBQW9CO1FBQ3ZILElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxhQUFhLEdBQUcsWUFBWSxDQUFDO0lBQ3BDLENBQUM7SUFFRCxJQUFXLFlBQVk7UUFDckIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzVCLENBQUM7SUFFTSxhQUFhLENBQUMsTUFBYztRQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsR0FBRyxNQUFNLENBQUM7SUFDcEMsQ0FBQztJQUVNLFlBQVksQ0FBQyxJQUFZLEVBQUUsS0FBYTtRQUM3QyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkMsQ0FBQztJQUVNLGVBQWUsQ0FBQyxDQUFTO1FBQzlCLElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVNLFFBQVE7UUFDYixNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7UUFDdkMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7UUFDakQsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsY0FBYyxHQUFHLGNBQWMsQ0FBQyxDQUFDO1FBQzdELEVBQUUsQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLEVBQUUsQ0FBQyxZQUFZLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25DLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUM7UUFDaEQsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0NBRUY7QUF2REQsd0RBdURDO0FBRUQsTUFBYSxXQUFXO0lBQ3RCLFlBQ2tCLE1BQWMsRUFDZCxRQUFnQixFQUNoQixJQUFZO1FBRlosV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUNkLGFBQVEsR0FBUixRQUFRLENBQVE7UUFDaEIsU0FBSSxHQUFKLElBQUksQ0FBUTtJQUFHLENBQUM7SUFFbEMsSUFBVyxhQUFhO1FBQ3RCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDdkMsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFO1lBQzVCLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7U0FDekM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFXLE1BQU07UUFDZixPQUFPLElBQUksQ0FBQyxhQUFhLEtBQUssV0FBVyxDQUFDO0lBQzVDLENBQUM7SUFFRCxJQUFXLFlBQVk7UUFDckIsUUFBUSxJQUFJLENBQUMsYUFBYSxFQUFFO1lBQzFCLEtBQUssaUJBQWlCLENBQUM7WUFDdkIsS0FBSyx3QkFBd0IsQ0FBQztZQUM5QixLQUFLLG1CQUFtQixDQUFDO1lBQ3pCLEtBQUssMEJBQTBCO2dCQUM3QixPQUFPLElBQUksQ0FBQztZQUNkO2dCQUNFLE9BQU8sS0FBSyxDQUFDO1NBQ2hCO0lBQ0gsQ0FBQztDQUNGO0FBN0JELGtDQTZCQztBQUVELE1BQWEsU0FBUztJQTJEcEIsWUFBWSxFQUFlO1FBcERuQixrQkFBYSxHQUFRLEtBQUssQ0FBQztRQUMzQixpQkFBWSxHQUFRLElBQUksQ0FBQztRQUN6QixTQUFJLEdBQW9CLElBQUksQ0FBQztRQUM3QixXQUFNLEdBQVEsSUFBSSxHQUFHLEVBQXVCLENBQUM7UUFrRG5ELElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQWpETSxNQUFNLENBQU8sTUFBTSxDQUFDLEtBQWtCLGNBQWM7O1lBQ3pELE1BQU0sR0FBRyxHQUFHLElBQUksV0FBZSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDaEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxPQUFPLENBQU8sQ0FBQyxRQUFhLEVBQUUsT0FBWSxFQUFFLEVBQUU7Z0JBQ3ZFLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtvQkFDMUIsUUFBUSxFQUFFLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQztZQUNILE1BQU0sRUFBRSxHQUFHLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzdCLEVBQUUsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdkIsTUFBTSxJQUFJLE9BQU8sQ0FBTyxDQUFDLFFBQWEsRUFBRSxPQUFZLEVBQUUsRUFBRTtnQkFDdEQsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO29CQUN6QixHQUFHLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDckMsUUFBUSxFQUFFLENBQUM7Z0JBQ2IsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDN0IsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJO2dCQUNGLE1BQU0sV0FBVyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO2FBQzNDO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO2dCQUM3RCxNQUFNLFdBQVcsR0FBRyxxQkFBSyxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUU7b0JBQ2pELEtBQUssRUFBRSxTQUFTO2lCQUNqQixDQUFDLENBQUM7Z0JBQ0gsSUFBSSxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDdEQsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN6QyxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLENBQUM7aUJBQ3hDO2dCQUNELEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDckMsTUFBTSxXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDdEM7WUFDRCxNQUFNLGNBQWMsQ0FBQztZQUVyQixPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUM7S0FBQTtJQUVPLE1BQU0sQ0FBQyxRQUFRO1FBQ3JCLElBQUksU0FBUyxDQUFDLGNBQWMsRUFBRTtZQUM1QixPQUFPO1NBQ1I7UUFDRCxTQUFTLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQztRQUNoQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUU7WUFDNUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFNRCxJQUFXLFlBQVk7UUFDckIsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzVCLENBQUM7SUFDRCxJQUFXLFlBQVksQ0FBQyxDQUFVO1FBQ2hDLElBQUksQ0FBQyxDQUFDLEVBQUU7WUFDTixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO1NBQ3JCO1FBQ0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVNLFlBQVksQ0FBQyxHQUFXO1FBQzdCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDOUIsQ0FBQztJQUVNLGdCQUFnQixDQUFDLEVBQTZDO1FBQ25FLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzFCLENBQUM7SUFFWSxRQUFRLENBQUMsU0FBaUI7O1lBQ3JDLE1BQU0sR0FBRyxHQUFHLFdBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNoQyxNQUFNLEdBQUcsR0FBUSxHQUFHLENBQUMsUUFBUSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBTyxDQUFDLENBQUMsQ0FBQyxXQUFRLENBQUM7WUFDL0QsT0FBTyxJQUFJLE9BQU8sQ0FBZSxDQUFDLFFBQWEsRUFBRSxPQUFZLEVBQUUsRUFBRTtnQkFDL0QsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDO29CQUNkLEdBQUcsRUFBRSxTQUFTO29CQUNkLE9BQU8sRUFBRTt3QkFDUCxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7cUJBQ2Y7b0JBQ0QsSUFBSSxFQUFFLFdBQVc7b0JBQ2pCLElBQUksRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDO29CQUN2QixJQUFJLEVBQUUsU0FBUztpQkFDaEIsRUFBRSxDQUFDLEdBQVEsRUFBRSxFQUFFO29CQUNkLE1BQU0sSUFBSSxHQUFHLElBQUksS0FBSyxFQUFVLENBQUM7b0JBQ2pDLEdBQUcsQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsS0FBYSxFQUFFLEVBQUU7d0JBQy9CLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7b0JBQ25CLENBQUMsQ0FBQyxDQUFDO29CQUNILEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTt3QkFDakIsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDOUIsUUFBUSxDQUFDOzRCQUNQLFVBQVUsRUFBRSxHQUFHLENBQUMsVUFBVTs0QkFDMUIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxPQUFPOzRCQUNwQixJQUFJLEVBQUUsQ0FBQzt5QkFDUixDQUFDLENBQUM7b0JBQ0wsQ0FBQyxDQUFDLENBQUM7b0JBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBQzdCLENBQUMsQ0FBQyxDQUFDO2dCQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQzdCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0lBRVksUUFBUTs7WUFDbkIsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLFFBQWEsRUFBRSxPQUFZLEVBQUUsRUFBRTtnQkFDdkQsTUFBTSxRQUFRLEdBQUcsR0FBRyxFQUFFO29CQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQVEsRUFBUSxFQUFFO3dCQUNqQyxJQUFJLEdBQUcsRUFBRTs0QkFDUCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7eUJBQ2Q7NkJBQU07NEJBQ0wsUUFBUSxFQUFFLENBQUM7eUJBQ1o7b0JBQ0gsQ0FBQyxDQUFDLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDO2dCQUVGLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLFNBQVMsRUFBRTtvQkFDcEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBUyxFQUFFLE1BQVcsRUFBRSxFQUFFO3dCQUN4RCxRQUFRLEVBQUUsQ0FBQztvQkFDYixDQUFDLENBQUMsQ0FBQztvQkFDSCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO2lCQUMxQjtxQkFBTTtvQkFDTCxRQUFRLEVBQUUsQ0FBQztpQkFDWjtZQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztLQUFBO0lBRVksaUJBQWlCOztZQUM1QixPQUFPLElBQUksT0FBTyxDQUFPLENBQUMsU0FBYyxFQUFFLFFBQWEsRUFBRSxFQUFFO2dCQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQVEsRUFBUSxFQUFFO29CQUNqQyxJQUFJLEdBQUcsRUFBRTt3QkFDUCxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7cUJBQ2Y7eUJBQU07d0JBQ0wsU0FBUyxFQUFFLENBQUM7cUJBQ2I7Z0JBQ0gsQ0FBQyxDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FBQTtRQUNKLENBQUM7S0FBQTtJQUVPLGNBQWMsQ0FBQyxHQUFvQjtRQUN6QyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztRQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFPLEVBQUUsRUFBRTtZQUNyQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDLE9BQWUsRUFBRSxFQUFFO2dCQUNuQyxNQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzVELElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ2xCLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRTtvQkFDdEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQ3JDLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2lCQUNqSDtnQkFDRCxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQy9CLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sb0JBQW9CLENBQUMsU0FBdUI7UUFDbEQsSUFBSSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUM7UUFDOUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBUyxFQUFFLE1BQVcsRUFBRSxFQUFFO1lBQ3RELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ3BFLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUNoQixTQUFTLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQzthQUM3QztZQUNELElBQUksSUFBSSxLQUFLLElBQUksRUFBRTtnQkFDakIsSUFBSSxJQUFJLEtBQUssQ0FBQyxFQUFFO29CQUNkLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxLQUFLLENBQUMsNEJBQTRCLElBQUksR0FBRyxDQUFDLENBQUM7aUJBQ2xFO2FBQ0Y7aUJBQU07Z0JBQ0wsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEtBQUssQ0FBQyxnQ0FBZ0MsTUFBTSxHQUFHLENBQUMsQ0FBQzthQUN4RTtRQUNILENBQUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBUSxFQUFFLEVBQUU7WUFDekMsSUFBSSxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDOztBQW5MYywwQkFBZ0IsR0FBbUIsRUFBRSxDQUFDO0FBQ3RDLHdCQUFjLEdBQVEsS0FBSyxDQUFDO0FBRjdDLDhCQXFMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7U2VydmVyIGFzIFdlYlNvY2tldFNlcnZlcn0gZnJvbSBcIndzXCI7XG5pbXBvcnQge3NwYXduLCBDaGlsZFByb2Nlc3N9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XG5pbXBvcnQge3BhcnNlIGFzIHBhcnNlVVJMLCBVcmx9IGZyb20gXCJ1cmxcIjtcbmltcG9ydCB7Z2V0IGFzIGh0dHBHZXR9IGZyb20gXCJodHRwXCI7XG5pbXBvcnQge2dldCBhcyBodHRwc0dldH0gZnJvbSBcImh0dHBzXCI7XG5pbXBvcnQge2NyZWF0ZUNvbm5lY3Rpb24gfSBmcm9tIFwibmV0XCI7XG5pbXBvcnQgeyBjb25maWcgfSBmcm9tICcuL2NvbmZpZyc7XG5cblxuY29uc3QgcHJveHlQb3J0ID0gXCI1MDY1XCI7XG5jb25zdCB3ZWJQcm94eVBvcnQgPSBcIjUwNTBcIjtcbmxldCBjb21tYW5kQXJncyA9IFtcbiAgXCItcFwiLFxuICBwcm94eVBvcnQsXG4gIFwiLS1pbnNlY3VyZVwiLFxuICBcIi0tYW50aWNhY2hlXCIsXG4gIFwiLXFcIixcbiAgXCItc1wiLFxuICBwcm9jZXNzLmN3ZCgpICsgXCIvbWl0bXNjcmlwdHMvcHJveHkucHlcIlxuXTtcblxuY29uc3QgdXBzdHJlYW1Qcm94eVVybCA9IGNvbmZpZy5wcm94eVVybDtcblxuaWYodXBzdHJlYW1Qcm94eVVybCkge1xuICBjb25zdCBhcnIgPSBbJy1VJywgdXBzdHJlYW1Qcm94eVVybF07XG4gIGNvbW1hbmRBcmdzID0gWy4uLmFyciwgLi4uY29tbWFuZEFyZ3NdO1xufVxuXG5mdW5jdGlvbiB3YWl0Rm9yUG9ydChwb3J0OiBudW1iZXIsIHJldHJpZXMgPSAxMCwgaW50ZXJ2YWwgPSA1MDApOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChwUmVzb2x2ZTogYW55LCBwUmVqZWN0OiBhbnkpID0+IHtcbiAgICBsZXQgcmV0cmllc1JlbWFpbmluZyA9IHJldHJpZXM7XG4gICAgbGV0IHJldHJ5SW50ZXJ2YWwgPSBpbnRlcnZhbDtcbiAgICBsZXQgdGltZXI6IGFueSA9IG51bGw7XG4gICAgbGV0IHNvY2tldDogYW55ID0gbnVsbDtcbiAgICBmdW5jdGlvbiBjbGVhclRpbWVyQW5kRGVzdHJveVNvY2tldCgpOiB2b2lkIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICB0aW1lciA9IG51bGw7XG4gICAgICBpZiAoc29ja2V0KSB7XG4gICAgICAgIHNvY2tldC5kZXN0cm95KCk7XG4gICAgICB9XG4gICAgICBzb2NrZXQgPSBudWxsO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZXRyeSgpOiB2b2lkIHtcbiAgICAgIHRyeVRvQ29ubmVjdCgpO1xuICAgIH1cbiAgICBmdW5jdGlvbiB0cnlUb0Nvbm5lY3QoKTogdm9pZCB7XG4gICAgICBjbGVhclRpbWVyQW5kRGVzdHJveVNvY2tldCgpO1xuXG4gICAgICBpZiAoLS1yZXRyaWVzUmVtYWluaW5nIDwgMCkge1xuICAgICAgICBwUmVqZWN0KG5ldyBFcnJvcihcIm91dCBvZiByZXRyaWVzXCIpKTtcbiAgICAgIH1cbiAgICAgIHNvY2tldCA9IGNyZWF0ZUNvbm5lY3Rpb24ocG9ydCwgXCJsb2NhbGhvc3RcIiwgKCk6IHZvaWQgPT4ge1xuICAgICAgICBjbGVhclRpbWVyQW5kRGVzdHJveVNvY2tldCgpO1xuICAgICAgICBpZiAocmV0cmllc1JlbWFpbmluZyA+PSAwKSB7XG4gICAgICAgICAgcFJlc29sdmUoKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB0aW1lciA9IHNldFRpbWVvdXQoKCk6IHZvaWQgPT4gcmV0cnkoKSwgcmV0cnlJbnRlcnZhbCk7XG4gICAgICBzb2NrZXQub24oXCJlcnJvclwiLCAoZXJyOiBhbnkpOiB2b2lkID0+IHtcbiAgICAgICAgY2xlYXJUaW1lckFuZERlc3Ryb3lTb2NrZXQoKTtcbiAgICAgICAgc2V0VGltZW91dChyZXRyeSwgcmV0cnlJbnRlcnZhbCk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgdHJ5VG9Db25uZWN0KCk7XG4gIH0pO1xufVxuXG5leHBvcnQgdHlwZSBJbnRlcmNlcHRvciA9IChtOiBJbnRlcmNlcHRlZEhUVFBNZXNzYWdlKSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gbm9wSW50ZXJjZXB0b3IobTogSW50ZXJjZXB0ZWRIVFRQTWVzc2FnZSk6IHZvaWQge1xuICByZXR1cm47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSFRUUFJlc3BvbnNlIHtcbiAgc3RhdHVzQ29kZTogbnVtYmVyO1xuICBoZWFkZXJzOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ307XG4gIGJvZHk6IEJ1ZmZlcjtcbn1cblxuaW50ZXJmYWNlIEhUVFBNZXNzYWdlTWV0YWRhdGEge1xuICByZXF1ZXN0OiBIVFRQUmVxdWVzdE1ldGFkYXRhO1xuICByZXNwb25zZTogSFRUUFJlc3BvbnNlTWV0YWRhdGE7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSFRUUFJlcXVlc3RNZXRhZGF0YSB7XG4gIG1ldGhvZDogc3RyaW5nO1xuICB1cmw6IHN0cmluZztcbiAgaGVhZGVyczogW3N0cmluZywgc3RyaW5nXVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEhUVFBSZXNwb25zZU1ldGFkYXRhIHtcbiAgc3RhdHVzX2NvZGU6IG51bWJlcjtcbiAgaGVhZGVyczogW3N0cmluZywgc3RyaW5nXVtdO1xufVxuXG5leHBvcnQgYWJzdHJhY3QgY2xhc3MgQWJzdHJhY3RIVFRQSGVhZGVycyB7XG4gIHB1YmxpYyBfaGVhZGVyczogW3N0cmluZywgc3RyaW5nXVtdO1xuICBwdWJsaWMgZ2V0IGhlYWRlcnMoKTogW3N0cmluZywgc3RyaW5nXVtdIHtcbiAgICByZXR1cm4gdGhpcy5faGVhZGVycztcbiAgfVxuICBjb25zdHJ1Y3RvcihoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmddW10pIHtcbiAgICB0aGlzLl9oZWFkZXJzID0gaGVhZGVycztcbiAgfVxuICBwdWJsaWMgX2luZGV4T2ZIZWFkZXIobmFtZTogc3RyaW5nKTogbnVtYmVyIHtcbiAgICBjb25zdCBoZWFkZXJzID0gdGhpcy5oZWFkZXJzO1xuICAgIGNvbnN0IGxlbiA9IGhlYWRlcnMubGVuZ3RoO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGlmIChoZWFkZXJzW2ldWzBdLnRvTG93ZXJDYXNlKCkgPT09IG5hbWUpIHtcbiAgICAgICAgcmV0dXJuIGk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiAtMTtcbiAgfVxuXG4gIHB1YmxpYyBnZXRIZWFkZXIobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuX2luZGV4T2ZIZWFkZXIobmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICByZXR1cm4gdGhpcy5oZWFkZXJzW2luZGV4XVsxXTtcbiAgICB9XG4gICAgcmV0dXJuIFwiXCI7XG4gIH1cblxuICBwdWJsaWMgc2V0SGVhZGVyKG5hbWU6IHN0cmluZywgdmFsdWU6IHN0cmluZyk6IHZvaWQge1xuICAgIGNvbnN0IGluZGV4ID0gdGhpcy5faW5kZXhPZkhlYWRlcihuYW1lLnRvTG93ZXJDYXNlKCkpO1xuICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgIHRoaXMuaGVhZGVyc1tpbmRleF1bMV0gPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5oZWFkZXJzLnB1c2goW25hbWUsIHZhbHVlXSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIHJlbW92ZUhlYWRlcihuYW1lOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuX2luZGV4T2ZIZWFkZXIobmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLmhlYWRlcnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICB9XG4gIH1cblxuICBwdWJsaWMgY2xlYXJIZWFkZXJzKCk6IHZvaWQge1xuICAgIHRoaXMuX2hlYWRlcnMgPSBbXTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgSW50ZXJjZXB0ZWRIVFRQUmVzcG9uc2UgZXh0ZW5kcyBBYnN0cmFjdEhUVFBIZWFkZXJzIHtcbiAgcHVibGljIHN0YXR1c0NvZGU6IG51bWJlcjtcbiAgY29uc3RydWN0b3IobWV0YWRhdGE6IEhUVFBSZXNwb25zZU1ldGFkYXRhKSB7XG4gICAgc3VwZXIobWV0YWRhdGEuaGVhZGVycyk7XG4gICAgdGhpcy5zdGF0dXNDb2RlID0gbWV0YWRhdGEuc3RhdHVzX2NvZGU7XG4gICAgdGhpcy5yZW1vdmVIZWFkZXIoXCJ0cmFuc2Zlci1lbmNvZGluZ1wiKTtcbiAgICB0aGlzLnJlbW92ZUhlYWRlcihcImNvbnRlbnQtZW5jb2RpbmdcIik7XG4gICAgdGhpcy5yZW1vdmVIZWFkZXIoXCJjb250ZW50LXNlY3VyaXR5LXBvbGljeVwiKTtcbiAgICB0aGlzLnJlbW92ZUhlYWRlcihcIngtd2Via2l0LWNzcFwiKTtcbiAgICB0aGlzLnJlbW92ZUhlYWRlcihcIngtY29udGVudC1zZWN1cml0eS1wb2xpY3lcIik7XG4gIH1cblxuICBwdWJsaWMgdG9KU09OKCk6IEhUVFBSZXNwb25zZU1ldGFkYXRhIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzX2NvZGU6IHRoaXMuc3RhdHVzQ29kZSxcbiAgICAgIGhlYWRlcnM6IHRoaXMuaGVhZGVyc1xuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEludGVyY2VwdGVkSFRUUFJlcXVlc3QgZXh0ZW5kcyBBYnN0cmFjdEhUVFBIZWFkZXJzIHtcbiAgcHVibGljIG1ldGhvZDogc3RyaW5nO1xuICBwdWJsaWMgcmF3VXJsOiBzdHJpbmc7XG4gIHB1YmxpYyB1cmw6IFVybDtcblxuICBjb25zdHJ1Y3RvcihtZXRhZGF0YTogSFRUUFJlcXVlc3RNZXRhZGF0YSkge1xuICAgIHN1cGVyKG1ldGFkYXRhLmhlYWRlcnMpO1xuICAgIHRoaXMubWV0aG9kID0gbWV0YWRhdGEubWV0aG9kLnRvTG93ZXJDYXNlKCk7XG4gICAgdGhpcy5yYXdVcmwgPSBtZXRhZGF0YS51cmw7XG4gICAgdGhpcy51cmwgPSBwYXJzZVVSTCh0aGlzLnJhd1VybCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEludGVyY2VwdGVkSFRUUE1lc3NhZ2Uge1xuICBwdWJsaWMgcmVhZG9ubHkgcmVxdWVzdDogSW50ZXJjZXB0ZWRIVFRQUmVxdWVzdDtcbiAgcHVibGljIHJlYWRvbmx5IHJlc3BvbnNlOiBJbnRlcmNlcHRlZEhUVFBSZXNwb25zZTtcbiAgcHVibGljIHJlYWRvbmx5IHJlcXVlc3RCb2R5OiBCdWZmZXI7XG4gIHB1YmxpYyBfcmVzcG9uc2VCb2R5OiBCdWZmZXI7XG5cbiAgcHVibGljIHN0YXRpYyBGcm9tQnVmZmVyKGI6IEJ1ZmZlcik6IEludGVyY2VwdGVkSFRUUE1lc3NhZ2Uge1xuICAgIGNvbnN0IG1ldGFkYXRhU2l6ZSA9IGIucmVhZEludDMyTEUoMCk7XG4gICAgY29uc3QgcmVxdWVzdFNpemUgPSBiLnJlYWRJbnQzMkxFKDQpO1xuICAgIGNvbnN0IHJlc3BvbnNlU2l6ZSA9IGIucmVhZEludDMyTEUoOCk7XG4gICAgY29uc3QgbWV0YWRhdGE6IEhUVFBNZXNzYWdlTWV0YWRhdGEgPSBKU09OLnBhcnNlKGIudG9TdHJpbmcoXCJ1dGY4XCIsIDEyLCAxMiArIG1ldGFkYXRhU2l6ZSkpO1xuICAgIHJldHVybiBuZXcgSW50ZXJjZXB0ZWRIVFRQTWVzc2FnZShcbiAgICAgIG5ldyBJbnRlcmNlcHRlZEhUVFBSZXF1ZXN0KG1ldGFkYXRhLnJlcXVlc3QpLFxuICAgICAgbmV3IEludGVyY2VwdGVkSFRUUFJlc3BvbnNlKG1ldGFkYXRhLnJlc3BvbnNlKSxcbiAgICAgIGIuc2xpY2UoMTIgKyBtZXRhZGF0YVNpemUsIDEyICsgbWV0YWRhdGFTaXplICsgcmVxdWVzdFNpemUpLFxuICAgICAgYi5zbGljZSgxMiArIG1ldGFkYXRhU2l6ZSArIHJlcXVlc3RTaXplLCAxMiArIG1ldGFkYXRhU2l6ZSArIHJlcXVlc3RTaXplICsgcmVzcG9uc2VTaXplKVxuICAgICk7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihyZXF1ZXN0OiBJbnRlcmNlcHRlZEhUVFBSZXF1ZXN0LCByZXNwb25zZTogSW50ZXJjZXB0ZWRIVFRQUmVzcG9uc2UsIHJlcXVlc3RCb2R5OiBCdWZmZXIsIHJlc3BvbnNlQm9keTogQnVmZmVyKSB7XG4gICAgdGhpcy5yZXF1ZXN0ID0gcmVxdWVzdDtcbiAgICB0aGlzLnJlc3BvbnNlID0gcmVzcG9uc2U7XG4gICAgdGhpcy5yZXF1ZXN0Qm9keSA9IHJlcXVlc3RCb2R5O1xuICAgIHRoaXMuX3Jlc3BvbnNlQm9keSA9IHJlc3BvbnNlQm9keTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgcmVzcG9uc2VCb2R5KCk6IEJ1ZmZlciB7XG4gICAgcmV0dXJuIHRoaXMuX3Jlc3BvbnNlQm9keTtcbiAgfVxuXG4gIHB1YmxpYyBzZXRTdGF0dXNDb2RlKHN0YXR1czogbnVtYmVyKTogdm9pZCB7XG4gICAgdGhpcy5yZXNwb25zZS5zdGF0dXNDb2RlID0gc3RhdHVzO1xuICB9XG5cbiAgcHVibGljIGFkZE5ld0hlYWRlcihuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICB0aGlzLnJlc3BvbnNlLnNldEhlYWRlcihuYW1lLCB2YWx1ZSk7XG4gIH1cblxuICBwdWJsaWMgc2V0UmVzcG9uc2VCb2R5KGI6IEJ1ZmZlcik6IHZvaWQge1xuICAgIHRoaXMuX3Jlc3BvbnNlQm9keSA9IGI7XG4gICAgdGhpcy5yZXNwb25zZS5zZXRIZWFkZXIoXCJjb250ZW50LWxlbmd0aFwiLCBgJHtiLmxlbmd0aH1gKTtcbiAgfVxuXG4gIHB1YmxpYyB0b0J1ZmZlcigpOiBCdWZmZXIge1xuICAgIGNvbnN0IG1ldGFkYXRhID0gQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkodGhpcy5yZXNwb25zZSksIFwidXRmOFwiKTtcbiAgICBjb25zdCBtZXRhZGF0YUxlbmd0aCA9IG1ldGFkYXRhLmxlbmd0aDtcbiAgICBjb25zdCByZXNwb25zZUxlbmd0aCA9IHRoaXMuX3Jlc3BvbnNlQm9keS5sZW5ndGg7XG4gICAgY29uc3QgcnYgPSBCdWZmZXIuYWxsb2MoOCArIG1ldGFkYXRhTGVuZ3RoICsgcmVzcG9uc2VMZW5ndGgpO1xuICAgIHJ2LndyaXRlSW50MzJMRShtZXRhZGF0YUxlbmd0aCwgMCk7XG4gICAgcnYud3JpdGVJbnQzMkxFKHJlc3BvbnNlTGVuZ3RoLCA0KTtcbiAgICBtZXRhZGF0YS5jb3B5KHJ2LCA4KTtcbiAgICB0aGlzLl9yZXNwb25zZUJvZHkuY29weShydiwgOCArIG1ldGFkYXRhTGVuZ3RoKTtcbiAgICByZXR1cm4gcnY7XG4gIH1cblxufVxuXG5leHBvcnQgY2xhc3MgU3Rhc2hlZEl0ZW0ge1xuICBjb25zdHJ1Y3RvcihcbiAgICBwdWJsaWMgcmVhZG9ubHkgcmF3VXJsOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IG1pbWVUeXBlOiBzdHJpbmcsXG4gICAgcHVibGljIHJlYWRvbmx5IGRhdGE6IEJ1ZmZlcikge31cblxuICBwdWJsaWMgZ2V0IHNob3J0TWltZVR5cGUoKTogc3RyaW5nIHtcbiAgICBsZXQgbWltZSA9IHRoaXMubWltZVR5cGUudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAobWltZS5pbmRleE9mKFwiO1wiKSAhPT0gLTEpIHtcbiAgICAgIG1pbWUgPSBtaW1lLnNsaWNlKDAsIG1pbWUuaW5kZXhPZihcIjtcIikpO1xuICAgIH1cbiAgICByZXR1cm4gbWltZTtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgaXNIdG1sKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnNob3J0TWltZVR5cGUgPT09IFwidGV4dC9odG1sXCI7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGlzSmF2YVNjcmlwdCgpOiBib29sZWFuIHtcbiAgICBzd2l0Y2ggKHRoaXMuc2hvcnRNaW1lVHlwZSkge1xuICAgICAgY2FzZSBcInRleHQvamF2YXNjcmlwdFwiOlxuICAgICAgY2FzZSBcImFwcGxpY2F0aW9uL2phdmFzY3JpcHRcIjpcbiAgICAgIGNhc2UgXCJ0ZXh0L3gtamF2YXNjcmlwdFwiOlxuICAgICAgY2FzZSBcImFwcGxpY2F0aW9uL3gtamF2YXNjcmlwdFwiOlxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIE1JVE1Qcm94eSB7XG4gIHByaXZhdGUgc3RhdGljIF9hY3RpdmVQcm9jZXNzZXM6IENoaWxkUHJvY2Vzc1tdID0gW107XG4gIHByaXZhdGUgc3RhdGljIF9jbGVhbnVwQ2FsbGVkOiBhbnkgPSBmYWxzZTtcblxuICBwdWJsaWMgY2I6IEludGVyY2VwdG9yO1xuICBwdWJsaWMgX21pdG1FcnJvcjogYW55O1xuXG4gIHByaXZhdGUgX3N0YXNoRW5hYmxlZDogYW55ID0gZmFsc2U7XG4gIHByaXZhdGUgX21pdG1Qcm9jZXNzOiBhbnkgPSBudWxsO1xuICBwcml2YXRlIF93c3M6IFdlYlNvY2tldFNlcnZlciA9IG51bGw7XG4gIHByaXZhdGUgX3N0YXNoOiBhbnkgPSBuZXcgTWFwPHN0cmluZywgU3Rhc2hlZEl0ZW0+KCk7XG5cbiAgcHVibGljIHN0YXRpYyBhc3luYyBDcmVhdGUoY2I6IEludGVyY2VwdG9yID0gbm9wSW50ZXJjZXB0b3IpOiBQcm9taXNlPE1JVE1Qcm94eT4ge1xuICAgIGNvbnN0IHdzcyA9IG5ldyBXZWJTb2NrZXRTZXJ2ZXIoeyBwb3J0OiBOdW1iZXIod2ViUHJveHlQb3J0KSB9KTtcbiAgICBjb25zdCBwcm94eUNvbm5lY3RlZCA9IG5ldyBQcm9taXNlPHZvaWQ+KChwUmVzb2x2ZTogYW55LCBwUmVqZWN0OiBhbnkpID0+IHtcbiAgICAgIHdzcy5vbmNlKFwiY29ubmVjdGlvblwiLCAoKSA9PiB7XG4gICAgICAgIHBSZXNvbHZlKCk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgICBjb25zdCBtcCA9IG5ldyBNSVRNUHJveHkoY2IpO1xuICAgIG1wLl9pbml0aWFsaXplV1NTKHdzcyk7XG4gICAgYXdhaXQgbmV3IFByb21pc2U8dm9pZD4oKHBSZXNvbHZlOiBhbnksIHBSZWplY3Q6IGFueSkgPT4ge1xuICAgICAgd3NzLm9uY2UoXCJsaXN0ZW5pbmdcIiwgKCkgPT4ge1xuICAgICAgICB3c3MucmVtb3ZlTGlzdGVuZXIoXCJlcnJvclwiLCBwUmVqZWN0KTtcbiAgICAgICAgcFJlc29sdmUoKTtcbiAgICAgIH0pO1xuICAgICAgd3NzLm9uY2UoXCJlcnJvclwiLCBwUmVqZWN0KTtcbiAgICB9KTtcblxuICAgIHRyeSB7XG4gICAgICBhd2FpdCB3YWl0Rm9yUG9ydChOdW1iZXIocHJveHlQb3J0KSwgMSk7XG4gICAgICBjb25zb2xlLmxvZyhgTUlUTVByb3h5IGFscmVhZHkgcnVubmluZy5gKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmxvZyhgTUlUTVByb3h5IG5vdCBydW5uaW5nOyBzdGFydGluZyB1cCBtaXRtcHJveHkuYCk7XG4gICAgICBjb25zdCBtaXRtUHJvY2VzcyA9IHNwYXduKFwibWl0bWR1bXBcIiwgY29tbWFuZEFyZ3MsIHtcbiAgICAgICAgc3RkaW86IFwiaW5oZXJpdFwiXG4gICAgICB9KTtcbiAgICAgIGlmIChNSVRNUHJveHkuX2FjdGl2ZVByb2Nlc3Nlcy5wdXNoKG1pdG1Qcm9jZXNzKSA9PT0gMSkge1xuICAgICAgICBwcm9jZXNzLm9uKFwiU0lHSU5UXCIsIE1JVE1Qcm94eS5fY2xlYW51cCk7XG4gICAgICAgIHByb2Nlc3Mub24oXCJleGl0XCIsIE1JVE1Qcm94eS5fY2xlYW51cCk7XG4gICAgICB9XG4gICAgICBtcC5faW5pdGlhbGl6ZU1JVE1Qcm94eShtaXRtUHJvY2Vzcyk7XG4gICAgICBhd2FpdCB3YWl0Rm9yUG9ydChOdW1iZXIocHJveHlQb3J0KSk7XG4gICAgfVxuICAgIGF3YWl0IHByb3h5Q29ubmVjdGVkO1xuXG4gICAgcmV0dXJuIG1wO1xuICB9XG5cbiAgcHJpdmF0ZSBzdGF0aWMgX2NsZWFudXAoKTogdm9pZCB7XG4gICAgaWYgKE1JVE1Qcm94eS5fY2xlYW51cENhbGxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBNSVRNUHJveHkuX2NsZWFudXBDYWxsZWQgPSB0cnVlO1xuICAgIE1JVE1Qcm94eS5fYWN0aXZlUHJvY2Vzc2VzLmZvckVhY2goKHA6IGFueSkgPT4ge1xuICAgICAgcC5raWxsKFwiU0lHS0lMTFwiKTtcbiAgICB9KTtcbiAgfVxuXG4gIGNvbnN0cnVjdG9yKGNiOiBJbnRlcmNlcHRvcikge1xuICAgIHRoaXMuY2IgPSBjYjtcbiAgfVxuXG4gIHB1YmxpYyBnZXQgc3Rhc2hFbmFibGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLl9zdGFzaEVuYWJsZWQ7XG4gIH1cbiAgcHVibGljIHNldCBzdGFzaEVuYWJsZWQodjogYm9vbGVhbikge1xuICAgIGlmICghdikge1xuICAgICAgdGhpcy5fc3Rhc2guY2xlYXIoKTtcbiAgICB9XG4gICAgdGhpcy5fc3Rhc2hFbmFibGVkID0gdjtcbiAgfVxuXG4gIHB1YmxpYyBnZXRGcm9tU3Rhc2godXJsOiBzdHJpbmcpOiBTdGFzaGVkSXRlbSB7XG4gICAgcmV0dXJuIHRoaXMuX3N0YXNoLmdldCh1cmwpO1xuICB9XG5cbiAgcHVibGljIGZvckVhY2hTdGFzaEl0ZW0oY2I6ICh2YWx1ZTogU3Rhc2hlZEl0ZW0sIHVybDogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XG4gICAgdGhpcy5fc3Rhc2guZm9yRWFjaChjYik7XG4gIH1cblxuICBwdWJsaWMgYXN5bmMgcHJveHlHZXQodXJsU3RyaW5nOiBzdHJpbmcpOiBQcm9taXNlPEhUVFBSZXNwb25zZT4ge1xuICAgIGNvbnN0IHVybCA9IHBhcnNlVVJMKHVybFN0cmluZyk7XG4gICAgY29uc3QgZ2V0OiBhbnkgPSB1cmwucHJvdG9jb2wgPT09IFwiaHR0cDpcIiA/IGh0dHBHZXQgOiBodHRwc0dldDtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8SFRUUFJlc3BvbnNlPigocFJlc29sdmU6IGFueSwgcFJlamVjdDogYW55KSA9PiB7XG4gICAgICBjb25zdCByZXEgPSBnZXQoe1xuICAgICAgICB1cmw6IHVybFN0cmluZyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgIGhvc3Q6IHVybC5ob3N0XG4gICAgICAgIH0sXG4gICAgICAgIGhvc3Q6IFwibG9jYWxob3N0XCIsXG4gICAgICAgIHBvcnQ6IE51bWJlcihwcm94eVBvcnQpLFxuICAgICAgICBwYXRoOiB1cmxTdHJpbmdcbiAgICAgIH0sIChyZXM6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBkYXRhID0gbmV3IEFycmF5PEJ1ZmZlcj4oKTtcbiAgICAgICAgcmVzLm9uKFwiZGF0YVwiLCAoY2h1bms6IEJ1ZmZlcikgPT4ge1xuICAgICAgICAgIGRhdGEucHVzaChjaHVuayk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXMub24oXCJlbmRcIiwgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IGQgPSBCdWZmZXIuY29uY2F0KGRhdGEpO1xuICAgICAgICAgIHBSZXNvbHZlKHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGU6IHJlcy5zdGF0dXNDb2RlLFxuICAgICAgICAgICAgaGVhZGVyczogcmVzLmhlYWRlcnMsXG4gICAgICAgICAgICBib2R5OiBkXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByZXMub25jZShcImVycm9yXCIsIHBSZWplY3QpO1xuICAgICAgfSk7XG4gICAgICByZXEub25jZShcImVycm9yXCIsIHBSZWplY3QpO1xuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHNodXRkb3duKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocFJlc29sdmU6IGFueSwgcFJlamVjdDogYW55KSA9PiB7XG4gICAgICBjb25zdCBjbG9zZVdTUyA9ICgpID0+IHtcbiAgICAgICAgdGhpcy5fd3NzLmNsb3NlKChlcnI6IGFueSk6IHZvaWQgPT4ge1xuICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgIHBSZWplY3QoZXJyKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcFJlc29sdmUoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfTtcblxuICAgICAgaWYgKHRoaXMuX21pdG1Qcm9jZXNzICYmIHRoaXMuX21pdG1Qcm9jZXNzLmNvbm5lY3RlZCkge1xuICAgICAgICB0aGlzLl9taXRtUHJvY2Vzcy5vbmNlKFwiZXhpdFwiLCAoY29kZTogYW55LCBzaWduYWw6IGFueSkgPT4ge1xuICAgICAgICAgIGNsb3NlV1NTKCk7XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9taXRtUHJvY2Vzcy5raWxsKCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjbG9zZVdTUygpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHNodXREb3duV2ViU29ja2V0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigod3NSZXNvbHZlOiBhbnksIHdzUmVqZWN0OiBhbnkpID0+IHtcbiAgICAgIHRoaXMuX3dzcy5jbG9zZSgoZXJyOiBhbnkpOiB2b2lkID0+IHtcbiAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgIHdzUmVqZWN0KGVycik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd3NSZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pXG4gIH1cblxuICBwcml2YXRlIF9pbml0aWFsaXplV1NTKHdzczogV2ViU29ja2V0U2VydmVyKTogdm9pZCB7XG4gICAgdGhpcy5fd3NzID0gd3NzO1xuICAgIHRoaXMuX3dzcy5vbihcImNvbm5lY3Rpb25cIiwgKHdzOiBhbnkpID0+IHtcbiAgICAgIHdzLm9uKFwibWVzc2FnZVwiLCAobWVzc2FnZTogQnVmZmVyKSA9PiB7XG4gICAgICAgIGNvbnN0IG9yaWdpbmFsID0gSW50ZXJjZXB0ZWRIVFRQTWVzc2FnZS5Gcm9tQnVmZmVyKG1lc3NhZ2UpO1xuICAgICAgICB0aGlzLmNiKG9yaWdpbmFsKTtcbiAgICAgICAgaWYgKHRoaXMuX3N0YXNoRW5hYmxlZCkge1xuICAgICAgICAgIHRoaXMuX3N0YXNoLnNldChvcmlnaW5hbC5yZXF1ZXN0LnJhd1VybCxcbiAgICAgICAgICAgIG5ldyBTdGFzaGVkSXRlbShvcmlnaW5hbC5yZXF1ZXN0LnJhd1VybCwgb3JpZ2luYWwucmVzcG9uc2UuZ2V0SGVhZGVyKFwiY29udGVudC10eXBlXCIpLCBvcmlnaW5hbC5yZXNwb25zZUJvZHkpKTtcbiAgICAgICAgfVxuICAgICAgICB3cy5zZW5kKG9yaWdpbmFsLnRvQnVmZmVyKCkpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIF9pbml0aWFsaXplTUlUTVByb3h5KG1pdG1Qcm94eTogQ2hpbGRQcm9jZXNzKTogdm9pZCB7XG4gICAgdGhpcy5fbWl0bVByb2Nlc3MgPSBtaXRtUHJveHk7XG4gICAgdGhpcy5fbWl0bVByb2Nlc3Mub24oXCJleGl0XCIsIChjb2RlOiBhbnksIHNpZ25hbDogYW55KSA9PiB7XG4gICAgICBjb25zdCBpbmRleCA9IE1JVE1Qcm94eS5fYWN0aXZlUHJvY2Vzc2VzLmluZGV4T2YodGhpcy5fbWl0bVByb2Nlc3MpO1xuICAgICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgICBNSVRNUHJveHkuX2FjdGl2ZVByb2Nlc3Nlcy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgfVxuICAgICAgaWYgKGNvZGUgIT09IG51bGwpIHtcbiAgICAgICAgaWYgKGNvZGUgIT09IDApIHtcbiAgICAgICAgICB0aGlzLl9taXRtRXJyb3IgPSBuZXcgRXJyb3IoYFByb2Nlc3MgZXhpdGVkIHdpdGggY29kZSAke2NvZGV9LmApO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9taXRtRXJyb3IgPSBuZXcgRXJyb3IoYFByb2Nlc3MgZXhpdGVkIGR1ZSB0byBzaWduYWwgJHtzaWduYWx9LmApO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHRoaXMuX21pdG1Qcm9jZXNzLm9uKFwiZXJyb3JcIiwgKGVycjogYW55KSA9PiB7XG4gICAgICB0aGlzLl9taXRtRXJyb3IgPSBlcnI7XG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==