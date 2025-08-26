"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Dialog from "../ui/Dialog";
import { generateSecretKey, getPublicKey } from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils";
import NostrExpertCreator from "./NostrExpertCreator";
import BlankExpertCreator from "./BlankExpertCreator";

// Define the steps in the expert creation process
enum CreateExpertStep {
  SELECT_TEMPLATE = "select_template",
  NOSTR_FLOW = "nostr_flow",
  BLANK_FLOW = "blank_flow",
  CONGRATULATIONS = "congratulations",
}

// Define the template options
enum TemplateType {
  NOSTR = "nostr",
  BLANK = "blank",
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

  // State for the multi-step dialog
  const [currentStep, setCurrentStep] = useState<CreateExpertStep>(
    CreateExpertStep.SELECT_TEMPLATE
  );
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(
    null
  );

  // State for expert creation
  const [expertPubkey, setExpertPubkey] = useState("");
  const [expertPrivkey, setExpertPrivkey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [createdExpertPubkey, setCreatedExpertPubkey] = useState("");

  // Reset the dialog state when it's opened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(CreateExpertStep.SELECT_TEMPLATE);
      setSelectedTemplate(null);
      setExpertPubkey("");
      setExpertPrivkey("");
      setError(null);
      setCreatedExpertPubkey("");
    }
  }, [isOpen]);

  // Generate a new keypair for the expert when needed
  useEffect(() => {
    if (
      (currentStep === CreateExpertStep.NOSTR_FLOW || 
       currentStep === CreateExpertStep.BLANK_FLOW) && 
      !expertPubkey
    ) {
      const privkey = generateSecretKey();
      const privkeyHex = bytesToHex(privkey);
      const pubkeyHex = getPublicKey(privkey);

      setExpertPubkey(pubkeyHex);
      setExpertPrivkey(privkeyHex);
    }
  }, [currentStep, expertPubkey]);

  // Handle template selection
  const handleTemplateSelect = (template: TemplateType) => {
    setSelectedTemplate(template);

    if (template === TemplateType.NOSTR) {
      setCurrentStep(CreateExpertStep.NOSTR_FLOW);
    } else {
      setCurrentStep(CreateExpertStep.BLANK_FLOW);
    }
  };

  // Handle expert creation completion
  const handleExpertCreated = (pubkey: string) => {
    setCreatedExpertPubkey(pubkey);
    setCurrentStep(CreateExpertStep.CONGRATULATIONS);
  };

  // Handle dialog close
  const handleClose = () => {
    onClose();
  };

  // Handle error from child components
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // Render the dialog title based on the current step
  const renderDialogTitle = () => {
    switch (currentStep) {
      case CreateExpertStep.SELECT_TEMPLATE:
        return "Create Expert - Select Template";
      case CreateExpertStep.NOSTR_FLOW:
        return "Create Expert - Nostr Data Import";
      case CreateExpertStep.BLANK_FLOW:
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
                  alt="Nostr profile clone"
                  width={48}
                  height={48}
                  className="rounded-full"
                />
              </div>
              <div>
                <h3 className="font-medium">Nostr profile clone</h3>
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

      case CreateExpertStep.NOSTR_FLOW:
        return (
          <NostrExpertCreator
            expertPubkey={expertPubkey}
            expertPrivkey={expertPrivkey}
            onComplete={handleExpertCreated}
            onBack={() => setCurrentStep(CreateExpertStep.SELECT_TEMPLATE)}
            onError={handleError}
          />
        );

      case CreateExpertStep.BLANK_FLOW:
        return (
          <BlankExpertCreator
            expertPubkey={expertPubkey}
            expertPrivkey={expertPrivkey}
            onComplete={handleExpertCreated}
            onBack={() => setCurrentStep(CreateExpertStep.SELECT_TEMPLATE)}
            onError={handleError}
          />
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
              onClick={() => router.push(`/experts/${createdExpertPubkey}`)}
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
