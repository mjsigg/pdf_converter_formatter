export class TKDForm {
  constructor(form, firstPage) {
    this.form = form;
    this.firstPage = firstPage;

    this.koreanInfoBlock = { x: 259, y: 522, width: 240, height: 76 };
    this.testCountBlock = { x: 440, y: 500, width: 40, height: 17 };
    this.testDateBlock = { x: 240, y: 440, width: 240, height: 25 };
    this.certificateBlock = { x: 240, y: 249, width: 250, height: 68 };
    this.certificateBodyLeftBlock = { x: 228, y: 187, width: 40, height: 18 };
    this.certificateBodyRightBlock = {
      x: this.certificateBodyLeftBlock.x + 195,
      y: this.certificateBodyLeftBlock.y,
      width: this.certificateBodyLeftBlock.width + 20,
      height: this.certificateBodyLeftBlock.height,
    };
  }

  createBlock(fieldName, { x, y, width, height }) {
    try {
      const textField = this.form.createTextField(fieldName);
      textField.addToPage(this.firstPage, {
        x,
        y,
        width,
        height,
        borderWidth: 0,
      });
    } catch (e) {
      console.error("Failed on createBlock on fieldName: ", fieldName);
      throw new Error(e);
    }
  }
  //  this method is to block out flood an area so it can't be seen on the form.
  createAllBlocks() {
    this.createBlock("Korean Info Block", this.koreanInfoBlock);
    this.createBlock("Test Count", this.testCountBlock);
    this.createBlock("Test Date Block", this.testDateBlock);
    this.createBlock("Certificate Block", this.certificateBlock);
    this.createBlock(
      "Certificate Block Body Left",
      this.certificateBodyLeftBlock
    );
    this.createBlock(
      "Certificate Block Body Right",
      this.certificateBodyRightBlock
    );
  }

  drawRows(page, rowArr, size = 14) {
    for (let rowIndex = 0; rowIndex < rowArr.length; rowIndex++) {
      const row = rowArr[rowIndex];
      row.forEach((optionFunction, textIndex) => {
        const options = optionFunction(); // Call the function to get the object
        const adjustedX = options.x + textIndex * 24;
        const adjustedY = options.y - rowIndex * 21;
        page.drawText(options.text, {
          x: adjustedX,
          y: adjustedY,
          font: options.font,
          size: options.size,
        });
      });
    }
  }
}
