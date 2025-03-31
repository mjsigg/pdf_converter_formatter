export class TKDForm {
  constructor(form, firstPage) {
    this.form = form;
    this.firstPage = firstPage;

    this.koreanInfoBlock = { x: 259, y: 520, width: 240, height: 78 };
    this.testCountBlock = { x: 440, y: 500, width: 40, height: 17 };
    this.testDateBlock = { x: 215, y: 440, width: 240, height: 27 };
    this.certificateBlock = { x: 240, y: 248, width: 250, height: 65.5 };
    this.certificateBodyLeftBlock = { x: 228, y: 187, width: 40, height: 18 };
    this.certificateBodyRightBlock = {
      x: this.certificateBodyLeftBlock.x + 190,
      y: this.certificateBodyLeftBlock.y,
      width: this.certificateBodyLeftBlock.width,
      height: this.certificateBodyLeftBlock.height,
    };
  }

  createBlock(fieldName, { x, y, width, height }) {
    const textField = this.form.createTextField(fieldName);
    textField.addToPage(this.firstPage, {
      x,
      y,
      width,
      height,
      borderWidth: 0,
    });
  }

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
}
