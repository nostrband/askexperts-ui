"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDBClient } from "../../hooks/useDBClient";
import { useDocStoreClient } from "../../hooks/useDocStoreClient";
import { waitNewExpert } from "@/src/utils/nostr";
import { FileImporter } from "@/src/utils/fileImport";
import { useIconGeneration } from "../../hooks/useIconGeneration";

// Define the steps in the blank expert creation process
enum BlankExpertStep {
  DETAILS = "details",
  DOCUMENTS = "documents",
}

// Define the imported file interface
interface ImportedFile {
  id: string;
  name: string;
  size: number;
}

interface BlankExpertCreatorProps {
  expertPubkey: string;
  expertPrivkey: string;
  onComplete: (pubkey: string) => void;
  onWaiting: (pubkey: string) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

export default function BlankExpertCreator({
  expertPubkey,
  expertPrivkey,
  onComplete,
  onWaiting,
  onBack,
  onError,
}: BlankExpertCreatorProps) {
  const router = useRouter();
  const { client: dbClient, loading: dbLoading } = useDBClient();
  const { client: docStoreClient, loading: docStoreLoading } =
    useDocStoreClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State for the multi-step flow
  const [currentStep, setCurrentStep] = useState<BlankExpertStep>(
    BlankExpertStep.DETAILS
  );

  // State for expert creation
  const [docstoreId, setDocstoreId] = useState("");
  const [creatingExpert, setCreatingExpert] = useState(false);
  const [waitingForExpert, setWaitingForExpert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileImporter, setFileImporter] = useState<FileImporter | null>(null);
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [currentImportFile, setCurrentImportFile] = useState<string>("");
  const [importProgress, setImportProgress] = useState<number>(0);

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
  const [expertType, setExpertType] = useState("rag");
  
  // Icon generation hook
  const { generateIcon, generatingIcon, iconGenerationError } = useIconGeneration();

  // Reset error when component mounts or step changes
  useEffect(() => {
    setError(null);
  }, [currentStep]);

  // Initialize FileImporter when docstoreId is set
  useEffect(() => {
    if (docstoreId && docStoreClient) {
      const importer = new FileImporter(docStoreClient, docstoreId);
      importer
        .initialize()
        .then(() => {
          setFileImporter(importer);
        })
        .catch((err) => {
          console.error("Error initializing FileImporter:", err);
          setError(
            err instanceof Error ? err.message : "Unknown error occurred"
          );
          onError(
            err instanceof Error ? err.message : "Unknown error occurred"
          );
        });
    }
  }, [docstoreId, docStoreClient, onError]);

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

  // Handle file selection
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || !fileImporter) return;

    setIsImporting(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Check if file is markdown or text
        if (!file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
          console.warn(
            `Skipping file ${file.name}: not a markdown or text file`
          );
          continue;
        }

        // Set current file and reset progress
        setCurrentImportFile(file.name);
        setImportProgress(0);

        // Read file content
        const content = await readFileContent(file);

        // Import file with progress callback
        const doc = await fileImporter.importFile(
          content,
          file.name,
          async (done, total) => {
            setImportProgress(Math.round((done / total) * 100));
            await new Promise((ok) => setTimeout(ok, 0));
          }
        );

        // Add to imported files list
        setImportedFiles((prev) => [
          ...prev,
          {
            id: doc.id,
            name: file.name,
            size: doc.data.length,
          },
        ]);
      }

