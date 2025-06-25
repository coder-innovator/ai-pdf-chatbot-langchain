/**
 * Vector similarity utilities for financial embeddings
 * Provides various similarity metrics for comparing embeddings
 */

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where 1 is identical, 0 is orthogonal, -1 is opposite
 */
export function cosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(`Vector dimensions must match: ${vectorA.length} vs ${vectorB.length}`);
  }

  if (vectorA.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    magnitudeA += vectorA[i] * vectorA[i];
    magnitudeB += vectorB[i] * vectorB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Calculate Euclidean distance between two vectors
 * Returns a value >= 0, where 0 means identical vectors
 */
export function euclideanDistance(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(`Vector dimensions must match: ${vectorA.length} vs ${vectorB.length}`);
  }

  let sum = 0;
  for (let i = 0; i < vectorA.length; i++) {
    const diff = vectorA[i] - vectorB[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Calculate Manhattan (L1) distance between two vectors
 * Returns a value >= 0, where 0 means identical vectors
 */
export function manhattanDistance(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(`Vector dimensions must match: ${vectorA.length} vs ${vectorB.length}`);
  }

  let sum = 0;
  for (let i = 0; i < vectorA.length; i++) {
    sum += Math.abs(vectorA[i] - vectorB[i]);
  }

  return sum;
}

/**
 * Calculate dot product between two vectors
 */
export function dotProduct(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(`Vector dimensions must match: ${vectorA.length} vs ${vectorB.length}`);
  }

  let sum = 0;
  for (let i = 0; i < vectorA.length; i++) {
    sum += vectorA[i] * vectorB[i];
  }

  return sum;
}

/**
 * Calculate vector magnitude (L2 norm)
 */
export function vectorMagnitude(vector: number[]): number {
  let sum = 0;
  for (const value of vector) {
    sum += value * value;
  }
  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = vectorMagnitude(vector);
  if (magnitude === 0) {
    return vector.slice(); // Return copy of zero vector
  }

  return vector.map(value => value / magnitude);
}

/**
 * Calculate Jaccard similarity for binary vectors
 * Useful for comparing sets represented as binary vectors
 */
export function jaccardSimilarity(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(`Vector dimensions must match: ${vectorA.length} vs ${vectorB.length}`);
  }

  let intersection = 0;
  let union = 0;

  for (let i = 0; i < vectorA.length; i++) {
    const a = vectorA[i] > 0 ? 1 : 0;
    const b = vectorB[i] > 0 ? 1 : 0;
    
    if (a === 1 && b === 1) {
      intersection++;
    }
    if (a === 1 || b === 1) {
      union++;
    }
  }

  return union === 0 ? 0 : intersection / union;
}

/**
 * Calculate Pearson correlation coefficient
 * Measures linear correlation between two vectors
 */
export function pearsonCorrelation(vectorA: number[], vectorB: number[]): number {
  if (vectorA.length !== vectorB.length) {
    throw new Error(`Vector dimensions must match: ${vectorA.length} vs ${vectorB.length}`);
  }

  const n = vectorA.length;
  if (n === 0) return 0;

  // Calculate means
  const meanA = vectorA.reduce((sum, val) => sum + val, 0) / n;
  const meanB = vectorB.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let sumSquareA = 0;
  let sumSquareB = 0;

  for (let i = 0; i < n; i++) {
    const diffA = vectorA[i] - meanA;
    const diffB = vectorB[i] - meanB;

    numerator += diffA * diffB;
    sumSquareA += diffA * diffA;
    sumSquareB += diffB * diffB;
  }

  const denominator = Math.sqrt(sumSquareA * sumSquareB);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Find k-nearest neighbors using cosine similarity
 */
export function findKNearestNeighbors<T>(
  queryVector: number[],
  vectors: Array<{ embedding: number[]; data: T }>,
  k: number,
  similarityThreshold: number = 0
): Array<{ similarity: number; data: T }> {
  const similarities = vectors
    .map(({ embedding, data }) => ({
      similarity: cosineSimilarity(queryVector, embedding),
      data
    }))
    .filter(item => item.similarity >= similarityThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);

  return similarities;
}

/**
 * Batch calculate similarities between a query vector and multiple vectors
 */
export function batchCosineSimilarity(
  queryVector: number[],
  vectors: number[][]
): number[] {
  return vectors.map(vector => cosineSimilarity(queryVector, vector));
}

/**
 * Calculate semantic similarity score
 * Combines cosine similarity with additional weighting factors
 */
export function semanticSimilarity(
  vectorA: number[],
  vectorB: number[],
  options: {
    weightCosineSimilarity?: number;
    weightMagnitudeDifference?: number;
    weightDimensionality?: number;
  } = {}
): number {
  const {
    weightCosineSimilarity = 0.8,
    weightMagnitudeDifference = 0.1,
    weightDimensionality = 0.1
  } = options;

  // Base cosine similarity
  const cosine = cosineSimilarity(vectorA, vectorB);

  // Magnitude difference penalty (closer magnitudes = more similar)
  const magA = vectorMagnitude(vectorA);
  const magB = vectorMagnitude(vectorB);
  const magnitudeSimilarity = magA === 0 && magB === 0 ? 1 : 
    1 - Math.abs(magA - magB) / Math.max(magA, magB);

  // Dimensionality factor (always 1 for same-dimension vectors)
  const dimensionalityFactor = vectorA.length === vectorB.length ? 1 : 0;

  // Weighted combination
  return (
    cosine * weightCosineSimilarity +
    magnitudeSimilarity * weightMagnitudeDifference +
    dimensionalityFactor * weightDimensionality
  );
}

/**
 * Create a similarity matrix between multiple vectors
 */
export function createSimilarityMatrix(
  vectors: number[][],
  similarityFunction: (a: number[], b: number[]) => number = cosineSimilarity
): number[][] {
  const n = vectors.length;
  const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0; // Self-similarity is always 1
      } else {
        const similarity = similarityFunction(vectors[i], vectors[j]);
        matrix[i][j] = similarity;
        matrix[j][i] = similarity; // Symmetric matrix
      }
    }
  }

  return matrix;
}

