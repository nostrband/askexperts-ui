"use client";

import React, { useState, useEffect } from "react";
import { useDBClient } from "../../hooks/useDBClient";
import { useDocStoreClient, DocStore } from "../../hooks/useDocStoreClient";
import Dialog from "../ui/Dialog";
import { DBExpert } from "askexperts/db";

interface EditExpertDialogProps {
  isOpen: boolean;
  onClose: () => void;
  expertId: string;
}

type ExpertType = "rag" | "system_prompt";

export default function EditExpertDialog({
  isOpen,
  onClose,
  expertId,
}: EditExpertDialogProps) {
  const {
    client: dbClient,
    loading: dbLoading,
    error: dbError,
  } = useDBClient();
  const {
    client: docStoreClient,
    loading: docStoreLoading,
    error: docStoreError,
  } = useDocStoreClient();
  const [expert, setExpert] = useState<DBExpert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Docstores state
  const [availableDocStores, setAvailableDocStores] = useState<DocStore[]>([]);
  const [loadingDocStores, setLoadingDocStores] = useState(false);

  // Edit form state
  const [nickname, setNickname] = useState("");
  const [pubkey, setPubkey] = useState("");
  const [env, setEnv] = useState("");
  const [selectedDocStoreId, setSelectedDocStoreId] = useState<string>("");
  const [type, setType] = useState<ExpertType>("rag");
  const [updatingExpert, setUpdatingExpert] = useState(false);
  const [updateExpertError, setUpdateExpertError] = useState<string | null>(
    null
  );

  // New fields
  const [description, setDescription] = useState("");
  const [picture, setPicture] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [model, setModel] = useState("");
  const [temperature, setTemperature] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [discoveryHashtags, setDiscoveryHashtags] = useState("");
  const [discoveryRelays, setDiscoveryRelays] = useState("");
  const [promptRelays, setPromptRelays] = useState("");
  const [priceMargin, setPriceMargin] = useState("");

  // Fetch docstores
  useEffect(() => {
    const fetchDocStores = async () => {
      if (!docStoreClient || docStoreLoading) return;

      try {
        setLoadingDocStores(true);
        const stores = await docStoreClient.listDocstores();
        setAvailableDocStores(stores);
        setLoadingDocStores(false);
      } catch (err) {
        console.error("Error fetching docstores:", err);
        // Don't set error state here to avoid UI disruption
        setLoadingDocStores(false);
      }
    };

    if (isOpen) {
      fetchDocStores();
    }
  }, [docStoreClient, docStoreLoading, isOpen]);

  // Fetch expert data
  useEffect(() => {
    const fetchExpertData = async () => {
      if (!dbClient || dbLoading) return;

      try {
        setLoading(true);

        // Fetch the expert
        const expertData = await dbClient.getExpert(expertId);

        // Set the expert data
        setExpert(expertData);

        // Initialize form fields
        if (expertData) {
          setNickname(expertData.nickname || "");
          setPubkey(expertData.pubkey || "");
          setEnv(expertData.env || "");

          // Get the first docstore ID if available
          const firstDocStoreId = expertData.docstores
            ? expertData.docstores.split(",")[0].trim()
            : "";
          setSelectedDocStoreId(firstDocStoreId);

          setType((expertData.type as ExpertType) || "rag");

          // Initialize new fields
          setDescription(expertData.description || "");
          setPicture(expertData.picture || "");
          setHashtags(expertData.hashtags || "");
          setModel(expertData.model || "");
          setTemperature(expertData.temperature || "");
          setSystemPrompt(expertData.system_prompt || "");
          setDiscoveryHashtags(expertData.discovery_hashtags || "");
          setDiscoveryRelays(expertData.discovery_relays || "");
          setPromptRelays(expertData.prompt_relays || "");
          setPriceMargin(expertData.price_margin || "");
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching expert data:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setLoading(false);
      }
    };

    if (isOpen && expertId) {
      fetchExpertData();
    }
  }, [dbClient, dbLoading, expertId, isOpen]);

  // Handle updating expert
  const handleUpdateExpert = async () => {
    if (!dbClient || !expert) return;
    if (!nickname.trim()) {
      setUpdateExpertError("Expert nickname is required");
      return;
    }

    try {
      setUpdatingExpert(true);
      setUpdateExpertError(null);

      // Create updated expert data
      const updatedExpertData = {
        ...expert,
        nickname: nickname.trim(),
        pubkey: pubkey.trim(),
        env: env.trim(),
        docstores: selectedDocStoreId.trim(),
        type: type,
        description: description.trim(),
        picture: picture.trim(),
        hashtags: hashtags.trim(),
        model: model.trim(),
        temperature: temperature.trim(),
        system_prompt: systemPrompt.trim(),
        discovery_hashtags: discoveryHashtags.trim(),
        discovery_relays: discoveryRelays.trim(),
        prompt_relays: promptRelays.trim(),
        price_margin: priceMargin.trim(),
      };

      // Update the expert
      await dbClient.updateExpert(updatedExpertData as any);

      // Close the dialog
      onClose();
    } catch (err) {
      console.error("Error updating expert:", err);
      setUpdateExpertError(
        err instanceof Error ? err.message : "Unknown error occurred"
      );
    } finally {
      setUpdatingExpert(false);
    }
  };

  // Handle docstore selection
  const handleDocStoreSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDocStoreId(e.target.value);
  };

  // Reset form to current expert values when closing
  const handleClose = () => {
    onClose();
    setUpdateExpertError(null);
  };

  if (loading || dbLoading) {
    return (
      <Dialog isOpen={isOpen} onClose={handleClose} title="Edit Expert">
        <div className="p-4 text-center">Loading expert data...</div>
      </Dialog>
    );
  }

  if (error || dbError) {
    return (
      <Dialog isOpen={isOpen} onClose={handleClose} title="Edit Expert">
        <div className="p-4 text-center text-red-500">
          Error:{" "}
          {error ||
            (dbError instanceof Error ? dbError.message : "Unknown error")}
        </div>
      </Dialog>
    );
  }

  if (!expert) {
    return (
      <Dialog isOpen={isOpen} onClose={handleClose} title="Edit Expert">
        <div className="p-4 text-center">Expert not found</div>
      </Dialog>
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Edit Expert"
      footer={
        <div className="flex justify-end space-x-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdateExpert}
            disabled={!nickname.trim() || updatingExpert}
            className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
              !nickname.trim() || updatingExpert
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {updatingExpert ? "Updating..." : "Update Expert"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
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
            htmlFor="pubkey"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Pubkey (Read-only)
          </label>
          <input
            type="text"
            id="pubkey"
            value={pubkey}
            readOnly
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
          />
        </div>
        <div>
          <label
            htmlFor="docstore"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Docstore
          </label>
          {loadingDocStores ? (
            <div className="p-2 text-gray-500 text-sm">
              Loading docstores...
            </div>
          ) : (
            <select
              id="docstore"
              value={selectedDocStoreId}
              onChange={handleDocStoreSelection}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a docstore</option>
              {availableDocStores.map((docStore) => (
                <option key={docStore.id} value={docStore.id}>
                  {docStore.name} ({docStore.id})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label
            htmlFor="expertType"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Expert Type
          </label>
          <div className="mt-2 space-y-2">
            <div className="flex items-center">
              <input
                id="rag"
                name="expertType"
                type="radio"
                checked={type === "rag"}
                onChange={() => setType("rag")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="rag" className="ml-2 block text-sm text-gray-700">
                RAG (Retrieval Augmented Generation with documents)
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="system_prompt"
                name="expertType"
                type="radio"
                checked={type === "system_prompt"}
                onChange={() => setType("system_prompt")}
                className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="system_prompt" className="ml-2 block text-sm text-gray-700">
                System Prompt (No document retrieval)
              </label>
            </div>
          </div>
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
            Picture
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

        <div>
          <label
            htmlFor="env"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Environment
          </label>
          <textarea
            id="env"
            value={env}
            onChange={(e) => setEnv(e.target.value)}
            placeholder="Enter environment"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {updateExpertError && (
          <div className="p-2 bg-red-100 text-red-800 rounded-md">
            {updateExpertError}
          </div>
        )}
      </div>
    </Dialog>
  );
}
