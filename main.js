import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { TKDForm } from "./models/TKDForm.js";
import { Student } from "./models/Student.js";
import { Storage } from "@google-cloud/storage";
import { google } from "googleapis";
import archiver from "archiver";
import { GoogleGenAI } from "@google/genai";
// --- NEW IMPORTS FOR CSV HANDLING ---
import "dotenv/config";
import sgMail from "@sendgrid/mail";
// --- Constants ---
const OUTPUT_BUCKET_NAME = "tkd_output_pdf"; // Your actual output bucket
const ASSETS_BUCKET_NAME = "tkd_assets"; // Your actual assets bucket
const BLANK_TEMPLATE_FILENAME = "blank_template_compressed.pdf";
const KOREAN_FONT_FILENAME = "NotoSerifKR-SemiBold.ttf";

// Google Sheet Details for student_name_map
const SHEET_RANGE = "Sheet1!A:B"; // A: EnglishName, B: KoreanNameq

const CREDENTIALS_PATH = process.env.CREDENTIALS_PATH; // only for local
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PROJECT_ID = process.env.PROJECT_ID;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;
const NAME_MAP_SHEET_ID = process.env.NAME_MAP_SHEET_ID;
const AUTOMATIONHOST_EMAIL = process.env.AUTOMATION_HOST_EMAIL;

const requiredEnvVariables = [
  "GEMINI_API_KEY",
  "PROJECT_ID",
  "SENDGRID_API_KEY",
  "RECIPIENT_EMAIL",
  "NAME_MAP_SHEET_ID",
  "AUTOMATION_HOST_EMAIL",
];

const env = {};

for (const varName of requiredEnvVariables) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
  env[varName] = process.env[varName];
}

console.log("All environment variables loaded successfully!");

if (!GEMINI_API_KEY) {
  throw new Error("Failed to loaded GEMINI API Key.");
}

