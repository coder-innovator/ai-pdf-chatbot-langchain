async function testPerformance() {
  console.log('⚡ Testing local model performance...');
  
  const startTime = Date.now();
  const startMemory = process.memoryUsage();
  
  try {
    const { pipeline } = await import('@xenova/transformers');
    
    console.log('Loading model...');
    const loadStart = Date.now();
    const generator = await pipeline('text-generation', 'Xenova/distilgpt2');
    const loadTime = Date.now() - loadStart;
    console.log(`✅ Model load time: ${loadTime}ms`);
    
    console.log('Running 5 inference tests...');
    const inferenceStart = Date.now();
    
    for (let i = 0; i < 5; i++) {
      const result = await generator(`Test ${i + 1}:`, { max_new_tokens: 10 });
      console.log(`  ${i + 1}. ${result[0].generated_text}`);
    }
    
    const inferenceTime = Date.now() - inferenceStart;
    console.log(`✅ Average inference time: ${inferenceTime / 5}ms per request`);
    
    const endMemory = process.memoryUsage();
    const memoryUsed = (endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024;
    console.log(`📊 Memory used: ${memoryUsed.toFixed(2)}MB`);
    
    const totalTime = Date.now() - startTime;
    console.log(`⏱️  Total test time: ${totalTime}ms`);
    
    return true;
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    return false;
  }
}

testPerformance();