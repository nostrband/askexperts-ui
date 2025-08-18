import { useAuth } from "@clerk/nextjs";
import { DBRemoteClient } from "askexperts/db";
import { useState, useEffect } from "react";

// Singleton instance of the client
let clientInstance: DBRemoteClient | null = null;

export function useDBClient() {
  const { getToken } = useAuth();
  const [client, setClient] = useState<DBRemoteClient | null>(null);
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

        // Create a new client instance
        clientInstance = new DBRemoteClient({
          url: "https://api.askexperts.io",
          token: async () => {
            const token = await getToken();
            if (!token)
              throw new Error(
                "Authentication token not available. Please sign in."
              );
            return token;
          },
        });

        setClient(clientInstance);
      } catch (err) {
        console.error("Error initializing DB client:", err);
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
