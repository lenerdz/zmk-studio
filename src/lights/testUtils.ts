/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Helpers for the tests of the lights code. Nothing here is used by the app.
 */
import { create_rpc_connection } from "@zmkfirmware/zmk-studio-ts-client";
import type { DemoDeviceOptions } from "./demo/demoDevice";
import { createDemoTransport } from "./demo/demoTransport";

/**
 * A connection to a demo keyboard, the way the app makes it: the bytes go
 * through the framing and the message encoding, in both directions.
 */
export function connectDemo(options?: DemoDeviceOptions) {
  const transport = createDemoTransport(options);
  const conn = create_rpc_connection(transport);

  return {
    conn,
    device: transport.device,
    /** Like unplugging the cable. */
    close: () => transport.abortController.abort(),
  };
}
