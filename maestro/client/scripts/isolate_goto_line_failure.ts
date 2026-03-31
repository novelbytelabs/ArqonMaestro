import { core } from "../src/gen/core";
import Executor from "../src/main/execute/executor";
import Stream from "../src/main/stream/stream";
import { h23Recorder } from "../src/main/runtime/h23-live-trace-recorder";

type CommandInvocation = {
  type: string;
  text?: string;
  modifiers?: string[];
  index?: number;
};

type IsolationResult = {
  transcript: string;
  parsedCommands: any[];
  authorization: any;
  activated: boolean;
  executed: boolean;
  commandInvocations: CommandInvocation[];
  logs: string[];
};

function commandTypeName(type: number | undefined): string {
  if (type == null) {
    return "COMMAND_TYPE_NONE";
  }
  return core.CommandType[type] || `COMMAND_TYPE_${type}`;
}

function buildExecutorHarness() {
  const commandInvocations: CommandInvocation[] = [];

  const handler = {
    COMMAND_TYPE_PRESS: async (command: core.ICommand) => {
      commandInvocations.push({
        type: "COMMAND_TYPE_PRESS",
        text: command.text || "",
        modifiers: command.modifiers || [],
        index: command.index == null ? undefined : Number(command.index),
      });
    },
    COMMAND_TYPE_INSERT: async (command: core.ICommand) => {
      commandInvocations.push({
        type: "COMMAND_TYPE_INSERT",
        text: command.text || command.source || "",
      });
    },
    COMMAND_TYPE_FOCUS: async (command: core.ICommand) => {
      commandInvocations.push({
        type: "COMMAND_TYPE_FOCUS",
        text: command.text || "",
      });
    },
    COMMAND_TYPE_OPEN_IN_BROWSER: async (command: core.ICommand) => {
      commandInvocations.push({
        type: "COMMAND_TYPE_OPEN_IN_BROWSER",
        text: command.path || "",
      });
    },
  };

  const active = {
    app: "vscode",
    filename: "calculator.py",
    customCommands: [],
    pluginConnected: () => false,
    isFirstPartyBrowser: () => false,
    getEditorState: async () => ({ source: "", cursor: 0 }),
  } as any;

  const settingsBase = {
    getNuxCompleted: () => true,
    getMiniMode: () => false,
    getUseMiniModeHideTimeout: () => false,
    getUseMiniModeFewerAlternatives: () => false,
    getUseMiniModeHideTimeoutPaused: () => false,
    getArqonFocusSimpleModeEnabled: () => true,
  } as Record<string, any>;

  const settings = new Proxy(settingsBase, {
    get(target, prop: string) {
      if (prop in target) {
        return (target as any)[prop];
      }
      // Deterministic default for unneeded settings hooks in this harness.
      return () => false;
    },
  }) as any;

  const bridge = {
    setState: () => undefined,
    send: () => undefined,
  } as any;

  const stream = {
    sendCallbackRequest: () => undefined,
    sendTextRequest: () => undefined,
  } as any;

  const system = {
    determineActiveApplication: async () => "vscode",
    applicationMatches: async () => ["code"],
    runningApplications: async () => ["code", "google-chrome"],
    installedApplications: async () => ["code", "google-chrome"],
    clickable: async () => [],
    pressKey: async () => undefined,
    focus: async () => undefined,
  } as any;

  const executor = new Executor(
    active,
    { logEvent: () => undefined } as any,
    bridge,
    { clear: () => undefined } as any,
    { logVerbose: (m: string) => console.log(m), logError: (e: any) => console.log(String(e)) } as any,
    { shown: () => false } as any,
    { shown: () => false } as any,
    { useNeedsUndo: false } as any,
    { updateForResponse: () => undefined } as any,
    { sendResponseToApp: async () => undefined, sendCommandToApp: async () => ({}) } as any,
    { shown: () => false } as any,
    () => undefined,
    settings,
    stream,
    system,
    () => handler
  );

  return { executor, handler, commandInvocations };
}

