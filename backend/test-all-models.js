async function testAllModels() {
  console.log('🎯 Testing all local models together...');
  
  try {
    const { pipeline } = await import('@xenova/transformers');
    
    // 1. Text Generation
    console.log('\n1️⃣ Text Generation...');
    const generator = await pipeline('text-generation', 'Xenova/llama2.c-stories15M');
    const generated = await generator('The future of artificial intelligence is', { 
      max_new_tokens: 150,
      temperature: 0.8,
      do_sample: true,
      top_p: 0.9
    });
    console.log('✅ Generated:', generated[0].generated_text);
    
    // 2. Question Answering
    console.log('\n2️⃣ Question Answering...');
    const qa = await pipeline('question-answering', 'Xenova/distilbert-base-cased-distilled-squad');
    const answer = await qa('you are a poet', 'Artificial intelligence is the simulation of human intelligence in machines.');
    console.log('✅ Answer:', answer.answer);
    
    // 3. Embeddings
    console.log('\n3️⃣ Embeddings...');
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const embedding = await embedder('Test text', { pooling: 'mean', normalize: true });
    console.log('✅ Embedding size:', embedding.dims);
    
    // 4. Sentiment Analysis
    console.log('\n4️⃣ Sentiment Analysis...');
    const sentiment = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    const mood = await sentiment('I love local AI models!');
    console.log('✅ Sentiment:', mood[0].label, mood[0].score);
    
    console.log('\n🎉 ALL LOCAL MODELS WORKING PERFECTLY!');
    return true;
    
  } catch (error) {
    console.error('❌ Combined test failed:', error.message);
    return false;
  }
}

testAllModels();