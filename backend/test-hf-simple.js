// backend/test-hf-simple.js
import dotenv from 'dotenv';
import { HuggingFaceInference } from "@langchain/community/llms/hf";

dotenv.config();

async function testHuggingFace() {
  console.log('Testing Hugging Face LLM...');
  
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.error('❌ HUGGINGFACE_API_KEY not found in environment');
    console.log('Please add your HF API key to the .env file');
    return false;
  }
  
  try {
    console.log('Creating HF LLM instance...');
    const llm = new HuggingFaceInference({
      model: "gpt2",
      apiKey: process.env.HUGGINGFACE_API_KEY,
      maxTokens: 20,
      temperature: 0.1,
      timeout: 30000, // 30 second timeout
      endpointUrl: "https://api-inference.huggingface.co/models/gpt2"
    });

    console.log('Sending test prompt (this may take 10-30 seconds)...');
    const response = await llm.call("What is 2+2? Answer briefly:");
    
    console.log('✅ Success! HF Response:', response);
    return true;
  } catch (error) {
    console.error('❌ HF Test Failed:', error.message);
    if (error.message.includes('401')) {
      console.error('🔑 This looks like an API key issue. Check your HUGGINGFACE_API_KEY.');
    } else if (error.message.includes('timeout') || error.code === 'ECONNABORTED') {
      console.error('⏱️ Request timed out. Try again or use a different model.');
    } else if (error.message.includes('503') || error.message.includes('loading')) {
      console.error('🔄 Model is loading. Wait a few minutes and try again.');
    }
    return false;
  }
}

testHuggingFace();
