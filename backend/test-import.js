async function testImport() {
  try {
    console.log('🔄 Testing @xenova/transformers import...');
    const { pipeline } = await import('@xenova/transformers');
    console.log('✅ Transformers import successful');
    console.log('Pipeline function type:', typeof pipeline);
    return true;
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    return false;
  }
}

testImport();