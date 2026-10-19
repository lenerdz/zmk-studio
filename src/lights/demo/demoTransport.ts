/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of upstream ZMK
 * Studio.
 *
 * Connects the demo keyboard (demoDevice.ts) to the app as a transport. The
 * bytes go through the same framing and the same message encoding as with a real
 * keyboard, so the app (and the tests) exercise the whole client.
 */
import { Request, Response } from "@zmkfirmware/zmk-studio-ts-client";
import {
  get_decoder,
  get_encoder,
} from "@zmkfirmware/zmk-studio-ts-client/framing";
import type { RpcTransport } from "@zmkfirmware/zmk-studio-ts-client/transport/index";
import { DemoDevice, type DemoDeviceOptions } from "./demoDevice";

export function createDemoTransport(
  options?: DemoDeviceOptions,
): RpcTransport & { device: DemoDevice } {
  const device = new DemoDevice(options);
  const abortController = new AbortController();

  // The bytes of the app to the keyboard, and the other way around.
  const toDevice = new TransformStream<Uint8Array, Uint8Array>();
  const toApp = new TransformStream<Uint8Array, Uint8Array>();

  const framer = new TransformStream<Uint8Array, Uint8Array>(get_encoder());
  framer.readable.pipeTo(toApp.writable).catch(() => {});
  const out = framer.writable.getWriter();

  const send = (response: Response) =>
    out.write(Response.encode(response).finish());

  toDevice.readable
    .pipeThrough(new TransformStream<Uint8Array, Uint8Array>(get_decoder()))
    .pipeTo(
      new WritableStream<Uint8Array>({
        async write(frame) {
          const { response, notifications } = device.handle(
            Request.decode(frame),
          );

          await send({ requestResponse: response });
          for (const notification of notifications) {
            await send({ notification });
          }
        },
      }),
    )
    .catch(() => {});

  // Like an unplugged cable: the app sees the end of the stream.
  abortController.signal.addEventListener(
    "abort",
    () => {
      out.close().catch(() => {});
    },
    { once: true },
  );

  return {
    label: "Demo",
    abortController,
    readable: toApp.readable,
    writable: toDevice.writable,
    device,
  };
}
