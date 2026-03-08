/**
 * ElectronAudio - Replacement for native speech-recorder
 * 
 * Uses Electron/Chromium's navigator.mediaDevices.getUserMedia
 * for cross-platform microphone capture.
 * 
 * This is a drop-in replacement that provides the same API as the
 * old native speech-recorder addon.
 */

import { ipcMain } from "electron";

// Event types matching the old speech-recorder API
export interface SpeechRecorderEvents {
  onChunkStart?: (data: { audio: Float32Array }) => void;
  onAudio?: (data: {
    audio: Float32Array;
    consecutiveSilence: number;
    speaking: boolean;
    volume: number;
  }) => void;
  onChunkEnd?: () => void;
  onDeviceChange?: () => void;
}

export interface SpeechRecorderOptions {
  device?: number;
  sileroVadSilenceThreshold?: number;
  sileroVadSpeechThreshold?: number;
  onChunkStart?: (data: { audio: Float32Array }) => void;
  onAudio?: (data: {
    audio: Float32Array;
    consecutiveSilence: number;
    speaking: boolean;
    volume: number;
  }) => void;
  onChunkEnd?: () => void;
}

export interface AudioDevice {
  id: string | number;
  name: string;
  maxInputChannels: number;
}

class ElectronAudioRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  
  private options: SpeechRecorderOptions;
  private isRunning = false;
  
  // VAD state (simplified version of Silero VAD)
  private consecutiveSilence = 0;
  private isSpeaking = false;
  private silenceThreshold = 0.01;
  private speechThreshold = 0.02;
  
  // Buffer for chunk detection
  private chunkBuffer: Float32Array[] = [];
  private readonly chunkSize = 512; // samples per chunk
  
  constructor(options: SpeechRecorderOptions = {}) {
    this.options = options;
    
    // Apply VAD thresholds from options
    if (options.sileroVadSilenceThreshold) {
      this.silenceThreshold = options.sileroVadSilenceThreshold;
    }
    if (options.sileroVadSpeechThreshold) {
      this.speechThreshold = options.sileroVadSpeechThreshold;
    }
  }
  
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    try {
      // Get microphone access
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: 16000, // Match expected sample rate
      });
      
      // Create source from stream
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create analyser for volume detection
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source.connect(this.analyser);
      
      // Create script processor for audio chunks
      this.processor = this.audioContext.createScriptProcessor(
        this.chunkSize,
        1,
        1
      );
      
      this.processor.onaudioprocess = (event) => {
        this.processAudio(event);
      };
      
      this.analyser.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      
      this.isRunning = true;
      
      // Emit chunk start event
      if (this.options.onChunkStart) {
        this.options.onChunkStart({ audio: new Float32Array(0) });
      }
      
    } catch (error) {
      console.error("Failed to start audio recording:", error);
      throw error;
    }
  }
  
  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    // Emit chunk end event
    if (this.options.onChunkEnd) {
      this.options.onChunkEnd();
    }
    
    // Clean up
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.isRunning = false;
    this.consecutiveSilence = 0;
    this.isSpeaking = false;
  }
  
  private processAudio(event: AudioProcessingEvent): void {
    if (!this.options.onAudio) {
      return;
    }
    
    const inputBuffer = event.inputBuffer;
    const channelData = inputBuffer.getChannelData(0);
    
    // Calculate RMS volume
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);
    
    // Simple VAD (Voice Activity Detection)
    const wasSpeaking = this.isSpeaking;
    
    if (rms > this.speechThreshold) {
      this.consecutiveSilence = 0;
      this.isSpeaking = true;
    } else if (rms < this.silenceThreshold) {
      this.consecutiveSilence++;
      if (this.consecutiveSilence > 30) { // ~500ms of silence
        this.isSpeaking = false;
      }
    }
    
    // Emit audio event
    this.options.onAudio({
      audio: channelData,
      consecutiveSilence: this.consecutiveSilence,
      speaking: this.isSpeaking,
      volume: rms,
    });
    
    // Handle chunk transitions
    if (wasSpeaking && !this.isSpeaking) {
      if (this.options.onChunkEnd) {
        this.options.onChunkEnd();
      }
    } else if (!wasSpeaking && this.isSpeaking) {
      if (this.options.onChunkStart) {
        this.options.onChunkStart({ audio: channelData });
      }
    }
  }
}

// Export the devices function for listing microphones
export function devices(): AudioDevice[] {
  // This will be populated via IPC from the main process
  // or we can use the browser's enumerateDevices
  return [];
}

// Export for async device listing
export async function getDevices(): Promise<AudioDevice[]> {
  try {
    // Request permission first
    await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Then enumerate devices
    const deviceInfos = await navigator.mediaDevices.enumerateDevices();
    
    return deviceInfos
      .filter((device) => device.kind === "audioinput")
      .map((device, index) => ({
        id: device.deviceId || index,
        name: device.label || `Microphone ${index + 1}`,
        maxInputChannels: 1,
      }));
  } catch (error) {
    console.error("Failed to enumerate devices:", error);
    return [];
  }
}

// Export the SpeechRecorder class as default (compatible with old API)
export { ElectronAudioRecorder as SpeechRecorder };

// Export a factory function for compatibility
export function createSpeechRecorder(
  options: SpeechRecorderOptions
): ElectronAudioRecorder {
  return new ElectronAudioRecorder(options);
}
