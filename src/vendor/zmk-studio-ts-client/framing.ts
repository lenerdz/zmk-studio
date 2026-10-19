// Ported from @zmkfirmware/zmk-studio-ts-client 0.0.18 (lib/framing.js),
// MIT License, Copyright (c) 2020 The ZMK Contributors. See LICENSE.
//
// Framing of the ZMK Studio RPC messages over a byte stream: every message is
// wrapped in a start-of-frame and an end-of-frame byte, and any byte of the
// payload with the value of one of the three special bytes is escaped.

const FRAMING_SOF = 0xab;
const FRAMING_ESC = 0xac;
const FRAMING_EOF = 0xad;

export function get_encoder(): Transformer<Uint8Array, Uint8Array> {
  return {
    transform: (chunk, controller) => {
      if (chunk instanceof Uint8Array) {
        controller.enqueue(new Uint8Array([FRAMING_SOF]));

        let next_start_index = 0;
        for (let i = 0; i < chunk.length; i++) {
          switch (chunk[i]) {
            case FRAMING_SOF:
            case FRAMING_ESC:
            case FRAMING_EOF:
              controller.enqueue(chunk.subarray(next_start_index, i));
              controller.enqueue(new Uint8Array([FRAMING_ESC]));
              next_start_index = i;
          }
        }

        if (next_start_index < chunk.length) {
          controller.enqueue(chunk.subarray(next_start_index, chunk.length));
        }

        controller.enqueue(new Uint8Array([FRAMING_EOF]));
      } else {
        return controller.error("Only Uint8Array chunks are able to be handled");
      }
    },
  };
}

enum DecodeState {
  IDLE,
  AWAITING_DATA,
  ESCAPED,
}

export function get_decoder(): Transformer<Uint8Array, Uint8Array> {
  let state = DecodeState.IDLE;
  let data: number[] = [];

  const process = (
    b: number,
    controller: TransformStreamDefaultController<Uint8Array>,
  ): boolean | void => {
    switch (state) {
      case DecodeState.IDLE:
        switch (b) {
          case FRAMING_SOF:
            state = DecodeState.AWAITING_DATA;
            break;
          default:
            return controller.error("Expected SoF to start decoding");
        }
        break;
      case DecodeState.AWAITING_DATA:
        switch (b) {
          case FRAMING_SOF:
            return controller.error("Unexpected SoF mid-frame");
          case FRAMING_ESC:
            state = DecodeState.ESCAPED;
            break;
          case FRAMING_EOF:
            controller.enqueue(new Uint8Array(data));
            data = [];
            state = DecodeState.IDLE;
            break;
          default:
            data.push(b);
            break;
        }
        break;
      case DecodeState.ESCAPED:
        data.push(b);
        state = DecodeState.AWAITING_DATA;
        break;
    }

    return true;
  };

  return {
    transform(chunk: unknown, controller) {
      if (chunk instanceof Uint8Array) {
        for (let i = 0; i < chunk.length; i++) {
          const b = chunk[i];
          if (!process(b, controller)) {
            throw "Failed to process the byte";
          }
        }
      } else if (typeof chunk == "number") {
        process(chunk, controller);
      } else {
        return controller.error("Only Uint8Array chunks are able to be handled");
      }
    },
  };
}
