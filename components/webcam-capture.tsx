'use client';

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

interface WebcamCaptureProps {
  onCapture: (imageSrc: string) => void;
  label: string;
  useBackCamera?: boolean;
}

export default function WebcamCapture({ 
  onCapture, 
  label, 
  useBackCamera = false 
}: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoConstraints = {
    facingMode: useBackCamera ? { exact: "environment" } : "user",
    width: 1280,
    height: 720,
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const handleConfirm = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      setIsOpen(false);
      setCapturedImage(null);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    setCapturedImage(null);
    setError(null);
  };

  const handleUserMediaError = (err: string | DOMException) => {
    console.error('Camera error:', err);
    setError('Unable to access camera. Please check permissions.');
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">{label}</h3>

        {error ? (
          <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-lg">
            {error}
            <p className="text-sm mt-2">Make sure you allow camera access when prompted.</p>
          </div>
        ) : null}

        <div className="mb-4 bg-gray-100 rounded-lg overflow-hidden">
          {!capturedImage ? (
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={videoConstraints}
              onUserMediaError={handleUserMediaError}
              className="w-full"
            />
          ) : (
            <img 
              src={capturedImage} 
              alt="Captured" 
              className="w-full"
            />
          )}
        </div>

        <div className="flex gap-2 justify-end">
          {!capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={capture}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                📸 Take Photo
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                🔄 Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                ✓ Use This Photo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}