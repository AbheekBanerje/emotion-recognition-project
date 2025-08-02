// src/App.js

import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import axios from 'axios';

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [capturedImage, setCapturedImage] = useState(null);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [imageEmotion, setImageEmotion] = useState('');
  const [imageConfidence, setImageConfidence] = useState('');

  // Load models
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = process.env.PUBLIC_URL + '/models';

      // Load face detection and expression models
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);

      // If using age and gender recognition, load additional models
      // await faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL);
    };

    loadModels();
  }, []);

  // Start video stream
  useEffect(() => {
    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: {} })
        .then((stream) => {
          videoRef.current.srcObject = stream;
        })
        .catch((err) => {
          console.error('Error accessing webcam:', err);
        });
    };

    startVideo();
  }, []);

  // Real-time face detection and emotion recognition
  useEffect(() => {
    const videoElement = videoRef.current;

    const handleVideoPlay = () => {
      const canvas = canvasRef.current;
      const displaySize = {
        width: videoElement.videoWidth,
        height: videoElement.videoHeight,
      };
      faceapi.matchDimensions(canvas, displaySize);

      const interval = setInterval(async () => {
        const detections = await faceapi
          .detectAllFaces(
            videoElement,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(
          detections,
          displaySize
        );

        // Clear canvas before drawing
        canvas
          .getContext('2d')
          .clearRect(0, 0, canvas.width, canvas.height);

        // Draw detections and expressions
        resizedDetections.forEach((detection) => {
          const { x, y, width, height } = detection.detection.box;
          const expressions = detection.expressions;
          const maxExpressionValue = Math.max(...Object.values(expressions));
          const emotion = Object.keys(expressions).find(
            (emotion) => expressions[emotion] === maxExpressionValue
          );
          const confidence = maxExpressionValue;

          // Draw bounding box
          const ctx = canvas.getContext('2d');
          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);

          // Draw label background
          ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
          ctx.fillRect(x, y - 20, width, 20);

          // Draw text
          ctx.fillStyle = '#000000';
          ctx.font = '16px Arial';
          ctx.fillText(
            `${emotion} (${(confidence * 100).toFixed(2)}%)`,
            x + 5,
            y - 5
          );
        });
      }, 100);

      // Cleanup on component unmount
      return () => clearInterval(interval);
    };

    if (videoElement) {
      videoElement.addEventListener('play', handleVideoPlay);
    }

    // Cleanup event listener
    return () => {
      if (videoElement) {
        videoElement.removeEventListener('play', handleVideoPlay);
      }
    };
  }, []);

  // Handle Capture Photo
  const handleCapture = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas
      .getContext('2d')
      .drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/jpeg');
    setCapturedImage(dataURL);

    // Process the captured image
    await processImage(dataURL);
  };

  // Handle Upload Image
  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const imageURL = URL.createObjectURL(file);
      setUploadedImage(imageURL);

      // Process the uploaded image
      await processImage(imageURL);
    }
  };

  // Process Image (Captured or Uploaded)
  const processImage = async (imageURL) => {
    const img = new Image();
    img.src = imageURL;
    await img.decode();

    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    if (detections.length > 0) {
      const expressions = detections[0].expressions;
      const maxExpressionValue = Math.max(...Object.values(expressions));
      const emotion = Object.keys(expressions).find(
        (emotion) => expressions[emotion] === maxExpressionValue
      );
      const confidence = maxExpressionValue;

      setImageEmotion(emotion);
      setImageConfidence((confidence * 100).toFixed(2));
    } else {
      setImageEmotion('No face detected');
      setImageConfidence('');
    }
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Emotion Recognition</h1>

      {/* Real-time emotion recognition */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          style={{
            width: '640px',
            height: '480px',
            borderRadius: '10px',
          }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '640px',
            height: '480px',
          }}
        />
      </div>

      {/* Capture and Upload Options */}
      <div style={{ marginTop: '20px' }}>
        <button onClick={handleCapture} style={{ marginRight: '10px' }}>
          Capture Photo
        </button>
        <input type="file" accept="image/*" onChange={handleUpload} />
      </div>

      {/* Display Captured Image */}
      {capturedImage && (
        <div style={{ marginTop: '20px' }}>
          <h2>Captured Image:</h2>
          <img
            src={capturedImage}
            alt="Captured"
            style={{ width: '400px', border: '1px solid #ccc' }}
          />
          {imageEmotion && (
            <div>
              <h3>
                Emotion Detected: {imageEmotion}{' '}
                {imageConfidence && `${imageConfidence}%`}
              </h3>
            </div>
          )}
        </div>
      )}

      {/* Display Uploaded Image */}
      {uploadedImage && (
        <div style={{ marginTop: '20px' }}>
          <h2>Uploaded Image:</h2>
          <img
            src={uploadedImage}
            alt="Uploaded"
            style={{ width: '400px', border: '1px solid #ccc' }}
          />
          {imageEmotion && (
            <div>
              <h3>
                Emotion Detected: {imageEmotion}{' '}
                {imageConfidence && `${imageConfidence}%`}
              </h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
