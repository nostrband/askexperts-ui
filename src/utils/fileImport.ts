import { Doc, DocStoreWebSocketClient } from "askexperts/docstore";
import { createRagEmbeddings, RagEmbeddings } from "askexperts/rag";
import { createDocImporter, DocImporter } from "askexperts/import";

export class FileImporter {
  private docstoreClient: DocStoreWebSocketClient;
  private docstoreId: string;
  private embeddings?: RagEmbeddings;
  private importer?: DocImporter;

  constructor(docstoreClient: DocStoreWebSocketClient, docstoreId: string) {
    this.docstoreClient = docstoreClient;
    this.docstoreId = docstoreId;
  }

  async initialize() {
    try {
      // Get docstore
      const docstore = await this.docstoreClient.getDocstore(this.docstoreId);

      if (!docstore) {
        throw new Error("Docstore not found");
      }

      // Initialize embeddings
      this.embeddings = createRagEmbeddings(docstore.model);
      await this.embeddings.start();

      // Create document importer for markdown
      this.importer = await createDocImporter("markdown");

      return true;
    } catch (error) {
      console.error("Error initializing FileImporter:", error);
      throw error;
    }
  }

  async importFile(fileContent: string, fileName: string): Promise<Doc> {
    try {
      if (!this.embeddings || !this.importer) {
        await this.initialize();
      }

      // Create a document from the file content
      const doc = await this.importer!.createDoc({
        url: fileName,
        content: fileContent,
      });
      doc.docstore_id = this.docstoreId;

      // Generate embeddings
      const chunks = await this.embeddings!.embed(doc.data);

      // Convert embeddings from number[][] to Float32Array[]
      const float32Embeddings = chunks.map((c: any) => {
        const float32Array = new Float32Array(c.embedding.length);
        for (let i = 0; i < c.embedding.length; i++) {
          float32Array[i] = c.embedding[i];
        }
        return float32Array;
      });

      doc.embeddings = float32Embeddings;

      // Add to docstore
      await this.docstoreClient.upsert(doc);

      return doc;
    } catch (error) {
      console.error("Error importing file:", error);
      throw error;
    }
  }
}
