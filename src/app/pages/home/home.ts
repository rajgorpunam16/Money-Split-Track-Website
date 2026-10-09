
import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import AOS from 'aos';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class Home implements AfterViewInit, OnDestroy {
  private refreshTimer?: ReturnType<typeof setTimeout>;

  ngAfterViewInit(): void {
    AOS.init({
      duration: 900,
      easing: 'ease-out-cubic',
      once: false,
      mirror: true,
      offset: 100,
      anchorPlacement: 'top-bottom'
    });

    this.refreshTimer = setTimeout(() => {
      AOS.refreshHard();
    }, 300);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
  }
}