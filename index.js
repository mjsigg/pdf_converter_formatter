import fs from "fs";
import { addFormFieldToDocument } from "./modifyPdf.js"; // Assuming you use the in-memory approach
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";

console.log("app start");
const targetFile = "converted_tkd.pdf";
const outPutFile = "output_file.pdf";

async function main() {
  try {
    const existingPdfBytes = fs.readFileSync(targetFile);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const form = pdfDoc.getForm();
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // certificateblock
    const certificate_x = 240;
    const certificate_y = 289;
    const certificate_width = 250;
    const certificate_height = 22.5;

    const taekwondo = ["Taekwondo", "4D Keub  Purple Belt"];
    const nameInFull = ["Name in full", "Michael Sigg"];
    const dateOfBirth = ["Date of Birth", "Michael Sigg"];
    const operations = [taekwondo, nameInFull, dateOfBirth];

    for (let i = 0; i < operations.length; i++) {
      const fieldName = operations[i][0];
      const fiedValue = operations[i][1];
      await addFormFieldToDocument(
        form,
        firstPage,
        fieldName,
        fiedValue,
        certificate_x,
        certificate_y - 23 * i,
        certificate_width,
        certificate_height
      );
    }

    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outPutFile, pdfBytes);

    console.log(`PDF with multiple form fields saved to ${outPutFile}!`);
  } catch (error) {
    console.error("Error processing PDF:", error);
  }
}

main();
