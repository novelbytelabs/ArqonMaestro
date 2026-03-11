import * as http from "http";
import * as https from "https";
import BusClient from "./src/main/stt/bus-client";
import STTTracking from "./src/main/stt/tracking";
import MockArqonBusServer from "./src/main/stt/mock-server";
import Log from "./src/main/log";
import Settings from "./src/main/settings";

interface Stats {
  n: number;
  mean_ms: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  min_ms: number;
  max_ms: number;
}

interface TtsStreamSample {
  ttfa_ms: number;
  total_ms: number;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function computeStats(values: number[]): Stats {
  if (values.length === 0) {
    return { n: 0, mean_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0, min_ms: 0, max_ms: 0 };
  }
  const sum = values.reduce((acc, v) => acc + v, 0);
  return {
    n: values.length,
    mean_ms: sum / values.length,
    p50_ms: percentile(values, 50),
    p95_ms: percentile(values, 95),
    p99_ms: percentile(values, 99),
    min_ms: Math.min(...values),
    max_ms: Math.max(...values),
  };
}

function postJson(urlString: string, body: any, timeoutMs: number): Promise<any> {
  const parsedUrl = new URL(urlString);
  const client = parsedUrl.protocol === "https:" ? https : http;
  const payload = JSON.stringify(body);
  const headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
  };

