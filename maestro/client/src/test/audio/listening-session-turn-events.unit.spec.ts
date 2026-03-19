import ListeningSessionService from "../../main/runtime/listening-session-service";
import { TurnEvent } from "../../main/audio/turn-events";

describe("ListeningSessionService turn-event plumbing", () => {
  it("forwards turn_event callbacks from microphone registration", async () => {
    let registeredCallback: ((data: any) => void) | undefined;
    const microphone = {
      unregister: jest.fn(),
      register: jest.fn((_name: string, cb: (data: any) => void) => {
        registeredCallback = cb;
      }),
    };

    const service = new ListeningSessionService({
      app: { clearAlternativesAndShowExamples: jest.fn() } as any,
      bridge: { setState: jest.fn() } as any,
      custom: {} as any,
      executor: {} as any,
      mainWindow: { updateTray: jest.fn() } as any,
      microphone: microphone as any,
      miniModeWindow: {} as any,
      stream: {
        connect: jest.fn().mockResolvedValue(true),
        sendDisableRequest: jest.fn(),
        disconnect: jest.fn(),
      } as any,
    });

    const onTurnEvent = jest.fn();
    await service.start({
      chunkManager: {} as any,
      generation: 1,
      isGenerationCurrent: () => true,
      onChunkStart: jest.fn(),
      onAudio: jest.fn(),
      onChunkEnd: jest.fn(),
      onTurnEvent,
      onPrepareStart: jest.fn(),
      onConnected: jest.fn().mockResolvedValue(undefined),
      onConnectionFailed: jest.fn(),
    });

    const event: TurnEvent = {
      type: "barge_in_candidate",
      frameIndex: 12,
      timestampMs: 1234,
      streamTimeMs: 360,
      source: "turn_layer",
      reason: "test",
      primary: {
        provider: "DefaultVadProvider",
        source: "primary",
        isSpeech: true,
        speechProb: 0.9,
        volume: 0.02,
        consecutiveSpeech: 2,
        consecutiveSilence: 0,
      },
      shadow: {
        provider: "SileroVadProvider",
        source: "shadow",
        isSpeech: true,
        speechProb: 0.8,
        volume: 0.02,
        consecutiveSpeech: 2,
        consecutiveSilence: 0,
      },
    };

    expect(registeredCallback).toBeDefined();
    registeredCallback!({ event: "turn_event", turnEvent: event });
    expect(onTurnEvent).toHaveBeenCalledWith(event);
  });
});

