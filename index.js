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
// --- Constants ---
const OUTPUT_BUCKET_NAME = "tkd_output_pdf"; // Your actual output bucket
const ASSETS_BUCKET_NAME = "tkd_assets"; // Your actual assets bucket
const BLANK_TEMPLATE_FILENAME = "blank_template_compressed.pdf";
const KOREAN_FONT_FILENAME = "NotoSerifKR-SemiBold.ttf";

// Google Sheet Details for student_name_map
const SPREADSHEET_ID = "1YRuZUPwIASP1U-N0CT7KtHaYEJ6v0lOYfiF0mc0FB_M";
const SHEET_RANGE = "Sheet1!A:B"; // Adjust 'Sheet1' to your actual sheet tab name if different

export async function main(event, context) {
  let inputFileName;
  let inputBucketName;
  const storage = new Storage();

  console.log("Attemping to load blank template file and korean font");
  const assetsBucket = storage.bucket(ASSETS_BUCKET_NAME);
  const templateFile = assetsBucket.file(
    `templates/${BLANK_TEMPLATE_FILENAME}`
  );
  const koreanFontFile = assetsBucket.file(`fonts/${KOREAN_FONT_FILENAME}`);

  // 3. Download both files concurrently for efficiency
  const [templateDownloadResult, koreanFontDownloadResult] = await Promise.all([
    templateFile.download(),
    koreanFontFile.download(),
  ]);

  const [templateBuffer] = templateDownloadResult;
  console.log("Template PDF downloaded from Cloud Storage.");

  const [koreanFontBuffer] = koreanFontDownloadResult;
  console.log("Korean font downloaded from Cloud Storage.");

  // 4. Load the PDF document from the downloaded buffer
  const existingPdfBytes = templateBuffer;
  const pdfDoc = await PDFDocument.load(existingPdfBytes, {
    // You might need to disable strict parsing if your compressed PDF has minor issues
    // ignoreEncryption: true,
    // throwOnInvalidObject: false,
  });

  // 5. Register fontkit and embed the Korean font
  pdfDoc.registerFontkit(fontkit);
  const koreanFont = await pdfDoc.embedFont(koreanFontBuffer, {
    family: "Noto Serif KR", // A descriptive name for your font
    // subsets: [0, 1] // Optional: if you only need certain Unicode ranges for smaller size
  });
  console.log("Korean font embedded into PDFDocument.");
  // Example: Get the first page of the template
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  console.log(`Template has ${pages.length} page(s).`);

  let studentNameMap = new Map();
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const authClient = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: authClient });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: SHEET_RANGE,
  });

  const values = response.data.values.slice(1);

  if (values && values.length > 0) {
    values.forEach((row) => {
      if (row[0] && row[1]) {
        studentNameMap.set(row[0].trim(), row[1].trim());
      }
    });
    console.log(
      `Successfully loaded ${studentNameMap.size} name mappings from Google Sheet.`
    );
  } else {
    throw new Error("Failed to load students map.  Check google sheet.");
  }

  return;

  const [testCount, jsonFilePath, latestTestDate] = await checkAndProcessData();
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
