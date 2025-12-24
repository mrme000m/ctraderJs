import { GenericObject } from "#utilities/GenericObject";

const protobuf = require("protobufjs");

export class CTraderProtobufReader {
    #params: any;
    #root: any;
    readonly #payloadTypes: {
        [key: string]: any;
    };
    readonly #names: any;
    readonly #messages: any;
    readonly #enums: any;

    public constructor(options: GenericObject) {
        this.#params = options;
        this.#root = undefined;
        this.#payloadTypes = {};
        this.#names = {};
        this.#messages = {};
        this.#enums = {};
    }

    public encode(payloadType: number, params: GenericObject, clientMsgId: string): any {
        const Message = this.getMessageByPayloadType(payloadType);
        const message = Message.create(params);

        // Create the envelope ProtoMessage and encode to a Buffer
        const protoMessageObj = this.#wrap(payloadType, message, clientMsgId);
        const ProtoMessage = this.getMessageByName("ProtoMessage");
        const encoded = ProtoMessage.encode(protoMessageObj).finish();

        // Return an object that matches the encoder's expectation (has `toBuffer()`)
        return {
            toBuffer: () => Buffer.from(encoded),
        };
    }

    public decode(buffer: GenericObject): any {
        const ProtoMessage = this.getMessageByName("ProtoMessage");
        const protoMessage = ProtoMessage.decode(buffer);
        const payloadType = protoMessage.payloadType;

        return {
            payload: this.getMessageByPayloadType(payloadType).decode(protoMessage.payload),
            payloadType: payloadType,
            clientMsgId: protoMessage.clientMsgId,
        };
    }

    #wrap(payloadType: number, message: any, clientMsgId: string): any {
        // Return a plain object that can be encoded by ProtoMessage.encode()
        return {
            payloadType: payloadType,
            payload: message.constructor.encode(message).finish(),
            clientMsgId: clientMsgId,
        };
    }

    public load(): void {
        const filePaths = this.#params.map((param: any) => param.file);
        this.#root = protobuf.loadSync(filePaths);
    }

    public build(): void {
        const root = this.#root;

        // Helper to recursively collect messages and enums from nested namespaces
        const messages: any[] = [];
        const enums: any[] = [];

        function walk(node: any) {
            if (!node) return;
            for (const key in node.nested) {
                const child = node.nested[key];
                if (child instanceof protobuf.Type) {
                    messages.push(child);
                } else if (child instanceof protobuf.Enum) {
                    enums.push(child);
                } else if (child && typeof child === 'object' && child.nested) {
                    walk(child);
                }
            }
        }

        walk(root);

        // Filter messages that have a payloadType field
        messages.filter((message) => typeof this.findPayloadType(message) === 'number')
            .forEach((message) => {
                const name: string = message.name;
                // Find message constructor by traversing the root by name (handles nested containers)
                const messageConstructor = this._findMessageConstructorByName(root, name);

                if (!messageConstructor) return;

                this.#messages[name] = messageConstructor;

                const payloadType = this.findPayloadType(message);

                this.#names[name] = {
                    messageBuilded: messageConstructor,
                    payloadType: payloadType,
                };
                this.#payloadTypes[payloadType] = {
                    messageBuilded: messageConstructor,
                    name: name,
                };
            });

        // Store enums
        enums.forEach((enumObj: any) => {
            const name: string = enumObj.name;
            const enumConstructor = this._findEnumConstructorByName(root, name);
            if (enumConstructor) this.#enums[name] = enumConstructor;
        });

        this.#buildWrapper();

        // Debug: list registered message names
        if (process.env.CTRADER_DEBUG) {
            console.log('[PROTO] Registered message names:', Object.keys(this.#names));
            console.log('[PROTO] Registered payload types:', Object.keys(this.#payloadTypes));
        }
    }

    // Helper: recursively search a message constructor by name
    private _findMessageConstructorByName(root: any, name: string): any {
        // Breadth-first search through nested namespaces
        const queue = [root];
        while (queue.length) {
            const node = queue.shift();
            if (!node || !node.nested) continue;
            for (const key in node.nested) {
                const child = node.nested[key];
                if (child instanceof protobuf.Type && child.name === name) return child;
                if (child && typeof child === 'object' && child.nested) queue.push(child);
            }
        }
        return undefined;
    }

    private _findEnumConstructorByName(root: any, name: string): any {
        const queue = [root];
        while (queue.length) {
            const node = queue.shift();
            if (!node || !node.nested) continue;
            for (const key in node.nested) {
                const child = node.nested[key];
                if (child instanceof protobuf.Enum && child.name === name) return child;
                if (child && typeof child === 'object' && child.nested) queue.push(child);
            }
        }
        return undefined;
    }

    #buildWrapper(): void {
        const name = "ProtoMessage";
        const messageConstructor = this.#root.nested[name];
        if (!messageConstructor) {
            throw new Error("ProtoMessage not found in proto definitions");
        }
        this.#messages[name] = messageConstructor;
        this.#names[name] = {
            messageBuilded: messageConstructor,
            payloadType: undefined,
        };
    }

    public findPayloadType(message: any): any {
        const field = message.fields && message.fields.payloadType;
        if (!field) {
            return undefined;
        }
        return field.defaultValue;
    }

    public getMessageByPayloadType(payloadType: number): any {
        const entry = this.#payloadTypes[payloadType];
        if (!entry) {
            throw new Error(`No message registered for payload type ${payloadType}`);
        }
        return entry.messageBuilded;
    }

    public getMessageByName(name: string): any {
        const entry = this.#names[name];
        if (!entry) {
            throw new Error(`No message registered for name ${name}`);
        }
        return entry.messageBuilded;
    }

    public getPayloadTypeByName(name: string): number {
        const entry = this.#names[name];
        if (!entry) {
            throw new Error(`No message registered for name ${name}`);
        }
        return entry.payloadType;
    }
}
