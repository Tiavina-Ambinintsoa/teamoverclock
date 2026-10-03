const TARGET_SAMPLE_RATE = 16_000

export function encodePcmWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const bytesPerSample = 2
  const dataSize = samples.length * bytesPerSample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const writeText = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index))
  }

  writeText(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeText(8, "WAVE")
  writeText(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeText(36, "data")
  view.setUint32(40, dataSize, true)
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]))
    view.setInt16(44 + index * bytesPerSample, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }
  return new Uint8Array(buffer)
}

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize))
  }
  return btoa(binary)
}

/** Locally decodes a browser recording and returns mono 16 kHz PCM WAV as base64. */
export async function audioBlobToWavBase64(blob: Blob): Promise<string> {
  if (!blob.size) throw new Error("No audio was recorded.")
  const audioContext = new AudioContext()
  try {
    const decoded = await audioContext.decodeAudioData(await blob.arrayBuffer())
    const outputLength = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE)
    const mono = new Float32Array(outputLength)
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index))
    for (let index = 0; index < outputLength; index += 1) {
      const sourcePosition = index * decoded.sampleRate / TARGET_SAMPLE_RATE
      const sourceIndex = Math.floor(sourcePosition)
      const fraction = sourcePosition - sourceIndex
      for (const channel of channels) {
        const first = channel[sourceIndex] ?? 0
        const second = channel[sourceIndex + 1] ?? first
        mono[index] += (first + (second - first) * fraction) / channels.length
      }
    }
    return toBase64(encodePcmWav(mono, TARGET_SAMPLE_RATE))
  } finally {
    await audioContext.close()
  }
}
