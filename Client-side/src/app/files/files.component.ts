import { Component, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { GridModule, RowSelectEventArgs } from '@syncfusion/ej2-angular-grids';
import { DataService } from '../data.service';
import { DialogComponent, DialogModule } from '@syncfusion/ej2-angular-popups';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface File {
  id: string;
  fileName: string;
  authorName: string;
  roomId: string;
}

@Component({
  selector: 'app-files',
  imports: [GridModule, DialogModule, CommonModule, FormsModule],
  templateUrl: './files.component.html',
  styleUrl: './files.component.css'
})
export class FilesComponent {
  public collaborativeUrl: string = '';
  @ViewChild('ejDialog') ejDialog: DialogComponent | any;
  showDialog: boolean = false;

  constructor(private router: Router, private dataService: DataService) { }

  files: File[] = [
    { id: '1', fileName: 'Giant Panda.docx', authorName: 'John Doe', roomId: 'C001' },
    { id: '2', fileName: 'Styles.docx', authorName: 'David Doe', roomId: 'C002' },
    { id: '3', fileName: 'Table Formatting.docx', authorName: 'Michael Doe', roomId: 'C003' },
  ];

  public dialogButton: Object = [
    {
      'click': this.copyURL.bind(this),
      buttonModel: {
        content: 'Copy URL',
        isPrimary: true
      }
    },
  ];

  onFileClick(args: RowSelectEventArgs): void {
    const rowData = args.data as File;
    this.dataService.setAuthorName(rowData.authorName);
    this.dataService.setIsAuthorOpened(true);
    const documentUrl = `/detail/${rowData.id}/${rowData.fileName}/${rowData.roomId}`;
    this.router.navigateByUrl(documentUrl);
  }

  onShareClick(rowData: File, event: MouseEvent): void {
    event.stopPropagation();
    this.dataService.setIsAuthorOpened(false);
    this.collaborativeUrl = `${window.location.origin}/detail/${rowData.id}/${rowData.fileName}/${rowData.roomId}`;
    this.showDialog = true;
    this.ejDialog.show();
  }

  onDialogOpen(): void {
    this.dataService.selectText('share_url');
  }

  private copyURL(): void {
    const copyText = document.getElementById("share_url") as HTMLInputElement;
    if (copyText) {
      copyText.select();
      navigator.clipboard.writeText(copyText.value);
      this.ejDialog.hide();
      this.showDialog = false;
    }
  }
}
