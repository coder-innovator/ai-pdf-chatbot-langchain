async function testQA() {
  try {
    console.log('❓ Testing question answering...');
    console.log('⚠️  First run will download ~250MB model');
    
    const { pipeline } = await import('@xenova/transformers');
    
    // Use a small Q&A model
    const qa = await pipeline('question-answering', 'Xenova/distilbert-base-cased-distilled-squad');
    
    const context = "Paris is the capital city of France. It is known for the Eiffel Tower.";
    const question = "What is the capital of France?";
    
    console.log('📖 Context:', context);
    console.log('❓ Question:', question);
    
    const result = await qa(question, context);
    
    console.log('✅ Q&A successful!');
    console.log('Answer:', result.answer);
    console.log('Confidence:', result.score);
    return true;
  } catch (error) {
    console.error('❌ Q&A failed:', error.message);
    return false;
  }
}

testQA();