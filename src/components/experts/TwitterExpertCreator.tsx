"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useDBClient } from "../../hooks/useDBClient";
import { useDocStoreClient } from "../../hooks/useDocStoreClient";
import { extractHashtags, Prompts } from "askexperts/experts";
import {
  parseTwitterArchive,
  parseTwitterAccount,
  parseTwitterProfile,
  extractTwitterProfileInfo,
  TwitterProfileInfo,
  importTwitterPosts
} from "../../utils/twitterImport";
import { DBExpert } from "askexperts/db";
import { LightningPaymentManager } from "askexperts/payments";
import { createOpenAI } from "askexperts/openai";
import { useDefaultWalletBalance } from "../../hooks/useDefaultWalletBalance";
import { waitNewExpert } from "@/src/utils/nostr";
import { DEFAULT_MODEL, DEFAULT_TEMPERATURE } from "@/src/utils/const";
import { SimplePool } from "nostr-tools";

const pool = new SimplePool();

// Define the steps in the Twitter expert creation process
enum TwitterExpertStep {
  TWITTER_DATA_IMPORT = "twitter_data_import",
  HASHTAG_INPUT = "hashtag_input",
  CONGRATULATIONS = "congratulations",
}

// Define the Tweet interface
interface Tweet {
  full_text?: string;
  text?: string;
  [key: string]: any;
}

interface TwitterExpertCreatorProps {
  expertPubkey: string;
  expertPrivkey: string;
  onComplete: (pubkey: string) => void;
  onWaiting: (pubkey: string) => void;
  onBack: () => void;
  onError: (error: string) => void;
}

