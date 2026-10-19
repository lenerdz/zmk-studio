// Ported from @zmkfirmware/zmk-studio-ts-client 0.0.18 (lib/transport/index.d.ts),
// MIT License, Copyright (c) 2020 The ZMK Contributors. See LICENSE.
export interface RpcTransport {
  label: string;
  abortController: AbortController;
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}
