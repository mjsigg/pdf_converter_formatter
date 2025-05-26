import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { TKDForm } from "./models/TKDForm.js";
import { Student } from "./models/Student.js";
import { Storage } from "@google-cloud/storage";
import { convertLatinNameToKorean } from "./services/GeminiService.js";
import { google } from "googleapis";
/*
Example of event
{
  "bucket": "your-input-bucket",
  "name": "testcount_05_25_2025.pdf", // This is the part we want!
  "contentType": "application/pdf",
  "timeCreated": "2025-05-25T19:30:00.000Z",
  "updated": "2025-05-25T19:30:00.000Z",
  // ... other properties
}
*/

// --- NEW IMPORTS FOR CSV HANDLING ---
import stream from "stream";
import { promisify } from "util";
import csv from "csv-parser";
const pipeline = promisify(stream.pipeline);

// --- Constants ---
const OUTPUT_BUCKET_NAME = "tkd_output_pdf"; // Your actual output bucket
const ASSETS_BUCKET_NAME = "tkd_assets"; // Your actual assets bucket
const BLANK_TEMPLATE_FILENAME = "blank_template_compressed.pdf";
const KOREAN_FONT_FILENAME = "NotoSerifKR-SemiBold.ttf";

// Google Sheet Details for student_name_map
const SPREADSHEET_ID = "1YRuZUPwIASP1U-N0CT7KtHaYEJ6v0lOYfiF0mc0FB_M";
const SHEET_RANGE = "Sheet1!A:B"; // Adjust 'Sheet1' to your actual sheet tab name if different

