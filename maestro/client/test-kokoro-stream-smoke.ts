import * as http from "http";
import Log from "./src/main/log";
import Settings from "./src/main/settings";
import VoiceOutput from "./src/main/stt/voice-output";

async function main() {
  console.log("=== GATE 6: KOKORO STREAM SMOKE TEST ===\n");

  const port = Number(process.env.ARQON_KOKORO_STREAM_SMOKE_PORT || 17881);
  const host = "127.0.0.1";
  const streamChunk = Buffer.alloc(3200).toString("base64");

  const server = http.createServer((req, res) => {
    if (req.url === "/synthesize_stream" && req.method === "POST") {
      res.writeHead(200, { "Content-Type": "application/x-ndjson" });
      res.write(
        JSON.stringify({ format: "raw", audio_chunk_b64: streamChunk, done: false }) + "\n"
      );
      setTimeout(() => {
        res.write(
          JSON.stringify({ format: "raw", audio_chunk_b64: streamChunk, done: false }) + "\n"
        );
        res.write(JSON.stringify({ format: "raw", done: true }) + "\n");
        res.end();
      }, 20);
      return;
    }

    if (req.url === "/synthesize" && req.method === "POST") {
      // Non-stream fallback endpoint (unused in this smoke but kept for compatibility).
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ format: "raw", audio_data_b64: streamChunk + streamChunk }));
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => {
    server.listen(port, host, resolve);
  });

  const telemetry: Array<{ name: string; data: any }> = [];
  const mockTracking = {
    logMetric: (name: string, data: any) => {
      telemetry.push({ name, data });
      console.log(`[Telemetry] ${name}:`, JSON.stringify(data));
    },
  } as any;

  const mockSettings = {
    getArqonTtsProvider: () => "kokoro",
    getArqonTtsKokoroUrl: () => `http://${host}:${port}`,
    getArqonTtsKokoroVoice: () => "af_heart",
    getArqonTtsKokoroTimeoutMs: () => 5000,
    getArqonTtsKokoroFallbackEnabled: () => false,
    getArqonTtsKokoroStreamingEnabled: () => true,
    getDisableAnalytics: () => false,
  } as any as Settings;

  const mockLog = {
    logInfo: console.log,
    logVerbose: console.log,
    logError: console.error,
    logWarning: console.warn,
  } as any as Log;

  try {
    const voiceOutput = new VoiceOutput(mockLog, mockTracking, mockSettings);
    const result = await voiceOutput.play(
      "gate6-kokoro-stream-smoke-001",
      "",
      "raw",
      "streaming smoke request"
    );

    const streamStarted = telemetry.some((t) => t.name === "stt.tts.kokoro.stream_started");
    const streamChunkMetric = telemetry.some((t) => t.name === "stt.tts.kokoro.stream_chunk");
    const kokoroSuccess = telemetry.some((t) => t.name === "stt.tts.kokoro.success");

    if (!result || !streamStarted || !streamChunkMetric || !kokoroSuccess) {
      console.error("[FAIL] Streaming path did not complete as expected.");
      process.exit(1);
    }

    console.log("\n[PASS] Kokoro streamed playback path verified.");
    process.exit(0);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

main().catch((e) => {
  console.error("[FAIL] Stream smoke crashed:", e);
  process.exit(1);
});