export default function TwitterExpertCreator({
  expertPubkey,
  expertPrivkey,
  onComplete,
  onWaiting,
  onBack,
  onError,
}: TwitterExpertCreatorProps) {
  const router = useRouter();
  const { client: dbClient, loading: dbLoading } = useDBClient();
  const { client: docStoreClient, loading: docStoreLoading } =
    useDocStoreClient();
  const { wallet } = useDefaultWalletBalance();
  const tweetsFileInputRef = useRef<HTMLInputElement>(null);
  const accountFileInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);

  // State for the multi-step flow
  const [currentStep, setCurrentStep] = useState<TwitterExpertStep>(
    TwitterExpertStep.TWITTER_DATA_IMPORT
  );

  // State for Twitter import
  const [tweetsFile, setTweetsFile] = useState<File | null>(null);
  const [accountFile, setAccountFile] = useState<File | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profileInfo, setProfileInfo] = useState<TwitterProfileInfo>({});
  const [importingData, setImportingData] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStatus, setImportStatus] = useState("");
  const [importedTweets, setImportedTweets] = useState<Tweet[]>([]);
  const [importedTweetCount, setImportedTweetCount] = useState(0);
  const [suggestingHashtags, setSuggestingHashtags] = useState(false);

  // State for expert creation
  const [docstoreId, setDocstoreId] = useState("");
  const [creatingExpert, setCreatingExpert] = useState(false);
  const [waitingForExpert, setWaitingForExpert] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for form fields
  const [hashtags, setHashtags] = useState("");
  const [discoveryHashtags, setDiscoveryHashtags] = useState("");

  // Reset error when step changes
  useEffect(() => {
    setError(null);
  }, [currentStep]);

  // Handle tweets.js file selection
  const handleTweetsFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name === "tweets.js" || file.name.endsWith(".js")) {
        setTweetsFile(file);
        setError(null);
      } else {
        setError("Please select the tweets.js file from your Twitter archive");
        setTweetsFile(null);
      }
    }
  };

  // Handle account.js file selection
  const handleAccountFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name === "account.js" || file.name.endsWith(".js")) {
        setAccountFile(file);
        setError(null);
      } else {
        setError("Please select the account.js file from your Twitter archive");
        setAccountFile(null);
      }
    }
  };

  // Handle profile.js file selection
  const handleProfileFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (file.name === "profile.js" || file.name.endsWith(".js")) {
        setProfileFile(file);
        setError(null);
      } else {
        setError("Please select the profile.js file from your Twitter archive");
        setProfileFile(null);
      }
    }
  };

  // Trigger file input clicks
  const handleTweetsBrowseClick = () => {
    tweetsFileInputRef.current?.click();
  };

  const handleAccountBrowseClick = () => {
    accountFileInputRef.current?.click();
  };

  const handleProfileBrowseClick = () => {
    profileFileInputRef.current?.click();
  };

  // Read file content
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

  // Check if all required files are selected
  const areAllFilesSelected = () => {
    return tweetsFile && accountFile && profileFile;
  };

  // Import Twitter data
  const handleImportTwitter = async () => {
    if (!areAllFilesSelected() || !docStoreClient) {
      setError("Please select all required files (tweets.js, account.js, profile.js) or DocStore client not available");
      onError("Please select all required files (tweets.js, account.js, profile.js) or DocStore client not available");
      return;
    }

    try {
      setImportingData(true);
      setError(null);

      // Read file contents
      const tweetsContent = await readFileContent(tweetsFile!);
      const accountContent = await readFileContent(accountFile!);
      const profileContent = await readFileContent(profileFile!);
      
      // Parse Twitter archive files
      const tweets = parseTwitterArchive(tweetsContent);
      const accountData = parseTwitterAccount(accountContent);
      const profileData = parseTwitterProfile(profileContent);
      
      // Extract profile information
      const extractedProfileInfo = extractTwitterProfileInfo(accountData, profileData);
      setProfileInfo(extractedProfileInfo);

      // Create a docstore for the expert
      const newDocstoreId = await createDocstore();

      if (!newDocstoreId) {
        throw new Error("Failed to create docstore");
      }

      setDocstoreId(newDocstoreId);

      // Use the importTwitterPosts utility function
      const result = await importTwitterPosts({
        docstoreClient: docStoreClient,
        docstoreId: newDocstoreId,
        tweets: tweets,
        onProgress: (progress, status) => {
          setImportProgress(progress);
          setImportStatus(status);
        },
      });

      if (!result.success) {
        throw new Error(result.message);
      }

      // Store the imported tweets count
      setImportedTweetCount(result.count || 0);
      
      // Store tweets for hashtag extraction
      setImportedTweets(tweets);

      // Move to the hashtag input screen
      setCurrentStep(TwitterExpertStep.HASHTAG_INPUT);
      setImportingData(false);
    } catch (err) {
      console.error("Error importing Twitter data:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
      onError(err instanceof Error ? err.message : "Unknown error occurred");
      setImportingData(false);
    }
  };

  // Suggest hashtags based on imported tweets
  const suggestHashtags = async () => {
    if (!wallet?.nwc || importedTweets.length === 0) {
      setError("Default wallet not available or no tweets imported");
      onError("Default wallet not available or no tweets imported");
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

      // Convert tweets to format expected by extractHashtags
      const posts = importedTweets.map(tweet => ({
        content: tweet.full_text || tweet.text || "",
      }));

      // Create a profile object
      const profile = {
        profile: {
          name: profileInfo.displayName || profileInfo.username,
          about: profileInfo.bio,
        }
      };

      // Extract hashtags
      const suggestedTags = await extractHashtags(
        openai,
        "openai/gpt-oss-20b",
        profile,
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

      // Use profile name or default
      const expertName = `${profileInfo.displayName || profileInfo.username || "Twitter User"} clone`;

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
        description: `I am imitating Twitter user '${profileInfo.username || "Unknown"}'. Ask me questions and I can answer like them. Profile description: ${profileInfo.bio || "-"}`,
        picture: profileInfo.avatarUrl || "",
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
          JSON.stringify({
            name: profileInfo.displayName || profileInfo.username,
            about: profileInfo.bio,
            twitter_username: profileInfo.username
          }),
      };

      await dbClient.insertExpert(expertData);

      // Wait for the expert to start
      setCreatingExpert(false);
      setWaitingForExpert(true);
      setImportStatus("Waiting for expert to start...");
      
      // Notify parent component that we're waiting for the expert
      onWaiting(expertPubkey);

      await waitNewExpert(expertPubkey);

      // Move to the congratulations step
      setCurrentStep(TwitterExpertStep.CONGRATULATIONS);
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
      case TwitterExpertStep.TWITTER_DATA_IMPORT:
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                Please select all three required files from your Twitter archive: tweets.js, account.js, and profile.js.
                You can download your Twitter archive from Twitter settings.
              </p>
            </div>

            {/* Tweets.js file selection */}
            <div className="mb-4">
              <label
                htmlFor="tweets-file"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                tweets.js File
              </label>
              <div className="flex">
                <input
                  type="file"
                  id="tweets-file"
                  ref={tweetsFileInputRef}
                  onChange={handleTweetsFileSelect}
                  className="hidden"
                  accept=".js"
                />
                <input
                  type="text"
                  value={tweetsFile?.name || ""}
                  readOnly
                  placeholder="Select tweets.js file"
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={importingData}
                />
                <button
                  onClick={handleTweetsBrowseClick}
                  disabled={importingData}
                  className={`px-4 py-2 rounded-r-md text-white ${
                    importingData
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Browse
                </button>
              </div>
            </div>

            {/* Account.js file selection */}
            <div className="mb-4">
              <label
                htmlFor="account-file"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                account.js File
              </label>
              <div className="flex">
                <input
                  type="file"
                  id="account-file"
                  ref={accountFileInputRef}
                  onChange={handleAccountFileSelect}
                  className="hidden"
                  accept=".js"
                />
                <input
                  type="text"
                  value={accountFile?.name || ""}
                  readOnly
                  placeholder="Select account.js file"
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={importingData}
                />
                <button
                  onClick={handleAccountBrowseClick}
                  disabled={importingData}
                  className={`px-4 py-2 rounded-r-md text-white ${
                    importingData
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Browse
                </button>
              </div>
            </div>

            {/* Profile.js file selection */}
            <div className="mb-4">
              <label
                htmlFor="profile-file"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                profile.js File
              </label>
              <div className="flex">
                <input
                  type="file"
                  id="profile-file"
                  ref={profileFileInputRef}
                  onChange={handleProfileFileSelect}
                  className="hidden"
                  accept=".js"
                />
                <input
                  type="text"
                  value={profileFile?.name || ""}
                  readOnly
                  placeholder="Select profile.js file"
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={importingData}
                />
                <button
                  onClick={handleProfileBrowseClick}
                  disabled={importingData}
                  className={`px-4 py-2 rounded-r-md text-white ${
                    importingData
                      ? "bg-blue-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Browse
                </button>
              </div>
            </div>

            {areAllFilesSelected() && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <div className="w-16 h-16 bg-blue-500 rounded-full mr-4 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-8 w-8 text-white"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium">
                      Twitter Archive Files
                    </h3>
                    <p className="text-sm text-gray-500">
                      All required files selected
                    </p>
                  </div>
                </div>

                {!importingData ? (
                  <button
                    onClick={handleImportTwitter}
                    className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Import Tweets
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

      case TwitterExpertStep.HASHTAG_INPUT:
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
                Successfully imported {importedTweetCount} tweets.
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
                  onClick={suggestHashtags}
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
                Hashtags help users discover your expert. Example: ai, twitter,
                tech
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
      case TwitterExpertStep.TWITTER_DATA_IMPORT:
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

      case TwitterExpertStep.HASHTAG_INPUT:
        return (
          <div className="flex justify-between space-x-2">
            <button
              onClick={() => setCurrentStep(TwitterExpertStep.TWITTER_DATA_IMPORT)}
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