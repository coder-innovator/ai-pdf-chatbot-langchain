// backend/test-local-model.js
import { pipeline } from '@xenova/transformers';
import dotenv from 'dotenv';

dotenv.config();

async function testLocalModel() {
  console.log('Testing local model with @xenova/transformers...');
  
  try {
    console.log('Loading text generation pipeline...');
    
    // Use a small, fast model for text generation
    const generator = await pipeline('text-generation', 'Xenova/gpt2');
    
    console.log('Generating text...');
    const result = await generator('What is 2+2? Answer:', {
      max_new_tokens: 20,
      temperature: 0.1,
      do_sample: true,
    });
    
    console.log('✅ Success! Local Response:', result[0].generated_text);
    return true;
    
  } catch (error) {
    console.error('❌ Local Test Failed:', error.message);
    return false;
  }
}

testLocalModel();