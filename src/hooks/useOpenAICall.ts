import { useState } from "react";
import { createOpenAI } from "askexperts/openai";
import { globalPool } from "../utils/nostr";
import { useDBClient } from "./useDBClient";
import { LightningPaymentManager } from "askexperts/payments";
import { ChatCompletion } from "openai/resources/index.mjs";

export interface UseOpenAICallOptions {
  model: string;
  maxAmountSats?: number;
}

export interface OpenAIMessage {
  content: string | null;
  images?: {
    type: "image_url";
    image_url: {
      url: string;
    };
  }[];
}

export function useOpenAICall({
  model,
  maxAmountSats = 100,
}: UseOpenAICallOptions) {
  const { client: dbClient } = useDBClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const makeCall = async (prompt: string, modalities?: ('image' | 'text')[]): Promise<OpenAIMessage> => {
    if (!dbClient) {
      throw new Error("DB client not available");
    }

    setLoading(true);
    setError(null);

    try {
      // Get the default wallet to get the NWC string
      const defaultWallet = await dbClient.getDefaultWallet();

      if (!defaultWallet || !defaultWallet.nwc) {
        throw new Error("No default wallet found or wallet missing NWC string");
      }

      const paymentManager = new LightningPaymentManager(defaultWallet.nwc);

      const openai = createOpenAI({
        pool: globalPool,
        paymentManager,
      });

      console.log("model", model, "prompt", prompt);
      const quote = await openai.getQuote(model, {
        model: model,
        messages: [{ role: "user", content: prompt }],
        // @ts-ignore
        modalities
      });

      if (quote.amountSats > maxAmountSats) {
        throw new Error(
          `Quoted amount too big: ${quote.amountSats} sats (max: ${maxAmountSats})`
        );
      }

      const reply = (await openai.execute(quote.quoteId)) as ChatCompletion;
      const message = reply.choices[0]?.message;
      console.log("reply", reply);

      if (!message) {
        throw new Error("No message received from OpenAI");
      }

      return message as OpenAIMessage;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    makeCall,
    loading,
    error,
  };
}
