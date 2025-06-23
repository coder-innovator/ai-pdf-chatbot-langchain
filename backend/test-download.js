async function downloadModel() {
  try {
    console.log('📥 Downloading smallest possible model...');
    console.log('⚠️  This may take 1-5 minutes on first run');
    
    const { pipeline } = await import('@xenova/transformers');
    
    // Use the smallest sentiment model available
    const classifier = await pipeline('sentiment-analysis', 'Xenova/distilbert-base-uncased-finetuned-sst-2-english');
    
    console.log('✅ Model downloaded and loaded successfully');
    return classifier;
  } catch (error) {
    console.error('❌ Download failed:', error.message);
    return null;
  }
}

downloadModel();