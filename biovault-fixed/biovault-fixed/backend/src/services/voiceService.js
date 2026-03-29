const axios = require("axios");

const PYTHON_SERVICE_URL = process.env.PYTHON_VOICE_SERVICE_URL || "http://localhost:8000";

// Calculate cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function processAudio(audioBuffer) {
  // Create form data to send to Python microservice
  const formData = new FormData();
  formData.append("audio", new Blob([audioBuffer]), "audio.wav");

  const response = await axios.post(`${PYTHON_SERVICE_URL}/process`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  
  return {
    embedding: response.data.embedding,
    transcript: response.data.transcript.trim().toLowerCase()
  };
}

module.exports = { cosineSimilarity, processAudio };