async function testEmbeddings() {
  try {
    console.log('🔢 Testing embeddings generation...');
    console.log('⚠️  First run will download ~80MB model');
    
    const { pipeline } = await import('@xenova/transformers');
    
    // Use a small embedding model
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    
    const text = "This is a test sentence for embeddings.";
    console.log('📝 Text:', text);
    
    const embeddings = await embedder(text, { pooling: 'mean', normalize: true });
    
    console.log('✅ Embeddings successful!');
    console.log('Embedding dimensions:', embeddings.dims);
    console.log('First 5 values:', Array.from(embeddings.data.slice(0, 5)));
    return true;
  } catch (error) {
    console.error('❌ Embeddings failed:', error.message);
    return false;
  }
}

testEmbeddings();