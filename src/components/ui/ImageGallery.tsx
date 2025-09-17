"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

interface ImageGalleryProps {
  images: string[];
  className?: string;
}

interface FullScreenViewerProps {
  imageUrl: string;
  onClose: () => void;
}

function FullScreenViewer({ imageUrl, onClose }: FullScreenViewerProps) {
  const [portalRoot, setPortalRoot] = useState<Element | null>(null);

  useEffect(() => {
    // Get the document body to render the portal
    setPortalRoot(document.body);
  }, []);

  if (!portalRoot) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      <div className="relative max-w-full max-h-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-2xl font-bold hover:text-gray-300 z-10"
          aria-label="Close"
        >
          ×
        </button>
        <img
          src={imageUrl}
          alt="Full screen view"
          className="max-w-full max-h-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>,
    portalRoot
  );
}

export default function ImageGallery({ images, className = "" }: ImageGalleryProps) {
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  const handleImageClick = (imageUrl: string) => {
    setFullScreenImage(imageUrl);
  };

  const handleCloseFullScreen = () => {
    setFullScreenImage(null);
  };

  return (
    <>
      <div className={`grid gap-2 ${className}`}>
        {images.length === 1 && (
          <div className="w-full max-w-md">
            <img
              src={images[0]}
              alt="Generated image"
              className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick(images[0])}
            />
          </div>
        )}
        
        {images.length === 2 && (
          <div className="grid grid-cols-2 gap-2 max-w-md">
            {images.map((imageUrl, index) => (
              <img
                key={index}
                src={imageUrl}
                alt={`Generated image ${index + 1}`}
                className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleImageClick(imageUrl)}
              />
            ))}
          </div>
        )}
        
        {images.length === 3 && (
          <div className="grid grid-cols-2 gap-2 max-w-md">
            <img
              src={images[0]}
              alt="Generated image 1"
              className="col-span-2 w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => handleImageClick(images[0])}
            />
            {images.slice(1).map((imageUrl, index) => (
              <img
                key={index + 1}
                src={imageUrl}
                alt={`Generated image ${index + 2}`}
                className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleImageClick(imageUrl)}
              />
            ))}
          </div>
        )}
        
        {images.length >= 4 && (
          <div className="grid grid-cols-2 gap-2 max-w-md">
            {images.slice(0, 4).map((imageUrl, index) => (
              <div key={index} className="relative">
                <img
                  src={imageUrl}
                  alt={`Generated image ${index + 1}`}
                  className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleImageClick(imageUrl)}
                />
                {index === 3 && images.length > 4 && (
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-60 rounded-lg flex items-center justify-center cursor-pointer"
                    onClick={() => handleImageClick(imageUrl)}
                  >
                    <span className="text-white font-bold text-lg">
                      +{images.length - 4}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {fullScreenImage && (
        <FullScreenViewer 
          imageUrl={fullScreenImage} 
          onClose={handleCloseFullScreen} 
        />
      )}
    </>
  );
}