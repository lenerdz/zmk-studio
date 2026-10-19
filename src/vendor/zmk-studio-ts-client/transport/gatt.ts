// Ported from @zmkfirmware/zmk-studio-ts-client 0.0.18 (lib/transport/gatt.js),
// MIT License, Copyright (c) 2020 The ZMK Contributors. See LICENSE.
import type { RpcTransport } from "./index";
import { UserCancelledError } from "./errors";

const SERVICE_UUID = "00000000-0196-6107-c967-c5cfb1c2482a";
const RPC_CHRC_UUID = "00000001-0196-6107-c967-c5cfb1c2482a";

export async function connect(): Promise<RpcTransport> {
  const dev = await navigator.bluetooth
    .requestDevice({
      filters: [{ services: [SERVICE_UUID] }],
      optionalServices: [SERVICE_UUID],
    })
    .catch((e) => {
      if (e instanceof DOMException && e.name == "NotFoundError") {
        throw new UserCancelledError("User cancelled the connection attempt", {
          cause: e,
        });
      } else {
        throw e;
      }
    });

  if (!dev.gatt) {
    throw "No GATT service!";
  }
  const gatt = dev.gatt;

  const abortController = new AbortController();
  const label = dev.name || "Unknown";

  if (!gatt.connected) {
    await gatt.connect();
  }

  const svc = await gatt.getPrimaryService(SERVICE_UUID);
  const char = await svc.getCharacteristic(RPC_CHRC_UUID);

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      // Reconnect to the same device will lose notifications if we don't first force a stop before starting again.
      await char.stopNotifications();
      await char.startNotifications();

      const vc = (ev: Event) => {
        const buf = (ev.target as BluetoothRemoteGATTCharacteristic | null)
          ?.value?.buffer;
        if (!buf) {
          return;
        }

        controller.enqueue(new Uint8Array(buf));
      };
      char.addEventListener("characteristicvaluechanged", vc);

      const cb = async () => {
        char.removeEventListener("characteristicvaluechanged", vc);
        dev.removeEventListener("gattserverdisconnected", cb);
        controller.close();
      };
      dev.addEventListener("gattserverdisconnected", cb);
    },
  });

  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      return char.writeValueWithoutResponse(chunk);
    },
  });

  const sig = abortController.signal;
  const abort_cb = async () => {
    sig.removeEventListener("abort", abort_cb);
    dev.gatt?.disconnect();
  };
  sig.addEventListener("abort", abort_cb);

  return { label, abortController, readable, writable };
}
