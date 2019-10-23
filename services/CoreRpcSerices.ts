import * as WebRequest from 'web-request';
import { CoreCookieService } from './CoreCookieService';

let RPC_REQUEST_ID = 1;

export const isException = Symbol();

export class Exception extends Error {

    public code = 500;
    public body;

    constructor(code: number, ...args: any[]) {
        super(args[0]);
        this.code = code;
        this.name = this.constructor.name;
        this.message = args[0] || 'Unknown error';
        this.body = args[1] || args[0];
        this[isException] = true;
        Error.captureStackTrace(this);
    }

    public toString(): string {
        return `${this.code} - ${this.constructor.name}:${this.message}`;
    }
}

export class HttpException extends Exception {
    constructor(id: number, message: string) {
        super(id, message);
    }
}

export class InternalServerException extends Exception {
    constructor(...args: any[]) {
        super(500, args);
    }
}

export interface JsonRpc2ResponseError {
    code: number;
    message: string;
    data?: any;
}

export interface JsonRpc2Response {
    jsonrpc: string;
    result?: any;
    error?: JsonRpc2ResponseError;
    id: number | string;
}

export class CoreRpcService {

    public log: Console;

    private DEFAULT_MAINNET_PORT = 51735;
    private DEFAULT_TESTNET_PORT = 51935;
    private DEFAULT_HOSTNAME = 'localhost';
    public coreCookieService: CoreCookieService

    // DEFAULT_USERNAME & DEFAULT_PASSWORD in CoreCookieService

    constructor() {
        this.log = console;
        this.coreCookieService = new CoreCookieService();
    }

    public async isConnected(): Promise<boolean> {
        return await this.getNetworkInfo()
            .then(response => true)
            .catch(error => false);
    }

    public async getNetworkInfo(): Promise<any> {
        return await this.call('getnetworkinfo', [], false);
    }

    public async call(method: string, params: any[] = [], logCall: boolean = true): Promise<any> {

        const id = RPC_REQUEST_ID++;
        const postData = JSON.stringify({
            jsonrpc: '2.0',
            method,
            params,
            id
        });

        const url = this.getUrl();
        const options = this.getOptions();

        if (logCall) {
            this.log.debug('call: ' + method + ' ' + params.toString().replace(',', ' '));
        }
        // this.log.debug('call url:', url);
        // this.log.debug('call postData:', postData);

        return await WebRequest.post(url, options, postData)
            .then( response => {

                if (response.statusCode !== 200) {
                    this.log.debug('response.headers: ', response.headers);
                    this.log.debug('response.statusCode: ', response.statusCode);
                    this.log.debug('response.statusMessage: ', response.statusMessage);
                    this.log.debug('response.content: ', response.content);
                    throw new HttpException(response.statusCode, response.statusMessage);
                }

                const jsonRpcResponse = JSON.parse(response.content) as JsonRpc2Response;
                if (jsonRpcResponse.error) {
                    throw new InternalServerException([jsonRpcResponse.error.code, jsonRpcResponse.error.message]);
                }

                // this.log.debug('RESULT:', jsonRpcResponse.result);
                return jsonRpcResponse.result;
            })
            .catch(error => {
                this.log.error('ERROR: ' + error.name + ': ' + error.message);
                if (error instanceof HttpException || error instanceof InternalServerException) {
                    throw error;
                } else {
                    throw new InternalServerException([error.name, error.message]);
                }
            });

    }

    private getOptions(): any {

        const auth = {
            user: (process.env.RPCUSER ? process.env.RPCUSER : this.coreCookieService.getCoreRpcUsername()),
            pass: (process.env.RPCPASSWORD ? process.env.RPCPASSWORD : this.coreCookieService.getCoreRpcPassword()),
            sendImmediately: false
        };

        const headers = {
            'User-Agent': 'Marketplace RPC client',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        const rpcOpts = {
            auth,
            headers
        };

        // this.log.debug('initializing rpc with opts:', rpcOpts);
        return rpcOpts;
    }

    private getUrl(): string {
        const host = (process.env.RPCHOSTNAME ? process.env.RPCHOSTNAME : this.DEFAULT_HOSTNAME);
        const port = (false ? // TODO: Is testnet...
            (process.env.TESTNET_PORT ? process.env.TESTNET_PORT : this.DEFAULT_TESTNET_PORT) :
            (process.env.MAINNET_PORT ? process.env.MAINNET_PORT : this.DEFAULT_MAINNET_PORT));
        return 'http://' + host + ':' + port;
    }

}
