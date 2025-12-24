import WebSocket = require("ws");
import { CTraderSocketParameters } from "#sockets/CTraderSocketParameters";

export class CTraderWebSocket {
    readonly #host: string;
    readonly #port: number;
    #socket?: WebSocket;

    public constructor ({ host, port, }: CTraderSocketParameters) {
        this.#host = host;
        this.#port = port;
        this.#socket = undefined;
    }

    public get host (): string {
        return this.#host;
    }

    public get port (): number {
        return this.#port;
    }

    public connect (): void {
        const wsUrl = `wss://${this.#host}:${this.#port}`;
        const socket = new WebSocket(wsUrl);

        socket.on("open", this.onOpen);
        socket.on("message", this.onData);
        socket.on("close", this.onClose);
        socket.on("error", this.onError);

        this.#socket = socket;
    }

    public send (buffer: any): void {
        if (this.#socket && this.#socket.readyState === WebSocket.OPEN) {
            this.#socket.send(buffer);
        }
    }

    public onOpen (): void {
        // Silence is golden.
    }

    public onData (...parameters: any[]): void {
        // Silence is golden.
    }

    public onClose (): void {
        // Silence is golden.
    }

    public onError (): void {
        // Silence is golden.
    }

    public close (): void {
        this.#socket?.close();
    }

    public get readyState (): number {
        return this.#socket?.readyState ?? WebSocket.CONNECTING;
    }
}