export async function main(event, context) {
  console.log("Starting application ...");

  // --- Initialize Storage FIRST ---
  const storage = new Storage();
  let assetsBucket = storage.bucket(ASSETS_BUCKET_NAME);

  let inputCsvContent;
  let testCount;
  let eventDate;
  let outPutFilePath;

  // Determine if running as a Cloud Function (Google Drive event) or locally
  const fileId = event?.data?.fileId; // For Google Drive trigger

  if (fileId) {
    // Running as a Cloud Function, triggered by Google Drive event
    console.log(
      `Cloud Function triggered by Google Drive file with ID: ${fileId}`
    );

    // --- Authenticate for Google Drive API ---
    const auth = new google.auth.GoogleAuth({
      scopes: [
        "https://www.googleapis.com/auth/drive.readonly", // To read files from Google Drive
        "https://www.googleapis.com/auth/spreadsheets.readonly", // Still needed for the name map sheet
      ],
    });
    const authClient = await auth.getClient();
    const drive = google.drive({ version: "v3", auth: authClient });

    // --- Download the Google Sheet (CSV) Content from Drive ---
    console.log(`Downloading CSV content for file ID: ${fileId}`);
    try {
      const res = await drive.files.export(
        {
          fileId: fileId,
          mimeType: "text/csv", // Request to export as CSV
        },
        {
          responseType: "stream", // Get the response as a stream
        }
      );

      const chunks = [];
      await pipeline(res.data, async function* (source) {
        for await (const chunk of source) {
          chunks.push(chunk);
          yield chunk;
        }
      });
      inputCsvContent = Buffer.concat(chunks).toString("utf8");
      console.log("CSV content downloaded successfully from Google Drive.");

      // Attempt to get the original filename from Drive metadata for output naming
      try {
        const fileMetadata = await drive.files.get({
          fileId: fileId,
          fields: "name",
        });
        if (fileMetadata.data.name) {
        }
      } catch (metaError) {
        console.warn(
          `Could not retrieve original filename for fileId ${fileId}: ${metaError.message}. Using default output name.`
        );
      }
    } catch (driveError) {
      console.error("Error downloading CSV from Google Drive:", driveError);
      throw new Error(
        `Failed to download CSV from Drive: ${driveError.message}`
      );
    }
  } else {
    // Running locally, provide mock CSV content from a file in GCS
    console.warn("Running locally. Loading mock CSV from Cloud Storage.");
    const mockFileName = "172_05_17_2025.csv"; // Name of your mock CSV file
    const mockCsvFile = assetsBucket.file(`mocks/${mockFileName}`); // Path within assets bucket

    try {
      const [mockCsvBuffer] = await mockCsvFile.download();
      inputCsvContent = mockCsvBuffer.toString("utf8");
      console.log(
        `Mock CSV "${mockFileName}" loaded successfully from Cloud Storage.`
      );
      let splitMockName = mockFileName.split(".");
      splitMockName.pop();
      splitMockName = splitMockName.join("_").split("_");
      testCount = splitMockName.shift();
      eventDate = splitMockName.join("/");
      outPutFilePath = path.join(
        ".",
        "data",
        "output_files",
        String(testCount)
      );
    } catch (mockError) {
      console.error(`Error loading mock CSV "${mockFileName}":`, mockError);
      throw new Error(
        `Failed to load mock CSV for local testing: ${mockError.message}`
      );
    }
  }

  // Configurations should be loaded, student map should be loaded, testcount & event loaded
  // we should be able to loop over every student now
  for (let line of inputCsvContent.split("\n")) {
    const [name, lildragonBelt, adultJrBelt, DOB, isJrOrAdult] =
      line.split(",");

    const beltColor = lildragonBelt ? lildragonBelt : adultJrBelt;
    // console.log("This is name", name);
    console.log("This is beltcolor", beltColor);
  }

  return;

  // const [testCount, jsonFilePath, latestTestDate] = await checkAndProcessData();
  const studentsJsonString = await fs.readFile(jsonFilePath, "utf8");
  const studentsJson = JSON.parse(studentsJsonString);
  const outPutFilesTestPath = path.join("data/output_files", testCount);
  const outFilesTestPathExists = await checkDirectoryExists(
    outPutFilesTestPath
  );

  if (!outFilesTestPathExists) {
    await fs.mkdir(outPutFilesTestPath);
  }

  for (let [key, val] of Object.entries(studentsJson)) {
    const {
      name,
      birthDay,
      beltColor,
      lilDragon,
      fullNameInKorean,
      latestTestDate,
    } = val;
    console.log("Loading ", name);
    const currStudent = new Student(
      name,
      birthDay,
      beltColor,
      lilDragon,
      fullNameInKorean,
      latestTestDate
    );
    console.log("This is current student: ", currStudent);

    try {
      const studentCertFilePath = path.join(
        outPutFilesTestPath,
        currStudent.name
      );

      const [pdfDoc, latinFont, koreanFont] = await checkAndProcessTemplate(
        templateFilePath
      );

      const form = pdfDoc.getForm();
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      const tkdForm = new TKDForm(form, firstPage);

      createStudentForm(
        currStudent,
        latinFont,
        koreanFont,
        tkdForm,
        firstPage,
        testCount,
        latestTestDate
      );

      const pdfBytes = await pdfDoc.save(studentCertFilePath);
      await fs.writeFile(studentCertFilePath + ".pdf", pdfBytes);
    } catch (e) {
      console.error(e);
      throw new Error("Failed on: ", name);
    }
  }
  console.log("Finished.");
  return;
}

await main();

// helpers