export async function main(eventMetaData) {
  console.log("Starting application ...");

  const auth = new google.auth.GoogleAuth({
    scopes: [
      "https://www.googleapis.com/auth/drive", // To read files from Google Drive
      "https://www.googleapis.com/auth/spreadsheets", // Still needed for the name map sheet
      "https://www.googleapis.com/auth/devstorage.read_write", // <-- ADD THIS FOR GCS!
    ],
    ...(CREDENTIALS_PATH && { keyFile: CREDENTIALS_PATH }), // Corrected conditional keyFile
  });
  const authClient = await auth.getClient();

  const drive = google.drive({ version: "v3", auth: authClient });
  const sheets = google.sheets({ version: "v4", auth: authClient });
  // --- Initialize Storage FIRST ---

  const storage = new Storage({
    projectId: PROJECT_ID,
    ...(CREDENTIALS_PATH && { keyFilename: CREDENTIALS_PATH }),
  });

  let assetsBucket = storage.bucket(ASSETS_BUCKET_NAME);

  // -- Load PDF
  const templateFile = assetsBucket.file(
    `templates/${BLANK_TEMPLATE_FILENAME}`
  );
  const koreanFontFile = assetsBucket.file(`fonts/${KOREAN_FONT_FILENAME}`);
  // metadata constants
  const FILE_ID = eventMetaData.fileId;
  const FILE_NAME = eventMetaData?.fileName?.includes(" copy")
    ? eventMetaData.fileName.replace(" copy", "") // Removed '...' and added '' for replacement
    : eventMetaData?.fileName || "172_06_08_2025";
  let [extractTestNumber, month, day, year] = FILE_NAME.split("_");

  const TEST_NUMBER = extractTestNumber;
  const TEST_DATE = [month, day, year];
  const CSV_DATA = eventMetaData.csvContent;
  const [studentList, updateKoreanNamesList] =
    await parseCsvToJsonAndReturnStudentsList(CSV_DATA, TEST_DATE, TEST_NUMBER);

  // 3. Download both files concurrently for efficiency
  // Use Promise.all to wait for both downloads to complete at once
  const [templateDownloadResult, koreanFontDownloadResult] = await Promise.all([
    templateFile.download(),
    koreanFontFile.download(),
  ]);
  const [templateBuffer] = templateDownloadResult;
  console.log("Template PDF downloaded from Cloud Storage.");

  const [koreanFontBuffer] = koreanFontDownloadResult;
  console.log("Korean font downloaded from Cloud Storage.");

  // start of processing PDFs
  const allGeneratedPdfs = [];
  console.log("Entering processing students map");

  for (const student of studentList) {
    const existingPdfBytes = templateBuffer;
    const studentPdfDoc = await PDFDocument.load(existingPdfBytes, {
      // You might need to disable strict parsing if your compressed PDF has minor issues
      // ignoreEncryption: true,
      // throwOnInvalidObject: false,
    });
    studentPdfDoc.registerFontkit(fontkit);
    const studentPages = studentPdfDoc.getPages();
    const studentFirstPage = studentPages[0];

    // TODO: tried setting the font characters to feed into the doc rather than loading all of it.
    // still not sure how to use it so we can reduce the amount of characters we inject into the document
    const allKoreanText = [
      student.fullNameInKorean,
      Student.rankInKorean,
      Student.monthInKorean,
      Student.dayInKorean,
      "품",
    ]
      .filter(Boolean)
      .join("");

    const uniqueKoreanUnicodes = new Set();
    for (const char of allKoreanText) {
      uniqueKoreanUnicodes.add(char.codePointAt(0));
    }

    let koreanFont = await studentPdfDoc.embedFont(koreanFontBuffer, {
      family: "Noto Serif KR",
      subset: false,
    });

    let latinFont = await studentPdfDoc.embedFont(StandardFonts.TimesRoman, {
      subset: true,
    });

    const tkdForm = new TKDForm(studentPdfDoc, studentFirstPage);

    console.log(`Template has ${studentPages.length} page(s).`);
    console.log("Korean font embedded into PDFDocument.");
    console.log("Latin font embedded into PDFDocument.");
    console.log("Template PDF loaded into PDFDocument.");

    createStudentForm(
      student,
      latinFont,
      koreanFont,
      tkdForm,
      studentFirstPage,
      TEST_NUMBER,
      TEST_DATE
    );

    const studentFileName = student.name + ".pdf";

    //This portion is for saving to zip portion
    const uint8ArrayPdf = await studentPdfDoc.save();
    const pdfBytes = Buffer.from(uint8ArrayPdf);
    allGeneratedPdfs.push({ fileName: studentFileName, pdfBytes });
    console.log("Finished processing ", student.name);
  }

  console.log("All student forms processed.");
  // zipper portion
  let batchZipSignedUrl;
  try {
    batchZipSignedUrl = await createAndUploadZip(
      allGeneratedPdfs,
      String(TEST_NUMBER) + "_" + TEST_DATE,
      OUTPUT_BUCKET_NAME,
      storage
    );
    console.log("Batch Zip Signed URL:", batchZipSignedUrl);
  } catch (e) {
    console.error("Failed to create and upload batch zip: ", e);
  }

  // update names
  const valuesToAppend = updateKoreanNamesList.map((entry) => [
    entry.englishName,
    entry.koreanName,
  ]);

  try {
    const appendResponse = await sheets.spreadsheets.values.append({
      spreadsheetId: NAME_MAP_SHEET_ID,
      range: SHEET_RANGE, // Append to the end of the specified sheet and range
      valueInputOption: "RAW", // Treat input values as raw strings
      resource: {
        values: valuesToAppend,
      },
    });

    console.log(
      `Successfully appended ${appendResponse.data.updates.updatedCells} cells ` +
        `across ${appendResponse.data.updates.updatedRows} rows to Google Sheet.`
    );
  } catch (writeError) {
    console.error("Error writing new names back to Google Sheet:", writeError);
  }
  sgMail.setApiKey(SENDGRID_API_KEY);

  const msg = {
    to: [RECIPIENT_EMAIL, "mjsigg@gmail.com"],
    from: AUTOMATIONHOST_EMAIL, // Change to your verified sender
    subject: `PDFs for Test Number: ${TEST_NUMBER} on Date: ${TEST_DATE}`,
    text: "Download",
    html: `
      <p>Please click on your form here: <span><a href=${batchZipSignedUrl}>Link for PDFs.</span></a></p>
      <p>Link is valid for 24 hours from this message.</p>`,
  };
  sgMail
    .send(msg)
    .then(() => {
      console.log("Email sent");
    })
    .catch((error) => {
      console.error(error);
    });

  console.log("End of application...");
  return;
}
if (CREDENTIALS_PATH) {
  main();
}
// -------------------------------------------------------end of app main
async function parseCsvToJsonAndReturnStudentsList(
  csvString,
  TEST_DATE,
  TEST_NUMBER
) {
  const lines = csvString
    .split(/\r?\n|\r/)
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) {
    return []; // Return empty array if no data
  }
  // const headers = lines[0].replace("\r\n", "").split(","); // Get headers from the first line
  const studentsList = [];
  const updateKoreanNamesList = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",");

    let [
      studentName,
      lilDragonBelt,
      jrAdultBelt,
      DOB,
      isJrOrAdult,
      nameInKorean,
    ] = values;

    if (!nameInKorean) {
      console.log(
        `Name "${studentName.trim()}" not found in map. Calling Gemini for translation.`
      );
      nameInKorean = await convertLatinNameToKorean(
        studentName.trim(),
        GEMINI_API_KEY
      ); // Await the Gemini call
      if (nameInKorean) {
        nameInKorean = nameInKorean.replace(/\n/g, "").trim(); // Use regex for all newlines and trim

        const newEntryForSheet = {
          englishName: studentName, // The original English name from CSV
          koreanName: nameInKorean, // The translated Korean name from Gemini
        };
        updateKoreanNamesList.push(newEntryForSheet);
        console.log(`Gemini translated "${studentName}" to "${nameInKorean}".`);
      } else {
        console.error(
          "Failed to convert studens name to Korean.  EnglisName: ",
          studentName
        );
      }
    }

    const currentStudent = new Student(
      studentName,
      DOB,
      lilDragonBelt ? lilDragonBelt : jrAdultBelt,
      lilDragonBelt ? true : false,
      nameInKorean,
      TEST_DATE
    );
    studentsList.push(currentStudent);
  }

  console.log("Finished populating studentlist");
  console.log(
    "Number of studentNames to be updated: ",
    updateKoreanNamesList.length
  );
  return [studentsList, updateKoreanNamesList];
}

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

