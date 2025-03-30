import { homedir } from "os";
import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from "pdf-lib";
/** form */
/**
 * Adds a single form field to an existing PDF document.
 * @param {PDFDocument} form - The PDFForm object to add the field to.
 * @param {PDFPage} page - The PDFPage object to add the field to.
 * @param {string} fieldName - The name of the form field.
 * @param {string} [initialValue] - The initial value of the form field.
 * @param {number} x - The x-coordinate of the bottom-left corner of the field.
 * @param {number} y - The y-coordinate of the bottom-left corner of the field.
 * @param {number} width - The width of the form field.
 * @param {number} height - The height of the form field.
 * @param {PDFFont} font - The PDFFont object to use for the field's text.
 * @returns {Promise<void>} - A promise that resolves when the field is added.
 */
async function addFormFieldToDocument(
  form, // Receive the PDFForm object
  page, // Receive the PDFPage object
  fieldName,
  initialValue,
  x,
  y,
  width,
  height
) {
  const textField = form.createTextField(fieldName);
  if (initialValue) {
    textField.setText(initialValue);
  }
  textField.addToPage(page, {
    // Use the passed page object
    x,
    y,
    width,
    height,
    borderWidth: 0,
    hidden: true,
  });

  textField.setFontSize;
}
export { addFormFieldToDocument };
