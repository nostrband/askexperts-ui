import { DocStoreWebSocketClient } from 'askexperts/docstore';
import { createRagEmbeddings } from 'askexperts/rag';
import { createDocImporter } from 'askexperts/import';

// Twitter profile information interface
export interface TwitterProfileInfo {
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  headerUrl?: string;
}

// Function to get a docstore by ID
async function getDocstore(client: DocStoreWebSocketClient, docstoreId: string) {
  try {
    const docstore = await client.getDocstore(docstoreId);
    return docstore;
  } catch (error) {
    console.error('Error getting docstore:', error);
    throw error;
  }
}

// Helper function to remove window assignment prefix
function removeWindowPrefix(content: string, prefix: string): string {
  if (content.startsWith(prefix)) {
    return content.substring(prefix.length);
  }
  return content;
}

// Parse Twitter archive tweets.js file
export function parseTwitterArchive(fileContent: string): any[] {
  try {
    let processedContent = removeWindowPrefix(fileContent, "window.YTD.tweets.part0 = ");

    // Parse the JSON content
    const jsonContent = JSON.parse(processedContent);
    
    // Extract tweets from the structure
    const tweets = jsonContent.map((t: any) => t.tweet);
    
    return tweets;
  } catch (error) {
    console.error('Error parsing Twitter archive:', error);
    throw new Error(`Failed to parse Twitter archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Parse Twitter archive account.js file
export function parseTwitterAccount(fileContent: string): any {
  try {
    let processedContent = removeWindowPrefix(fileContent, "window.YTD.account.part0 = ");
    
    // Parse the JSON content
    const jsonContent = JSON.parse(processedContent);
    
    // Extract account info
    if (jsonContent && jsonContent.length > 0 && jsonContent[0].account) {
      return jsonContent[0].account;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing Twitter account:', error);
    throw new Error(`Failed to parse Twitter account: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Parse Twitter archive profile.js file
export function parseTwitterProfile(fileContent: string): any {
  try {
    let processedContent = removeWindowPrefix(fileContent, "window.YTD.profile.part0 = ");
    
    // Parse the JSON content
    const jsonContent = JSON.parse(processedContent);
    
    // Extract profile info
    if (jsonContent && jsonContent.length > 0 && jsonContent[0].profile) {
      return jsonContent[0].profile;
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing Twitter profile:', error);
    throw new Error(`Failed to parse Twitter profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Extract Twitter profile information from account and profile data
export function extractTwitterProfileInfo(accountData: any, profileData: any): TwitterProfileInfo {
  const profileInfo: TwitterProfileInfo = {};
  
  if (accountData) {
    profileInfo.username = accountData.username;
    profileInfo.displayName = accountData.accountDisplayName;
  }
  
  if (profileData && profileData.description) {
    profileInfo.bio = profileData.description.bio;
  }
  
  if (profileData) {
    profileInfo.avatarUrl = profileData.avatarMediaUrl;
    profileInfo.headerUrl = profileData.headerMediaUrl;
  }
  
  return profileInfo;
}

// Main import function
export async function importTwitterPosts({
  docstoreClient,
  docstoreId,
  tweets,
  onProgress
}: {
  docstoreClient: DocStoreWebSocketClient;
  docstoreId: string;
  tweets: any[];
  onProgress: (progress: number, status: string) => void;
}) {
  try {
    // Update progress
    onProgress(0, 'Starting import...');

    // Get docstore
    const docstore = await getDocstore(docstoreClient, docstoreId);
    onProgress(5, 'Processing tweets...');

    if (!docstore) {
      throw new Error('Docstore not found');
    }
    
    // Initialize embeddings
    const embeddings = await createRagEmbeddings(docstore.model);
    await embeddings.start();
    
    onProgress(10, `Processing ${tweets.length} tweets...`);

    // Create document importer for twitter
    const importer = await createDocImporter("twitter");

    // Process each tweet
    let successCount = 0;
    for (let i = 0; i < tweets.length; i++) {
      const tweet = tweets[i];
      try {
        // Convert to doc
        const doc = await importer.createDoc(tweet);
        doc.docstore_id = docstore?.id || docstoreId;

        // Generate embeddings
        const chunks = await embeddings.embed(doc.data);

        // Convert embeddings from number[][] to Float32Array[]
        const float32Embeddings = chunks.map((c) => {
          const float32Array = new Float32Array(c.embedding.length);
          for (let i = 0; i < c.embedding.length; i++) {
            float32Array[i] = c.embedding[i];
          }
          return float32Array;
        });

        doc.embeddings = float32Embeddings;

        // Add to docstore
        await docstoreClient.upsert(doc);
        successCount++;

        // Update progress
        const progress = 10 + Math.floor((successCount / tweets.length) * 90);
        onProgress(progress, `Processed ${successCount}/${tweets.length} tweets`);
      } catch (error) {
        console.error('Error processing tweet:', error);
      }
    }

    // Final update
    onProgress(100, `Import completed! Processed ${successCount}/${tweets.length} tweets.`);
    return {
      success: true,
      message: `Successfully imported ${successCount} tweets.`,
      count: successCount,
      tweets: tweets
    };
  } catch (error) {
    console.error('Error importing Twitter posts:', error);
    onProgress(0, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}