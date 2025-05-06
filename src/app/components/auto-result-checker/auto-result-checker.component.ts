import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { StudentResult } from '../../models/students';
import { StudentResultService } from '../../services/student-result.service';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as ExcelJS from 'exceljs';
import * as FileSaver from 'file-saver';

interface ExtendedStudentResult extends StudentResult {
  _originalIndex?: number; // added to enable sorting by natural fetch order
}

@Component({
  selector: 'app-auto-result-checker',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './auto-result-checker.component.html',
  styleUrls: ['./auto-result-checker.component.scss']
})
export class AutoResultCheckerComponent implements OnInit {


  // Define a list of columns for toggling and their labels.
  columnList = [
    { key: 'sr', header: 'S.No.' },
    { key: 'seatNo', header: 'Seat No' },
    { key: 'name', header: 'Name' },
    { key: 'result', header: 'Result' },
    { key: 'schoolIndex', header: 'School Index' },
    { key: 'sidNo', header: 'SID No' },
    { key: 'total', header: 'Total' },
    { key: 'grandTotal', header: 'Grand Total' },
    { key: 'overallGrade', header: 'Overall Grade' },
    { key: 'percentileRank', header: 'Percentile Rank' },
    { key: 'percentage', header: 'Percentage' },
    { key: 'boardMarks', header: 'Board Marks' },
    { key: 'schoolMarks', header: 'School Marks' }
  ];

  // Record for visibility of columns; all columns are visible by default.
  visibleColumns: any= {
    sr: true,
    seatNo: true,
    name: true,
    result: true,
    schoolIndex: true,
    sidNo: true,
    total: true,
    grandTotal: true,
    overallGrade: true,
    percentileRank: true,
    percentage: true,
    boardMarks: true,
    schoolMarks: true
  };

  lastSearchedRollNos: any;
  lastSearchedResult: any;

  studentResults: ExtendedStudentResult[] = [];
  rollNosInput: string = '';
  isLoading: boolean = false;

  // Filtering and sorting
  filterText: string = '';
  sortField: string = ''; // can be 'serial' for natural order or any StudentResult property
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 5;
  totalPages: number = 0;
  itemsPerPageOptions: number[] = [5, 10, 15, 20, 50];

  // Modal for marks details
  showModal: boolean = false;
  selectedMarks: any[] = [];
  selectedMarksType: 'board' | 'school' = 'board';

  constructor(private resultsService: StudentResultService, @Inject(PLATFORM_ID) private platformId: object) { }


  ngOnInit(): void {
    const savedRollNos = this.getFromLocalStorage('rollNosInput');
    const savedResults = this.getFromLocalStorage('studentResults');
    if (savedRollNos && savedResults) {
      this.rollNosInput = savedRollNos;
      try {
        this.studentResults = JSON.parse(savedResults);
        this.calculateTotalPages();
      } catch (e) {
        console.error('Error parsing saved student results:', e);
      }
    }
  }


