"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDBClient } from "../../hooks/useDBClient";
import { useDocStoreClient } from "../../hooks/useDocStoreClient";
import { waitNewExpert } from "@/src/utils/nostr";

interface BlankExpertCreatorProps {
  expertPubkey: string;
  expertPrivkey: string;
  onComplete: (pubkey: string) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

export default function BlankExpertCreator({
  expertPubkey,
  expertPrivkey,
  onComplete,
  onBack,
  onError,
}: BlankExpertCreatorProps) {
  const router = useRouter();
  const { client: dbClient, loading: dbLoading } = useDBClient();
  const { client: docStoreClient, loading: docStoreLoading } =
    useDocStoreClient();

  // State for expert creation
  const [docstoreId, setDocstoreId] = useState("");
  const [creatingExpert, setCreatingExpert] = useState(false);
  const [waitingForExpert, setWaitingForExpert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for form fields
  const [nickname, setNickname] = useState("");
  const [description, setDescription] = useState("");
  const [picture, setPicture] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [model, setModel] = useState("openai/gpt-oss-120b");
  const [temperature, setTemperature] = useState("0.2");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [discoveryHashtags, setDiscoveryHashtags] = useState("");
  const [discoveryRelays, setDiscoveryRelays] = useState("");
  const [promptRelays, setPromptRelays] = useState("");
  const [priceMargin, setPriceMargin] = useState("0.1");

  // Reset error when component mounts
  useEffect(() => {
    setError(null);
  }, []);

  // Create a docstore for the expert
  const createDocstore = async () => {
    if (!docStoreClient) {
      setError("DocStore client not available");
      onError("DocStore client not available");
      return null;
    }

    try {
      // Create a new docstore with all required parameters
      const name = `Docstore for expert ${expertPubkey.substring(0, 8)}`;
      const newDocStoreId = await docStoreClient.createDocstore(
        name,
        "Xenova/all-MiniLM-L6-v2",
        384,
        ""
      );

      return newDocStoreId;
    } catch (err) {
      console.error("Error creating docstore:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      onError(err instanceof Error ? err.message : "Unknown error occurred");
      return null;
    }
  };

  // Handle creating a blank expert
  const handleCreateBlankExpert = async () => {
    if (!dbClient) {
      setError("DB client not available");
      onError("DB client not available");
      return;
    }

    if (!nickname.trim()) {
      setError("Expert nickname is required");
      onError("Expert nickname is required");
      return;
    }

    try {
      setCreatingExpert(true);
      setError(null);

      // Create a docstore for the expert
      const newDocstoreId = await createDocstore();

      if (!newDocstoreId) {
        throw new Error("Failed to create docstore");
      }

      setDocstoreId(newDocstoreId);

      // Create a new wallet for the expert
      const walletName = `${nickname}_wallet`;

      const walletData = {
        name: walletName,
        user_id: await dbClient.getUserId(),
        nwc: "",
        default: false,
      };

      const walletId = await dbClient.insertWallet(walletData);

      // Create the expert
      const expertData = {
        nickname,
        pubkey: expertPubkey,
        privkey: expertPrivkey,
        description,
        picture,
        docstores: newDocstoreId,
        disabled: false,
        user_id: await dbClient.getUserId(),
        type: "nostr",
        wallet_id: walletId,
        model,
        price_margin: priceMargin,
        hashtags,
        temperature,
        system_prompt: systemPrompt,
        discovery_hashtags: discoveryHashtags,
        discovery_relays: discoveryRelays,
        prompt_relays: promptRelays,
      };

      await dbClient.insertExpert(expertData);
      
      // Wait for the expert to start
      setCreatingExpert(false);
      setWaitingForExpert(true);
      
      await waitNewExpert(expertPubkey, discoveryRelays ? discoveryRelays.split(" ") : undefined);
      
      // Notify parent component that expert creation is complete
      onComplete(expertPubkey);
    } catch (err) {
      console.error("Error creating expert:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      onError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setCreatingExpert(false);
      setWaitingForExpert(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        <div>
          <label
            htmlFor="nickname"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Nickname *
          </label>
          <input
            type="text"
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Enter expert nickname"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="picture"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Picture URL
          </label>
          <input
            type="text"
            id="picture"
            value={picture}
            onChange={(e) => setPicture(e.target.value)}
            placeholder="Enter picture URL"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="hashtags"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Hashtags
          </label>
          <input
            type="text"
            id="hashtags"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="Enter hashtags"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="model"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Model
          </label>
          <input
            type="text"
            id="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Enter model"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="temperature"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Temperature (0 to 1.0)
          </label>
          <input
            type="number"
            id="temperature"
            value={temperature}
            onChange={(e) => setTemperature(e.target.value)}
            placeholder="Enter temperature"
            min="0"
            max="1"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="systemPrompt"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            System Prompt
          </label>
          <textarea
            id="systemPrompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Enter system prompt"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="discoveryHashtags"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Discovery Hashtags
          </label>
          <input
            type="text"
            id="discoveryHashtags"
            value={discoveryHashtags}
            onChange={(e) => setDiscoveryHashtags(e.target.value)}
            placeholder="Enter discovery hashtags"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="discoveryRelays"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Discovery Relays
          </label>
          <input
            type="text"
            id="discoveryRelays"
            value={discoveryRelays}
            onChange={(e) => setDiscoveryRelays(e.target.value)}
            placeholder="Enter discovery relays"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="promptRelays"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Prompt Relays
          </label>
          <input
            type="text"
            id="promptRelays"
            value={promptRelays}
            onChange={(e) => setPromptRelays(e.target.value)}
            placeholder="Enter prompt relays"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="priceMargin"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Price Margin (&gt; 0)
          </label>
          <input
            type="number"
            id="priceMargin"
            value={priceMargin}
            onChange={(e) => setPriceMargin(e.target.value)}
            placeholder="Enter price margin"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex justify-between space-x-2 pt-4">
          <button
            onClick={onBack}
            disabled={creatingExpert || waitingForExpert}
            className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
              creatingExpert || waitingForExpert
                ? "text-gray-400 cursor-not-allowed"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            Back
          </button>
          <button
            onClick={handleCreateBlankExpert}
            disabled={!nickname.trim() || creatingExpert || waitingForExpert}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
              !nickname.trim() || creatingExpert || waitingForExpert
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {creatingExpert ? "Creating..." : waitingForExpert ? "Waiting..." : "Create"}
          </button>
        </div>

        {waitingForExpert && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center mb-2">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-blue-600">Waiting for expert to start...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full w-full animate-pulse"></div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}