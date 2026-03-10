import WebSocket, { Server } from "ws";
import { v4 as uuid } from "uuid";

/**
 * A simple mock Arqon Bus server to validate the BusClient regression tests.
 */
class MockArqonBusServer {
  private wss: Server;
  
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

      this.sendPartial(ws, sessionId, message.payload.chunk_id, "mock partial transcript");
    }
    
    // Auto-respond to endpoint requests with finals
    if (message.payload && message.payload.type === "stt.endpoint.request") {
      this.sendFinal(ws, message.payload.session_id, message.payload.chunk_id, "mock final transcript");
    }
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

  public stop() {
    this.wss.close();
  }
}

// Start server if run directly
if (require.main === module) {
  new MockArqonBusServer(9100);
}

export default MockArqonBusServer;
