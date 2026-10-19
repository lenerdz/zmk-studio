// Ported from @zmkfirmware/zmk-studio-ts-client 0.0.18 (lib/index.js),
// MIT License, Copyright (c) 2020 The ZMK Contributors. See LICENSE.
//
// The behavior is the same as the published package. The generated message
// files next to this one (studio.ts, keymap.ts, ...) are the part that differs:
// they include the requests of the lenerdz/zmk-studio-messages fork. See
// README.md in this folder.
import { Request, Response, RequestResponse, Notification } from "./studio";
import { get_encoder, get_decoder } from "./framing";
import { Mutex } from "async-mutex";
import type { RpcTransport } from "./transport";
import { ErrorConditions } from "./meta";

export { Request, RequestResponse, Response, Notification };

export interface RpcConnection {
  label: string;
  request_response_readable: ReadableStream<RequestResponse>;
  request_writable: WritableStream<Request>;
  notification_readable: ReadableStream<Notification>;
  current_request: number;
}

export interface CreateRpcConnectionOpts {
  signal?: AbortSignal;
}

export function create_rpc_connection(
  transport: RpcTransport,
  opts?: CreateRpcConnectionOpts,
): RpcConnection {
  const { writable: request_writable, readable: byte_readable } =
    new TransformStream<Request, Uint8Array>({
      transform(chunk, controller) {
        const bytes = Request.encode(chunk).finish();
        controller.enqueue(bytes);
      },
    });

  const reqPipelineClosed = byte_readable
    .pipeThrough(new TransformStream<Uint8Array, Uint8Array>(get_encoder()), {
      signal: opts?.signal,
    })
    .pipeTo(transport.writable, { signal: opts?.signal });

  reqPipelineClosed
    .catch((r) => {
      console.log("Closed error", r);
      return r;
    })
    .then(async (reason) => {
      await byte_readable.cancel();
      transport.abortController.abort(reason);
    });

  const response_readable = transport.readable
    .pipeThrough(new TransformStream<Uint8Array, Uint8Array>(get_decoder()), {
      signal: opts?.signal,
    })
    .pipeThrough(
      new TransformStream<Uint8Array, Response>({
        transform(chunk, controller) {
          controller.enqueue(Response.decode(chunk));
        },
      }),
      { signal: opts?.signal },
    );

  const [a, b] = response_readable.tee();

  const request_response_readable = a.pipeThrough(
    new TransformStream<Response, RequestResponse>({
      transform(chunk, controller) {
        if (chunk.requestResponse) {
          controller.enqueue(chunk.requestResponse);
        }
      },
    }),
    { signal: opts?.signal },
  );

  const notification_readable = b.pipeThrough(
    new TransformStream<Response, Notification>({
      transform(chunk, controller) {
        if (chunk.notification) {
          controller.enqueue(chunk.notification);
        }
      },
    }),
    { signal: opts?.signal },
  );

  return {
    label: transport.label,
    request_response_readable,
    request_writable,
    notification_readable,
    current_request: 0,
  };
}

const rpcMutex = new Mutex();

export class NoResponseError extends Error {
  constructor() {
    super("No RPC response received");
    Object.setPrototypeOf(this, NoResponseError.prototype);
  }
}

export class MetaError extends Error {
  readonly condition: ErrorConditions;

  constructor(condition: ErrorConditions) {
    super("Meta error: " + condition);
    this.condition = condition;
    Object.setPrototypeOf(this, MetaError.prototype);
  }
}

export async function call_rpc(
  conn: RpcConnection,
  req: Omit<Request, "requestId">,
): Promise<RequestResponse> {
  return await rpcMutex.runExclusive(async () => {
    const request = { ...req, requestId: conn.current_request++ };

    const writer = conn.request_writable.getWriter();
    await writer.write(request);
    writer.releaseLock();

    const reader = conn.request_response_readable.getReader();
    const { done, value } = await reader.read();
    reader.releaseLock();

    if (done || !value) {
      throw "No response";
    }

    if (value.requestId != request.requestId) {
      throw "Mismatch request IDs";
    }

    if (value.meta?.noResponse) {
      throw new NoResponseError();
    } else if (value.meta?.simpleError) {
      throw new MetaError(value.meta.simpleError);
    }

    return value;
  });
}
