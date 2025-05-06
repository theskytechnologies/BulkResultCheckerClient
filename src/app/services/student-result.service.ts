import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { StudentResult } from '../models/students';

@Injectable({
  providedIn: 'root',
})
export class StudentResultService {

  // private baseUrl = 'http://localhost:3000/get-result';
  // private forwardedUrl = 'https://pwr126dr-3000.inc1.devtunnels.ms/get-result';
  private forwardedUrl = 'https://bulkresultcheckerapi-251s.onrender.com/get-result';
  

  constructor(private http: HttpClient) {}

  getResultByRollNo(seatNo: string): Observable<StudentResult> {
    return this.http.get<StudentResult>(`${this.forwardedUrl}?seatNo=${seatNo}`);
  }
}
