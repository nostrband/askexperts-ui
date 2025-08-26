"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDBClient } from "../../hooks/useDBClient";
import { useDocStoreClient } from "../../hooks/useDocStoreClient";
import { SimplePool } from "nostr-tools";
import { extractHashtags, Nostr, Prompts } from "askexperts/experts";
import { importNostrPosts } from "../../utils/nostrImport";
import { DBExpert } from "askexperts/db";
import { LightningPaymentManager } from "askexperts/payments";
import { createOpenAI } from "askexperts/openai";
import { useDefaultWalletBalance } from "../../hooks/useDefaultWalletBalance";
import { waitNewExpert } from "@/src/utils/nostr";
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE } from "@/src/utils/const";

const MAX_POSTS = 5000;
const pool = new SimplePool();

// Define the steps in the Nostr expert creation process
enum NostrExpertStep {
  NOSTR_DATA_IMPORT = "nostr_data_import",
  HASHTAG_INPUT = "hashtag_input",
  CONGRATULATIONS = "congratulations",
}

// Define the ProfileInfo interface for Nostr.fetchProfile result
interface ProfileInfo {
  profile?: {
    name?: string;
    picture?: string;
    about?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Define the Post interface
interface Post {
  content: string;
  [key: string]: any;
}

interface NostrExpertCreatorProps {
  expertPubkey: string;
  expertPrivkey: string;
  onComplete: (pubkey: string) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

export default function NostrExpertCreator({
  expertPubkey,
  expertPrivkey,
  onComplete,
  onBack,
  onError,
}: NostrExpertCreatorProps) {
  const router = useRouter();
  const { client: dbClient, loading: dbLoading } = useDBClient();
  const { client: docStoreClient, loading: docStoreLoading } =
    useDocStoreClient();
  const { wallet } = useDefaultWalletBalance();

  // State for the multi-step flow
  const [currentStep, setCurrentStep] = useState<NostrExpertStep>(
    NostrExpertStep.NOSTR_DATA_IMPORT
  );

  // State for Nostr import
  const [nostrPubkey, setNostrPubkey] = useState("");
  const [nostrProfile, setNostrProfile] = useState<ProfileInfo | null>(null);
  const [fetchingProfile, setFetchingProfile] = useState(false);
  const [importingData, setImportingData] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importedPosts, setImportedPosts] = useState<Post[]>([]);
  const [importedPostCount, setImportedPostCount] = useState(0);
  const [suggestingHashtags, setSuggestingHashtags] = useState(false);
  const [profilePostCount, setProfilePostCount] = useState(0);

  // State for expert creation
  const [docstoreId, setDocstoreId] = useState("");
  const [creatingExpert, setCreatingExpert] = useState(false);
  const [waitingForExpert, setWaitingForExpert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for form fields
  const [picture, setPicture] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [discoveryHashtags, setDiscoveryHashtags] = useState("");

  // Reset error when step changes
  useEffect(() => {
    setError(null);
  }, [currentStep]);

  // Fetch Nostr profile
  const fetchNostrProfile = async () => {
    if (!nostrPubkey.trim()) {
      setError("Please enter a Nostr pubkey");
      return;
    }

    try {
      setFetchingProfile(true);
      setError(null);

      // Create a new pool and Nostr instance
      const nostr = new Nostr(pool);

      // Fetch the profile
      const profile = await nostr.fetchProfile(nostrPubkey.trim());

      // Clean up pool connections
      pool.destroy();

      if (profile) {
        setNostrProfile(profile);

        if (profile.profile?.picture) {
          setPicture(profile.profile.picture);
        }

        // Fetch post count from nostr.band API
        fetchProfileStats(nostrPubkey.trim());
      } else {
        setError("Profile not found");
      }
    } catch (err) {
      console.error("Error fetching Nostr profile:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      onError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setFetchingProfile(false);
    }
  };

  // Fetch profile stats from nostr.band API
  const fetchProfileStats = async (pubkey: string) => {
    try {
      const response = await fetch(
        `https://api.nostr.band/v0/stats/profile/${pubkey}`
      );
      const data = await response.json();

      if (data && data.stats?.[pubkey].pub_note_count) {
        const count = Math.min(MAX_POSTS, data.stats?.[pubkey].pub_note_count);
        setProfilePostCount(count);
      }
    } catch (err) {
      console.error("Error fetching profile stats:", err);
      // Don't set error state here, as this is a non-critical feature
    }
  };

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

  // Import Nostr data
  const handleImportNostr = async () => {
    if (!nostrProfile || !docStoreClient) {
      setError("Profile not found or DocStore client not available");
      onError("Profile not found or DocStore client not available");
      return;
    }

    try {
      setImportingData(true);
      setError(null);

      // Create a docstore for the expert
      const newDocstoreId = await createDocstore();

      if (!newDocstoreId) {
        throw new Error("Failed to create docstore");
      }

      setDocstoreId(newDocstoreId);

      // Use the importNostrPosts utility function
      const result = await importNostrPosts({
        docstoreClient: docStoreClient,
        docstoreId: newDocstoreId,
        pubkey: nostrPubkey.trim(),
        limit: profilePostCount > 0 ? profilePostCount : MAX_POSTS,
        onProgress: (progress, status) => {
          setImportProgress(progress);
          setImportStatus(status);
        },
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      // Store the imported posts count
      setImportedPostCount(result.count || 0);

      // Map events to posts for hashtag extraction
      if (result.events) {
        setImportedPosts(
          result.events.map((event) => ({ content: event.content || "" }))
        );
      }

      // Move to the hashtag input screen
      setCurrentStep(NostrExpertStep.HASHTAG_INPUT);
      setImportingData(false);
    } catch (err) {
      console.error("Error importing Nostr data:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      onError(err instanceof Error ? err.message : "Unknown error occurred");
      setImportingData(false);
    }
  };

  // Suggest hashtags based on imported posts
  const suggestHashtags = async (posts?: Post[]) => {
    if (!posts) posts = importedPosts;

    if (!wallet?.nwc || posts.length === 0) {
      setError("Default wallet not available or no posts imported");
      onError("Default wallet not available or no posts imported");
      return;
    }

    try {
      setSuggestingHashtags(true);
      setError(null);

      // Create LightningPaymentManager
      const paymentManager = new LightningPaymentManager(wallet.nwc);

      // Create OpenAI instance
      const openai = createOpenAI({
        paymentManager,
        pool,
      });

      // Extract hashtags
      const suggestedTags = await extractHashtags(
        openai,
        "openai/gpt-oss-20b",
        nostrProfile,
        posts
      );
      console.log("suggestedTags", suggestedTags);

      // Set the suggested hashtags
      setHashtags(suggestedTags.join(", "));
      setDiscoveryHashtags(suggestedTags.join(", "));
    } catch (err) {
      console.error("Error suggesting hashtags:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      onError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setSuggestingHashtags(false);
    }
  };

  // Create the expert
  const createExpert = async () => {
    if (!dbClient) {
      setError("DB client not available");
      onError("DB client not available");
      return;
    }

    try {
      setCreatingExpert(true);
      setError(null);

      // Use profile name or pubkey
      const nostrName =
        nostrProfile?.profile?.name || nostrPubkey.substring(0, 8);
      const expertName = `${nostrName} clone`;

      // Create a new wallet for the expert
      const walletId = await dbClient.insertWallet({
        name: `Wallet for expert ${expertName}`,
        user_id: await dbClient.getUserId(),
        nwc: "", // Leave empty to be generated by the server
        default: false,
      });

      // Create the expert
      const expertData: DBExpert = {
        nickname: expertName,
        pubkey: expertPubkey,
        privkey: expertPrivkey,
        description: `I am imitating '${nostrName}' pubkey ${nostrPubkey}, ask me questions and I can answer like them. Profile description of '${nostrName}': ${
          nostrProfile?.profile?.about || "-"
        }`,
        picture: nostrProfile?.profile?.picture || picture,
        docstores: docstoreId,
        disabled: false,
        user_id: await dbClient.getUserId(),
        type: "rag",
        wallet_id: walletId,
        model: DEFAULT_MODEL, // Default
        price_margin: "0.1", // Default
        hashtags: hashtags,
        temperature: DEFAULT_TEMPERATURE,
        discovery_hashtags: discoveryHashtags,
        system_prompt:
          Prompts.nostrCloneSystemPrompt() +
          JSON.stringify(nostrProfile?.profile || {}),
      };

      await dbClient.insertExpert(expertData);

      // Wait for the expert to start
      setCreatingExpert(false);
      setWaitingForExpert(true);
      setImportStatus("Waiting for expert to start...");

      await waitNewExpert(expertPubkey);

      // Move to the congratulations step
      setCurrentStep(NostrExpertStep.CONGRATULATIONS);
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
      case NostrExpertStep.NOSTR_DATA_IMPORT:
        return (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="nostr-pubkey"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nostr Pubkey
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="nostr-pubkey"
                  value={nostrPubkey}
                  onChange={(e) => setNostrPubkey(e.target.value)}
                  placeholder="Enter Nostr pubkey"
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={fetchingProfile || importingData}
                />
                <button
                  onClick={fetchNostrProfile}
                  disabled={
                    !nostrPubkey.trim() || fetchingProfile || importingData
                  }
                  className={`px-4 py-2 rounded-r-md text-white ${
                    !nostrPubkey.trim() || fetchingProfile || importingData
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {fetchingProfile ? "Fetching..." : "Verify"}
                </button>
              </div>
            </div>

            {fetchingProfile && (
              <div className="text-center py-4">
                <p className="text-gray-600">Fetching profile...</p>
              </div>
            )}

            {nostrProfile && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-4">
                  {nostrProfile.profile?.picture ? (
                    <Image
                      src={nostrProfile.profile.picture}
                      alt={nostrProfile.profile?.name || "Profile"}
                      width={64}
                      height={64}
                      className="rounded-full mr-4"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full mr-4 flex items-center justify-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-gray-500"
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
                  <div>
                    <h3 className="font-medium">
                      {nostrProfile.profile?.name || "Unnamed Profile"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {nostrPubkey.substring(0, 8)}...
                    </p>
                  </div>
                </div>

                {nostrProfile.profile?.about && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      {nostrProfile.profile.about}
                    </p>
                  </div>
                )}

                {!importingData ? (
                  <button
                    onClick={handleImportNostr}
                    className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    {profilePostCount > 0
                      ? `Import ${profilePostCount} posts`
                      : "Import"}
                  </button>
                ) : (
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${importProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{importStatus}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case NostrExpertStep.HASHTAG_INPUT:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-500 mr-2"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <h3 className="font-medium text-green-800">Import Finished!</h3>
              </div>
              <p className="text-sm text-green-700">
                Successfully imported {importedPostCount} posts.
              </p>
            </div>

            <div>
              <label
                htmlFor="discovery-hashtags"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Enter hashtags for expert discovery
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="discovery-hashtags"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="Enter hashtags"
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  readOnly={suggestingHashtags}
                />
                <button
                  onClick={() => suggestHashtags()}
                  disabled={suggestingHashtags}
                  className={`px-4 py-2 rounded-r-md text-white ${
                    suggestingHashtags
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {suggestingHashtags ? "Suggesting..." : "Suggest"}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Hashtags help users discover your expert. Example: ai, nostr,
                bitcoin
              </p>
            </div>

            <div className="mt-4">
              {waitingForExpert ? (
                <div className="text-center py-4">
                  <div className="flex items-center justify-center mb-2">
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
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
                    <span className="text-blue-600">
                      Waiting for expert to start...
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full w-full animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={createExpert}
                  disabled={!hashtags.trim() || creatingExpert}
                  className={`w-full px-4 py-2 rounded-md text-white ${
                    !hashtags.trim() || creatingExpert
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {creatingExpert ? "Creating..." : "Create Expert"}
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render the footer based on the current step
  const renderFooter = () => {
    switch (currentStep) {
      case NostrExpertStep.NOSTR_DATA_IMPORT:
        return (
          <div className="flex justify-between space-x-2">
            <button
              onClick={onBack}
              disabled={importingData}
              className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                importingData
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Back
            </button>
          </div>
        );

      case NostrExpertStep.HASHTAG_INPUT:
        return (
          <div className="flex justify-between space-x-2">
            <button
              onClick={() => setCurrentStep(NostrExpertStep.NOSTR_DATA_IMPORT)}
              disabled={suggestingHashtags || waitingForExpert}
              className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                suggestingHashtags || waitingForExpert
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Back
            </button>
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
