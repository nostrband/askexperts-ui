import { useAuth } from "@clerk/nextjs";
import { DocStoreWebSocketClient } from "askexperts/docstore";
import { useState, useEffect } from "react";

// Singleton instance of the client
let clientInstance: DocStoreWebSocketClient | null = null;

export function useDocStoreClient() {
  const { getToken } = useAuth();
  const [client, setClient] = useState<DocStoreWebSocketClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initClient = async () => {
      try {
        // If we already have a client instance, return it
        if (clientInstance) {
          setClient(clientInstance);
          setLoading(false);
          return;
        }

        // Get the token first
        const token = await getToken();
        if (!token)
          throw new Error(
            "Authentication token not available. Please sign in."
          );

        // Create a new client instance
        clientInstance = new DocStoreWebSocketClient({
          url: "https://docstore.askexperts.io",
          token: token,
        });

        setClient(clientInstance);
      } catch (err) {
        console.error("Error initializing DocStore client:", err);
        setError(
          err instanceof Error ? err : new Error("Unknown error occurred")
        );
      } finally {
        setLoading(false);
      }
    };

    initClient();

    // Cleanup function
    return () => {
      // We don't dispose the client here since it's a singleton
      // If needed, we could implement a reference counting mechanism
    };
  }, [getToken]);

  return { client, loading, error };
}

// DocStore interface as specified
export interface DocStore {
  id: string;
  name: string;
  timestamp: number;
  model: string;       // name of embeddings model
  vector_size: number; // size of embedding vectors
  options: string;     // options of the model, '' by default
  user_id?: string;    // User ID associated with the docstore
}