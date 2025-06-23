async function testInference() {
  try {
    console.log('🤖 Testing model inference...');
    
    const { pipeline } = await import('@xenova/transformers');
    const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    
    console.log('📝 Running inference on: "I love coding!"');
    const result = await classifier('I love coding!');
    
    console.log('✅ Inference successful!');
    console.log('Result:', result);
    return true;
  } catch (error) {
    console.error('❌ Inference failed:', error.message);
    return false;
  }
}

testInference();