      // Reset progress indicators when all files are processed
      setCurrentImportFile("");
      setImportProgress(0);
    } catch (err) {
      console.error("Error importing files:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      onError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsImporting(false);
    }
  };

  // Read file content as text
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          resolve(e.target.result as string);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle file delete
  const handleDeleteFile = (id: string) => {
    if (confirm("Are you sure you want to delete this file?")) {
      setImportedFiles((prev) => prev.filter((file) => file.id !== id));
    }
  };

  // Handle click on file drop area
  const handleFileAreaClick = () => {
    fileInputRef.current?.click();
  };

  // Handle icon generation
  const handleGenerateIcon = async () => {
    if (!nickname.trim()) {
      return;
    }

    try {
      const prompt = `${nickname} ${description ? `- ${description}` : ''}`.trim();
      const generatedIcon = await generateIcon(prompt);
      setPicture(generatedIcon);
    } catch (error) {
      console.error("Error generating icon:", error);
      // Error is already handled by the hook
    }
  };

  // Handle proceeding to document import step
  const handleProceedToDocuments = async () => {
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

      // If expert type is system_prompt, skip docstore creation and document upload
      if (expertType === "system_prompt") {
        // Skip directly to creating the expert
        await handleCreateBlankExpert();
        return;
      }

      // Create a docstore for the expert
      const newDocstoreId = await createDocstore();

      if (!newDocstoreId) {
        throw new Error("Failed to create docstore");
      }

      setDocstoreId(newDocstoreId);
      setCurrentStep(BlankExpertStep.DOCUMENTS);
    } catch (err) {
      console.error("Error creating docstore:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      onError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setCreatingExpert(false);
    }
  };

  // Handle creating a blank expert
  const handleCreateBlankExpert = async () => {
    if (!dbClient) {
      setError("DB client not available");
      onError("DB client not available");
      return;
    }

    try {
      setCreatingExpert(true);
      setError(null);

      // Create a new wallet for the expert
      const walletData = {
        name: `Wallet for expert ${nickname}`,
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
        docstores: expertType === "system_prompt" ? "" : docstoreId,
        disabled: false,
        user_id: await dbClient.getUserId(),
        type: expertType,
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

      // Notify parent component that we're waiting for the expert
      onWaiting(expertPubkey);

      await waitNewExpert(
        expertPubkey,
        discoveryRelays ? discoveryRelays.split(" ") : undefined
      );

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

  // Render content based on the current step
  const renderContent = () => {
    switch (currentStep) {
      case BlankExpertStep.DETAILS:
        return (
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
              <div className="flex items-center space-x-3">
                {/* Image preview */}
                <div className="flex-shrink-0">
                  {picture ? (
                    <img
                      src={picture}
                      alt="Expert picture preview"
                      className="w-12 h-12 rounded-full object-cover border border-gray-300"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
                
                {/* Input field */}
                <div className="flex-1">
                  <input
                    type="text"
                    id="picture"
                    value={picture}
                    onChange={(e) => setPicture(e.target.value)}
                    placeholder="Enter picture URL"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {/* Generate icon button */}
                <button
                  type="button"
                  onClick={handleGenerateIcon}
                  disabled={generatingIcon || !nickname.trim()}
                  className="flex-shrink-0 p-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Generate icon with AI"
                >
                  {generatingIcon ? (
                    <svg
                      className="animate-spin h-5 w-5 text-gray-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              
              {iconGenerationError && (
                <p className="mt-1 text-sm text-red-600">{iconGenerationError}</p>
              )}
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
                    checked={expertType === "rag"}
                    onChange={() => setExpertType("rag")}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="rag"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    RAG (Retrieval Augmented Generation with documents)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="system_prompt"
                    name="expertType"
                    type="radio"
                    checked={expertType === "system_prompt"}
                    onChange={() => setExpertType("system_prompt")}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="system_prompt"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    System Prompt (No document retrieval)
                  </label>
                </div>
              </div>
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
                disabled={creatingExpert}
                className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                  creatingExpert
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Back
              </button>
              <button
                onClick={handleProceedToDocuments}
                disabled={!nickname.trim() || creatingExpert}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                  !nickname.trim() || creatingExpert
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {creatingExpert
                  ? "Creating..."
                  : expertType === "system_prompt"
                  ? "Create"
                  : "Next"}
              </button>
            </div>
          </div>
        );

      case BlankExpertStep.DOCUMENTS:
        return (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Add Documents
              </h3>
              <p className="text-sm text-gray-600">
                Select or drop markdown (.md) or text (.txt) files to add to
                your expert.
              </p>
            </div>

            {/* File drop area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleFileAreaClick}
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileInputChange}
                multiple
                accept=".md,.txt"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {isImporting && currentImportFile ? (
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    Importing file: {currentImportFile}: {importProgress}%
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${importProgress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-600">
                  {isImporting
                    ? "Importing files..."
                    : "Drag and drop files here, or click to select files"}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Only .md and .txt files are supported
              </p>
            </div>

            {/* Imported files list */}
            {importedFiles.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Imported Files ({importedFiles.length})
                </h4>
                <div className="border rounded-lg divide-y">
                  {importedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3"
                    >
                      <div className="flex items-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-gray-400 mr-2"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-gray-700">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Size: {file.size} characters
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between space-x-2 pt-4">
              <button
                onClick={() => setCurrentStep(BlankExpertStep.DETAILS)}
                disabled={isImporting || creatingExpert}
                className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                  isImporting || creatingExpert
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Back
              </button>
              <button
                onClick={handleCreateBlankExpert}
                disabled={isImporting || creatingExpert}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                  isImporting || creatingExpert
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {creatingExpert ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}

      {renderContent()}
    </>
  );
}
