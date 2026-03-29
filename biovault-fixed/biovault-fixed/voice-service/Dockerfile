FROM python:3.10-slim

# Install system dependencies required for audio processing (librosa/whisper)
RUN apt-get update && apt-get install -y ffmpeg libsndfile1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]