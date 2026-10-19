/*
 * Added by the lenerdz/zmk-studio fork; this file is not part of
 * @zmkfirmware/zmk-studio-ts-client.
 */
import { describe, expect, it } from "vitest";
import { get_decoder, get_encoder } from "./framing";

const SOF = 0xab;
const ESC = 0xac;
const EOF = 0xad;

async function run(
  transformer: Transformer<Uint8Array, Uint8Array>,
  chunks: Uint8Array[],
): Promise<Uint8Array[]> {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>(
    transformer,
  );
  const output: Uint8Array[] = [];

  const reading = (async () => {
    const reader = readable.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      output.push(value);
    }
  })();

  // A stream that fails rejects the reading before this function waits for it.
  reading.catch(() => {});

  const writer = writable.getWriter();
  for (const chunk of chunks) {
    await writer.write(chunk);
  }
  await writer.close();
  await reading;

  return output;
}

const join = (parts: Uint8Array[]) => Uint8Array.from(parts.flatMap((p) => [...p]));

const encode = async (payload: number[]) =>
  join(await run(get_encoder(), [Uint8Array.from(payload)]));

describe("get_encoder", () => {
  it("wraps a payload in a start and an end byte", async () => {
    expect([...(await encode([1, 2, 3]))]).toEqual([SOF, 1, 2, 3, EOF]);
  });

  it("escapes the three special bytes", async () => {
    expect([...(await encode([1, SOF, 2, ESC, EOF, 3]))]).toEqual([
      SOF,
      1,
      ESC,
      SOF,
      2,
      ESC,
      ESC,
      ESC,
      EOF,
      3,
      EOF,
    ]);
  });

  it("frames an empty payload", async () => {
    expect([...(await encode([]))]).toEqual([SOF, EOF]);
  });
});

describe("get_decoder", () => {
  it("gives back the payload of a frame", async () => {
    const frames = await run(get_decoder(), [
      Uint8Array.from([SOF, 1, ESC, SOF, 2, ESC, ESC, ESC, EOF, 3, EOF]),
    ]);

    expect(frames.map((f) => [...f])).toEqual([[1, SOF, 2, ESC, EOF, 3]]);
  });

  it("gives each frame of a stream, however the bytes are split", async () => {
    const stream = [SOF, 1, 2, EOF, SOF, 3, ESC, EOF, 4, EOF];

    for (const size of [1, 2, 3, stream.length]) {
      const chunks: Uint8Array[] = [];
      for (let i = 0; i < stream.length; i += size) {
        chunks.push(Uint8Array.from(stream.slice(i, i + size)));
      }

      const frames = await run(get_decoder(), chunks);
      expect(frames.map((f) => [...f])).toEqual([
        [1, 2],
        [3, EOF, 4],
      ]);
    }
  });

  it("refuses bytes outside a frame", async () => {
    await expect(run(get_decoder(), [Uint8Array.from([1, 2])])).rejects.toBeDefined();
  });

  it("refuses a start byte inside a frame", async () => {
    await expect(
      run(get_decoder(), [Uint8Array.from([SOF, 1, SOF])]),
    ).rejects.toBeDefined();
  });
});

describe("encoder and decoder", () => {
  it("make a round trip for any byte", async () => {
    const payload = Array.from({ length: 256 }, (_, i) => i);
    const framed = await encode(payload);

    const frames = await run(get_decoder(), [framed]);

    expect(frames.map((f) => [...f])).toEqual([payload]);
  });
});
