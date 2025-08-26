import { DocStoreWebSocketClient } from 'askexperts/docstore';
import { createRagEmbeddings } from 'askexperts/rag';
import { Nostr } from 'askexperts/experts';
import { globalPool } from './nostr';
import { createDocImporter } from 'askexperts/import';

// Function to get a docstore by ID
async function getDocstore(client: DocStoreWebSocketClient, docstoreId: string) {
  try {
    const docstore = await client.getDocstore(docstoreId);
    return docstore;
  } catch (error) {
    console.error('Error getting docstore:', error);
    throw error;
  }
}

// Main import function
export async function importNostrPosts({
  docstoreClient,
  docstoreId,
  pubkey,
  limit,
  onProgress
}: {
  docstoreClient: DocStoreWebSocketClient;
  docstoreId: string;
  pubkey: string;
  limit: number;
  onProgress: (progress: number, status: string) => void;
}) {
  try {
    // Update progress
    onProgress(0, 'Starting import...');

    // Get docstore
    const docstore = await getDocstore(docstoreClient, docstoreId);
    onProgress(5, 'Fetching Nostr events...');

    // Event kinds
    const kinds = [1, 30023];

    // Create SimplePool and Nostr utility instance
    const nostr = new Nostr(globalPool);

    // Crawl events using the Nostr utility class
    const events = await nostr.crawl({
      pubkey,
      kinds,
      limit,
      onProgress: (count) => {
        const p = Math.floor(count * 25 / limit);
        onProgress(5 + p, `Fetching, got ${count} events...`);
      }
    });

    onProgress(30, `Fetched ${events.length} events. Preparing embeddings...`);

    // Initialize embeddings
    if (!docstore) {
      throw new Error('Docstore not found');
    }
    
    const embeddings = await createRagEmbeddings(docstore.model);
    await embeddings.start();
    
    onProgress(30, 'Processing events...');

    const importer = await createDocImporter("nostr");

    // Process each event
    let successCount = 0;
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      try {
        // Convert to doc
        const doc = await importer.createDoc(event);
        doc.docstore_id = docstore?.id || docstoreId;

        // Generate embeddings
        const chunks = await embeddings.embed(doc.data);

        // Convert embeddings from number[][] to Float32Array[]
        const float32Embeddings = chunks.map((c) => {
          const float32Array = new Float32Array(c.embedding.length);
          for (let i = 0; i < c.embedding.length; i++) {
            float32Array[i] = c.embedding[i];
          }
          return float32Array;
        });

        doc.embeddings = float32Embeddings;

        // Add to docstore
        await docstoreClient.upsert(doc);
        successCount++;

        // Update progress
        const progress = 30 + Math.floor((successCount / events.length) * 70);
        onProgress(progress, `Processed ${successCount}/${events.length} events`);
      } catch (error) {
        console.error('Error processing event:', error);
      }
    }

    // Final update
    onProgress(100, `Import completed! Processed ${successCount}/${events.length} events.`);
    return {
      success: true,
      message: `Successfully imported ${successCount} events.`,
      count: successCount,
      events: events
    };
  } catch (error) {
    console.error('Error importing Nostr posts:', error);
    onProgress(0, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
