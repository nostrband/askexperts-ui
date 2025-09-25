import { useAuth } from "./useCustomAuth";
import { DBRemoteClient } from "askexperts/db";
import { API_BASE_URL } from "../utils/const";
import { useState, useEffect } from "react";

// Singleton instance of the client
let clientInstance: DBRemoteClient | null = null;

export function useDBClient() {
  const auth = useAuth();
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

        // Check if user is authenticated with either method
        if (!auth.isSignedIn) {
          setLoading(false);
          return;
        }

        // Create client options based on auth method
        let clientOptions: any = {
          url: API_BASE_URL,
        };

        if (auth.getToken) {
          // Use Clerk token for authentication
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
        clientInstance = new DBRemoteClient(clientOptions);

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
  }, [auth.isSignedIn, auth.getToken]);

  return { client, loading, error };
}
