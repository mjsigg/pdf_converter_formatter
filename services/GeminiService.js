const { VertexAI } = require("@google-cloud/vertexai");
const path = require("path");
const fs = require("fs").promises;
const { configDotenv } = require("dotenv");

configDotenv();
const GCP_CRED = process.env.GCP_CRED;
if (!GCP_CRED) throw new Error("GCP cred is not set. Check env.");
const credentialsPath = path.join(__dirname, GCP_CRED);
const fileContent = await fs.readFile(credentialsPath, "utf8");
const credentials = JSON.parse(fileContent);

/**
 * Asynchronously retrieves specified properties from the Google Cloud credentials JSON file.
 *
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

export async function convertLatinNameToKorean(latinName) {
  t;
}
