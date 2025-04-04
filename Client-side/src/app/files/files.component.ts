import { Component} from '@angular/core';
import { Router } from '@angular/router';
import { FileManagerModule } from '@syncfusion/ej2-angular-filemanager';
import { DataService } from '../data.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-files',
  // Import the FileManagerModule, CommonModule, and FormsModule for use in this component.
  imports: [FileManagerModule, CommonModule, FormsModule],
  templateUrl: './files.component.html',
  styleUrls: ['./files.component.css']
})
export class FilesComponent {
  //  Base URL for the service calls.
  private serviceUrl = 'http://localhost:5212/';
  /**
   * ajaxSettings: Configuration for the Syncfusion File Manager to communicate
   * with the server-side endpoints. The 'url' property is used for basic file operations.
   */
  public ajaxSettings: object = {
    url: this.serviceUrl + 'AzureDocumentStorage/ManageDocument',
  };
  /**
   * Constructor injects the Angular Router for navigation
   * and DataService for sharing data/state across components.
   */
  constructor(private router: Router, private dataService: DataService) { }

  /**
   * onFileSelect: Event handler triggered when a file or folder is selected.
   * - We read 'args.fileDetails' to get info about the selected item.
   * - We generate a random room ID.
   * - We construct a URL for the collaborative editor page, passing the file name and room ID.
   * - We set a flag in DataService to indicate that the author is opening the file.
   * - Finally, we navigate to that URL using Angular's router.
   */
  onFileSelect(args: any): void {
    // args.fileDetails is an array; we use the first item.
    if (args?.fileDetails) {
      const selectedFile = args.fileDetails;  // The selected file details
      const fileName = selectedFile.name;  // Extract the file name
      const roomId = this.generateRandomRoomId();  // Generate a unique room ID
      // Construct the URL for collaborative editing.
      const documentUrl = `/detail/${fileName}/${roomId}`;
      // Indicate that the author is opening the file
      this.dataService.setIsAuthorOpened(true);
      // Navigate to the collaborative editor page.
      this.router.navigateByUrl(documentUrl);
    }
  }

  // Utility method to generate a random room ID.
  generateRandomRoomId(): string {
    return 'RoomID_' + Math.random().toString(32).slice(2, 8);
  }
}
