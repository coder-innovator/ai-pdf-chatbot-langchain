// backend/src/utils/hf-models-api.ts
import { HuggingFaceInference } from "@langchain/community/llms/hf";
import { HuggingFaceInferenceEmbeddings } from "@langchain/community/embeddings/hf";
import { getModelConfig } from "../config/models.js";

export class HuggingFaceManager {
  private static instance: HuggingFaceManager;
  
  public static getInstance(): HuggingFaceManager {
    if (!HuggingFaceManager.instance) {
      HuggingFaceManager.instance = new HuggingFaceManager();
    }
    return HuggingFaceManager.instance;
  }

  createLLM(tier: 'primary' | 'fast' | 'premium' = 'primary') {
    const config = getModelConfig(tier);
    
    return new HuggingFaceInference({
      model: config.llm,
      apiKey: process.env.HUGGINGFACE_API_KEY,
      maxTokens: 2048,
      temperature: 0.1,
    });
  }

  createEmbeddings(tier: 'primary' | 'fast' | 'premium' = 'primary') {
    const config = getModelConfig(tier);
    
    // Use API-based embeddings instead of local transformers
    return new HuggingFaceInferenceEmbeddings({
      model: config.embedding,
      apiKey: process.env.HUGGINGFACE_API_KEY,
    });
  }

  async testConnection(): Promise<boolean> {
    try {
      const llm = this.createLLM('fast');
      const response = await llm.call("Hello, respond with 'HF models working!'");
      return response.includes('working') || response.includes('HF') || response.length > 10;
    } catch (error) {
      console.error('HF connection test failed:', error);
      return false;
    }
  }
}
