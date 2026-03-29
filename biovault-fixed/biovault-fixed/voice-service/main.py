from fastapi import FastAPI, UploadFile, File
from speechbrain.pretrained import EncoderClassifier
import whisper
import librosa
import numpy as np
import io

app = FastAPI()

# Load models on startup
whisper_model = whisper.load_model("base")
classifier = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb")

@app.post("/process")
async def process_audio(audio: UploadFile = File(...)):
    # Read audio bytes
    audio_bytes = await audio.read()
    
    # Process for Whisper (requires saving temp file or memory buffer depending on wrapper)
    with open("temp.wav", "wb") as f:
        f.write(audio_bytes)
    
    # 1. Get Transcript
    transcription_result = whisper_model.transcribe("temp.wav")
    transcript = transcription_result["text"]

    # 2. Get Embedding
    signal, fs = librosa.load("temp.wav", sr=16000)
    embeddings = classifier.encode_batch(signal)
    embedding_list = embeddings.squeeze().tolist()

    return {
        "embedding": embedding_list,
        "transcript": transcript
    }