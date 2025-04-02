import fs from "fs";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { TKDForm } from "./models/TKDForm.js";
import { Student } from "./models/Student.js";

async function createTemplateFile(inputFilePath, outputFilePath) {
  console.log("Creating template file...");
  const existingPdfBytes = fs.readFileSync(inputFilePath);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];

  const formConfig = new TKDForm(form, firstPage);
  formConfig.createAllBlocks();

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputFilePath, pdfBytes);
  console.log("Successfully created template form to: ", outputFilePath);
}

function drawText(page, textVal, xPos, yPos, font, size) {
  const options = {
    x: xPos,
    y: yPos,
    font,
    size,
  };
  page.drawText(textVal, options);
}

async function main() {
  // const originalFile = "converted_tkd.pdf";
  const templateFile = "data/template/blank_template.pdf";
  // await createTemplateFile(originalFile, templateFile);
  console.log("Application starting...");
  const currStudent = new Student("Michael", "", "Sigg", "6-3-2004", "4D");

  const existingPdfBytes = fs.readFileSync(templateFile);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const formConfig = new TKDForm(form, firstPage);
  const outPutFile = "data/tkd_cert.pdf";
  const testCount = 58;

  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica, {
    subset: true,
  });
  const koreanFontData = fs.readFileSync(
    // "fonts/WantedSans-1.0.3/ttf/WantedSans-Regular.ttf"
    "fonts/WantedSans-1.0.3/ttf/WantedSans-Medium.ttf"
    // "fonts/NotoSansKR/NotoSansKR-VariableFont_wght.ttf"
  );

  const koreanFont = await pdfDoc.embedFont(koreanFontData);
  const koreanInfoBlockXPos = formConfig.koreanInfoBlock.x;
  const koreanInfoBlockYPos = formConfig.koreanInfoBlock.y;
  const koreanInfoBlockData = currStudent.generateKoreanInfoBlockValues(
    koreanInfoBlockXPos,
    koreanInfoBlockYPos + 66,
    helveticaFont,
    koreanFont
  );

  try {
    formConfig.drawRows(firstPage, koreanInfoBlockData);
  } catch (e) {
    console.error("Error in the Korean Info Block: ", e);
  }

  const testCountXPos = formConfig.testCountBlock.x;
  const testCountYPos = formConfig.testCountBlock.y;
  const testCountUnderKoreanInfo =
    currStudent.generateTestCountUnderKoreanBlock(
      testCountXPos,
      testCountYPos,
      testCount,
      helveticaFont,
      koreanFont
    );

  try {
    formConfig.drawRows(firstPage, testCountUnderKoreanInfo);
  } catch (e) {
    console.error("Error in the testCountUnderKoreanInfo block: ", e);
  }

  const testDateBlockXPos = formConfig.testDateBlock.x;
  const testDateBlockYPos = formConfig.testDateBlock.y;
  const testDateBlock = currStudent.generateTestDateInKorean(
    testDateBlockXPos,
    testDateBlockYPos + 4.75,
    "",
    helveticaFont,
    koreanFont,
    18
  );

  try {
    formConfig.drawRows(firstPage, testDateBlock);
  } catch (e) {
    console.error("Error in testDateInKorean block", e);
  }

  const certificateBlockXPos = formConfig.certificateBlock.x;
  const certificateBlockYPos = formConfig.certificateBlock.y + 43;
  const certificateBlock = currStudent.generateCertificateBlock(
    certificateBlockXPos,
    certificateBlockYPos + 4.75,
    helveticaFont,
    koreanFont
  );

  try {
    formConfig.drawRows(firstPage, certificateBlock);
  } catch (e) {
    console.error("Error in certificate block", e);
  }

  const certificateBodyLeftBlockXPos = formConfig.certificateBodyLeftBlock.x;
  const certificateBodyLeftBlockYPos =
    formConfig.certificateBodyLeftBlock.y + 43;

  const certificateBlockBodyLeft = currStudent.generateCertificateBodyLeft(
    certificateBodyLeftBlockXPos,
    certificateBodyLeftBlockYPos - 41.5,
    helveticaFont,
    koreanFont
  );

  try {
    formConfig.drawRows(firstPage, certificateBlockBodyLeft);
  } catch (e) {
    console.error("Error in certificate block left", e);
  }

  const certificateBodyRightBlockXPos = formConfig.certificateBodyRightBlock.x;
  const certificateBodyRightBlockYPos =
    formConfig.certificateBodyRightBlock.y + 43;

  const certificateBlockBodyRight = currStudent.generateCertificateBodyRight(
    certificateBodyRightBlockXPos,
    certificateBodyRightBlockYPos - 41.5,
    testCount,
    helveticaFont,
    koreanFont
  );

  try {
    formConfig.drawRows(firstPage, certificateBlockBodyRight);
  } catch (e) {
    console.error("Error in certificate block right", e);
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outPutFile, pdfBytes);
}

main();
