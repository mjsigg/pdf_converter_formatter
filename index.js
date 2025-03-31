import fs from "fs";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { TKDForm } from "./models/tkdForm.js";
import { create } from "domain";

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
  const templateFile = "blank_template.pdf";
  // await createTemplateFile(originalFile, templateFile);
  console.log("Application starting...");

  const existingPdfBytes = fs.readFileSync(templateFile);
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const formConfig = new TKDForm(form, firstPage);
  const outPutFile = "tkd_cert.pdf";
  const classCount = 58;

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
  const koreanInfoBlockYPos = formConfig.koreanInfoBlock.y + 66;
  function createTextOptions(text, font, x, y) {
    return {
      text: text,
      font: font,
      x: x,
      y: y,
    };
  }

  function drawRows(page, rowArr, size = 14) {
    for (let rowIndex = 0; rowIndex < rowArr.length; rowIndex++) {
      const row = rowArr[rowIndex];
      row.forEach((optionFunction, textIndex) => {
        // Changed 'options' to 'optionFunction'
        const options = optionFunction(); // Call the function to get the object
        const adjustedX = options.x + textIndex * 24;
        const adjustedY = options.y - rowIndex * 21;
        page.drawText(options.text, {
          x: adjustedX,
          y: adjustedY,
          font: options.font,
          size,
        });
      });
    }
  }

  const koreanInfoFirstRow = [
    () =>
      createTextOptions(
        "4D",
        helveticaFont,
        koreanInfoBlockXPos,
        koreanInfoBlockYPos
      ),
    () =>
      createTextOptions(
        "급",
        koreanFont,
        koreanInfoBlockXPos,
        koreanInfoBlockYPos
      ),
  ];

  const koreanInfoSecondRow = [
    () =>
      createTextOptions(
        "마이클 시그",
        koreanFont,
        koreanInfoBlockXPos,
        koreanInfoBlockYPos
      ),
  ];

  const koreanInfoThirdRow = [
    () =>
      createTextOptions(
        new Date().getFullYear().toString(),
        helveticaFont,
        koreanInfoBlockXPos,
        koreanInfoBlockYPos
      ),
    () =>
      createTextOptions(
        "년",
        koreanFont,
        koreanInfoBlockXPos + 25,
        koreanInfoBlockYPos
      ),
    () =>
      createTextOptions(
        new Date().getMonth().toString(),
        helveticaFont,
        koreanInfoBlockXPos + 25,
        koreanInfoBlockYPos
      ),
    () =>
      createTextOptions(
        "월",
        koreanFont,
        koreanInfoBlockXPos + 25,
        koreanInfoBlockYPos
      ),
    () =>
      createTextOptions(
        new Date().getDate().toString(),
        helveticaFont,
        koreanInfoBlockXPos + 25,
        koreanInfoBlockYPos
      ),
    () =>
      createTextOptions(
        "일",
        koreanFont,
        koreanInfoBlockXPos + 25,
        koreanInfoBlockYPos
      ),
  ];

  drawRows(firstPage, [
    koreanInfoFirstRow,
    koreanInfoSecondRow,
    koreanInfoThirdRow,
  ]);

  const testCountBlock = [
    () =>
      createTextOptions(
        classCount.toString(),
        helveticaFont,
        formConfig.testCountBlock.x + 10,
        formConfig.testCountBlock.y + 6
      ),
  ];

  drawRows(firstPage, [testCountBlock]);

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outPutFile, pdfBytes);

  // const korean_info_x = 259;
  // const korean_info_y = 520;
  // const korean_info_width = 240;
  // const korean_info_height = 78;
  // const korean_info_belt_info_latin = ["Latin: Taekwondo", "4D"]; // might need to break this into multiple elements since the numbers and letter seem to be in different fonts
  // const korean_info_belt_info_korean = ["Korean: Taekwondo", "급"]; // might need to break this into multiple elements since the numbers and letter seem to be in different fonts
  // const korean_recipient_name = ["Korean: Name in Korean", "마이클 시그"];
  // const korean_current_date = [
  //   "Korean: Receipient Birthday",
  //   `${new Date().getFullYear()} PH ${new Date().getMonth()} PH ${new Date().getDate()}`,
  // ];
  // const korean_operations = [
  //   korean_info_belt_info_latin,
  //   korean_info_belt_info_korean,
  //   korean_recipient_name,
  //   korean_current_date,
  // ];
  // for (let i = 0; i < korean_operations.length; i++) {
  //   const fieldName = korean_operations[i][0];
  //   const fieldValue = korean_operations[i][1];
  //   const hasKoreanFont = fieldName.startsWith("Korean:");
  //   firstPage.drawText(fieldValue, {
  //     x: korean_info_x,
  //     y: korean_info_y,
  //     font: hasKoreanFont ? koreanFont : helveticaFont,
  //     size: 20,
  //   });
  // await addFormFieldToDocument(
  //   form,
  //   firstPage,
  //   fieldName,
  //   fieldValue,
  //   korean_info_x,
  //   korean_info_y - 23 * (hasKoreanFont ? i - 1 : i), // presuming that we always write the korean text right after and we never start with one
  //   korean_info_width,
  //   korean_info_height,
  //   hasKoreanFont ? koreanFont : helveticaFont,
  //   hasKoreanFont
  // );
  // }
  // // certificateblock
  // const certificate_x = 240;
  // const certificate_y = 289;
  // const certificate_width = 250;
  // const certificate_height = 22.5;
  // const taekwondo = ["Taekwondo", "4D Keub  Purple Belt"];
  // const nameInFull = ["Name in full", "Michael Sigg"];
  // const dateOfBirth = ["Date of Birth", "November 5th, 1969"]; // example of original Month(full spelling), Day, Year => November 5th, 1886
  // const operations = [taekwondo, nameInFull, dateOfBirth];
  // //
  // for (let i = 0; i < operations.length; i++) {
  //   const fieldName = operations[i][0];
  //   const fieldValue = operations[i][1];
  //   //
  //   await addFormFieldToDocument(
  //     form,
  //     firstPage,
  //     fieldName,
  //     fieldValue,
  //     certificate_x,
  //     certificate_y - 23 * i,
  //     certificate_width,
  //     certificate_height,
  //     helveticaFont
  // );
  // }
  // } catch (e) {
  //   console.error("Error processing PDF:", e);
  // }
  // try {
  //   const pdfBytes = await pdfDoc.save();
  //   fs.writeFileSync(outPutFile, pdfBytes);
  //   // console.log(`PDF with multiple form fields saved to ${outPutFile}!`);
  // } catch (e) {
  //   console.error("Error processing save.", e);
  // }
}

main();