  return new Promise<any>((resolve, reject) => {
    const req = client.request(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers,
      },
      (res) => {
        let responseBody = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          responseBody += chunk;
        });
        res.on("end", () => {
          const statusCode = res.statusCode || 0;
          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`HTTP_${statusCode}: ${responseBody.slice(0, 200)}`));
            return;
          }
          try {
            resolve(responseBody ? JSON.parse(responseBody) : {});
          } catch (e: any) {
            reject(new Error(`invalid_json: ${e.message}`));
          }
        });
      }
    );
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function postNdjsonStream(
  urlString: string,
  body: any,
  timeoutMs: number
): Promise<TtsStreamSample> {
  const parsedUrl = new URL(urlString);
  const client = parsedUrl.protocol === "https:" ? https : http;
  const payload = JSON.stringify(body);
  const headers = {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(payload),
    Accept: "application/x-ndjson",
  };

  return new Promise<TtsStreamSample>((resolve, reject) => {
    const startedAt = Date.now();
    let firstChunkAt: number | null = null;
    let pending = "";
    let responseBody = "";

    const req = client.request(
      {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        method: "POST",
        headers,
      },
      (res) => {
        const statusCode = res.statusCode || 0;
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          responseBody += chunk;
          if (statusCode < 200 || statusCode >= 300) {
            return;
          }
          pending += chunk;
          let newline = pending.indexOf("\n");
          while (newline >= 0) {
            const line = pending.slice(0, newline).trim();
            pending = pending.slice(newline + 1);
            if (line.length > 0) {
              try {
                const parsed = JSON.parse(line);
                const audioChunk = parsed.audio_chunk_b64 || parsed.audio_data_b64;
                if (audioChunk && firstChunkAt === null) {
                  firstChunkAt = Date.now();
                }
              } catch (e: any) {
                reject(new Error(`invalid_stream_json: ${e.message}`));
                return;
              }
            }
            newline = pending.indexOf("\n");
          }
        });
        res.on("end", () => {
          if (statusCode < 200 || statusCode >= 300) {
            reject(new Error(`HTTP_${statusCode}: ${responseBody.slice(0, 200)}`));
            return;
          }
          const endedAt = Date.now();
          resolve({
            ttfa_ms: firstChunkAt === null ? endedAt - startedAt : firstChunkAt - startedAt,
            total_ms: endedAt - startedAt,
          });
        });
      }
    );

    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

async function benchmarkTts(baseUrl: string, runs: number, timeoutMs: number) {
  const synthLatencies: number[] = [];
  const streamTtfa: number[] = [];
  const streamTotals: number[] = [];
  let streamErrors = 0;

  for (let i = 0; i < runs; i++) {
    const text = `Arqon benchmark sample ${i + 1}.`;
    const start = Date.now();
    await postJson(
      `${baseUrl.replace(/\/+$/, "")}/synthesize`,
      { request_id: `tts-nonstream-${i}`, text, voice: "af_heart", format: "raw" },
      timeoutMs
    );
    synthLatencies.push(Date.now() - start);

    try {
      const stream = await postNdjsonStream(
        `${baseUrl.replace(/\/+$/, "")}/synthesize_stream`,
        { request_id: `tts-stream-${i}`, text, voice: "af_heart", format: "raw", stream: true },
        timeoutMs
      );
      streamTtfa.push(stream.ttfa_ms);
      streamTotals.push(stream.total_ms);
    } catch (e) {
      streamErrors++;
    }
  }

  return {
    non_stream_total_ms: computeStats(synthLatencies),
    stream_ttfa_ms: computeStats(streamTtfa),
    stream_total_ms: computeStats(streamTotals),
    stream_errors: streamErrors,
  };
}

async function benchmarkSttBus(runs: number, port: number): Promise<Stats> {
  const latencies: number[] = [];
  const mockApi = {
    logEvent: () => {},
    logLocalAudio: () => {},
    logLocalResponse: () => {},
    ping: async () => 1,
    setBestEndpoint: async () => {},
  } as any;

  const mockLog = {
    logInfo: () => {},
    logVerbose: () => {},
    logError: console.error,
    logWarning: console.warn,
  } as any as Log;

  const mockSettings = {
    getArqonBusWsUrl: () => `ws://localhost:${port}`,
    getArqonBusRoom: () => "stt",
    getArqonBusChannel: () => "transcription",
    getArqonBusShadowMode: () => false,
    getArqonBusEnabled: () => true,
    getArqonBusStageApproval: () => true,
    getArqonBusCompareEnabled: () => false,
    getArqonBusCompareThreshold: () => 0.95,
    getArqonBusCompareReportInterval: () => 300,
    getArqonBusCompareSampleRate: () => 1.0,
    getArqonTtsProvider: () => "fallback",
    getArqonTtsKokoroUrl: () => "http://127.0.0.1:7781",
    getArqonTtsKokoroVoice: () => "af_heart",
    getArqonTtsKokoroTimeoutMs: () => 10000,
    getArqonTtsKokoroFallbackEnabled: () => true,
    getArqonTtsKokoroStreamingEnabled: () => true,
    getDisableAnalytics: () => true,
  } as any as Settings;

  const tracking = new STTTracking(mockApi, mockSettings);
  const client = new BusClient(mockSettings, mockLog, tracking);
  const connected = await client.connect();
  if (!connected) {
    throw new Error("Failed to connect BusClient for STT benchmark");
  }

  try {
    for (let i = 0; i < runs; i++) {
      const sessionId = `bench-stt-${i}`;
      const chunkId = `chunk-${i}`;
      const start = Date.now();

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`timeout waiting final transcript for ${chunkId}`));
        }, 5000);

        client.setExecutionMode(true, (_sid, cid, _alts, _latencyMs, isFinal) => {
          if (cid === chunkId && isFinal) {
            clearTimeout(timeout);
            latencies.push(Date.now() - start);
            resolve();
          }
        });

        client.publishSessionStart(sessionId, chunkId, "en-US", "mock-model");
        client.publishAudioAppend(sessionId, chunkId, Buffer.from("benchmark-audio"), 1, Date.now());
        client.publishEndpointRequest(sessionId, chunkId, true, "final");
      });
    }
  } finally {
    client.disconnect();
  }

  return computeStats(latencies);
}

async function main() {
  const ttsUrl = process.env.ARQON_BENCH_TTS_URL || "http://127.0.0.1:7781";
  const ttsRuns = Number(process.env.ARQON_BENCH_TTS_RUNS || "20");
  const sttRuns = Number(process.env.ARQON_BENCH_STT_RUNS || "50");
  const timeoutMs = Number(process.env.ARQON_BENCH_TIMEOUT_MS || "15000");
  const sttPort = Number(process.env.ARQON_BENCH_STT_PORT || "9110");

  const startedAt = new Date().toISOString();
  const mockServer = new MockArqonBusServer(sttPort);
  try {
    const tts = await benchmarkTts(ttsUrl, ttsRuns, timeoutMs);
    const sttBus = await benchmarkSttBus(sttRuns, sttPort);

    const result = {
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      config: {
        tts_url: ttsUrl,
        tts_runs: ttsRuns,
        stt_runs: sttRuns,
        timeout_ms: timeoutMs,
        stt_bus_port: sttPort,
      },
      tts: tts,
      stt: {
        bus_audio_to_final_ms: sttBus,
        websocket_audio_to_final_ms: null,
        note: "WebSocket head-to-head not included in this harness without a live comparable WS backend endpoint.",
      },
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    mockServer.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