// zipper helper
async function createAndUploadZip(
  pdfsToZip,
  zipFileName = "all_student_forms.zip",
  OUTPUT_BUCKET_NAME,
  storage
) {
  return new Promise(async (resolve, reject) => {
    const archive = archiver("zip", {
      zlib: { level: 9 }, // Sets the compression level.
    });

    // Create a buffer to store the zip archive
    const zipBufferChunks = [];
    archive.on("data", (chunk) => zipBufferChunks.push(chunk));
    archive.on("end", async () => {
      const zipBuffer = Buffer.concat(zipBufferChunks);

      console.log(
        `Zip file "${zipFileName}" created. Size: ${zipBuffer.length} bytes`
      );

      // 1. Upload the Zip Buffer to GCS
      const bucket = storage.bucket(OUTPUT_BUCKET_NAME);
      const file = bucket.file(zipFileName);

      try {
        await file.save(zipBuffer, {
          metadata: { contentType: "application/zip" },
          resumable: false,
        });
        console.log(
          `Zip file "${zipFileName}" uploaded to ${OUTPUT_BUCKET_NAME}.`
        );

        // 2. Generate a signed URL for the Zip file (expires in one day)
        const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;
        const [signedUrl] = await file.getSignedUrl({
          version: "v4",
          action: "read",
          expires: Date.now() + ONE_DAY_IN_MS,
        });

        console.log(`Signed URL for "${zipFileName}": ${signedUrl}`);
        resolve(signedUrl);
      } catch (uploadError) {
        console.error(
          `Error uploading or generating signed URL for "${zipFileName}":`,
          uploadError
        );
        reject(uploadError);
      }
    });

    archive.on("error", (err) => reject(err));

    // Add each PDF to the zip archive
    for (const pdfItem of pdfsToZip) {
      archive.append(pdfItem.pdfBytes, { name: pdfItem.fileName });
    }

    archive.finalize(); // Finalize the archive (trigger 'end' event)
  });
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
    (koreanFont = await pdfDoc.embedFont(koreanFontData)), { subset: false };
    console.log("Korean font loaded. ");
  } catch (error) {
    console.error("Error embedding Korean font:", error);
    throw new Error("Error from Korean font block:", error); // Add throw here to exit on error
  }

  console.log("PDF Doc and fonts loaded.");

  return [pdfDoc, latinFont, koreanFont];
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

export async function convertLatinNameToKorean(latinName, GEMINI_API_KEY) {
  try {
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `Convert the following name from latin into Korean ${latinName}. Ensure that the format is in Korean only.  Ensure that you ONLY resond with the name in Korean.  Ensure that there are no newline characters returned back in the response.`,
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
