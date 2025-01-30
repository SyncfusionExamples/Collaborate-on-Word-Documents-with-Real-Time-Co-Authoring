import { Routes } from '@angular/router';
import { FilesComponent } from './files/files.component';
import { DocumentEditorComponent } from './document-editor/document-editor.component';

export const appRoutes: Routes= [
    { path: '', component: FilesComponent},
    { path: 'detail/:documentID/:fileName/:roomId', component: DocumentEditorComponent},  
  ];
