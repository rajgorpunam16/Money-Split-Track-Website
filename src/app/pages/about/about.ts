import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import AOS from 'aos';


@Component({
selector: 'app-about',
standalone: true,
imports: [RouterLink],
templateUrl: './about.html',
styleUrl: './about.scss'
})
export class About implements AfterViewInit, OnDestroy {
private refreshTimer?: ReturnType<typeof setTimeout>;

ngAfterViewInit(): void {
AOS.refresh();
this.refreshTimer = setTimeout(() => AOS.refresh(), 200);
}

ngOnDestroy(): void {
if (this.refreshTimer) clearTimeout(this.refreshTimer);
}
}
