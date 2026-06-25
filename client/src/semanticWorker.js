import { pipeline, env } from '@huggingface/transformers';

// Ensure we only download from HF hub, no local fallback
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1; // Prevent Vite SharedArrayBuffer crashes

class PipelineSingleton {
    static task = 'feature-extraction';
    static model = 'Xenova/all-MiniLM-L6-v2';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { 
                progress_callback,
                dtype: 'q8' // Blazing fast 8-bit quantized model (22MB vs 90MB), universally supported via WASM
            });
        }
        return this.instance;
    }
}

// Compute cosine similarity between two vectors
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

let knowledgeEmbeddings = [];

self.addEventListener('message', async (event) => {
    let extractor = await PipelineSingleton.getInstance(x => {
        // Send loading progress back to UI
        self.postMessage({ status: 'progress', ...x });
    });

    const { action, text, id, knowledgeBase } = event.data;

    // 1. Build knowledge base embeddings
    if (action === 'build_index' && knowledgeBase) {
        knowledgeEmbeddings = [];
        
        for (let i = 0; i < knowledgeBase.length; i++) {
            const item = knowledgeBase[i];
            const output = await extractor(item.text, { pooling: 'mean', normalize: true });
            knowledgeEmbeddings.push({
                ...item,
                embedding: Array.from(output.data)
            });
        }
        self.postMessage({ status: 'index_ready', count: knowledgeEmbeddings.length });
        return;
    }

    // 2. Search against knowledge base
    if (action === 'search' && text) {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(output.data);
        
        // Calculate similarities
        const results = knowledgeEmbeddings.map(item => ({
            ...item,
            score: cosineSimilarity(queryVector, item.embedding)
        }));
        
        // Sort by similarity descending
        results.sort((a, b) => b.score - a.score);
        
        self.postMessage({
            status: 'search_results',
            text: text,
            prefix: event.data.prefix || '',
            id: id,
            results: results.slice(0, 10).map(r => ({ text: r.text, type: r.type, score: r.score }))
        });
    }
});
