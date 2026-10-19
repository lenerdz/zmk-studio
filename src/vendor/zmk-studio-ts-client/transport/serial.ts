// Ported from @zmkfirmware/zmk-studio-ts-client 0.0.18 (lib/transport/serial.js),
// MIT License, Copyright (c) 2020 The ZMK Contributors. See LICENSE.
import type { RpcTransport } from "./index";

export async function connect(): Promise<RpcTransport> {
  const abortController = new AbortController();

  const port = await navigator.serial.requestPort({});

  await port.open({ baudRate: 12500 }).catch((e) => {
    if (e instanceof DOMException && e.name === "NetworkError") {
      throw new Error(
        "Failed to open the serial port. Check the permissions of the device and verify it is not in use by another process.",
        { cause: e },
      );
    } else {
      throw e;
    }
  });

  const info = port.getInfo();
  const label =
    (info.usbVendorId?.toLocaleString() || "") +
    ":" +
    (info.usbProductId?.toLocaleString() || "");

  const sig = abortController.signal;
  const abort_cb = async () => {
    sig.removeEventListener("abort", abort_cb);
    await port.writable?.close();
    await port.readable?.cancel();
    await port.close();
  };
  sig.addEventListener("abort", abort_cb);

  return {
    label,
    abortController,
    readable: port.readable as ReadableStream<Uint8Array>,
    writable: port.writable as WritableStream<Uint8Array>,
  };
}
