export class Student {
  static ranks = {
    "4D": ["Purple", "급"],
  };

  static monthToKorean = {
    1: "일월",
    2: "이월",
    3: "삼월",
    4: "사월",
    5: "오월",
    6: "유월",
    7: "칠월",
    8: "팔월",
    9: "구월",
    10: "시월",
    11: "십일월",
    12: "십이월",
  };

  static daysToKorean = {
    1: "일",
    2: "이",
    3: "삼",
    4: "사",
    5: "오",
    6: "육",
    7: "칠",
    8: "팔",
    9: "구",
    10: "십",
    11: "십일",
    12: "십이",
    13: "십삼",
    14: "십사",
    15: "십오",
    16: "십육",
    17: "십칠",
    18: "십팔",
    19: "십구",
    20: "이십",
    21: "이십일",
    22: "이십이",
    23: "이십삼",
    24: "이십사",
    25: "이십오",
    26: "이십육",
    27: "이십칠",
    28: "이십팔",
    29: "이십구",
    30: "삼십",
    31: "삼십일",
  };

  static yearInKorean = "년";

  constructor(fName, mName = "", lName, birthDay, numberDan) {
    (this.fName = fName),
      (this.mName = mName),
      (this.lName = lName),
      (this.numberDan = numberDan.toUpperCase()),
      (this.birthDay = birthDay),
      (this.koreanRank = Student.ranks[numberDan][1]),
      (this.beltColor = Student.ranks[numberDan][0]),
      (this.fullNameInKorean = null);
  }

  getFullName() {
    return this.mName
      ? `${this.fName} ${this.mName} ${this.lName}`
      : `${this.fName} ${this.lName}`;
  }

  parseBday() {
    const parts = this.birthDay.split("-"); // assuming month - day - year format with numbers ex: 6-2-1942
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const fullYear = year;
    const date = new Date(fullYear, month, day);
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
    helveticaFont,
    koreanFont
  ) {
    const koreanInfoFirstRow = [
      () =>
        this.createTextOptions(
          this.numberDan,
          helveticaFont,
          koreanInfoBlockXPos,
          koreanInfoBlockYPos
        ),
      () =>
        this.createTextOptions(
          this.koreanRank,
          koreanFont,
          koreanInfoBlockXPos,
          koreanInfoBlockYPos
        ),
    ];

    const koreanInfoSecondRow = [
      () =>
        this.createTextOptions(
          this.fullNameInKorean || "마이클   시그",
          koreanFont,
          koreanInfoBlockXPos,
          koreanInfoBlockYPos
        ),
    ];

    const koreanInfoThirdRow = [
      () =>
        this.createTextOptions(
          new Date().getFullYear().toString(),
          helveticaFont,
          koreanInfoBlockXPos,
          koreanInfoBlockYPos
        ),
      () =>
        this.createTextOptions(
          this.yearInKorean || "년",
          koreanFont,
          koreanInfoBlockXPos + 20,
          koreanInfoBlockYPos
        ),
      () =>
        this.createTextOptions(
          (new Date().getMonth() + 1).toString(), // months are zero indexed
          helveticaFont,
          koreanInfoBlockXPos + 23,
          koreanInfoBlockYPos
        ),
      () =>
        this.createTextOptions(
          Student.monthToKorean[(new Date().getMonth() + 1).toString()],
          koreanFont,
          koreanInfoBlockXPos + 25,
          koreanInfoBlockYPos
        ),
      () =>
        this.createTextOptions(
          new Date().getDate().toString(), // days are not 0 indexed
          helveticaFont,
          koreanInfoBlockXPos + 40,
          koreanInfoBlockYPos
        ),
      () =>
        this.createTextOptions(
          Student.daysToKorean[new Date().getDate()],
          koreanFont,
          koreanInfoBlockXPos + 40,
          koreanInfoBlockYPos
        ),
    ];

    return [koreanInfoFirstRow, koreanInfoSecondRow, koreanInfoThirdRow];
  }

  generateTestCountUnderKoreanBlock(
    testCountXPos,
    testCountYPos,
    classCount,
    helveticaFont,
    koreanFont
  ) {
    return [
      [
        () =>
          this.createTextOptions(
            String(classCount),
            helveticaFont,
            testCountXPos + 8,
            testCountYPos + 6.8
          ),
      ],
    ];
  }

  generateTestDateInKorean(
    testDateXPos,
    testDateYPos,
    testDate, // this will need to be supplied in the end
    helveticaFont,
    koreanFont,
    size = 14
  ) {
    // need to probably do something like a split.  YEAR koreanYear  numMonth koreanMonth  numDay koreanDay
    // use current day as placeholder
    return [
      [
        () =>
          this.createTextOptions(
            new Date().getFullYear().toString(),
            helveticaFont,
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
            Student.monthToKorean[new Date().getMonth() + 1],
            koreanFont,
            testDateXPos + 40,
            testDateYPos,
            size
          ),
        () =>
          this.createTextOptions(
            new Date().getDate().toString(),
            koreanFont,
            testDateXPos + 70,
            testDateYPos,
            size
          ),
        () =>
          this.createTextOptions(
            Student.daysToKorean[new Date().getDate()],
            koreanFont,
            testDateXPos + 70,
            testDateYPos,
            size
          ),
      ],
    ];
  }

  generateCertificateBlock(
    certificateXPos,
    certificateYPos,
    helveticaFont,
    koreanFont
  ) {
    const takewondoRow = [
      () =>
        this.createTextOptions(
          `${this.numberDan} ${this.beltColor} Belt`,
          koreanFont,
          certificateXPos,
          certificateYPos
        ),
    ];

    const nameInFullRow = [
      () =>
        this.createTextOptions(
          this.getFullName(),
          helveticaFont,
          certificateXPos,
          certificateYPos
        ),
    ];

    const birthDayRow = [
      () =>
        this.createTextOptions(
          this.parseBday(),
          helveticaFont,
          certificateXPos,
          certificateYPos
        ),
    ];

    return [takewondoRow, nameInFullRow, birthDayRow];
  }

  generateCertificateBodyLeft(
    certificateBodyLeftXPos,
    certificateBodyLeftYPos,
    helveticaFont,
    koreanFont
  ) {
    return [
      [
        () =>
          this.createTextOptions(
            this.numberDan,
            helveticaFont,
            certificateBodyLeftXPos,
            certificateBodyLeftYPos,
            16
          ),
      ],
    ];
  }

  generateCertificateBodyRight(
    certificateBodyRightXPos,
    certificateBodyRightYPos,
    classCount,
    helveticaFont,
    koreanFont
  ) {
    return [
      [
        () =>
          this.createTextOptions(
            classCount.toString(),
            helveticaFont,
            certificateBodyRightXPos + 10,
            certificateBodyRightYPos + 1,
            16
          ),
      ],
    ];
  }
}
