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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic29ja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid2Vic29ja2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFBQSwyQkFBNkM7QUFDN0MsaURBQWtEO0FBQ2xELDZCQUEyQztBQUMzQywrQkFBb0M7QUFDcEMsaUNBQXNDO0FBQ3RDLDZCQUFzQztBQUN0QyxxQ0FBa0M7QUFHbEMsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDO0FBQ3pCLE1BQU0sWUFBWSxHQUFHLE1BQU0sQ0FBQztBQUM1QixJQUFJLFdBQVcsR0FBRztJQUNoQixJQUFJO0lBQ0osU0FBUztJQUNULFlBQVk7SUFDWixhQUFhO0lBQ2IsSUFBSTtJQUNKLElBQUk7SUFDSixPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsdUJBQXVCO0NBQ3hDLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLGVBQU0sQ0FBQyxRQUFRLENBQUM7QUFFekMsSUFBRyxnQkFBZ0IsRUFBRTtJQUNuQixNQUFNLEdBQUcsR0FBRyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3JDLFdBQVcsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLEdBQUcsV0FBVyxDQUFDLENBQUM7Q0FDeEM7QUFFRCxxQkFBcUIsSUFBWSxFQUFFLE9BQU8sR0FBRyxFQUFFLEVBQUUsUUFBUSxHQUFHLEdBQUc7SUFDN0QsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLFFBQWEsRUFBRSxPQUFZLEVBQUUsRUFBRTtRQUN2RCxJQUFJLGdCQUFnQixHQUFHLE9BQU8sQ0FBQztRQUMvQixJQUFJLGFBQWEsR0FBRyxRQUFRLENBQUM7UUFDN0IsSUFBSSxLQUFLLEdBQVEsSUFBSSxDQUFDO1FBQ3RCLElBQUksTUFBTSxHQUFRLElBQUksQ0FBQztRQUN2QjtZQUNFLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNwQixLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ2IsSUFBSSxNQUFNLEVBQUU7Z0JBQ1Ys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RSxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRTtnQkFDaEIsU0FBUyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDN0M7WUFDRCxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUU7Z0JBQ2pCLElBQUksSUFBSSxLQUFLLENBQUMsRUFBRTtvQkFDZCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksS0FBSyxDQUFDLDRCQUE0QixJQUFJLEdBQUcsQ0FBQyxDQUFDO2lCQUNsRTthQUNGO2lCQUFNO2dCQUNMLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxLQUFLLENBQUMsZ0NBQWdDLE1BQU0sR0FBRyxDQUFDLENBQUM7YUFDeEU7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQVEsRUFBRSxFQUFFO1lBQ3pDLElBQUksQ0FBQyxVQUFVLEdBQUcsR0FBRyxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQzs7QUFuTGMsMEJBQWdCLEdBQW1CLEVBQUUsQ0FBQztBQUN0Qyx3QkFBYyxHQUFRLEtBQUssQ0FBQztBQUY3Qyw4QkFxTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1NlcnZlciBhcyBXZWJTb2NrZXRTZXJ2ZXJ9IGZyb20gXCJ3c1wiO1xuaW1wb3J0IHtzcGF3biwgQ2hpbGRQcm9jZXNzfSBmcm9tIFwiY2hpbGRfcHJvY2Vzc1wiO1xuaW1wb3J0IHtwYXJzZSBhcyBwYXJzZVVSTCwgVXJsfSBmcm9tIFwidXJsXCI7XG5pbXBvcnQge2dldCBhcyBodHRwR2V0fSBmcm9tIFwiaHR0cFwiO1xuaW1wb3J0IHtnZXQgYXMgaHR0cHNHZXR9IGZyb20gXCJodHRwc1wiO1xuaW1wb3J0IHtjcmVhdGVDb25uZWN0aW9uIH0gZnJvbSBcIm5ldFwiO1xuaW1wb3J0IHsgY29uZmlnIH0gZnJvbSAnLi9jb25maWcnO1xuXG5cbmNvbnN0IHByb3h5UG9ydCA9IFwiNTA2NVwiO1xuY29uc3Qgd2ViUHJveHlQb3J0ID0gXCI1MDUwXCI7XG5sZXQgY29tbWFuZEFyZ3MgPSBbXG4gIFwiLXBcIixcbiAgcHJveHlQb3J0LFxuICBcIi0taW5zZWN1cmVcIixcbiAgXCItLWFudGljYWNoZVwiLFxuICBcIi1xXCIsXG4gIFwiLXNcIixcbiAgcHJvY2Vzcy5jd2QoKSArIFwiL21pdG1zY3JpcHRzL3Byb3h5LnB5XCJcbl07XG5cbmNvbnN0IHVwc3RyZWFtUHJveHlVcmwgPSBjb25maWcucHJveHlVcmw7XG5cbmlmKHVwc3RyZWFtUHJveHlVcmwpIHtcbiAgY29uc3QgYXJyID0gWyctVScsIHVwc3RyZWFtUHJveHlVcmxdO1xuICBjb21tYW5kQXJncyA9IFsuLi5hcnIsIC4uLmNvbW1hbmRBcmdzXTtcbn1cblxuZnVuY3Rpb24gd2FpdEZvclBvcnQocG9ydDogbnVtYmVyLCByZXRyaWVzID0gMTAsIGludGVydmFsID0gNTAwKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocFJlc29sdmU6IGFueSwgcFJlamVjdDogYW55KSA9PiB7XG4gICAgbGV0IHJldHJpZXNSZW1haW5pbmcgPSByZXRyaWVzO1xuICAgIGxldCByZXRyeUludGVydmFsID0gaW50ZXJ2YWw7XG4gICAgbGV0IHRpbWVyOiBhbnkgPSBudWxsO1xuICAgIGxldCBzb2NrZXQ6IGFueSA9IG51bGw7XG4gICAgZnVuY3Rpb24gY2xlYXJUaW1lckFuZERlc3Ryb3lTb2NrZXQoKTogdm9pZCB7XG4gICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgdGltZXIgPSBudWxsO1xuICAgICAgaWYgKHNvY2tldCkge1xuICAgICAgICBzb2NrZXQuZGVzdHJveSgpO1xuICAgICAgfVxuICAgICAgc29ja2V0ID0gbnVsbDtcbiAgICB9XG4gICAgZnVuY3Rpb24gcmV0cnkoKTogdm9pZCB7XG4gICAgICB0cnlUb0Nvbm5lY3QoKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gdHJ5VG9Db25uZWN0KCk6IHZvaWQge1xuICAgICAgY2xlYXJUaW1lckFuZERlc3Ryb3lTb2NrZXQoKTtcblxuICAgICAgaWYgKC0tcmV0cmllc1JlbWFpbmluZyA8IDApIHtcbiAgICAgICAgcFJlamVjdChuZXcgRXJyb3IoXCJvdXQgb2YgcmV0cmllc1wiKSk7XG4gICAgICB9XG4gICAgICBzb2NrZXQgPSBjcmVhdGVDb25uZWN0aW9uKHBvcnQsIFwibG9jYWxob3N0XCIsICgpOiB2b2lkID0+IHtcbiAgICAgICAgY2xlYXJUaW1lckFuZERlc3Ryb3lTb2NrZXQoKTtcbiAgICAgICAgaWYgKHJldHJpZXNSZW1haW5pbmcgPj0gMCkge1xuICAgICAgICAgIHBSZXNvbHZlKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdGltZXIgPSBzZXRUaW1lb3V0KCgpOiB2b2lkID0+IHJldHJ5KCksIHJldHJ5SW50ZXJ2YWwpO1xuICAgICAgc29ja2V0Lm9uKFwiZXJyb3JcIiwgKGVycjogYW55KTogdm9pZCA9PiB7XG4gICAgICAgIGNsZWFyVGltZXJBbmREZXN0cm95U29ja2V0KCk7XG4gICAgICAgIHNldFRpbWVvdXQocmV0cnksIHJldHJ5SW50ZXJ2YWwpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHRyeVRvQ29ubmVjdCgpO1xuICB9KTtcbn1cblxuZXhwb3J0IHR5cGUgSW50ZXJjZXB0b3IgPSAobTogSW50ZXJjZXB0ZWRIVFRQTWVzc2FnZSkgPT4gdm9pZDtcblxuZXhwb3J0IGZ1bmN0aW9uIG5vcEludGVyY2VwdG9yKG06IEludGVyY2VwdGVkSFRUUE1lc3NhZ2UpOiB2b2lkIHtcbiAgcmV0dXJuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEhUVFBSZXNwb25zZSB7XG4gIHN0YXR1c0NvZGU6IG51bWJlcjtcbiAgaGVhZGVyczoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9O1xuICBib2R5OiBCdWZmZXI7XG59XG5cbmludGVyZmFjZSBIVFRQTWVzc2FnZU1ldGFkYXRhIHtcbiAgcmVxdWVzdDogSFRUUFJlcXVlc3RNZXRhZGF0YTtcbiAgcmVzcG9uc2U6IEhUVFBSZXNwb25zZU1ldGFkYXRhO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEhUVFBSZXF1ZXN0TWV0YWRhdGEge1xuICBtZXRob2Q6IHN0cmluZztcbiAgdXJsOiBzdHJpbmc7XG4gIGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBIVFRQUmVzcG9uc2VNZXRhZGF0YSB7XG4gIHN0YXR1c19jb2RlOiBudW1iZXI7XG4gIGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbn1cblxuZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFic3RyYWN0SFRUUEhlYWRlcnMge1xuICBwdWJsaWMgX2hlYWRlcnM6IFtzdHJpbmcsIHN0cmluZ11bXTtcbiAgcHVibGljIGdldCBoZWFkZXJzKCk6IFtzdHJpbmcsIHN0cmluZ11bXSB7XG4gICAgcmV0dXJuIHRoaXMuX2hlYWRlcnM7XG4gIH1cbiAgY29uc3RydWN0b3IoaGVhZGVyczogW3N0cmluZywgc3RyaW5nXVtdKSB7XG4gICAgdGhpcy5faGVhZGVycyA9IGhlYWRlcnM7XG4gIH1cbiAgcHVibGljIF9pbmRleE9mSGVhZGVyKG5hbWU6IHN0cmluZyk6IG51bWJlciB7XG4gICAgY29uc3QgaGVhZGVycyA9IHRoaXMuaGVhZGVycztcbiAgICBjb25zdCBsZW4gPSBoZWFkZXJzLmxlbmd0aDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoaGVhZGVyc1tpXVswXS50b0xvd2VyQ2FzZSgpID09PSBuYW1lKSB7XG4gICAgICAgIHJldHVybiBpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG4gIH1cblxuICBwdWJsaWMgZ2V0SGVhZGVyKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLl9pbmRleE9mSGVhZGVyKG5hbWUudG9Mb3dlckNhc2UoKSk7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgcmV0dXJuIHRoaXMuaGVhZGVyc1tpbmRleF1bMV07XG4gICAgfVxuICAgIHJldHVybiBcIlwiO1xuICB9XG5cbiAgcHVibGljIHNldEhlYWRlcihuYW1lOiBzdHJpbmcsIHZhbHVlOiBzdHJpbmcpOiB2b2lkIHtcbiAgICBjb25zdCBpbmRleCA9IHRoaXMuX2luZGV4T2ZIZWFkZXIobmFtZS50b0xvd2VyQ2FzZSgpKTtcbiAgICBpZiAoaW5kZXggIT09IC0xKSB7XG4gICAgICB0aGlzLmhlYWRlcnNbaW5kZXhdWzFdID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuaGVhZGVycy5wdXNoKFtuYW1lLCB2YWx1ZV0pO1xuICAgIH1cbiAgfVxuXG4gIHB1YmxpYyByZW1vdmVIZWFkZXIobmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgaW5kZXggPSB0aGlzLl9pbmRleE9mSGVhZGVyKG5hbWUudG9Mb3dlckNhc2UoKSk7XG4gICAgaWYgKGluZGV4ICE9PSAtMSkge1xuICAgICAgdGhpcy5oZWFkZXJzLnNwbGljZShpbmRleCwgMSk7XG4gICAgfVxuICB9XG5cbiAgcHVibGljIGNsZWFySGVhZGVycygpOiB2b2lkIHtcbiAgICB0aGlzLl9oZWFkZXJzID0gW107XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIEludGVyY2VwdGVkSFRUUFJlc3BvbnNlIGV4dGVuZHMgQWJzdHJhY3RIVFRQSGVhZGVycyB7XG4gIHB1YmxpYyBzdGF0dXNDb2RlOiBudW1iZXI7XG4gIGNvbnN0cnVjdG9yKG1ldGFkYXRhOiBIVFRQUmVzcG9uc2VNZXRhZGF0YSkge1xuICAgIHN1cGVyKG1ldGFkYXRhLmhlYWRlcnMpO1xuICAgIHRoaXMuc3RhdHVzQ29kZSA9IG1ldGFkYXRhLnN0YXR1c19jb2RlO1xuICAgIHRoaXMucmVtb3ZlSGVhZGVyKFwidHJhbnNmZXItZW5jb2RpbmdcIik7XG4gICAgdGhpcy5yZW1vdmVIZWFkZXIoXCJjb250ZW50LWVuY29kaW5nXCIpO1xuICAgIHRoaXMucmVtb3ZlSGVhZGVyKFwiY29udGVudC1zZWN1cml0eS1wb2xpY3lcIik7XG4gICAgdGhpcy5yZW1vdmVIZWFkZXIoXCJ4LXdlYmtpdC1jc3BcIik7XG4gICAgdGhpcy5yZW1vdmVIZWFkZXIoXCJ4LWNvbnRlbnQtc2VjdXJpdHktcG9saWN5XCIpO1xuICB9XG5cbiAgcHVibGljIHRvSlNPTigpOiBIVFRQUmVzcG9uc2VNZXRhZGF0YSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c19jb2RlOiB0aGlzLnN0YXR1c0NvZGUsXG4gICAgICBoZWFkZXJzOiB0aGlzLmhlYWRlcnNcbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRlcmNlcHRlZEhUVFBSZXF1ZXN0IGV4dGVuZHMgQWJzdHJhY3RIVFRQSGVhZGVycyB7XG4gIHB1YmxpYyBtZXRob2Q6IHN0cmluZztcbiAgcHVibGljIHJhd1VybDogc3RyaW5nO1xuICBwdWJsaWMgdXJsOiBVcmw7XG5cbiAgY29uc3RydWN0b3IobWV0YWRhdGE6IEhUVFBSZXF1ZXN0TWV0YWRhdGEpIHtcbiAgICBzdXBlcihtZXRhZGF0YS5oZWFkZXJzKTtcbiAgICB0aGlzLm1ldGhvZCA9IG1ldGFkYXRhLm1ldGhvZC50b0xvd2VyQ2FzZSgpO1xuICAgIHRoaXMucmF3VXJsID0gbWV0YWRhdGEudXJsO1xuICAgIHRoaXMudXJsID0gcGFyc2VVUkwodGhpcy5yYXdVcmwpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBJbnRlcmNlcHRlZEhUVFBNZXNzYWdlIHtcbiAgcHVibGljIHJlYWRvbmx5IHJlcXVlc3Q6IEludGVyY2VwdGVkSFRUUFJlcXVlc3Q7XG4gIHB1YmxpYyByZWFkb25seSByZXNwb25zZTogSW50ZXJjZXB0ZWRIVFRQUmVzcG9uc2U7XG4gIHB1YmxpYyByZWFkb25seSByZXF1ZXN0Qm9keTogQnVmZmVyO1xuICBwdWJsaWMgX3Jlc3BvbnNlQm9keTogQnVmZmVyO1xuXG4gIHB1YmxpYyBzdGF0aWMgRnJvbUJ1ZmZlcihiOiBCdWZmZXIpOiBJbnRlcmNlcHRlZEhUVFBNZXNzYWdlIHtcbiAgICBjb25zdCBtZXRhZGF0YVNpemUgPSBiLnJlYWRJbnQzMkxFKDApO1xuICAgIGNvbnN0IHJlcXVlc3RTaXplID0gYi5yZWFkSW50MzJMRSg0KTtcbiAgICBjb25zdCByZXNwb25zZVNpemUgPSBiLnJlYWRJbnQzMkxFKDgpO1xuICAgIGNvbnN0IG1ldGFkYXRhOiBIVFRQTWVzc2FnZU1ldGFkYXRhID0gSlNPTi5wYXJzZShiLnRvU3RyaW5nKFwidXRmOFwiLCAxMiwgMTIgKyBtZXRhZGF0YVNpemUpKTtcbiAgICByZXR1cm4gbmV3IEludGVyY2VwdGVkSFRUUE1lc3NhZ2UoXG4gICAgICBuZXcgSW50ZXJjZXB0ZWRIVFRQUmVxdWVzdChtZXRhZGF0YS5yZXF1ZXN0KSxcbiAgICAgIG5ldyBJbnRlcmNlcHRlZEhUVFBSZXNwb25zZShtZXRhZGF0YS5yZXNwb25zZSksXG4gICAgICBiLnNsaWNlKDEyICsgbWV0YWRhdGFTaXplLCAxMiArIG1ldGFkYXRhU2l6ZSArIHJlcXVlc3RTaXplKSxcbiAgICAgIGIuc2xpY2UoMTIgKyBtZXRhZGF0YVNpemUgKyByZXF1ZXN0U2l6ZSwgMTIgKyBtZXRhZGF0YVNpemUgKyByZXF1ZXN0U2l6ZSArIHJlc3BvbnNlU2l6ZSlcbiAgICApO1xuICB9XG5cbiAgY29uc3RydWN0b3IocmVxdWVzdDogSW50ZXJjZXB0ZWRIVFRQUmVxdWVzdCwgcmVzcG9uc2U6IEludGVyY2VwdGVkSFRUUFJlc3BvbnNlLCByZXF1ZXN0Qm9keTogQnVmZmVyLCByZXNwb25zZUJvZHk6IEJ1ZmZlcikge1xuICAgIHRoaXMucmVxdWVzdCA9IHJlcXVlc3Q7XG4gICAgdGhpcy5yZXNwb25zZSA9IHJlc3BvbnNlO1xuICAgIHRoaXMucmVxdWVzdEJvZHkgPSByZXF1ZXN0Qm9keTtcbiAgICB0aGlzLl9yZXNwb25zZUJvZHkgPSByZXNwb25zZUJvZHk7XG4gIH1cblxuICBwdWJsaWMgZ2V0IHJlc3BvbnNlQm9keSgpOiBCdWZmZXIge1xuICAgIHJldHVybiB0aGlzLl9yZXNwb25zZUJvZHk7XG4gIH1cblxuICBwdWJsaWMgc2V0U3RhdHVzQ29kZShzdGF0dXM6IG51bWJlcik6IHZvaWQge1xuICAgIHRoaXMucmVzcG9uc2Uuc3RhdHVzQ29kZSA9IHN0YXR1cztcbiAgfVxuXG4gIHB1YmxpYyBhZGROZXdIZWFkZXIobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5yZXNwb25zZS5zZXRIZWFkZXIobmFtZSwgdmFsdWUpO1xuICB9XG5cbiAgcHVibGljIHNldFJlc3BvbnNlQm9keShiOiBCdWZmZXIpOiB2b2lkIHtcbiAgICB0aGlzLl9yZXNwb25zZUJvZHkgPSBiO1xuICAgIHRoaXMucmVzcG9uc2Uuc2V0SGVhZGVyKFwiY29udGVudC1sZW5ndGhcIiwgYCR7Yi5sZW5ndGh9YCk7XG4gIH1cblxuICBwdWJsaWMgdG9CdWZmZXIoKTogQnVmZmVyIHtcbiAgICBjb25zdCBtZXRhZGF0YSA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KHRoaXMucmVzcG9uc2UpLCBcInV0ZjhcIik7XG4gICAgY29uc3QgbWV0YWRhdGFMZW5ndGggPSBtZXRhZGF0YS5sZW5ndGg7XG4gICAgY29uc3QgcmVzcG9uc2VMZW5ndGggPSB0aGlzLl9yZXNwb25zZUJvZHkubGVuZ3RoO1xuICAgIGNvbnN0IHJ2ID0gQnVmZmVyLmFsbG9jKDggKyBtZXRhZGF0YUxlbmd0aCArIHJlc3BvbnNlTGVuZ3RoKTtcbiAgICBydi53cml0ZUludDMyTEUobWV0YWRhdGFMZW5ndGgsIDApO1xuICAgIHJ2LndyaXRlSW50MzJMRShyZXNwb25zZUxlbmd0aCwgNCk7XG4gICAgbWV0YWRhdGEuY29weShydiwgOCk7XG4gICAgdGhpcy5fcmVzcG9uc2VCb2R5LmNvcHkocnYsIDggKyBtZXRhZGF0YUxlbmd0aCk7XG4gICAgcmV0dXJuIHJ2O1xuICB9XG5cbn1cblxuZXhwb3J0IGNsYXNzIFN0YXNoZWRJdGVtIHtcbiAgY29uc3RydWN0b3IoXG4gICAgcHVibGljIHJlYWRvbmx5IHJhd1VybDogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBtaW1lVHlwZTogc3RyaW5nLFxuICAgIHB1YmxpYyByZWFkb25seSBkYXRhOiBCdWZmZXIpIHt9XG5cbiAgcHVibGljIGdldCBzaG9ydE1pbWVUeXBlKCk6IHN0cmluZyB7XG4gICAgbGV0IG1pbWUgPSB0aGlzLm1pbWVUeXBlLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKG1pbWUuaW5kZXhPZihcIjtcIikgIT09IC0xKSB7XG4gICAgICBtaW1lID0gbWltZS5zbGljZSgwLCBtaW1lLmluZGV4T2YoXCI7XCIpKTtcbiAgICB9XG4gICAgcmV0dXJuIG1pbWU7XG4gIH1cblxuICBwdWJsaWMgZ2V0IGlzSHRtbCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zaG9ydE1pbWVUeXBlID09PSBcInRleHQvaHRtbFwiO1xuICB9XG5cbiAgcHVibGljIGdldCBpc0phdmFTY3JpcHQoKTogYm9vbGVhbiB7XG4gICAgc3dpdGNoICh0aGlzLnNob3J0TWltZVR5cGUpIHtcbiAgICAgIGNhc2UgXCJ0ZXh0L2phdmFzY3JpcHRcIjpcbiAgICAgIGNhc2UgXCJhcHBsaWNhdGlvbi9qYXZhc2NyaXB0XCI6XG4gICAgICBjYXNlIFwidGV4dC94LWphdmFzY3JpcHRcIjpcbiAgICAgIGNhc2UgXCJhcHBsaWNhdGlvbi94LWphdmFzY3JpcHRcIjpcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBNSVRNUHJveHkge1xuICBwcml2YXRlIHN0YXRpYyBfYWN0aXZlUHJvY2Vzc2VzOiBDaGlsZFByb2Nlc3NbXSA9IFtdO1xuICBwcml2YXRlIHN0YXRpYyBfY2xlYW51cENhbGxlZDogYW55ID0gZmFsc2U7XG5cbiAgcHVibGljIGNiOiBJbnRlcmNlcHRvcjtcbiAgcHVibGljIF9taXRtRXJyb3I6IGFueTtcblxuICBwcml2YXRlIF9zdGFzaEVuYWJsZWQ6IGFueSA9IGZhbHNlO1xuICBwcml2YXRlIF9taXRtUHJvY2VzczogYW55ID0gbnVsbDtcbiAgcHJpdmF0ZSBfd3NzOiBXZWJTb2NrZXRTZXJ2ZXIgPSBudWxsO1xuICBwcml2YXRlIF9zdGFzaDogYW55ID0gbmV3IE1hcDxzdHJpbmcsIFN0YXNoZWRJdGVtPigpO1xuXG4gIHB1YmxpYyBzdGF0aWMgYXN5bmMgQ3JlYXRlKGNiOiBJbnRlcmNlcHRvciA9IG5vcEludGVyY2VwdG9yKTogUHJvbWlzZTxNSVRNUHJveHk+IHtcbiAgICBjb25zdCB3c3MgPSBuZXcgV2ViU29ja2V0U2VydmVyKHsgcG9ydDogTnVtYmVyKHdlYlByb3h5UG9ydCkgfSk7XG4gICAgY29uc3QgcHJveHlDb25uZWN0ZWQgPSBuZXcgUHJvbWlzZTx2b2lkPigocFJlc29sdmU6IGFueSwgcFJlamVjdDogYW55KSA9PiB7XG4gICAgICB3c3Mub25jZShcImNvbm5lY3Rpb25cIiwgKCkgPT4ge1xuICAgICAgICBwUmVzb2x2ZSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgY29uc3QgbXAgPSBuZXcgTUlUTVByb3h5KGNiKTtcbiAgICBtcC5faW5pdGlhbGl6ZVdTUyh3c3MpO1xuICAgIGF3YWl0IG5ldyBQcm9taXNlPHZvaWQ+KChwUmVzb2x2ZTogYW55LCBwUmVqZWN0OiBhbnkpID0+IHtcbiAgICAgIHdzcy5vbmNlKFwibGlzdGVuaW5nXCIsICgpID0+IHtcbiAgICAgICAgd3NzLnJlbW92ZUxpc3RlbmVyKFwiZXJyb3JcIiwgcFJlamVjdCk7XG4gICAgICAgIHBSZXNvbHZlKCk7XG4gICAgICB9KTtcbiAgICAgIHdzcy5vbmNlKFwiZXJyb3JcIiwgcFJlamVjdCk7XG4gICAgfSk7XG5cbiAgICB0cnkge1xuICAgICAgYXdhaXQgd2FpdEZvclBvcnQoTnVtYmVyKHByb3h5UG9ydCksIDEpO1xuICAgICAgY29uc29sZS5sb2coYE1JVE1Qcm94eSBhbHJlYWR5IHJ1bm5pbmcuYCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5sb2coYE1JVE1Qcm94eSBub3QgcnVubmluZzsgc3RhcnRpbmcgdXAgbWl0bXByb3h5LmApO1xuICAgICAgY29uc3QgbWl0bVByb2Nlc3MgPSBzcGF3bihcIm1pdG1kdW1wXCIsIGNvbW1hbmRBcmdzLCB7XG4gICAgICAgIHN0ZGlvOiBcImluaGVyaXRcIlxuICAgICAgfSk7XG4gICAgICBpZiAoTUlUTVByb3h5Ll9hY3RpdmVQcm9jZXNzZXMucHVzaChtaXRtUHJvY2VzcykgPT09IDEpIHtcbiAgICAgICAgcHJvY2Vzcy5vbihcIlNJR0lOVFwiLCBNSVRNUHJveHkuX2NsZWFudXApO1xuICAgICAgICBwcm9jZXNzLm9uKFwiZXhpdFwiLCBNSVRNUHJveHkuX2NsZWFudXApO1xuICAgICAgfVxuICAgICAgbXAuX2luaXRpYWxpemVNSVRNUHJveHkobWl0bVByb2Nlc3MpO1xuICAgICAgYXdhaXQgd2FpdEZvclBvcnQoTnVtYmVyKHByb3h5UG9ydCkpO1xuICAgIH1cbiAgICBhd2FpdCBwcm94eUNvbm5lY3RlZDtcblxuICAgIHJldHVybiBtcDtcbiAgfVxuXG4gIHByaXZhdGUgc3RhdGljIF9jbGVhbnVwKCk6IHZvaWQge1xuICAgIGlmIChNSVRNUHJveHkuX2NsZWFudXBDYWxsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgTUlUTVByb3h5Ll9jbGVhbnVwQ2FsbGVkID0gdHJ1ZTtcbiAgICBNSVRNUHJveHkuX2FjdGl2ZVByb2Nlc3Nlcy5mb3JFYWNoKChwOiBhbnkpID0+IHtcbiAgICAgIHAua2lsbChcIlNJR0tJTExcIik7XG4gICAgfSk7XG4gIH1cblxuICBjb25zdHJ1Y3RvcihjYjogSW50ZXJjZXB0b3IpIHtcbiAgICB0aGlzLmNiID0gY2I7XG4gIH1cblxuICBwdWJsaWMgZ2V0IHN0YXNoRW5hYmxlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5fc3Rhc2hFbmFibGVkO1xuICB9XG4gIHB1YmxpYyBzZXQgc3Rhc2hFbmFibGVkKHY6IGJvb2xlYW4pIHtcbiAgICBpZiAoIXYpIHtcbiAgICAgIHRoaXMuX3N0YXNoLmNsZWFyKCk7XG4gICAgfVxuICAgIHRoaXMuX3N0YXNoRW5hYmxlZCA9IHY7XG4gIH1cblxuICBwdWJsaWMgZ2V0RnJvbVN0YXNoKHVybDogc3RyaW5nKTogU3Rhc2hlZEl0ZW0ge1xuICAgIHJldHVybiB0aGlzLl9zdGFzaC5nZXQodXJsKTtcbiAgfVxuXG4gIHB1YmxpYyBmb3JFYWNoU3Rhc2hJdGVtKGNiOiAodmFsdWU6IFN0YXNoZWRJdGVtLCB1cmw6IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xuICAgIHRoaXMuX3N0YXNoLmZvckVhY2goY2IpO1xuICB9XG5cbiAgcHVibGljIGFzeW5jIHByb3h5R2V0KHVybFN0cmluZzogc3RyaW5nKTogUHJvbWlzZTxIVFRQUmVzcG9uc2U+IHtcbiAgICBjb25zdCB1cmwgPSBwYXJzZVVSTCh1cmxTdHJpbmcpO1xuICAgIGNvbnN0IGdldDogYW55ID0gdXJsLnByb3RvY29sID09PSBcImh0dHA6XCIgPyBodHRwR2V0IDogaHR0cHNHZXQ7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPEhUVFBSZXNwb25zZT4oKHBSZXNvbHZlOiBhbnksIHBSZWplY3Q6IGFueSkgPT4ge1xuICAgICAgY29uc3QgcmVxID0gZ2V0KHtcbiAgICAgICAgdXJsOiB1cmxTdHJpbmcsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICBob3N0OiB1cmwuaG9zdFxuICAgICAgICB9LFxuICAgICAgICBob3N0OiBcImxvY2FsaG9zdFwiLFxuICAgICAgICBwb3J0OiBOdW1iZXIocHJveHlQb3J0KSxcbiAgICAgICAgcGF0aDogdXJsU3RyaW5nXG4gICAgICB9LCAocmVzOiBhbnkpID0+IHtcbiAgICAgICAgY29uc3QgZGF0YSA9IG5ldyBBcnJheTxCdWZmZXI+KCk7XG4gICAgICAgIHJlcy5vbihcImRhdGFcIiwgKGNodW5rOiBCdWZmZXIpID0+IHtcbiAgICAgICAgICBkYXRhLnB1c2goY2h1bmspO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzLm9uKFwiZW5kXCIsICgpID0+IHtcbiAgICAgICAgICBjb25zdCBkID0gQnVmZmVyLmNvbmNhdChkYXRhKTtcbiAgICAgICAgICBwUmVzb2x2ZSh7XG4gICAgICAgICAgICBzdGF0dXNDb2RlOiByZXMuc3RhdHVzQ29kZSxcbiAgICAgICAgICAgIGhlYWRlcnM6IHJlcy5oZWFkZXJzLFxuICAgICAgICAgICAgYm9keTogZFxuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgcmVzLm9uY2UoXCJlcnJvclwiLCBwUmVqZWN0KTtcbiAgICAgIH0pO1xuICAgICAgcmVxLm9uY2UoXCJlcnJvclwiLCBwUmVqZWN0KTtcbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzaHV0ZG93bigpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHBSZXNvbHZlOiBhbnksIHBSZWplY3Q6IGFueSkgPT4ge1xuICAgICAgY29uc3QgY2xvc2VXU1MgPSAoKSA9PiB7XG4gICAgICAgIHRoaXMuX3dzcy5jbG9zZSgoZXJyOiBhbnkpOiB2b2lkID0+IHtcbiAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICBwUmVqZWN0KGVycik7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHBSZXNvbHZlKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH07XG5cbiAgICAgIGlmICh0aGlzLl9taXRtUHJvY2VzcyAmJiB0aGlzLl9taXRtUHJvY2Vzcy5jb25uZWN0ZWQpIHtcbiAgICAgICAgdGhpcy5fbWl0bVByb2Nlc3Mub25jZShcImV4aXRcIiwgKGNvZGU6IGFueSwgc2lnbmFsOiBhbnkpID0+IHtcbiAgICAgICAgICBjbG9zZVdTUygpO1xuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fbWl0bVByb2Nlc3Mua2lsbCgpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2xvc2VXU1MoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIHB1YmxpYyBhc3luYyBzaHV0RG93bldlYlNvY2tldCgpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHdzUmVzb2x2ZTogYW55LCB3c1JlamVjdDogYW55KSA9PiB7XG4gICAgICB0aGlzLl93c3MuY2xvc2UoKGVycjogYW55KTogdm9pZCA9PiB7XG4gICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICB3c1JlamVjdChlcnIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdzUmVzb2x2ZSgpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9KVxuICB9XG5cbiAgcHJpdmF0ZSBfaW5pdGlhbGl6ZVdTUyh3c3M6IFdlYlNvY2tldFNlcnZlcik6IHZvaWQge1xuICAgIHRoaXMuX3dzcyA9IHdzcztcbiAgICB0aGlzLl93c3Mub24oXCJjb25uZWN0aW9uXCIsICh3czogYW55KSA9PiB7XG4gICAgICB3cy5vbihcIm1lc3NhZ2VcIiwgKG1lc3NhZ2U6IEJ1ZmZlcikgPT4ge1xuICAgICAgICBjb25zdCBvcmlnaW5hbCA9IEludGVyY2VwdGVkSFRUUE1lc3NhZ2UuRnJvbUJ1ZmZlcihtZXNzYWdlKTtcbiAgICAgICAgdGhpcy5jYihvcmlnaW5hbCk7XG4gICAgICAgIGlmICh0aGlzLl9zdGFzaEVuYWJsZWQpIHtcbiAgICAgICAgICB0aGlzLl9zdGFzaC5zZXQob3JpZ2luYWwucmVxdWVzdC5yYXdVcmwsXG4gICAgICAgICAgICBuZXcgU3Rhc2hlZEl0ZW0ob3JpZ2luYWwucmVxdWVzdC5yYXdVcmwsIG9yaWdpbmFsLnJlc3BvbnNlLmdldEhlYWRlcihcImNvbnRlbnQtdHlwZVwiKSwgb3JpZ2luYWwucmVzcG9uc2VCb2R5KSk7XG4gICAgICAgIH1cbiAgICAgICAgd3Muc2VuZChvcmlnaW5hbC50b0J1ZmZlcigpKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBfaW5pdGlhbGl6ZU1JVE1Qcm94eShtaXRtUHJveHk6IENoaWxkUHJvY2Vzcyk6IHZvaWQge1xuICAgIHRoaXMuX21pdG1Qcm9jZXNzID0gbWl0bVByb3h5O1xuICAgIHRoaXMuX21pdG1Qcm9jZXNzLm9uKFwiZXhpdFwiLCAoY29kZTogYW55LCBzaWduYWw6IGFueSkgPT4ge1xuICAgICAgY29uc3QgaW5kZXggPSBNSVRNUHJveHkuX2FjdGl2ZVByb2Nlc3Nlcy5pbmRleE9mKHRoaXMuX21pdG1Qcm9jZXNzKTtcbiAgICAgIGlmIChpbmRleCAhPT0gLTEpIHtcbiAgICAgICAgTUlUTVByb3h5Ll9hY3RpdmVQcm9jZXNzZXMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChjb2RlICE9PSBudWxsKSB7XG4gICAgICAgIGlmIChjb2RlICE9PSAwKSB7XG4gICAgICAgICAgdGhpcy5fbWl0bUVycm9yID0gbmV3IEVycm9yKGBQcm9jZXNzIGV4aXRlZCB3aXRoIGNvZGUgJHtjb2RlfS5gKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fbWl0bUVycm9yID0gbmV3IEVycm9yKGBQcm9jZXNzIGV4aXRlZCBkdWUgdG8gc2lnbmFsICR7c2lnbmFsfS5gKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICB0aGlzLl9taXRtUHJvY2Vzcy5vbihcImVycm9yXCIsIChlcnI6IGFueSkgPT4ge1xuICAgICAgdGhpcy5fbWl0bUVycm9yID0gZXJyO1xuICAgIH0pO1xuICB9XG59XG4iXX0=