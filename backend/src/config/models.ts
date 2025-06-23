// backend/src/config/models.ts
export const ModelConfig = {
  // Primary models (good balance of speed/quality)
  primary: {
    llm: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    embedding: "sentence-transformers/all-MiniLM-L6-v2", 
    sentiment: "cardiffnlp/twitter-roberta-base-sentiment-latest",
  },
  
  // Fast models (quicker responses)
  fast: {
    llm: "microsoft/Phi-3.5-mini-instruct",
    embedding: "sentence-transformers/all-MiniLM-L6-v2",
    sentiment: "cardiffnlp/twitter-roberta-base-sentiment-latest",
  },
  
  // High-quality models (slower but more accurate)
  premium: {
    llm: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    embedding: "BAAI/bge-large-en-v1.5",
    sentiment: "ProsusAI/finbert",
  }
};

export const getModelConfig = (tier: 'primary' | 'fast' | 'premium' = 'primary') => {
  return ModelConfig[tier];
};
