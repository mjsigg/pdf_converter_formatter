// processor.js
import express from "express";
import bodyParser from "body-parser";
import { main } from "./main.js";
const app = express();
const port = process.env.PORT || 8080;

app.use(bodyParser.json({ limit: "10mb" })); // Adjust if large CSVs

app.post("/", async (req, res) => {
  try {
    const { fileId, fileName, csvContent } = req.body;
    const eventMetaData = req.body;
    console.log(`✅ Received CSV from poller`);
    console.log(`🗂️  File ID: ${fileId}`);
    console.log(`📄 File Name: ${fileName}`);
    // console.log(`🧾 CSV Preview:\n${csvContent.slice(0, 200)}...`); // Preview only

    // console.log("Preview of eventmetadata", eventMetaData);
    main(eventMetaData);
    // TODO: process CSV, save to DB, trigger something, etc.

    res.status(200).send("Processed");
  } catch (e) {
    console.error("Error happened within base path: ", e);
  }
});

app.listen(port, () => {
  console.log(`🚀 Server listening on port ${port}`);
});
