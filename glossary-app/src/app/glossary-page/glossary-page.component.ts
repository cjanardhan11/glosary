import { HttpClient } from '@angular/common/http';
import { Component, OnInit, TemplateRef } from '@angular/core';
import { BsModalRef, BsModalService } from 'ngx-bootstrap/modal';
import { APIURLS, environment } from 'src/environments/environment';

@Component({
  selector: 'app-glossary-page',
  templateUrl: './glossary-page.component.html',
  styleUrls: ['./glossary-page.component.css']
})
export class GlossaryPageComponent implements OnInit {
  selectedTerm: any = '';
  selectedDefinition: any = '';
  modalRef?: BsModalRef | null;
  data: any = [];
  currentValus: any;
  constructor(private httpClient: HttpClient,
    private modalService: BsModalService) { }

  ngOnInit(): void {
    this.httpClient.get("assets/data.json").subscribe(data => {
      console.log(data);
      this.data = data;
    })
  }
  openCreateModal(template: TemplateRef<any>) {
    this.modalRef = this.modalService.show(template, { id: 1, class: 'modal-lg' });
  }
  closeModal() {
    this.modalService.hide();
  }
  openUpdateModal(res: any, template: TemplateRef<any>) {
    this.currentValus = res;
    this.selectedTerm = res.Term;
    this.selectedDefinition = res.definition;
    this.modalRef = this.modalService.show(template, { id: 1, class: 'modal-lg' });
  }
  openDeleteModal(res: any, template: TemplateRef<any>) {
    this.currentValus = res;
    this.modalRef = this.modalService.show(template, { id: 1, class: 'modal-lg' });
  }
  saveFn(term: any, def: any) {
    console.log('term:', term.value);
    console.log('definition:', def.value);
    let params: any = {
      'term': term.value, 'definition': def.value
    }
    this.httpClient.post(`${environment.APIHost}${APIURLS.create}`, params)
      .subscribe((res: any) => {
        console.log(res);
      });
    this.modalService.hide();
  }
  updateFn() {
    let params: any = {
      'term': this.selectedTerm, 'definition': this.selectedDefinition
    }
    this.httpClient.put(`${environment.APIHost}${APIURLS.updateTerm}`, params)
      .subscribe((res: any) => {
        console.log(res);
      });
    this.modalService.hide();
  }
  deleteFn() {
    let params: any = {
      'term': this.currentValus.Term, 'definition': this.currentValus.definition
    }
    this.httpClient.delete(`${environment.APIHost}${APIURLS.deleteTerm}`, params)
      .subscribe((res: any) => {
        console.log(res);
      });
    this.modalService.hide();
  }
}
