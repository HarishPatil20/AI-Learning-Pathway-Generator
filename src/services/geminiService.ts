import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface RoadmapStep {
  stepNumber: number;
  topic: string;
  importance: string;
  resources: { name: string; url: string; type: string }[];
  estimatedTime: string;
  practiceProject: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

export interface RoadmapResponse {
  learningGoal: string;
  steps: RoadmapStep[];
}

export async function generateLearningRoadmap(
  goal: string,
  level: string,
  skills: string,
  mode: 'fast' | 'deep' = 'fast'
): Promise<RoadmapResponse> {
  const prompt = `
    You are an expert educational consultant and AI Learning Pathway Generator.
    Create a structured and personalized learning roadmap for the following:
    Learning Goal: ${goal}
    Current Knowledge Level: ${level}
    Known Skills: ${skills}

    Your task is to:
    1. Identify important topics required to achieve the learning goal.
    2. Determine prerequisite topics.
    3. Arrange the topics in a logical learning order from basic to advanced.
    4. Suggest high-quality Open Educational Resources (OER) such as:
       - Free textbooks (e.g., OpenStax, LibreTexts)
       - YouTube lectures (e.g., MIT OCW, Khan Academy, 3Blue1Brown)
       - Research articles (e.g., arXiv, Google Scholar)
       - Free online courses (e.g., Coursera Financial Aid, edX Free Audit, Saylor Academy)
    5. Provide a step-by-step learning pathway.

    The response must be in JSON format.
  `;

  const model = mode === 'fast' ? "gemini-3.1-flash-lite-preview" : "gemini-3.1-pro-preview";
  const thinkingConfig = mode === 'deep' ? { thinkingLevel: ThinkingLevel.HIGH } : undefined;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          learningGoal: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                stepNumber: { type: Type.INTEGER },
                topic: { type: Type.STRING },
                importance: { type: Type.STRING },
                resources: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      url: { type: Type.STRING },
                      type: { type: Type.STRING, description: "e.g., Video, Textbook, Course" },
                    },
                    required: ["name", "url", "type"],
                  },
                },
                estimatedTime: { type: Type.STRING },
                practiceProject: { type: Type.STRING },
                difficulty: { type: Type.STRING, enum: ["Beginner", "Intermediate", "Advanced"] },
              },
              required: ["stepNumber", "topic", "importance", "resources", "estimatedTime", "practiceProject", "difficulty"],
            },
          },
        },
        required: ["learningGoal", "steps"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  return JSON.parse(text) as RoadmapResponse;
}

export async function analyzeImage(imageBytes: string, mimeType: string, prompt: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [
      {
        inlineData: {
          data: imageBytes,
          mimeType: mimeType,
        },
      },
      {
        text: prompt,
      },
    ],
  });

  return response.text || "No analysis provided.";
}

export async function generateImage(prompt: string, imageBytes?: string, mimeType?: string): Promise<string> {
  const parts: any[] = [{ text: prompt }];
  if (imageBytes && mimeType) {
    parts.unshift({
      inlineData: {
        data: imageBytes,
        mimeType: mimeType,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
        imageSize: "1K",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("Failed to generate image.");
}

export async function generateVeoVideo(imageBytes: string, mimeType: string, prompt: string, aspectRatio: '16:9' | '9:16' = '16:9') {
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: imageBytes,
      mimeType: mimeType,
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: aspectRatio
    }
  });

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': process.env.GEMINI_API_KEY || '',
    },
  });

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
