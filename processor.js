// processor.js
import express from "express";
import bodyParser from "body-parser";
import { main } from "./main.js"; // Import your core logic

const app = express();
app.use(bodyParser.json({ limit: "10mb" })); // Adjust if large CSVs

app.post("/", async (req, res) => {
  try {
    const eventMetaData = req.body; // The entire request body is your eventMetaData
    const { fileId, fileName, csvContent } = req.body; // Destructure for logging/preview

    console.log(`✅ Received data from poller`);
    console.log(`🗂️  File ID: ${fileId}`);
    console.log(`📄 File Name: ${fileName}`);
    // console.log(`🧾 CSV Preview:\n${csvContent.slice(0, 200)}...`); // Preview only

    // Call your core logic with the extracted metadata
    // IMPORTANT: See next point about the 'main' function signature
    await main(eventMetaData);

    res.status(200).send("Processed");
  } catch (e) {
    console.error("Error happened within base path: ", e);
    // It's crucial to send an error response if something goes wrong
    res.status(500).send(`Error processing request: ${e.message}`);
  }
});

// This is the line for Cloud Functions: export the Express app
export { app };

// app.listen(port, () => {
//   console.log(`🚀 Server listening on port ${port}`);
// });