async function createStudentForm(
  currStudent,
  latinFont,
  koreanFont,
  currentForm,
  currentPage,
  testCount
) {
  const koreanInfoBlockXPos = currentForm.koreanInfoBlock.x;
  const koreanInfoBlockYPos = currentForm.koreanInfoBlock.y;
  const koreanInfoBlockData = currStudent.generateKoreanInfoBlockValues(
    koreanInfoBlockXPos,
    koreanInfoBlockYPos + 66,
    latinFont,
    koreanFont,
    16.5
  );

  try {
    currentForm.drawRows(currentPage, koreanInfoBlockData);
  } catch (e) {
    console.error("Error in the Korean Info Block: ", e);
  }

  const testCountXPos = currentForm.testCountBlock.x;
  const testCountYPos = currentForm.testCountBlock.y;
  const testCountUnderKoreanInfo =
    currStudent.generateTestCountUnderKoreanBlock(
      testCountXPos,
      testCountYPos,
      testCount,
      latinFont,
      koreanFont,
      16.5
    );

  try {
    currentForm.drawRows(currentPage, testCountUnderKoreanInfo);
  } catch (e) {
    console.error("Error in the testCountUnderKoreanInfo block: ", e);
  }

  const testDateBlockXPos = currentForm.testDateBlock.x;
  const testDateBlockYPos = currentForm.testDateBlock.y;
  const testDateBlock = currStudent.generateTestDateInKorean(
    testDateBlockXPos,
    testDateBlockYPos + 10,
    currStudent.latestTestDate,
    latinFont,
    koreanFont,
    18
  );

  try {
    currentForm.drawRows(currentPage, testDateBlock);
  } catch (e) {
    console.error("Error in testDateInKorean block", e);
  }

  const certificateBlockXPos = currentForm.certificateBlock.x;
  const certificateBlockYPos = currentForm.certificateBlock.y + 43;
  const certificateBlock = currStudent.generateCertificateBlock(
    certificateBlockXPos,
    certificateBlockYPos + 4.75,
    latinFont,
    koreanFont,
    16.5
  );

  try {
    currentForm.drawRows(currentPage, certificateBlock);
  } catch (e) {
    console.error("Error in certificate block", e);
  }

  const certificateBodyLeftBlockXPos = currentForm.certificateBodyLeftBlock.x;
  const certificateBodyLeftBlockYPos =
    currentForm.certificateBodyLeftBlock.y + 43;

  const certificateBlockBodyLeft = currStudent.generateCertificateBodyLeft(
    certificateBodyLeftBlockXPos,
    certificateBodyLeftBlockYPos - 41.5,
    latinFont,
    koreanFont,
    16.5
  );

  try {
    currentForm.drawRows(currentPage, certificateBlockBodyLeft);
  } catch (e) {
    console.error("Error in certificate block left", e);
  }

  const certificateBodyRightBlockXPos = currentForm.certificateBodyRightBlock.x;
  const certificateBodyRightBlockYPos =
    currentForm.certificateBodyRightBlock.y + 43;

  const certificateBlockBodyRight = currStudent.generateCertificateBodyRight(
    certificateBodyRightBlockXPos,
    certificateBodyRightBlockYPos - 41.5,
    testCount,
    latinFont,
    koreanFont,
    16.5
  );

  try {
    currentForm.drawRows(currentPage, certificateBlockBodyRight);
  } catch (e) {
    console.error("Error in certificate block right", e);
  }
}

//helpers
async function checkAndProcessTemplate(templateFilePath) {
  const existingPdfBytes = await fs.readFile(templateFilePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);

  pdfDoc.registerFontkit(fontkit);
  let latinFont;
  let koreanFont;
  try {
    latinFont = await pdfDoc.embedFont(StandardFonts.TimesRoman, {
      subset: true,
    });
    console.log("latin font loaded");
  } catch (error) {
    console.error("Error embedding Latin font:", error);
    throw new Error("Error from latinFont block:", error);
  }
  const nanum_myeongjo = "fonts/Nanum_Myeongjo/NanumMyeongjo-Regular.ttf";
  const nanum_myeongjo_bold = "fonts/Nanum_Myeongjo/NanumMyeongjo-Bold.ttf";
  const noto_serif_kr = "fonts/Noto_Serif_KR/static/NotoSerifKR-Regular.ttf";
  const noto_serif_kr_semi_bold =
    "fonts/Noto_Serif_KR/static/NotoSerifKR-SemiBold.ttf";

  try {
    const koreanFontData = await fs.readFile(noto_serif_kr_semi_bold);
    (koreanFont = await pdfDoc.embedFont(koreanFontData)), { subset: true };
    console.log("Korean font loaded. ");
  } catch (error) {
    console.error("Error embedding Korean font:", error);
    throw new Error("Error from Korean font block:", error); // Add throw here to exit on error
  }

  console.log("PDF Doc and fonts loaded.");

  return [pdfDoc, latinFont, koreanFont];
}

