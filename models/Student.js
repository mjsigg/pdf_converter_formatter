export class Student {
  static ranks = {
    "8D": ["Yellow Stripe", "급"],
    "7D": ["Yellow", "급"],
    "6D": ["Orange", "급"],
    "5D": ["Green", "급"],
    "4D": ["Purple", "급"],
    "3D": ["Blue", "급"],
    "2D": ["Brown", "급"],
    "1D": ["Red", "급"],
  };

  static lilDragonRanks = {
    "8R": ["Yellow Stripe", "급"],
    "7R": ["Yellow Stripe", "급"],
    "6R": ["Orange Stripe", "급"],
    "5R": ["Green Stripe", "급"],
    "4R": ["Purple Stripe", "급"],
    "3R": ["Blue Stripe", "급"],
    "2R": ["Brown Stripe", "급"],
    "1R": ["Red Stripe", "급"],
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
  static monthInKorean = "월";
  static dayInKorean = "일";

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
    latinFont,
    koreanFont,
    size
  ) {
    const koreanInfoFirstRow = [
      () =>
        this.createTextOptions(
          this.numberDan,
          latinFont,
          koreanInfoBlockXPos,
          koreanInfoBlockYPos,
          size
        ),
      () =>
        this.createTextOptions(
          this.koreanRank,
          koreanFont,
          koreanInfoBlockXPos,
          koreanInfoBlockYPos,
          size
        ),
    ];

    const koreanInfoSecondRow = [
      () =>
        this.createTextOptions(
          this.fullNameInKorean || "마이클   시그",
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
          `${this.numberDan} ${this.beltColor} Belt`,
          koreanFont,
          certificateXPos,
          certificateYPos,
          size
        ),
    ];

    const nameInFullRow = [
      () =>
        this.createTextOptions(
          this.getFullName(),
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
            this.numberDan,
            latinFont,
            certificateBodyLeftXPos,
            certificateBodyLeftYPos,
            size
          ),
      ],
    ];
  }

  generateCertificateBodyRight(
    certificateBodyRightXPos,
    certificateBodyRightYPos,
    classCount,
    latinFont,
    koreanFont,
    size
  ) {
    return [
      [
        () =>
          this.createTextOptions(
            classCount.toString(),
            latinFont,
            certificateBodyRightXPos + 10,
            certificateBodyRightYPos + 1,
            size
          ),
      ],
    ];
  }
}
