export interface StudentResult {
    seatNo: string;
    name: string;
    result: string;
    schoolIndex: string;
    sidNo: string;
    boardMarks: { subjectName: string; marksObtained: string; grade: string;totalMarks:string }[];
    schoolMarks: { subjectName: string; grade: string }[];
    grandTotal: {outOf:string;obtained:string};
    overallGrade: string;
    percentileRank: string;
  }
  