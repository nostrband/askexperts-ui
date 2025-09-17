import { useState } from 'react';
import { useOpenAICall } from './useOpenAICall';
import { resizeDataUrlImage } from '../utils/images';

const SPEC_EXPERT = "b409c8c39325782ed8729a6849a4f1467061183e93e6ccef26e6a3a3355d8562";
const ICON_EXPERT = "5f78605e5fc8ba44118b535215744bbeb420fcc664138e06a754c1d9f08ff027";

export function useIconGeneration() {
  const [generatingIcon, setGeneratingIcon] = useState(false);
  const [iconGenerationError, setIconGenerationError] = useState<string | null>(null);
  
  const { makeCall: generateSPEC } = useOpenAICall({ 
    model: SPEC_EXPERT, 
    maxAmountSats: 100 
  });

  const { makeCall: generateImage } = useOpenAICall({ 
    model: ICON_EXPERT, 
    maxAmountSats: 100 
  });

  const generateIcon = async (prompt: string): Promise<string> => {
    setGeneratingIcon(true);
    setIconGenerationError(null);

    try {
      const spec = await generateSPEC(prompt);
      if (!spec.content) throw new Error("Spec returned empty content");

      const message = await generateImage(spec.content);

      // Check if the content is already a data URL
      if (message.images?.[0].image_url?.url.startsWith("data:image")) {
        return resizeDataUrlImage(message.images?.[0].image_url?.url, 128);
      }

      throw new Error('Invalid image content received from AI expert');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate icon';
      setIconGenerationError(errorMessage);
      throw error;
    } finally {
      setGeneratingIcon(false);
    }
  };

  return {
    generateIcon,
    generatingIcon,
    iconGenerationError
  };
}