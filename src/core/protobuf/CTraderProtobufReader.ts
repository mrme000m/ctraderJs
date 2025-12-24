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

        return this.#wrap(payloadType, message, clientMsgId).encode();
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
        const ProtoMessage = this.getMessageByName("ProtoMessage");

        // Encode the inner message to a buffer
        const payloadBuffer = message.constructor.encode(message).finish();

        return ProtoMessage.create({
            payloadType: payloadType,
            payload: payloadBuffer,
            clientMsgId: clientMsgId,
        });
    }

    public load(): void {
        const filePaths = this.#params.map((param: any) => param.file);
        this.#root = protobuf.loadSync(filePaths);
    }

    public build(): void {
        const root = this.#root;

        // Process all nested objects
        const messages: any[] = [];
        const enums: any[] = [];

        for (const key in root.nested) {
            const child = root.nested[key];
            if (child instanceof protobuf.Type) {
                messages.push(child);
            } else if (child instanceof protobuf.Enum) {
                enums.push(child);
            }
        }

        // Filter messages that have a payloadType field
        messages.filter((message) => typeof this.findPayloadType(message) === "number")
            .forEach((message) => {
                const name: string = message.name;
                // The message constructor is already available via root.nested[name]
                const messageConstructor = root.nested[name];

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
            this.#enums[name] = root.nested[name];
        });

        this.#buildWrapper();
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