async function processStudentData(
  csvFilePath,
  expectedJsonFilePath,
  latestTestDate
) {
  try {
    const fileContent = await fs.readFile(csvFilePath, "utf8");

    console.log("Processing students data.", fileContent);
    const lines = fileContent.trim().split("\n");

    if (lines.length <= 1) {
      console.log("CSV file is empty or has only headers.");
      return;
    }

    const nameIdx = 0;
    const littleDragonBeltIdx = 1;
    const jrAdultBeltIdx = 2;
    const DOBIdx = 3; // skip 4 at the moment
    const fullNameInKoreanIdx = 5;

    const currentStudentList = [];

    for (let idx = 1; idx < lines.length; idx++) {
      const currLine = lines[idx].split(",");
      const currName = currLine[nameIdx]?.trim();

      if (currName) {
        const capitalizedName = currName
          .split(" ")
          .map((name) => name[0].toUpperCase() + name.slice(1))
          .join(" ");

        let currBelt =
          (littleDragonBeltIdx !== -1 &&
            currLine[littleDragonBeltIdx]?.trim()) ||
          (jrAdultBeltIdx !== -1 && currLine[jrAdultBeltIdx]?.trim());

        if (currBelt) {
          const splitBelt = currBelt
            .split(" ")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            );
          currBelt = splitBelt.join(" ");
        }

        const isLilDragon = currLine[littleDragonBeltIdx] ? true : false;
        const currDOB = DOBIdx !== -1 ? currLine[DOBIdx]?.trim() : undefined;

        const currStudent = {
          name: capitalizedName,
          birthDay: currDOB,
          beltColor: currBelt,
          lilDragon: isLilDragon,
          fullNameInKorean: currLine[fullNameInKoreanIdx].trim(),
          latestTestDate: latestTestDate,
        };

        currentStudentList.push(currStudent);
      }
    }

    const jsonData = JSON.stringify(currentStudentList, null, 2);
    await fs.writeFile(expectedJsonFilePath, jsonData, "utf8");
    console.log(`Updated JSON data written to ${expectedJsonFilePath}`);

    return currentStudentList;
  } catch (e) {
    console.error("Error processing student data:", e);
    return null;
  }
}

async function checkDirectoryExists(directoryPath) {
  try {
    await fs.access(directoryPath); // Check if the path exists
    const stats = await fs.stat(directoryPath); // Get file/directory stats
    return stats.isDirectory(); // Check if it's a directory
  } catch (error) {
    return false; // Path doesn't exist or other error
  }
}

async function checkAndProcessData() {
  const studentDataBasePath = "data/student_data";

  try {
    const studentDataFolder = await fs.readdir(studentDataBasePath);
    const latestTestCount = studentDataFolder
      .filter((folder) => !isNaN(Number(folder)))
      .sort((a, b) => Number(b) - Number(a))[0];

    console.log("Latest test count: ", latestTestCount);

    const latestTestCountPath = path.join(studentDataBasePath, latestTestCount);

    const latestCsvFileName = (await fs.readdir(latestTestCountPath)).filter(
      (file) => file.includes(".csv")
    )[0];

    const latestTestDate = latestCsvFileName.split(".csv")[0];

    console.log(
      "This is latest test date in check and process data",
      latestTestDate
    );
    const latestCsvFilePath = path.join(latestTestCountPath, latestCsvFileName);
    const expectedLatestJsonFileName = `test_${latestTestCount}.json`;
    const expectedJsonFilePath = path.join(
      latestTestCountPath,
      expectedLatestJsonFileName
    );

    console.log("This is latestTestCountPath: ", latestTestCountPath);
    if (!latestTestCountPath.includes(expectedLatestJsonFileName)) {
      console.log("Creating new json file.");
      await processStudentData(
        latestCsvFilePath,
        expectedJsonFilePath,
        latestTestDate
      ); // Use full paths
    }

    return [latestTestCount, expectedJsonFilePath, latestTestDate];
  } catch (e) {
    console.error("Error in checkAndProcessData:", e);
  }
}

async function createTemplateFile(sourceFilePath, savePath) {
  console.log("Creating template file...");
  const existingPdfBytes = await fs.readFile(sourceFilePath);

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const currentForm = new TKDForm(form, firstPage);
  currentForm.createAllBlocks();

  const pdfBytes = await pdfDoc.save(savePath);
  const pathToFormattedFolder =
    "data/formatted_for_template/" +
    "formatted_" +
    sourceFilePath.slice("data/source/".length);
  await fs.writeFile(pathToFormattedFolder, pdfBytes);
  console.log("Successfully created template form to: ", pathToFormattedFolder);
}
