import fs from "fs/promises";

import path from "path";

import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { TKDForm } from "./models/TKDForm.js";
import { Student } from "./models/Student.js";
import { convertLatinNameToKorean } from "./services/GeminiService.js";

async function main() {
  const sourceFilePath = "data/source/updated_min.pdf";
  const [testCount, jsonFilePath] = await checkAndProcessData();
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
    const student = val;
    const { name, birthDay, beltColor, lilDragon, fullNameInKorean } = student;
    const currStudent = new Student(
      name,
      birthDay,
      beltColor,
      lilDragon,
      fullNameInKorean
    );

    try {
      const studentCertFilePath = path.join(
        outPutFilesTestPath,
        currStudent.name
      );

      const BLANK_TEMPLATE_FILENAME = "blank_template.pdf";
      const [pdfDoc, latinFont, koreanFont] = await checkAndProcessTemplate(
        sourceFilePath,
        BLANK_TEMPLATE_FILENAME
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
        testCount
      );

      const pdfBytes = await pdfDoc.save(studentCertFilePath);
      await fs.writeFile(studentCertFilePath + ".pdf", pdfBytes);
    } catch (e) {
      console.error(e);
      throw new Error("Failed on: ", name);
    }
  }

  return;
}

await main();

// helpers
async function createTemplateFile(sourceFilePath, savePath) {
  console.log("Creating template file...");
  const existingPdfBytes = fs.readFileSync(sourceFilePath);
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
  fs.writeFileSync(pathToFormattedFolder, pdfBytes);
  console.log("Successfully created template form to: ", pathToFormattedFolder);
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
    "",
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

main();

//helpers
async function checkAndProcessTemplate(
  sourceFilePath,
  BLANK_TEMPLATE_FILENAME
) {
  const templateFolderPath = "data/template";
  const templateFilePath = path.join(
    templateFolderPath,
    BLANK_TEMPLATE_FILENAME
  );
  const templateFormatPath = "formatted_for_template/readyForEdit.pdf";
  const templatefilesAndDirs = await fs.readdir(templateFolderPath);

  const existingPdfBytes = await fs.readFile(templateFilePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  let latinFont;
  let koreanFont;
  let createTemplate = false;

  if (templatefilesAndDirs.length > 1) {
    throw new Error(
      "Check template folder. We should be expecting only one called, blank template."
    );
  }

  if (createTemplate || templatefilesAndDirs.length === 0) {
    await createTemplateFile(sourceFilePath, templateFormatPath);
    console.log(
      "Creating template.  Need to print and move to formatted_for_template after creation to prep for drawing."
    );
    return;
  }

  if (!templatefilesAndDirs.includes(BLANK_TEMPLATE_FILENAME)) {
    throw new Error(
      `Expected '${BLANK_TEMPLATE_FILENAME}' in the template folder.`
    );
  }

  pdfDoc.registerFontkit(fontkit);

  try {
    latinFont = await pdfDoc.embedFont(StandardFonts.TimesRoman, {
      subset: true,
    });
    console.log("latin font loaded");
  } catch (error) {
    console.error("Error embedding Latin font:", error);
    throw new Error("Error from latinFont block:", error);
  }

  try {
    const koreanFontData = await fs.readFile(
      "fonts/WantedSans-1.0.3/ttf/WantedSans-Medium.ttf"
    );
    koreanFont = await pdfDoc.embedFont(koreanFontData);
    console.log("Korean font loaded. ");
  } catch (error) {
    console.error("Error embedding Korean font:", error);
    throw new Error("Error from Korean font block:", error); // Add throw here to exit on error
  }

  console.log("PDF Doc and fonts loaded.");

  return [pdfDoc, latinFont, koreanFont];
}

async function processStudentData(csvFilePath, outputJsonPath) {
  try {
    const fileContent = await fs.readFile(csvFilePath, "utf8");
    const lines = fileContent.trim().split("\n");

    if (lines.length <= 1) {
      console.log("CSV file is empty or has only headers.");
      return;
    }

    const nameIdx = 0;
    const littleDragonBeltIdx = 1;
    const jrAdultBeltIdx = 2;
    const DOBIdx = 3;
    const lilDragonIdx = 4;

    const studentDataPromises = [];

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

        const isLilDragon =
          lilDragonIdx !== -1 &&
          currLine[lilDragonIdx]?.toLowerCase().includes("dragon");
        const currDOB = DOBIdx !== -1 ? currLine[DOBIdx]?.trim() : undefined;

        // Create a promise to fetch the Korean name and then create the student object
        const studentPromise = convertLatinNameToKorean(capitalizedName)
          .then((koreanName) => ({
            name: capitalizedName,
            birthDay: currDOB,
            beltColor: currBelt,
            lilDragon: isLilDragon,
            fullNameInKorean: koreanName.replace("\n", ""), // because of new lines
          }))
          .catch((error) => {
            console.error(
              `Error converting name for ${capitalizedName}:`,
              error.message
            );
            return {
              name: capitalizedName,
              birthDay: currDOB,
              beltColor: currBelt,
              lilDragon: isLilDragon,
              fullNameInKorean: "Conversion Failed",
            };
          });

        studentDataPromises.push(studentPromise);
      }
    }

    // Wait for all student data (including Korean names) to be fetched
    const updatedStudentsList = await Promise.all(studentDataPromises);

    // Write the JSON object to a file
    const jsonData = JSON.stringify(updatedStudentsList, null, 2);
    await fs.writeFile(outputJsonPath, jsonData, "utf8");
    console.log(`Updated JSON data written to ${outputJsonPath}`);

    return updatedStudentsList;
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

async function getLatestTestCountDirectory() {
  const studentDataBasePath = "data/student_data";
  const filesAndDirs = await fs.readdir(studentDataBasePath);
  const testCountDirectories = [];

  for (const item of filesAndDirs) {
    const itemPath = path.join(studentDataBasePath, item);
    const stats = await fs.stat(itemPath);
    if (stats.isDirectory() && /^\d+$/.test(item)) {
      // Assuming testCount dirs are numbers
      testCountDirectories.push(item);
    }
  }

  if (testCountDirectories.length === 0) {
    throw new Error("No test count directories found.");
  }

  testCountDirectories.sort((a, b) => parseInt(b) - parseInt(a)); // Get latest (highest number)
  return testCountDirectories[0];
}

async function checkAndProcessData() {
  const studentDataBasePath = "data/student_data";
  let csvFileName = null;
  let testCountPath = null;
  let testCsvFilePath = null;
  let expectedTestCountParsedJsonName = null;
  let jsonFilePath = null;
  let testCountPathHasJson = false;

  try {
    let testCount = await getLatestTestCountDirectory();
    csvFileName = `test_${testCount}.csv`;
    expectedTestCountParsedJsonName = `test_${testCount}.json`;
    testCountPath = path.join(studentDataBasePath, testCount);
    testCsvFilePath = path.join(testCountPath, csvFileName);
    jsonFilePath = path.join(testCountPath, expectedTestCountParsedJsonName);

    try {
      await fs.access(testCsvFilePath);
      console.log(`CSV file found: ${testCsvFilePath}`);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(
          `CSV file not found at expected path: ${testCsvFilePath}`
        );
      } else {
        throw new Error(`Error accessing CSV file: ${error.message}`);
      }
    }

    try {
      await fs.access(jsonFilePath);
      console.log(`JSON file found: ${jsonFilePath}`);
      testCountPathHasJson = true;
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log(`JSON file not found, processing CSV.`);
        testCountPathHasJson = false;
      } else {
        throw new Error(`Error accessing JSON file: ${error.message}`);
      }
    }

    if (!testCountPathHasJson) {
      await processStudentData(testCsvFilePath, jsonFilePath); // Use full paths
    }
    console.log("Json file exists: ", jsonFilePath);
    return [testCount, jsonFilePath];
  } catch (e) {
    console.error("Error in checkAndProcessData:", e);
  }
}