  saveToLocalStorage(key: string, value: any) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(key, value);
    }
  }

  getFromLocalStorage(key: string): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(key);
    }
    return null;
  }

  // Fetch results sequentially and assign an original index for serial sorting
  async fetchResults(): Promise<void> {
    const rollNos = this.rollNosInput.split(',')
      .map(r => r.trim())
      .filter(r => r !== '');

    // Clear previous results and reset pagination
    this.studentResults = [];
    this.currentPage = 1;
    this.isLoading = true;

    for (const rollNo of rollNos) {
      try {
        const result: ExtendedStudentResult = await firstValueFrom(this.resultsService.getResultByRollNo(rollNo));
        console.log("Result : ",result);
        // Assign an original index (starting from 1)
        result._originalIndex = this.studentResults.length + 1;
        this.studentResults.push(result);
      } catch (err: any) {
        console.error(`Error fetching result for roll no ${rollNo}:`, err);
      }
    }
    this.isLoading = false;
    this.calculateTotalPages();
    this.saveToLocalStorage('rollNosInput', this.rollNosInput);
    this.saveToLocalStorage('studentResults', JSON.stringify(this.studentResults));
  }

  // Calculate total pages based on filtered results and items per page
  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.displayedResults.length / this.itemsPerPage);
  }

  // Get filtered and sorted results
  get displayedResults(): ExtendedStudentResult[] {
    let results = this.studentResults.slice();

    // Filtering
    if (this.filterText) {
      const filterLower = this.filterText.toLowerCase();
      results = results.filter(student =>
        student.seatNo.toLowerCase().includes(filterLower) ||
        student.name.toLowerCase().includes(filterLower) ||
        student.result.toLowerCase().includes(filterLower) ||
        student.schoolIndex.toLowerCase().includes(filterLower) ||
        student.sidNo.toLowerCase().includes(filterLower) ||
        student.grandTotal.obtained.toLowerCase().includes(filterLower) ||
        student.overallGrade.toLowerCase().includes(filterLower) ||
        student.percentileRank.toLowerCase().includes(filterLower)
      );
    }
    // Sorting
    if (this.sortField) {
      results.sort((a, b) => {
        let aValue: any, bValue: any;
        if (this.sortField === 'serial') {
          // sort by the original fetch order
          aValue = a._originalIndex || 0;
          bValue = b._originalIndex || 0;
        } else {
          aValue = (a[this.sortField as keyof StudentResult] || '').toString();
          bValue = (b[this.sortField as keyof StudentResult] || '').toString();
        }
        const comparison = aValue.toString().localeCompare(bValue.toString(), undefined, { numeric: true });
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }
    return results;
  }

  // Get only the results for the current page
  get pagedResults(): ExtendedStudentResult[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.displayedResults.slice(startIndex, startIndex + this.itemsPerPage);
  }

  // Trigger sorting when header is clicked
  sortData(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
  }

  // Pagination controls
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }
  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }
  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }
  onItemsPerPageChange(): void {
    this.currentPage = 1;
    this.calculateTotalPages();
  }

  // For display: compute first and last entry numbers on current page
  get currentPageStart(): number {
    return this.displayedResults.length > 0 ? (this.currentPage - 1) * this.itemsPerPage + 1 : 0;
  }
  get currentPageEnd(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.displayedResults.length);
  }

  // Open modal for marks details
  studentModalData: any;
  openMarksModal(student: ExtendedStudentResult, type: 'board' | 'school'): void {
    this.selectedMarksType = type;
    this.studentModalData = student;
    this.selectedMarks = type === 'board' ? student.boardMarks : student.schoolMarks;
    this.showModal = true;
  }
  closeModal(): void {
    this.showModal = false;
    this.selectedMarks = [];
  }


   /** sum of the “Total Marks” column */
   get totalMarksSum(): number {
    if (this.selectedMarksType !== 'board') return 0;
    return this.selectedMarks
      .reduce((acc, m) => acc + (parseInt(m.totalMarks, 10) || 0), 0);
  }

  /** sum of the “Obtained Marks” column */
  get obtainedMarksSum(): number {
    if (this.selectedMarksType !== 'board') return 0;
    return this.selectedMarks
      .reduce((acc, m) => acc + (parseInt(m.marksObtained, 10) || 0), 0);
  }

  get percentage(): string {
    if (this.totalMarksSum === 0) return '0.00';
    return ((this.obtainedMarksSum / this.totalMarksSum) * 100)
      .toFixed(2);
  }


  getPercentage(student: {
    grandTotal: { outOf: string; obtained: string };
    // …other props…
  }): string {
    const out = parseInt(student.grandTotal.outOf, 10);
    const obt = parseInt(student.grandTotal.obtained, 10);

    if (!out || isNaN(out) || isNaN(obt)) {
      return '0.00';
    }

    // fix to two decimals
    return ((obt / out) * 100).toFixed(2);
  }
  //Old Export
  // exportToExcel(): void {
  //   // Create a new workbook
  //   const workbook = new ExcelJS.Workbook();
  //   workbook.creator = 'Your App Name';
  //   workbook.created = new Date();

  //   // Add Summary Sheet as the first sheet
  //   const summarySheet = workbook.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF4472C4' } } });
  //   // Set Summary sheet columns with your preferred widths and headers
  //   summarySheet.columns = [
  //     { header: 'Sr. No.', key: 'sr', width: 10 },
  //     { header: 'Seat No', key: 'seatNo', width: 10 },
  //     { header: 'Name', key: 'name', width: 40 },
  //     { header: 'Result', key: 'result', width: 45 },
  //     { header: 'School Index', key: 'schoolIndex', width: 12 },
  //     { header: 'SID No', key: 'sidNo', width: 15 },
  //     { header: 'Grand Total', key: 'grandTotal', width: 12 },
  //     { header: 'Overall Grade', key: 'overallGrade', width: 12 },
  //     { header: 'Percentile Rank', key: 'percentileRank', width: 15 },
  //     { header: 'Board Marks', key: 'boardMarks', width: 16 },
  //     { header: 'School Marks', key: 'schoolMarks', width: 16 },
  //   ];
  //   // Style the header row in Summary
  //   summarySheet.getRow(1).eachCell(cell => {
  //     cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  //     cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
  //     cell.alignment = { horizontal: 'center', vertical: 'middle' };
  //     cell.border = {
  //       top: { style: 'thin' },
  //       left: { style: 'thin' },
  //       bottom: { style: 'thin' },
  //       right: { style: 'thin' },
  //     };
  //   });

  //   // Loop through your displayedResults data
  //   this.displayedResults.forEach((student, index) => {
  //     const srNo = index + 1;
  //     const boardSheetName = `Board_${student.seatNo}`;
  //     const schoolSheetName = `School_${student.seatNo}`;

  //     // Add a row to the Summary sheet with hyperlinks for detail sheets
  //     summarySheet.addRow({
  //       sr: srNo,
  //       seatNo: student.seatNo,
  //       name: student.name,
  //       result: student.result,
  //       schoolIndex: student.schoolIndex,
  //       sidNo: student.sidNo,
  //       grandTotal: student.grandTotal,
  //       overallGrade: student.overallGrade,
  //       percentileRank: student.percentileRank,
  //       boardMarks: { text: 'View Board Marks', hyperlink: `#${boardSheetName}!A1` },
  //       schoolMarks: { text: 'View School Marks', hyperlink: `#${schoolSheetName}!A1` },
  //     });

  //     // -------------------
  //     // Create Board Marks Detail Sheet
  //     // -------------------
  //     const boardSheet = workbook.addWorksheet(boardSheetName, { properties: { tabColor: { argb: 'FF70AD47' } } });
  //     // Set column widths (keys only, no headers)
  //     boardSheet.columns = [
  //       { key: 'subject', width: 40 },
  //       { key: 'marks', width: 25 },
  //       { key: 'grade', width: 10 },
  //     ];
  //     // Insert navigation row at the top
  //     boardSheet.spliceRows(1, 0, ['Back to Summary']);
  //     boardSheet.mergeCells('A1:C1');
  //     const boardNavCell = boardSheet.getCell('A1');
  //     boardNavCell.value = { text: 'Back to Summary', hyperlink: '#Summary!A1' };
  //     boardNavCell.font = { bold: true, color: { argb: 'FF1155CC' } };
  //     boardNavCell.alignment = { horizontal: 'center' };

  //     // Insert header row manually at row 2
  //     const boardHeaderRow = boardSheet.addRow(['Subject Name', 'Marks Obtained', 'Grade']);
  //     boardHeaderRow.eachCell(cell => {
  //       cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  //       cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
  //       cell.alignment = { horizontal: 'center', vertical: 'middle' };
  //       cell.border = {
  //         top: { style: 'thin' },
  //         left: { style: 'thin' },
  //         bottom: { style: 'thin' },
  //         right: { style: 'thin' },
  //       };
  //     });
  //     // Add board marks data rows
  //     student.boardMarks.forEach(mark => {
  //       boardSheet.addRow([mark.subjectName, mark.marksObtained, mark.grade]);
  //     });

  //     // -------------------
  //     // Create School Marks Detail Sheet
  //     // -------------------
  //     const schoolSheet = workbook.addWorksheet(schoolSheetName, { properties: { tabColor: { argb: 'FFED7D31' } } });
  //     // Set column widths
  //     schoolSheet.columns = [
  //       { key: 'subject', width: 40 },
  //       { key: 'grade', width: 10 },
  //     ];
  //     // Insert navigation row at the top
  //     schoolSheet.spliceRows(1, 0, ['Back to Summary']);
  //     schoolSheet.mergeCells('A1:B1');
  //     const schoolNavCell = schoolSheet.getCell('A1');
  //     schoolNavCell.value = { text: 'Back to Summary', hyperlink: '#Summary!A1' };
  //     schoolNavCell.font = { bold: true, color: { argb: 'FF1155CC' } };
  //     schoolNavCell.alignment = { horizontal: 'center' };

  //     // Insert header row manually at row 2
  //     const schoolHeaderRow = schoolSheet.addRow(['Subject Name', 'Grade']);
  //     schoolHeaderRow.eachCell(cell => {
  //       cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  //       cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };
  //       cell.alignment = { horizontal: 'center', vertical: 'middle' };
  //       cell.border = {
  //         top: { style: 'thin' },
  //         left: { style: 'thin' },
  //         bottom: { style: 'thin' },
  //         right: { style: 'thin' },
  //       };
  //     });
  //     // Add school marks data rows
  //     student.schoolMarks.forEach(mark => {
  //       schoolSheet.addRow([mark.subjectName, mark.grade]);
  //     });
  //   });

  //   // Reorder sheets so that Summary is the first sheet
  //   const summaryIndex = workbook.worksheets.findIndex(ws => ws.name === 'Summary');
  //   if (summaryIndex > 0) {
  //     const summary = workbook.worksheets.splice(summaryIndex, 1)[0];
  //     workbook.worksheets.unshift(summary);
  //     workbook.worksheets = workbook.worksheets;
  //   }

  //   // Write workbook to buffer and save file using FileSaver
  //   workbook.xlsx.writeBuffer().then((buffer: any) => {
  //     const blob = new Blob([buffer], {
  //       type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  //     });
  //     FileSaver.saveAs(blob, `student-results_export_${new Date().getTime()}.xlsx`);
  //   });
  // }


  //New export with mobile excel support
  exportToExcel(): void {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Your App Name';
    workbook.created = new Date();

    // Add Summary Sheet as the first sheet
    const summarySheet = workbook.addWorksheet('Summary', { properties: { tabColor: { argb: 'FF4472C4' } } });
    // Set Summary sheet columns with your preferred widths and headers
    summarySheet.columns = [
      { header: 'Sr. No.', key: 'sr', width: 10 },
      { header: 'Seat No', key: 'seatNo', width: 10 },
      { header: 'Name', key: 'name', width: 40 },
      { header: 'Result', key: 'result', width: 45 },
      // { header: 'School Index', key: 'schoolIndex', width: 12 },
      // { header: 'SID No', key: 'sidNo', width: 15 },
      { header: 'Grand Total', key: 'grandTotal', width: 12 },
      { header: 'Overall Grade', key: 'overallGrade', width: 15 },
      { header: 'Percentage', key: 'percentage', width: 15 },
      { header: 'Percentile Rank', key: 'percentileRank', width: 15 },
      { header: 'Board Marks', key: 'boardMarks', width: 16 },
      { header: 'School Marks', key: 'schoolMarks', width: 16 },
    ];
    // Style the header row in Summary
    summarySheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Loop through your displayedResults data
    this.displayedResults.forEach((student, index) => {
      const srNo = index + 1;
      const boardSheetName = `Board_${student.seatNo}`;
      const schoolSheetName = `School_${student.seatNo}`;

      // Add a row to the Summary sheet with formula-based hyperlinks for detail sheets
      summarySheet.addRow({
        sr: srNo,
        seatNo: student.seatNo,
        name: student.name,
        result: student.result,
        // schoolIndex: student.schoolIndex,
        // sidNo: student.sidNo,
        grandTotal: student.grandTotal.obtained,
        overallGrade: student.overallGrade,
        percentage: this.getPercentage(student) + '%',
        percentileRank: student.percentileRank,
        boardMarks: { formula: `HYPERLINK("#'${boardSheetName}'!A1","View Board Marks")` },
        schoolMarks: { formula: `HYPERLINK("#'${schoolSheetName}'!A1","View School Marks")` },
      });

      // -------------------
      // Create Board Marks Detail Sheet
      // -------------------
      const boardSheet = workbook.addWorksheet(boardSheetName, { properties: { tabColor: { argb: 'FF70AD47' } } });
      // Set column widths (keys only, no headers)
      boardSheet.columns = [
        { key: 'subject', width: 40 },
        { key: 'totalMarks', width: 20 },
        { key: 'marks', width: 20 },
        { key: 'grade', width: 10 },
      ];
      // Insert navigation row at the top using a formula-based hyperlink
      boardSheet.spliceRows(1, 0, ['Back to Summary']);
      boardSheet.mergeCells('A1:D1');
      const boardNavCell = boardSheet.getCell('A1');
      boardNavCell.value = { formula: 'HYPERLINK("#Summary!A1","Back to Summary")' };
      boardNavCell.font = { bold: true, color: { argb: 'FF1155CC' } };
      boardNavCell.alignment = { horizontal: 'center' };

      // Insert header row manually at row 2
      const boardHeaderRow = boardSheet.addRow(['Subject Name','Total Marks', 'Marks Obtained', 'Grade']);
      boardHeaderRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      // Add board marks data rows
      student.boardMarks.forEach(mark => {
        boardSheet.addRow([mark.subjectName, mark.totalMarks,mark.marksObtained, mark.grade]);
      });
      let grandTotalRow = boardSheet.addRow(['Grand Total', student.grandTotal.outOf,student.grandTotal.obtained,this.getPercentage(student) + '%']);
      grandTotalRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF70AD47' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      // -------------------
      // Create School Marks Detail Sheet
      // -------------------
      const schoolSheet = workbook.addWorksheet(schoolSheetName, { properties: { tabColor: { argb: 'FFED7D31' } } });
      // Set column widths
      schoolSheet.columns = [
        { key: 'subject', width: 40 },
        { key: 'grade', width: 10 },
      ];
      // Insert navigation row at the top using a formula-based hyperlink
      schoolSheet.spliceRows(1, 0, ['Back to Summary']);
      schoolSheet.mergeCells('A1:B1');
      const schoolNavCell = schoolSheet.getCell('A1');
      schoolNavCell.value = { formula: 'HYPERLINK("#Summary!A1","Back to Summary")' };
      schoolNavCell.font = { bold: true, color: { argb: 'FF1155CC' } };
      schoolNavCell.alignment = { horizontal: 'center' };

      // Insert header row manually at row 2
      const schoolHeaderRow = schoolSheet.addRow(['Subject Name', 'Grade']);
      schoolHeaderRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
      // Add school marks data rows
      if(student.schoolMarks){
        student.schoolMarks.forEach(mark => {
          schoolSheet.addRow([mark.subjectName, mark.grade]);
        });
      }
    });

    // Reorder sheets so that Summary is the first sheet
    const summaryIndex = workbook.worksheets.findIndex(ws => ws.name === 'Summary');
    if (summaryIndex > 0) {
      const summary = workbook.worksheets.splice(summaryIndex, 1)[0];
      workbook.worksheets.unshift(summary);
      workbook.worksheets = workbook.worksheets;
    }

    // Write workbook to buffer and save file using FileSaver
    workbook.xlsx.writeBuffer().then((buffer: any) => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      FileSaver.saveAs(blob, `student-results_export_${new Date().getTime()}.xlsx`);
    });
  }

}
