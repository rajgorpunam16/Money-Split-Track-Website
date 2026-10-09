import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import AOS from 'aos';


@Component({
selector: 'app-contact',
standalone: true,
imports: [FormsModule],
templateUrl: './contact.html',
styleUrl: './contact.scss'
})
export class Contact implements AfterViewInit, OnDestroy {
submitted = false;
private refreshTimer?: ReturnType<typeof setTimeout>;

ngAfterViewInit(): void {
AOS.refresh();
this.refreshTimer = setTimeout(() => AOS.refresh(), 200);
}

ngOnDestroy(): void {
if (this.refreshTimer) clearTimeout(this.refreshTimer);
}

submitContact(form: NgForm): void {
if (form.invalid) {
form.form.markAllAsTouched();
return;
}


this.submitted = true;
form.resetForm();


}
}
