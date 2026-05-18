#!/usr/bin/env python3
import os
import sys


def main():
    if len(sys.argv) != 2:
        print("Usage: transcribe-audio-local.py <audio-file>", file=sys.stderr)
        return 2

    audio_path = sys.argv[1]
    model_name = os.getenv("LOCAL_WHISPER_MODEL", "base")
    device = os.getenv("LOCAL_WHISPER_DEVICE", "cpu")
    compute_type = os.getenv("LOCAL_WHISPER_COMPUTE_TYPE", "int8")

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print("Missing dependency: faster-whisper. Install it in the VPS transcription venv.", file=sys.stderr)
        return 3

    model = WhisperModel(model_name, device=device, compute_type=compute_type)
    segments, _ = model.transcribe(
        audio_path,
        language="es",
        vad_filter=True,
        beam_size=1,
    )

    transcript = " ".join(segment.text.strip() for segment in segments).strip()
    print(transcript)
    return 0 if transcript else 4


if __name__ == "__main__":
    raise SystemExit(main())
