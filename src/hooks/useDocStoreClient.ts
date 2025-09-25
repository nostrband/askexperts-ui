import { useAuth } from "./useCustomAuth";
import { DocStoreWebSocketClient } from "askexperts/docstore";
import { DOCSTORE_BASE_URL } from "../utils/const";
import { useState, useEffect } from "react";

// Singleton instance of the client
let clientInstance: DocStoreWebSocketClient | null = null;

export function useDocStoreClient() {
  const auth = useAuth();
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

        // Check if user is authenticated with either method
        if (!auth.isSignedIn) {
          setLoading(false);
          return;
        }

        // Create client options based on auth method
        let clientOptions: any = {
          url: DOCSTORE_BASE_URL,
        };

        if (auth.getToken) {
          clientOptions.token = async () => {
            const token = await auth.getToken!();
            if (!token)
              throw new Error(
                "Authentication token not available. Please sign in."
              );
            return token;
          };
        } else {
          throw new Error("No authentication method available");
        }

        // Create a new client instance
        clientInstance = new DocStoreWebSocketClient(clientOptions);

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
      // FIXME what happens if it's created in SSR? If we get
      // requests from different clients in the same process,
      // how can singleton satisfy them?
    };
  }, [auth.isSignedIn, auth.getToken]);

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