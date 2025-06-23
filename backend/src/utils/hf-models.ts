// backend/src/utils/hf-models.ts
import { HuggingFaceInference } from "@langchain/community/llms/hf";
import { HuggingFaceTransformersEmbeddings } from "@langchain/community/embeddings/hf_transformers";
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
    
    return new HuggingFaceTransformersEmbeddings({
      model: config.embedding, // Changed from modelName to model
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
