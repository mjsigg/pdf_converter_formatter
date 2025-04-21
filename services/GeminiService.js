import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import { configDotenv } from "dotenv";

configDotenv();

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION = process.env.GCP_LOCATION || "us-central1";
const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH; // Point to your downloaded JSON key file

export async function convertLatinNameToKorean(latinName) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Convert the following name from latin into Korean${latinName}. Ensure that the format is in Korean only, with the first name followed by the last name.  Put 4 spaces between the names and return only the name.`,
    });

    if (response && response.text) {
      return response.text;
    } else {
      throw new Error(
        `Gemini conversion failed for "${latinName}": No text response received.`
      );
    }
  } catch (error) {
    console.error(`Gemini conversion error for "${latinName}":`, error);
    throw new Error(
      `Gemini conversion failed for "${latinName}": ${error.message}`
    );
  }
}

/**
 * Asynchronously retrieves specified properties from the Google Cloud credentials JSON file.
 * @async
 * @param {string[]} options An array of keys representing the properties to retrieve from the credentials file.
 * @returns {Promise<object>} A Promise that resolves to an object containing the requested properties from the credentials file.
 * Returns an empty object if no valid options are provided or if an error occurs.
 */
export const GCP_PROPS = async (options) => {
  try {
    const fileContent = await fs.readFile(credentialsPath, "utf8");
    const credentials = JSON.parse(fileContent);
    const requestedOptions = {};

    if (options && Array.isArray(options)) {
      for (const option of options) {
        if (credentials.hasOwnProperty(option)) {
          requestedOptions[option] = credentials[option];
        }
      }
    }

    return requestedOptions;
  } catch (error) {
    console.error("Error reading or parsing GCP credentials file:", error);
    return {};
  }
};
