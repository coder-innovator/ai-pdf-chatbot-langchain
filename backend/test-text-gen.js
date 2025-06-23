async function testTextGeneration() {
  try {
    console.log('📝 Testing text generation...');
    console.log('⚠️  First run will download ~500MB model');
    
    const { pipeline } = await import('@xenova/transformers');
    
    // Use a small text generation model
    const generator = await pipeline('text-generation', 'Xenova/distilgpt2');
    
    console.log('🚀 Generating text for: "The weather today is"');
    const result = await generator('The weather today is', {
      max_new_tokens: 20,
      temperature: 0.7,
    });
    
    console.log('✅ Text generation successful!');
    console.log('Generated:', result[0].generated_text);
    return true;
  } catch (error) {
    console.error('❌ Text generation failed:', error.message);
    return false;
  }
}

testTextGeneration();