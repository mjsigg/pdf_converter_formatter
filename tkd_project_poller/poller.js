import { google } from "googleapis";
import "dotenv/config";
import fetch from "node-fetch";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const POLL_INTERVAL_SECONDS = 60;
const isLocal = process.env.CREDENTIALS_PATH;

const auth = new google.auth.GoogleAuth({
  scopes: SCOPES,
  ...(isLocal && { keyFile: process.env.CREDENTIALS_PATH }),
});

const SHARED_FOLDER_ID = process.env.SHARED_FOLDER_ID;
const MAIN_FUNCTION_URL = isLocal
  ? process.env.LOCAL_URL
  : process.env.PROCESSOR_FUNCTION_URL; // HTTP trigger of your main processor

let lastCheckedTime = new Date().toISOString();
if (SHARED_FOLDER_ID) console.log("Shared folder ID found: ", SHARED_FOLDER_ID);

export async function pollDrive() {
  console.log(`[${new Date().toISOString()}] Polling started...`);
  const authClient = await auth.getClient();
  const drive = google.drive({ version: "v3", auth: authClient });
  const baseQuery = `"${SHARED_FOLDER_ID}" in parents and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;

  const timeQuery = !isLocal ? ` and modifiedTime > '${lastCheckedTime}'` : "";

  const query = baseQuery + timeQuery;

  try {
    const folderInfo = await drive.files.get({
      fileId: SHARED_FOLDER_ID,
      fields: "id, name, mimeType",
      supportsAllDrives: true,
    });

    console.log(
      `Polling folder: "${folderInfo.data.name}" (ID: ${folderInfo.data.id})`
    );

    const res = await drive.files.list({
      q: query,
      fields: "files(id, name, modifiedTime)",
      corpora: "user",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });

    console.log("API Response (res.data.files):", res.data.files);

    const newFiles = res.data.files;
    if (newFiles && newFiles.length > 0) {
      console.log(`Found ${newFiles.length} new Google Sheet(s).`);

      for (const file of newFiles) {
        console.log(`Exporting & triggering processor for: ${file.name}`);

        const exportUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/csv`;

        const token = await authClient.getAccessToken();

        const csvRes = await fetch(exportUrl, {
          headers: {
            Authorization: `Bearer ${token.token}`,
          },
        });

        if (!csvRes.ok) {
          console.error(
            `Failed to export file ${file.name}: ${csvRes.statusText}`
          );
          continue; // Skip this file
        }

        const csvText = await csvRes.text();

        await fetch(MAIN_FUNCTION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId: file.id,
            fileName: file.name,
            csvContent: csvText,
          }),
        });
      }
    } else {
      console.log("No new Google Sheets found.");
    }

    lastCheckedTime = new Date().toISOString();
  } catch (err) {
    console.error("Polling error:", err);
  }
}

if (process.env.RUN_LOCAL === "true") {
  setInterval(pollDrive, POLL_INTERVAL_SECONDS * 1000);
}
