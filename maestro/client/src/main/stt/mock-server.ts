import WebSocket, { Server } from "ws";
import { v4 as uuid } from "uuid";

/**
 * A simple mock Arqon Bus server to validate the BusClient regression tests.
 */
class MockArqonBusServer {
  private wss: Server;
  private integritySignals: Array<{ type: "stt.action.allow" | "stt.action.block"; actionId: string }> = [];
  
  constructor(port: number) {
    this.wss = new Server({ port });
    console.log(`Mock Arqon Bus Server listening on ws://localhost:${port}`);
    
    this.wss.on("connection", (ws: WebSocket) => {
      console.log("Client connected");
      
      ws.on("message", (message: string) => {
        try {
          const data = JSON.parse(message);
          this.handleMessage(ws, data);
        } catch (e) {
          console.error("Failed to parse message", e);
        }
      });
      
      ws.on("close", () => {
        console.log("Client disconnected");
      });
    });
  }
  
  private handleMessage(ws: WebSocket, message: any) {
    console.log(`Received message type: ${message.type}, payload type: ${message.payload ? message.payload.type : 'undefined'}`);
    
    // Auto-respond to audio appends with partials
    if (message.payload && message.payload.type === "stt.audio.append") {
      const sessionId = message.payload.session_id;

      if (sessionId === "test-malformed") {
        // Send malformed garbage JSON
        ws.send("{ bad json : true }");
        ws.send(JSON.stringify({ type: "event", payload: { type: "stt.transcript.partial" } })); // Missing required fields
        return;
      }

      if (sessionId === "test-command") {
        // Send a simulated command to the client
        ws.send(JSON.stringify({
          version: "1.0",
          id: `arq_${uuid()}`,
          type: "command",
          room: "stt",
          channel: "transcription",
          from: "mock-server",
          timestamp: new Date().toISOString(),
          payload: {
            message_id: uuid(),
            session_id: sessionId,
            type: "stt.command.pause"
          }
        }));
      }

      if (sessionId === "test-replay") {
        // Send the same message 3 times with the same message_id to simulate replay
        const msgId = "replayed-msg-12345";
        for (let i = 0; i < 3; i++) {
          this.sendPartial(ws, sessionId, message.payload.chunk_id, "mock partial transcript", msgId);
        }
        return;
      }

      if (sessionId === "test-transcript-mismatch") {
        this.sendPartial(ws, sessionId, message.payload.chunk_id, "DIFFERENT transcript");
        return;
      }

      if (sessionId === "test-command-mismatch") {
        // Send a DIFFERENT command than expected or just a transcript that implies a command mismatch
        this.sendPartial(ws, sessionId, message.payload.chunk_id, "mock partial transcript with pause"); 
        return;
      }

      if (sessionId === "test-speech-replay") {
        // Send speech requests multiple times for the same payload to simulate startup replay
        const msgId = "speech-replay-msg-999";
        for (let i = 0; i < 3; i++) {
          this.sendSpeechRequest(ws, sessionId, message.payload.chunk_id, "mock synthesized speech", msgId);
        }
        return;
      }

      if (sessionId === "test-integrity-allow" || sessionId === "test-integrity-block") {
        this.sendActionReview(
          ws,
          sessionId,
          message.payload.chunk_id,
          "action-123",
          "Destructive file deletion requested",
          { path: "/tmp/foo", force: true }
        );
        return;
      }

      if (sessionId === "test-integrity-policy-block") {
        this.sendActionBlocked(
          ws,
          sessionId,
          message.payload.chunk_id,
          "action-illegal",
          "policy",
          "Direct root access is prohibited by corporate security policy."
        );
        return;
      }

      this.sendPartial(ws, sessionId, message.payload.chunk_id, "mock partial transcript");
    }

    if (message.payload && (message.payload.type === "stt.action.allow" || message.payload.type === "stt.action.block")) {
      const actionId = message.payload.payload && message.payload.payload.action_id;
      console.log(`[MockServer] Received integrity signal: ${message.payload.type} for action ${actionId}`);
      this.integritySignals.push({
        type: message.payload.type,
        actionId,
      });
    }
    
    // Auto-respond to endpoint requests with finals
    if (message.payload && message.payload.type === "stt.endpoint.request") {
      this.sendFinal(ws, message.payload.session_id, message.payload.chunk_id, "mock final transcript");
    }
  }

