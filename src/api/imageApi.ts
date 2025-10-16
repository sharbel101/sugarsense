const GEMINI_API_KEY = "AIzaSyB5s-jRsgBlQlIaQgNU01eG3VfgNyM9bUY";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

// Function to convert file to base64
const fileToGenerativePart = async (file: File) => {
  console.log('[imageApi.ts] fileToGenerativePart: Converting file to base64', file);
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      console.log('[imageApi.ts] fileToGenerativePart: FileReader onloadend');
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => {
      console.error('[imageApi.ts] fileToGenerativePart: FileReader error', error);
      resolve(''); // Resolve with empty string on error
    };
    reader.readAsDataURL(file);
  });
  const data = await base64EncodedDataPromise;
  console.log('[imageApi.ts] fileToGenerativePart: Base64 conversion complete');
  return {
    inlineData: { data, mimeType: file.type },
  };
};

export const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height *= maxWidth / width));
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width *= maxHeight / height));
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const newFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(newFile);
          } else {
            reject(new Error('Canvas to Blob conversion failed'));
          }
        },
        file.type,
        0.8 // image quality
      );
    };
    img.onerror = (error) => {
      reject(error);
    };
  });
};

export const getCarbPrediction = async (prompt: string, image: File) => {
  console.log('[imageApi.ts] getCarbPrediction: Starting prediction with prompt:', prompt, 'and image:', image.name);
  try {
    const imagePart = await fileToGenerativePart(image);
    const contents = {
      contents: [{ parts: [{ text: prompt }, imagePart] }],
    };
    console.log('[imageApi.ts] getCarbPrediction: Sending request to Gemini API with contents:', JSON.stringify(contents, null, 2));

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contents),
    });

    console.log('[imageApi.ts] getCarbPrediction: Received response from Gemini API:', response);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[imageApi.ts] getCarbPrediction: Gemini API request failed:', response.status, errorText);
      throw new Error(`Gemini API request failed: ${errorText}`);
    }

    const data = await response.json();
    console.log('[imageApi.ts] getCarbPrediction: Parsed JSON response:', data);

    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0];
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const predictionText = candidate.content.parts[0].text;
        console.log('[imageApi.ts] getCarbPrediction: Prediction successful:', predictionText);
        return predictionText;
      }
    }

    console.warn('[imageApi.ts] getCarbPrediction: Could not find prediction text in response.');
    return "Could not get a prediction.";
  } catch (error) {
    console.error('[imageApi.ts] getCarbPrediction: An unexpected error occurred:', error);
    return "An error occurred while trying to get a prediction.";
  }
};