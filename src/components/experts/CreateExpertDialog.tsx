"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Dialog from "../ui/Dialog";
import { useDBClient } from "../../hooks/useDBClient";
import { useDocStoreClient } from "../../hooks/useDocStoreClient";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils";
import { extractHashtags, Nostr } from "askexperts/experts";
import { SimplePool } from "nostr-tools";
import { importNostrPosts, waitNewExpert } from "../../utils/nostrImport";
import { DBExpert } from "askexperts/db";
import { LightningPaymentManager } from "askexperts/payments";
import { createOpenAI } from "askexperts/openai";
import { useDefaultWalletBalance } from "../../hooks/useDefaultWalletBalance";

const MAX_POSTS = 5000;
const pool = new SimplePool();

// Define the steps in the expert creation process
enum CreateExpertStep {
  SELECT_TEMPLATE = "select_template",
  NOSTR_DATA_IMPORT = "nostr_data_import",
  HASHTAG_INPUT = "hashtag_input",
  BLANK_FORM = "blank_form",
  CONGRATULATIONS = "congratulations",
}

// Define the template options
enum TemplateType {
  NOSTR = "nostr",
  BLANK = "blank",
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

// Define the NostrEvent interface
interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

interface CreateExpertDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateExpertDialog({
  isOpen,
  onClose,
}: CreateExpertDialogProps) {
  const router = useRouter();
  const { client: dbClient, loading: dbLoading } = useDBClient();
  const { client: docStoreClient, loading: docStoreLoading } =
    useDocStoreClient();
  const { wallet } = useDefaultWalletBalance();

  // State for the multi-step dialog
  const [currentStep, setCurrentStep] = useState<CreateExpertStep>(
    CreateExpertStep.SELECT_TEMPLATE
  );
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(
    null
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
  const [expertPubkey, setExpertPubkey] = useState("");
  const [expertPrivkey, setExpertPrivkey] = useState("");
  const [docstoreId, setDocstoreId] = useState("");
  const [creatingExpert, setCreatingExpert] = useState(false);
  const [waitingForExpert, setWaitingForExpert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for blank form
  const [nickname, setNickname] = useState("");
  const [description, setDescription] = useState("");
  const [picture, setPicture] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [model, setModel] = useState("openai/gpt-4.1");
  const [temperature, setTemperature] = useState("0.2");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [discoveryHashtags, setDiscoveryHashtags] = useState("");
  const [discoveryRelays, setDiscoveryRelays] = useState("");
  const [promptRelays, setPromptRelays] = useState("");
  const [priceMargin, setPriceMargin] = useState("0.1");

  // Reset the dialog state when it's opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(CreateExpertStep.SELECT_TEMPLATE);
      setSelectedTemplate(null);
      setNostrPubkey("");
      setNostrProfile(null);
      setFetchingProfile(false);
      setImportingData(false);
      setImportProgress(0);
      setImportStatus("");
      setImportedPosts([]);
      setImportedPostCount(0);
      setExpertPubkey("");
      setExpertPrivkey("");
      setDocstoreId("");
      setCreatingExpert(false);
      setError(null);
      setNickname("");
      setDescription("");
      setPicture("");
      setHashtags("");
      setModel("openai/gpt-4.1");
      setTemperature("0.2");
      setSystemPrompt("");
      setDiscoveryHashtags("");
      setDiscoveryRelays("");
      setPromptRelays("");
      setPriceMargin("0.1");
      setSuggestingHashtags(false);
      setWaitingForExpert(false);
    }
  }, [isOpen]);

  // Generate a new keypair for the expert when needed
  useEffect(() => {
    if (
      (currentStep === CreateExpertStep.NOSTR_DATA_IMPORT && nostrProfile) ||
      (currentStep === CreateExpertStep.BLANK_FORM && !expertPubkey)
    ) {
      const privkey = generateSecretKey();
      const privkeyHex = bytesToHex(privkey);
      const pubkeyHex = getPublicKey(privkey);

      setExpertPubkey(pubkeyHex);
      setExpertPrivkey(privkeyHex);
    }
  }, [currentStep, nostrProfile]);

  // Handle template selection
  const handleTemplateSelect = (template: TemplateType) => {
    setSelectedTemplate(template);

    if (template === TemplateType.NOSTR) {
      setCurrentStep(CreateExpertStep.NOSTR_DATA_IMPORT);
    } else {
      setCurrentStep(CreateExpertStep.BLANK_FORM);
    }
  };

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

