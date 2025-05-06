import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AutoResultCheckerComponent } from './auto-result-checker.component';

describe('AutoResultCheckerComponent', () => {
  let component: AutoResultCheckerComponent;
  let fixture: ComponentFixture<AutoResultCheckerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AutoResultCheckerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AutoResultCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
