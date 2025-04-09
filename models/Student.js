export class Student {
  static ranks = {
    "yellow stripe": "8D",
    yellow: "7D",
    orange: "6D",
    green: "5D",
    purple: "4D",
    blue: "3D",
    brown: "2D",
    red: "1D",
    "recommended black belt level 1": "Rec Black Belt",
  };

  static lilDragonRanks = {
    "yellow stripe": "8R",
    yellow: "7R",
    "orange stripe": "6R",
    "green stripe": "5R",
    "purple stripe": "4R",
    "blue stripe": "3R",
    "brown stripe": "2R",
    "red stripe": "1R",
  };

  static yearInKorean = "년";
  static monthInKorean = "월";
  static dayInKorean = "일";
  static rankInKorean = "급";

  constructor(name, birthDay, beltColor, isLilDragon, fullNameInKorean) {
    if (!birthDay) throw new Error("Failed to obtain birthDay");
    if (!name) throw new Error("Name is empty");
    if (!beltColor) throw new Error("Belt color is empty");
    if (!fullNameInKorean) throw new Error("Full name in korean not provided.");

    const bDayParts = birthDay.split("/");
    if (bDayParts.length !== 3)
      throw new Error("Expected a format of MM/DD/YEAR");

    const nameParts = name.split(" ");

    if (nameParts.length < 2)
      throw new Error(
        "Name is either not split by space(s).  Check student names."
      );

    const formattedName = nameParts.map((name, idx) => {
      const updatedName = name[0].toUpperCase() + name.slice(1);
      return updatedName;
    });

    let normalizedBeltColor = beltColor
      .split(" ")
      .filter((word) => word.trim().length > 0)
      .map((word) => word.toLowerCase());

    const normalizedBeltColorKey = normalizedBeltColor.join(" ");

    normalizedBeltColor = normalizedBeltColor
      .map((word) => word[0].toUpperCase() + word.slice(1))
      .join(" ");

    const computeNumberDan = isLilDragon
      ? Student.lilDragonRanks[normalizedBeltColorKey]
      : Student.ranks[normalizedBeltColorKey];

    (this.lilDragon = isLilDragon),
      (this.name = formattedName.join(" ")),
      (this.birthDay = birthDay),
      (this.beltColor = normalizedBeltColor),
      (this.fullNameInKorean = fullNameInKorean),
      (this.numberDan = computeNumberDan);
  }

  parseBday() {
    const parts = this.birthDay.split("/"); // expecting MM/DD/YY or MM/DD/YYYY
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);

    if (year < 100) {
      const currentYear = new Date().getFullYear();
      const cutoff = currentYear - 2000 <= 30 ? currentYear - 2000 : 35; // Usually 30
      year += year <= cutoff ? 2000 : 1900;
    }

    const date = new Date(year, month, day);
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  createTextOptions(text, font, x, y, size = 14) {
    return {
      text: text,
      font: font,
      x: x,
      y: y,
      size: size,
    };
  }

  generateKoreanInfoBlockValues(
    koreanInfoBlockXPos,
    koreanInfoBlockYPos,
    latinFont,
    koreanFont,
    size
  ) {
    const koreanInfoFirstRow = [
      () =>
        this.createTextOptions(
          this.beltColor.toLowerCase().trim().includes("black")
            ? "품 " + this.beltColor.trim().at(-1)
            : this.numberDan,
          this.beltColor.toLowerCase().trim().includes("black")
            ? koreanFont
            : latinFont,
          koreanInfoBlockXPos,
          koreanInfoBlockYPos,
          size
        ),
      () =>
        this.createTextOptions(
          Student.rankInKorean,
          koreanFont,
          koreanInfoBlockXPos + 15,
          koreanInfoBlockYPos,
          size
        ),
    ];

    const koreanInfoSecondRow = [
      () =>
        this.createTextOptions(
          this.fullNameInKorean,
          koreanFont,
          koreanInfoBlockXPos,
          koreanInfoBlockYPos,
          size
        ),
    ];

    const koreanInfoThirdRow = [
      () =>
        this.createTextOptions(
          new Date().getFullYear().toString(),
          latinFont,
          koreanInfoBlockXPos,
          koreanInfoBlockYPos,
          size
        ),
      () =>
        this.createTextOptions(
          Student.yearInKorean,
          koreanFont,
          koreanInfoBlockXPos + 20,
          koreanInfoBlockYPos,
          size
        ),
      () =>
        this.createTextOptions(
          (new Date().getMonth() + 1).toString(), // months are zero indexed
          latinFont,
          koreanInfoBlockXPos + 23,
          koreanInfoBlockYPos,
          size
        ),
      () =>
        this.createTextOptions(
          Student.monthInKorean,
          koreanFont,
          koreanInfoBlockXPos + 25,
          koreanInfoBlockYPos,
          size
        ),
      () =>
        this.createTextOptions(
          new Date().getDate().toString(), // days are not 0 indexed
          latinFont,
          koreanInfoBlockXPos + 25,
          koreanInfoBlockYPos,
          size
        ),
      () =>
        this.createTextOptions(
          Student.dayInKorean,
          koreanFont,
          koreanInfoBlockXPos + 25,
          koreanInfoBlockYPos,
          size
        ),
    ];

    return [koreanInfoFirstRow, koreanInfoSecondRow, koreanInfoThirdRow];
  }

  generateTestCountUnderKoreanBlock(
    testCountXPos,
    testCountYPos,
    classCount,
    latinFont,
    koreanFont,
    size
  ) {
    return [
      [
        () =>
          this.createTextOptions(
            String(classCount),
            latinFont,
            testCountXPos + 8,
            testCountYPos + 6.8,
            size
          ),
      ],
    ];
  }

  generateTestDateInKorean(
    testDateXPos,
    testDateYPos,
    testDate, // this will need to be supplied in the end
    latinFont,
    koreanFont,
    size
  ) {
    return [
      [
        () =>
          this.createTextOptions(
            new Date().getFullYear().toString(),
            koreanFont,
            testDateXPos,
            testDateYPos,
            size
          ),
        () =>
          this.createTextOptions(
            Student.yearInKorean,
            koreanFont,
            testDateXPos + 28,
            testDateYPos,
            size
          ),
        () =>
          this.createTextOptions(
            (new Date().getMonth() + 1).toString(),
            koreanFont,
            testDateXPos + 40,
            testDateYPos,
            size
          ),
        () =>
          this.createTextOptions(
            Student.monthInKorean,
            koreanFont,
            testDateXPos + 40,
            testDateYPos,
            size
          ),
        () =>
          this.createTextOptions(
            new Date().getDate().toString(),
            koreanFont,
            testDateXPos + 50,
            testDateYPos,
            size
          ),
        () =>
          this.createTextOptions(
            Student.dayInKorean,
            koreanFont,
            testDateXPos + 50,
            testDateYPos,
            size
          ),
      ],
    ];
  }

  generateCertificateBlock(
    certificateXPos,
    certificateYPos,
    latinFont,
    koreanFont,
    size
  ) {
    const takewondoRow = [
      () =>
        this.createTextOptions(
          this.beltColor.toLowerCase().includes("black")
            ? `Lv ${this.beltColor.trim().at(-1)} Keub ${" ".repeat(
                5
              )} Rec Black Belt`
            : `${this.numberDan} ${this.beltColor} Belt`,
          latinFont,
          certificateXPos,
          certificateYPos,
          size
        ),
    ];

    const nameInFullRow = [
      () =>
        this.createTextOptions(
          this.name,
          latinFont,
          certificateXPos,
          certificateYPos,
          size
        ),
    ];

    const birthDayRow = [
      () =>
        this.createTextOptions(
          this.parseBday(),
          latinFont,
          certificateXPos,
          certificateYPos,
          size
        ),
    ];

    return [takewondoRow, nameInFullRow, birthDayRow];
  }

  generateCertificateBodyLeft(
    certificateBodyLeftXPos,
    certificateBodyLeftYPos,
    latinFont,
    koreanFont,
    size
  ) {
    return [
      [
        () =>
          this.createTextOptions(
            this.beltColor.toLowerCase().trim().includes("black")
              ? "Rec Black " + `LV ${this.beltColor.trim().at(-1)}`
              : this.beltColor,
            latinFont,
            this.beltColor.toLowerCase().trim().includes("black")
              ? certificateBodyLeftXPos - 20
              : certificateBodyLeftXPos,
            certificateBodyLeftYPos,
            size
          ),
      ],
    ];
  }

  generateCertificateBodyRight(
    certificateBodyRightXPos,
    certificateBodyRightYPos,
    testCount,
    latinFont,
    koreanFont,
    size
  ) {
    const convertTestCount = (testCount) => {
      const str = String(testCount);
      const lastTwo = str.slice(-2);
      const lastOne = str.slice(-1);

      if (["11", "12", "13"].includes(lastTwo)) return str + "th";

      if (lastOne === "1") return str + "st";
      if (lastOne === "2") return str + "nd";
      if (lastOne === "3") return str + "rd";
      return str + "th";
    };
    return [
      [
        () =>
          this.createTextOptions(
            convertTestCount(testCount),
            latinFont,
            certificateBodyRightXPos + 10,
            certificateBodyRightYPos + 1,
            size
          ),
      ],
    ];
  }
}
