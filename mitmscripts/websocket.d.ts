/// <reference types="node" />
import { Url } from "url";
export declare type Interceptor = (m: InterceptedHTTPMessage) => void;
export declare function nopInterceptor(m: InterceptedHTTPMessage): void;
export interface HTTPResponse {
    statusCode: number;
    headers: {
        [name: string]: string;
    };
    body: Buffer;
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
export declare abstract class AbstractHTTPHeaders {
    _headers: [string, string][];
    readonly headers: [string, string][];
    constructor(headers: [string, string][]);
    _indexOfHeader(name: string): number;
    getHeader(name: string): string;
    setHeader(name: string, value: string): void;
    removeHeader(name: string): void;
    clearHeaders(): void;
}
export declare class InterceptedHTTPResponse extends AbstractHTTPHeaders {
    statusCode: number;
    constructor(metadata: HTTPResponseMetadata);
    toJSON(): HTTPResponseMetadata;
}
export declare class InterceptedHTTPRequest extends AbstractHTTPHeaders {
    method: string;
    rawUrl: string;
    url: Url;
    constructor(metadata: HTTPRequestMetadata);
}
export declare class InterceptedHTTPMessage {
    readonly request: InterceptedHTTPRequest;
    readonly response: InterceptedHTTPResponse;
    readonly requestBody: Buffer;
    _responseBody: Buffer;
    static FromBuffer(b: Buffer): InterceptedHTTPMessage;
    constructor(request: InterceptedHTTPRequest, response: InterceptedHTTPResponse, requestBody: Buffer, responseBody: Buffer);
    readonly responseBody: Buffer;
    setStatusCode(status: number): void;
    addNewHeader(name: string, value: string): void;
    setResponseBody(b: Buffer): void;
    toBuffer(): Buffer;
}
export declare class StashedItem {
    readonly rawUrl: string;
    readonly mimeType: string;
    readonly data: Buffer;
    constructor(rawUrl: string, mimeType: string, data: Buffer);
    readonly shortMimeType: string;
    readonly isHtml: boolean;
    readonly isJavaScript: boolean;
}
export declare class MITMProxy {
    private static _activeProcesses;
    private static _cleanupCalled;
    cb: Interceptor;
    _mitmError: any;
    private _stashEnabled;
    private _mitmProcess;
    private _wss;
    private _stash;
    static Create(cb?: Interceptor): Promise<MITMProxy>;
    private static _cleanup;
    constructor(cb: Interceptor);
    stashEnabled: boolean;
    getFromStash(url: string): StashedItem;
    forEachStashItem(cb: (value: StashedItem, url: string) => void): void;
    proxyGet(urlString: string): Promise<HTTPResponse>;
    shutdown(): Promise<void>;
    shutDownWebSocket(): Promise<void>;
    private _initializeWSS;
    private _initializeMITMProxy;
}
