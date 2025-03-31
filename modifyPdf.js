import { homedir } from "os";
import { PDFDocument, rgb, StandardFonts, degrees, PDFPage } from "pdf-lib";
import { text } from "stream/consumers";
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
 * @param {boolean} hasKoreanFont Param to enable Korean workflow.
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
  height,
  font,
  hasKoreanFont = false
) {
  page.drawText(initialValue, {
    x,
    y,
    font,
    size: 12,
  });
  return;

  const textField = form.createTextField(
    hasKoreanFont ? initialValue : fieldName
  );
  if (initialValue) textField.setText(initialValue);
  textField.addToPage(page, {
    x,
    y,
    width,
    height,
    borderWidth: 0,
    hidden: false,
    font,
  });
}

export { addFormFieldToDocument };