async function runDirectFinalTranscriptTest(transcript: string): Promise<IsolationResult> {
  process.env.H23_HARD_GATE_NUMERIC = "false";
  const { executor, commandInvocations } = buildExecutorHarness();
  const logs: string[] = [];

  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: any[]) => {
    logs.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  console.warn = (...args: any[]) => {
    logs.push("WARN " + args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };

  try {
    const response = {
      alternatives: [
        {
          transcript,
          commands: [
            {
              type: core.CommandType.COMMAND_TYPE_PRESS,
              text: "",
            },
          ],
        },
      ],
      final: true,
    } as unknown as core.ICommandsResponse;

    const processed = await executor.postProcessResponse(response);
    const parsedCommands = (processed.execute?.commands || []).map((c: core.ICommand) => ({
      type: commandTypeName(Number(c.type ?? 0)),
      text: c.text || "",
      modifiers: c.modifiers || [],
    }));

    const authorization = await (executor as any).checkAuthorization(processed);

    let executed = false;
    if (authorization.authorized && processed.execute?.commands?.length) {
      executed = true;
      for (const command of processed.execute.commands) {
        const commandType = commandTypeName(Number(command.type ?? 0));
        const fn = (executor as any).commandHandler()[commandType];
        if (typeof fn === "function") {
          await fn(command);
        }
      }
    }

    return {
      transcript,
      parsedCommands,
      authorization,
      activated: !!processed.execute,
      executed,
      commandInvocations,
      logs,
    };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

async function runFinalOnlyLiveBoundaryTest(transcript: string): Promise<any> {
  process.env.H23_HARD_GATE_NUMERIC = "false";

  const { executor, commandInvocations } = buildExecutorHarness();
  const chunkId = "chunk-final-only-goto-line-52";
  const logs: string[] = [];
  const events: Array<Record<string, any>> = [];

  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: any[]) => {
    const line = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    logs.push(line);
  };
  console.warn = (...args: any[]) => {
    const line = "WARN " + args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
    logs.push(line);
  };

  try {
    const tracking = {
      getCurrentSessionId: () => "session-final-only-1",
    } as any;

    const stream = new Stream(
      { getEditorState: async () => ({ source: "", cursor: 0 }) } as any,
      {} as any,
      { logVerbose: (m: string) => console.log(m), logError: (e: any) => console.log(String(e)) } as any,
      {
        getStreamingEndpoint: () => ({ id: "local", address: "localhost:17200" }),
        getLogAudio: () => false,
      } as any,
      tracking
    );

    h23Recorder.startChunk(chunkId);
    events.push({ step: "h23_start_chunk", chunkId, at: new Date().toISOString() });

    const finalStep = h23Recorder.recordFinal(chunkId, transcript, 1);
    events.push({
      step: "h23_record_final",
      chunkId,
      transcript,
      decisionGranted: finalStep.granted,
      decisionReason: finalStep.reason,
      at: new Date().toISOString(),
    });

    const facade = {
      updateDictationRuntimeStatus: (_: any) => undefined,
      async postProcessResponse(response: core.ICommandsResponse) {
        events.push({ step: "executor_post_process_enter", chunkId: response.chunkId, at: new Date().toISOString() });
        const processed = await executor.postProcessResponse(response);
        events.push({
          step: "executor_post_process_exit",
          chunkId: processed.chunkId,
          executePresent: !!processed.execute,
          parsedCommands: (processed.execute?.commands || []).map((c: core.ICommand) => ({
            type: commandTypeName(Number(c.type ?? 0)),
            text: c.text || "",
          })),
          at: new Date().toISOString(),
        });
        return processed;
      },
      async execute(response: core.ICommandsResponse) {
        events.push({ step: "executor_execute_enter", chunkId: response.chunkId, at: new Date().toISOString() });
        const auth = await (executor as any).checkAuthorization(response);
        events.push({
          step: "executor_authorization",
          chunkId: response.chunkId,
          authorized: auth.authorized,
          reason: auth.reason || "",
          trustState: auth.trustState || "",
          at: new Date().toISOString(),
        });
        if (auth.authorized && response.execute?.commands?.length) {
          for (const command of response.execute.commands) {
            const commandType = commandTypeName(Number(command.type ?? 0));
            const fn = (executor as any).commandHandler()[commandType];
            if (typeof fn === "function") {
              await fn(command);
            }
          }
          events.push({ step: "executor_commands_dispatched", chunkId: response.chunkId, count: response.execute.commands.length, at: new Date().toISOString() });
        } else {
          events.push({ step: "executor_commands_not_dispatched", chunkId: response.chunkId, at: new Date().toISOString() });
        }
      },
      getRuntimeDispatchPolicyContext: () => ({
        securityMode: "normal",
        speakerVerified: true,
        interactionMode: "command",
        currentApp: "vscode",
        targetSurface: "editor",
        surfaceContext: {},
        modalContext: {},
      }),
    } as any;

    const custom = {
      send: (_name: string, _payload: any) => undefined,
    } as any;

    const response = {
      chunkId,
      final: true,
      textResponse: transcript,
      alternatives: [
        {
          transcript,
          commands: [
            {
              type: core.CommandType.COMMAND_TYPE_PRESS,
              text: "",
            },
          ],
        },
      ],
    } as unknown as core.ICommandsResponse;

    events.push({ step: "stream_on_text_response_enter", chunkId, at: new Date().toISOString() });
    await stream.onTextCommandsResponse(custom, facade, response);
    events.push({ step: "stream_on_text_response_exit", chunkId, at: new Date().toISOString() });

    const latestDecision = h23Recorder.getLatestDecision(chunkId);
    events.push({
      step: "h23_latest_decision",
      chunkId,
      granted: latestDecision?.granted ?? null,
      reason: latestDecision?.reason ?? "none",
      commandClass: latestDecision?.commandClass ?? "none",
      at: new Date().toISOString(),
    });

    const finalized = h23Recorder.finalizeChunk(chunkId);
    events.push({ step: "h23_finalize_chunk", chunkId, outfile: finalized.wroteFile, at: new Date().toISOString() });

    return {
      transcript,
      chunkId,
      events,
      logs,
      commandInvocations,
      latestDecision,
    };
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
  }
}

async function main() {
  const transcript = "go to line fifty two";
  const direct = await runDirectFinalTranscriptTest(transcript);
  const finalOnly = await runFinalOnlyLiveBoundaryTest(transcript);

  const output = {
    observeMode: {
      H23_HARD_GATE_NUMERIC: process.env.H23_HARD_GATE_NUMERIC,
    },
    direct,
    finalOnly,
  };

  process.stdout.write(JSON.stringify(output, null, 2));
  // Stream/Executor constructors create timers; force deterministic process exit.
  setTimeout(() => process.exit(0), 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
