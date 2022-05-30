import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { GlossaryPageComponent } from './glossary-page/glossary-page.component';

const routes: Routes = [
  { path: '', component: GlossaryPageComponent }

];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
