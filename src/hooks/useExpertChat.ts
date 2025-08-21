import { useState, useEffect, useRef } from "react";
import { AskExpertsChatClient } from "askexperts/client";
import { Expert, METHOD_LIGHTNING, parseBolt11 } from "askexperts/common";
import { useDBClient } from "./useDBClient";
import { nwc } from "@getalby/sdk";

// Define Message interface for chat messages
export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "expert";
  timestamp: number;
  amountPaid?: number; // Amount paid in sats (only for expert messages)
  sending?: boolean; // Flag to indicate if the message is currently being sent
}

export interface UseExpertChatResult {
  expert: Expert | null;
  loading: boolean;
  error: string | null;
  messages: ChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  sendError: string | null;
  setSendError: (error: string | null) => void;
  lastFailedMessage: string;
  setLastFailedMessage: (message: string) => void;
}

export function useExpertChat(expertPubkey: string): UseExpertChatResult {
  const { client: dbClient, loading: dbLoading } = useDBClient();
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string>("");

  const chatClient = useRef<AskExpertsChatClient | null>(null);
  const nwcClientRef = useRef<nwc.NWCClient | null>(null);

  // Initialize chat client
  useEffect(() => {
    let isMounted = true;

    const initializeClient = async () => {
      if (!dbClient || dbLoading) return;

      try {
        setLoading(true);

        // Get the default wallet to get the NWC string
        const defaultWallet = await dbClient.getDefaultWallet();

        if (!defaultWallet || !defaultWallet.nwc) {
          throw new Error(
            "No default wallet found or wallet missing NWC string"
          );
        }

        // Create an NWC client for balance updates
        const nwcClient = new nwc.NWCClient({
          nostrWalletConnectUrl: defaultWallet.nwc,
        });
        nwcClientRef.current = nwcClient;

        // Create chat client with expert pubkey and proper NWC string
        const client = new AskExpertsChatClient(expertPubkey, {
          nwcString: defaultWallet.nwc,
          onPaid: async (prompt, quote, proof, fees_msat) => {
            try {
              // Find the lightning invoice
              const lightningInvoice = quote.invoices.find(
                (inv) => inv.method === METHOD_LIGHTNING
              );

              if (lightningInvoice && lightningInvoice.invoice) {
                // Parse the invoice to get the amount
                const { amount_sats } = parseBolt11(lightningInvoice.invoice);

                // Calculate total amount paid including fees
                const totalPaid = amount_sats + Math.ceil(fees_msat / 1000);

                // Get expert name or use a default
                const expertName = expert?.name || "Expert";

                // Print payment information to console
                console.log(
                  `Paid ${amount_sats}+${Math.ceil(
                    fees_msat / 1000
                  )} sats to ${expertName}`
                );

                // Force a refresh of the header balance by dispatching a custom event
                window.dispatchEvent(new CustomEvent("wallet-balance-update"));

                // Update the last user message with the amount paid
                setMessages((prev) => {
                  // Find the last user message
                  const lastUserMessageIndex = [...prev]
                    .reverse()
                    .findIndex((msg) => msg.sender === "user");
                  if (lastUserMessageIndex === -1) return prev;

                  // Create a new messages array with the updated message
                  const newMessages = [...prev];
                  const actualIndex = prev.length - 1 - lastUserMessageIndex;
                  newMessages[actualIndex] = {
                    ...newMessages[actualIndex],
                    amountPaid: totalPaid,
                  };

                  return newMessages;
                });
              }
            } catch (error) {
              console.error("Error in onPaid callback:", error);
            }
          },
        });

        chatClient.current = client;

        // Initialize client and get expert profile
        const expertData = await client.initialize();
        console.log("expertData", expertData);

        if (isMounted) {
          setExpert(expertData);
          setLoading(false);
        }
      } catch (err) {
        console.error("Error initializing chat client:", err);
        if (isMounted) {
          setError("Failed to load expert profile. Please try again later.");
          setLoading(false);
        }
      }
    };

    // Add a small delay to ensure the DB client is fully initialized
    const timeoutId = setTimeout(() => {
      initializeClient();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      isMounted = false;
      if (chatClient.current) {
        chatClient.current[Symbol.dispose]();
      }
      if (nwcClientRef.current) {
        nwcClientRef.current.close();
      }
    };
  }, [expertPubkey, dbClient, dbLoading]);

  // Function to send a message to the expert
  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || !chatClient.current || sending) {
      return;
    }

    // Clear any previous send errors
    setSendError(null);

    // Generate a unique ID for this message
    const messageId = `user-${Date.now()}`;

    try {
      setSending(true);

      // Add user message to chat
      const userMessage: ChatMessage = {
        id: messageId,
        content: messageContent,
        sender: "user",
        timestamp: Date.now(),
        sending: true, // Mark the message as being sent
      };

      setMessages((prev) => [...prev, userMessage]);

      // Process message and get expert's reply
      const expertReplyContent = await chatClient.current.processMessage(
        messageContent
      );

      // Add expert's reply to chat
      const expertReply: ChatMessage = {
        id: `expert-${Date.now()}`,
        content: expertReplyContent,
        sender: "expert",
        timestamp: Date.now(),
      };
      // Update the user message to mark it as sent and add the expert reply
      setMessages((prev) => {
        const updatedMessages = prev.map((msg) =>
          msg.id === messageId ? { ...msg, sending: false } : msg
        );
        return [...updatedMessages, expertReply];
      });
    } catch (err) {
      console.error("Error sending message:", err);

      // Instead of removing the message, mark it as not sending
      // This ensures the spinner disappears if we keep the message in the UI
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, sending: false } : msg
        )
      );

      // Then remove the user message from history
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

      // Save the failed message so it can be put back in the textarea
      setLastFailedMessage(messageContent);

      // Set the error message to display
      setSendError(
        err instanceof Error
          ? err.message
          : "Failed to send message. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  return {
    expert,
    loading,
    error,
    messages,
    sendMessage,
    sendError,
    setSendError,
    lastFailedMessage,
    setLastFailedMessage,
  };
}