  private sendSpeechRequest(ws: WebSocket, sessionId: string, chunkId: string, transcript: string, explicitMsgId?: string) {
    const response = {
      version: "1.0",
      id: `arq_${uuid()}`,
      type: "event",
      room: "stt",
      channel: "transcription",
      from: "mock-server",
      timestamp: new Date().toISOString(),
      payload: {
        message_id: explicitMsgId || uuid(),
        session_id: sessionId,
        chunk_id: chunkId,
        tenant_id: "default",
        timestamp: new Date().toISOString(),
        source: "bus",
        version: "1.0",
        type: "stt.speech.request",
        payload: {
          audio_data: Buffer.from("mock pcm data").toString("base64"),
          audio_format: "pcm",
          transcript: transcript,
          duration_ms: 1000
        }
      }
    };
    ws.send(JSON.stringify(response));
  }
  
  private sendPartial(ws: WebSocket, sessionId: string, chunkId: string, transcript: string, explicitMsgId?: string) {
    const response = {
      version: "1.0",
      id: `arq_${uuid()}`,
      type: "event",
      room: "stt",
      channel: "transcription",
      from: "mock-server",
      timestamp: new Date().toISOString(),
      payload: {
        message_id: explicitMsgId || uuid(),
        session_id: sessionId,
        chunk_id: chunkId,
        tenant_id: "default",
        timestamp: new Date().toISOString(),
        source: "bus",
        version: "1.0",
        type: "stt.transcript.partial",
        payload: {
          alternatives: [
            {
              transcript: transcript,
              confidence: 0.99,
              words: []
            }
          ],
          latency_ms: 15,
          silence_threshold: 0.3,
          model_id: "mock",
          redaction_applied: false
        }
      }
    };
    ws.send(JSON.stringify(response));
  }
  
  private sendFinal(ws: WebSocket, sessionId: string, chunkId: string, transcript: string) {
    const response = {
      version: "1.0",
      id: `arq_${uuid()}`,
      type: "event",
      room: "stt",
      channel: "transcription",
      from: "mock-server",
      timestamp: new Date().toISOString(),
      payload: {
        message_id: uuid(),
        session_id: sessionId,
        chunk_id: chunkId,
        tenant_id: "default",
        timestamp: new Date().toISOString(),
        source: "bus",
        version: "1.0",
        type: "stt.transcript.final",
        payload: {
          alternatives: [
            {
              transcript: transcript,
              confidence: 0.99,
              words: []
            }
          ],
          latency_ms: 25,
          silence_threshold: 0.3,
          model_id: "mock",
          redaction_applied: false
        }
      }
    };
    ws.send(JSON.stringify(response));
  }

  private sendActionReview(ws: WebSocket, sessionId: string, chunkId: string, actionId: string, summary: string, context: any) {
    const response = {
      version: "1.0",
      id: `arq_${uuid()}`,
      type: "event",
      room: "stt",
      channel: "transcription",
      from: "mock-server",
      timestamp: new Date().toISOString(),
      payload: {
        message_id: uuid(),
        session_id: sessionId,
        chunk_id: chunkId,
        tenant_id: "default",
        timestamp: new Date().toISOString(),
        source: "bus",
        version: "1.0",
        type: "stt.action.review",
        payload: {
          action_id: actionId,
          summary,
          context,
          timeout_ms: 5000,
        },
      },
    };
    ws.send(JSON.stringify(response));
  }

  private sendActionBlocked(
    ws: WebSocket,
    sessionId: string,
    chunkId: string,
    actionId: string,
    reason: "policy" | "timeout" | "user_rejected" | "unsupported",
    message: string
  ) {
    const response = {
      version: "1.0",
      id: `arq_${uuid()}`,
      type: "event",
      room: "stt",
      channel: "transcription",
      from: "mock-server",
      timestamp: new Date().toISOString(),
      payload: {
        message_id: uuid(),
        session_id: sessionId,
        chunk_id: chunkId,
        tenant_id: "default",
        timestamp: new Date().toISOString(),
        source: "bus",
        version: "1.0",
        type: "stt.action.blocked",
        payload: {
          action_id: actionId,
          reason,
          message,
        },
      },
    };
    ws.send(JSON.stringify(response));
  }

  public stop() {
    this.wss.close();
  }

  public getIntegritySignals(): Array<{ type: "stt.action.allow" | "stt.action.block"; actionId: string }> {
    return [...this.integritySignals];
  }

  public clearIntegritySignals(): void {
    this.integritySignals = [];
  }
}

// Start server if run directly
if (require.main === module) {
  new MockArqonBusServer(9100);
}

export default MockArqonBusServer;
