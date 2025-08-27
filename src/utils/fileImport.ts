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

  async importFile(fileContent: string, fileName: string, onProgress?: (done: number, total: number) => Promise<void>): Promise<Doc> {
    try {
      if (!this.embeddings || !this.importer) {
        await this.initialize();
      }

      // Create a document from the file content
      let doc = await this.importer!.createDoc({
        url: fileName,
        content: fileContent,
      });
      doc.docstore_id = this.docstoreId;

      // Generate embeddings - pass the progress callback
      doc = await this.embeddings!.embedDoc(doc, onProgress);

      // Add to docstore
      await this.docstoreClient.upsert(doc);

      return doc;
    } catch (error) {
      console.error("Error importing file:", error);
      throw error;
    }
  }
}