/**
 * Calculate centroid of multiple vectors
 */
export function calculateCentroid(vectors: number[][]): number[] {
  if (vectors.length === 0) {
    return [];
  }

  const dimensions = vectors[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const vector of vectors) {
    if (vector.length !== dimensions) {
      throw new Error('All vectors must have the same dimensions');
    }
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += vector[i];
    }
  }

  return centroid.map(sum => sum / vectors.length);
}

/**
 * Calculate variance of vectors from their centroid
 */
export function calculateVariance(vectors: number[][]): number {
  if (vectors.length <= 1) {
    return 0;
  }

  const centroid = calculateCentroid(vectors);
  let totalVariance = 0;

  for (const vector of vectors) {
    const distance = euclideanDistance(vector, centroid);
    totalVariance += distance * distance;
  }

  return totalVariance / vectors.length;
}

/**
 * Similarity search result interface
 */
export interface SimilaritySearchResult<T = any> {
  similarity: number;
  distance?: number;
  data: T;
  id?: string;
}

/**
 * Advanced similarity search with multiple metrics
 */
export function advancedSimilaritySearch<T>(
  queryVector: number[],
  vectors: Array<{ id: string; embedding: number[]; data: T }>,
  options: {
    k?: number;
    threshold?: number;
    metrics?: ('cosine' | 'euclidean' | 'manhattan' | 'pearson')[];
    weights?: { [metric: string]: number };
  } = {}
): SimilaritySearchResult<T>[] {
  const {
    k = 10,
    threshold = 0,
    metrics = ['cosine'],
    weights = { cosine: 1.0 }
  } = options;

  const results = vectors.map(({ id, embedding, data }) => {
    let combinedSimilarity = 0;
    let totalWeight = 0;

    for (const metric of metrics) {
      const weight = weights[metric] || 1.0;
      let similarity = 0;

      switch (metric) {
        case 'cosine':
          similarity = cosineSimilarity(queryVector, embedding);
          break;
        case 'euclidean':
          // Convert distance to similarity (0-1 range)
          const eucDist = euclideanDistance(queryVector, embedding);
          const maxDist = Math.sqrt(queryVector.length) * 2; // Approximate max distance
          similarity = Math.max(0, 1 - eucDist / maxDist);
          break;
        case 'manhattan':
          // Convert distance to similarity
          const manDist = manhattanDistance(queryVector, embedding);
          const maxManDist = queryVector.length * 2; // Approximate max distance
          similarity = Math.max(0, 1 - manDist / maxManDist);
          break;
        case 'pearson':
          // Pearson correlation (-1 to 1) converted to 0-1 similarity
          const correlation = pearsonCorrelation(queryVector, embedding);
          similarity = (correlation + 1) / 2;
          break;
      }

      combinedSimilarity += similarity * weight;
      totalWeight += weight;
    }

    const finalSimilarity = totalWeight > 0 ? combinedSimilarity / totalWeight : 0;

    return {
      similarity: finalSimilarity,
      distance: euclideanDistance(queryVector, embedding),
      data,
      id
    };
  });

  return results
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}

/**
 * Utility to validate vector dimensions
 */
export function validateVectorDimensions(vectors: number[][]): boolean {
  if (vectors.length === 0) return true;
  
  const expectedDimension = vectors[0].length;
  return vectors.every(vector => vector.length === expectedDimension);
}

/**
 * Utility to check if vectors contain valid numbers
 */
export function validateVectorValues(vectors: number[][]): boolean {
  return vectors.every(vector => 
    vector.every(value => 
      typeof value === 'number' && !isNaN(value) && isFinite(value)
    )
  );
}