import { describe, expect, it } from "vitest"

import { encodePcmWav } from "./audio"

describe("encodePcmWav", () => {
  it("encodes mono 16-bit PCM with a valid WAV header", () => {
    const wav = encodePcmWav(new Float32Array([-1, 0, 1]), 16_000)
    const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength)
    const readText = (offset: number, length: number) =>
      String.fromCharCode(...wav.subarray(offset, offset + length))

    expect(readText(0, 4)).toBe("RIFF")
    expect(readText(8, 4)).toBe("WAVE")
    expect(readText(36, 4)).toBe("data")
    expect(view.getUint32(24, true)).toBe(16_000)
    expect(view.getUint32(40, true)).toBe(6)
    expect(view.getInt16(44, true)).toBe(-32768)
    expect(view.getInt16(46, true)).toBe(0)
    expect(view.getInt16(48, true)).toBe(32767)
  })
})
