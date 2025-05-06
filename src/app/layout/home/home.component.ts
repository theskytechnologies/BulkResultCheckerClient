import { Component } from "@angular/core";
import { AutoResultCheckerComponent } from "../../components/auto-result-checker/auto-result-checker.component";
import { FooterComponent } from "../footer/footer.component";
import { NavbarComponent } from "../navbar/navbar.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NavbarComponent, FooterComponent, AutoResultCheckerComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']  
})
export class HomeComponent {}
