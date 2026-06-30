"use client";

// Microphone capture via MediaRecorder — the iOS-safe path for speech, since
// WebKit doesn't expose SpeechRecognition. Returns a controller whose stop()
// resolves with the recorded audio Blob (and releases the mic).

export interface Recorder {
  stop: () => Promise<Blob>;
  cancel: () => void;
}

export function mediaRecorderSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

// iOS (incl. iPadOS, which reports as "MacIntel" with touch). iOS browsers
// expose webkitSpeechRecognition but it doesn't actually transcribe, so we must
// route iOS to the cloud STT path instead of the broken browser recognition.
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return (
    navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1
  );
}

// Pick a mime type the current browser actually supports.
// iOS yields audio/mp4; Chrome/Firefox yield audio/webm.
function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = ["audio/webm", "audio/mp4", "audio/ogg"];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t));
}

// Record the mic and auto-stop after the speaker goes quiet, resolving with the
// audio Blob. Powers hands-free turn-taking where there's no "stop" tap. Uses a
// Web Audio analyser to detect speech then a trailing pause. Throws on denied
// mic permission.
export async function recordUntilSilence(
  opts: {
    silenceMs?: number; // trailing pause that ends a turn
    maxMs?: number; // hard cap on a turn
    noSpeechMs?: number; // give up if nothing is said
  } = {}
): Promise<Blob> {
  const silenceMs = opts.silenceMs ?? 1400;
  const maxMs = opts.maxMs ?? 15000;
  const noSpeechMs = opts.noSpeechMs ?? 7000;

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const ACtor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new ACtor();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  source.connect(analyser);
  const buf = new Uint8Array(analyser.fftSize);

  return new Promise<Blob>((resolve) => {
    let raf = 0;
    let speechSeen = false;
    let silenceStart = 0;
    const startedAt = Date.now();

    const cleanup = () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
    };
    recorder.onstop = () => {
      cleanup();
      resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
    };
    const finish = () => {
      try {
        recorder.stop();
      } catch {
        cleanup();
        resolve(new Blob(chunks));
      }
    };

    const THRESHOLD = 8; // RMS deviation from the 128 midpoint
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const d = buf[i] - 128;
        sum += d * d;
      }
      const rms = Math.sqrt(sum / buf.length);
      const now = Date.now();

      if (rms > THRESHOLD) {
        speechSeen = true;
        silenceStart = 0;
      } else if (speechSeen) {
        if (!silenceStart) silenceStart = now;
        else if (now - silenceStart > silenceMs) return finish();
      }

      if (!speechSeen && now - startedAt > noSpeechMs) return finish();
      if (now - startedAt > maxMs) return finish();
      raf = requestAnimationFrame(tick);
    };

    recorder.start();
    tick();
  });
}

// Begin recording. Throws if mic permission is denied or unavailable, so the
// caller can show a clear message.
export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  recorder.start();

  const release = () => stream.getTracks().forEach((t) => t.stop());

  return {
    stop: () =>
      new Promise<Blob>((resolve) => {
        recorder.onstop = () => {
          release();
          resolve(new Blob(chunks, { type: recorder.mimeType || mimeType }));
        };
        recorder.stop();
      }),
    cancel: () => {
      try {
        recorder.stop();
      } catch {
        /* already stopped */
      }
      release();
    },
  };
}