        // Set form values from profile
        if (profile.profile?.name) {
          setNickname(`${profile.profile.name} clone`);
        }

        if (profile.profile?.about) {
          setDescription(`Clone of ${profile.profile.name}`);
        }

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
    } finally {
      setFetchingProfile(false);
    }
  };
  
  // Fetch profile stats from nostr.band API
  const fetchProfileStats = async (pubkey: string) => {
    try {
      const response = await fetch(`https://api.nostr.band/v0/stats/profile/${pubkey}`);
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
      return null;
    }
  };

  // Import Nostr data
  const handleImportNostr = async () => {
    if (!nostrProfile || !docStoreClient) {
      setError("Profile not found or DocStore client not available");
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
      setCurrentStep(CreateExpertStep.HASHTAG_INPUT);
      setImportingData(false);
    } catch (err) {
      console.error("Error importing Nostr data:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      setImportingData(false);
    }
  };

  // Suggest hashtags based on imported posts
  const suggestHashtags = async (posts?: Post[]) => {
    if (!posts) posts = importedPosts;

    if (!wallet?.nwc || posts.length === 0) {
      setError("Default wallet not available or no posts imported");
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
      setHashtags(suggestedTags.join(" "));
      setDiscoveryHashtags(suggestedTags.join(" "));
    } catch (err) {
      console.error("Error suggesting hashtags:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setSuggestingHashtags(false);
    }
  };

  // Create the expert
  const createExpert = async () => {
    if (!dbClient) {
      setError("DB client not available");
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
        env: `NOSTR_PUBKEY=${nostrPubkey}`,
        disabled: false,
        user_id: await dbClient.getUserId(),
        type: "nostr",
        wallet_id: walletId,
        model: "openai/gpt-4.1", // Default
        price_margin: "0.1", // Default
        hashtags: hashtags,
        temperature: temperature,
        discovery_hashtags: discoveryHashtags,
        discovery_relays: discoveryRelays,
        prompt_relays: promptRelays,
        system_prompt: `You will be given a person's profile in json format below. Also, for every user's message a relevant
selection of person's posts will be prepended to user message in this format:
'
### CONTEXT
[<person's posts>]
### Message
<user message>
'
Act like you are that person - when users talk to you, look through the person's profile and posts and reply as if you were that person, preserve their unique style, their opinions and their preferences.

${JSON.stringify(nostrProfile?.profile || {})}`,
      };

      await dbClient.insertExpert(expertData);
      
      // Wait for the expert to start
      setCreatingExpert(false);
      setWaitingForExpert(true);
      setImportStatus("Waiting for expert to start...");
      
      await waitNewExpert(expertPubkey, discoveryRelays ? discoveryRelays.split(" ") : undefined);
      
      // Move to the congratulations step
      setCurrentStep(CreateExpertStep.CONGRATULATIONS);
    } catch (err) {
      console.error("Error creating expert:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setCreatingExpert(false);
      setWaitingForExpert(false);
    }
  };

  // Handle creating a blank expert
  const handleCreateBlankExpert = async () => {
    if (!dbClient) {
      setError("DB client not available");
      return;
    }

    if (!nickname.trim()) {
      setError("Expert nickname is required");
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
      setImportStatus("Waiting for expert to start...");
      
      await waitNewExpert(expertPubkey, discoveryRelays ? discoveryRelays.split(" ") : undefined);

      // Move to the congratulations step
      setCurrentStep(CreateExpertStep.CONGRATULATIONS);
    } catch (err) {
      console.error("Error creating expert:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setCreatingExpert(false);
      setWaitingForExpert(false);
    }
  };

  // Handle dialog close
  const handleClose = () => {
    // If we're importing data, don't allow closing
    if (importingData) return;

    onClose();
  };

  // Render the dialog title based on the current step
  const renderDialogTitle = () => {
    switch (currentStep) {
      case CreateExpertStep.SELECT_TEMPLATE:
        return "Create Expert - Select Template";
      case CreateExpertStep.NOSTR_DATA_IMPORT:
        return "Create Expert - Nostr Data Import";
      case CreateExpertStep.HASHTAG_INPUT:
        return "Create Expert - Hashtags";
      case CreateExpertStep.BLANK_FORM:
        return "Create Expert - Details";
      case CreateExpertStep.CONGRATULATIONS:
        return "Expert Created";
      default:
        return "Create Expert";
    }
  };

  // Render the dialog content based on the current step
  const renderDialogContent = () => {
    switch (currentStep) {
      case CreateExpertStep.SELECT_TEMPLATE:
        return (
          <div className="space-y-4">
            <p className="text-gray-600">
              Select a template to create your expert:
            </p>

            <div
              className={`p-4 border rounded-lg cursor-pointer flex items-center ${
                selectedTemplate === TemplateType.NOSTR
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => handleTemplateSelect(TemplateType.NOSTR)}
            >
              <div className="flex-shrink-0 mr-4">
                <Image
                  src="/nostr.png"
                  alt="Nostr"
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              </div>
              <div>
                <h3 className="font-medium">Nostr</h3>
                <p className="text-sm text-gray-500">
                  Import data from a Nostr profile
                </p>
              </div>
            </div>

            <div
              className={`p-4 border rounded-lg cursor-pointer flex items-center ${
                selectedTemplate === TemplateType.BLANK
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:bg-gray-50"
              }`}
              onClick={() => handleTemplateSelect(TemplateType.BLANK)}
            >
              <div className="flex-shrink-0 mr-4 w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Blank</h3>
                <p className="text-sm text-gray-500">
                  Create an expert from scratch
                </p>
              </div>
            </div>
          </div>
        );

      case CreateExpertStep.NOSTR_DATA_IMPORT:
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
                    {profilePostCount > 0 ? `Import ${profilePostCount} posts` : "Import"}
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

      case CreateExpertStep.HASHTAG_INPUT:
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
                Hashtags help users discover your expert. Example: #ai #nostr
                #bitcoin
              </p>
            </div>

            <div className="mt-4">
              {waitingForExpert ? (
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

      case CreateExpertStep.BLANK_FORM:
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
          </div>
        );

      case CreateExpertStep.CONGRATULATIONS:
        return (
          <div className="text-center py-8">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Congratulations!
            </h3>
            <p className="text-gray-600 mb-6">Your expert is ready to use.</p>
            <button
              onClick={() => router.push(`/experts/${expertPubkey}`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try it
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // Render the dialog footer based on the current step
  const renderDialogFooter = () => {
    switch (currentStep) {
      case CreateExpertStep.SELECT_TEMPLATE:
        return (
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        );

      case CreateExpertStep.NOSTR_DATA_IMPORT:
        return (
          <div className="flex justify-between space-x-2">
            <button
              onClick={() => setCurrentStep(CreateExpertStep.SELECT_TEMPLATE)}
              disabled={importingData}
              className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                importingData
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Back
            </button>
            <button
              onClick={handleClose}
              disabled={importingData}
              className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                importingData
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
          </div>
        );

      case CreateExpertStep.HASHTAG_INPUT:
        return (
          <div className="flex justify-between space-x-2">
            <button
              onClick={() => setCurrentStep(CreateExpertStep.NOSTR_DATA_IMPORT)}
              disabled={suggestingHashtags || waitingForExpert}
              className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                suggestingHashtags
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Back
            </button>
            <button
              onClick={handleClose}
              disabled={suggestingHashtags || waitingForExpert}
              className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                suggestingHashtags
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Cancel
            </button>
          </div>
        );

      case CreateExpertStep.BLANK_FORM:
        return (
          <div className="flex justify-between space-x-2">
            <button
              onClick={() => setCurrentStep(CreateExpertStep.SELECT_TEMPLATE)}
              disabled={creatingExpert}
              className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                creatingExpert
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Back
            </button>
            <div className="flex space-x-2">
              <button
                onClick={handleClose}
                disabled={creatingExpert}
                className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
                  creatingExpert
                    ? "text-gray-400 cursor-not-allowed"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBlankExpert}
                disabled={!nickname.trim() || creatingExpert}
                className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                  !nickname.trim() || creatingExpert
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {creatingExpert ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        );

      case CreateExpertStep.CONGRATULATIONS:
        return (
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={renderDialogTitle()}
      footer={renderDialogFooter()}
    >
      {error && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded-md">
          {error}
        </div>
      )}

      {renderDialogContent()}
    </Dialog>
  );
}
