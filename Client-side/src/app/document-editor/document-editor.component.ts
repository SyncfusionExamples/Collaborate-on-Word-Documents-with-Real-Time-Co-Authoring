import { FormsModule } from '@angular/forms';
import { Component, ViewChild } from '@angular/core';
import { DocumentEditorContainerModule, ToolbarService, DocumentEditorContainerComponent, ContainerContentChangeEventArgs, Operation, DocumentEditor, CollaborativeEditingHandler } from '@syncfusion/ej2-angular-documenteditor';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { TitleBar } from './title-bar';
import { HubConnectionBuilder, HttpTransportType, HubConnectionState, HubConnection } from '@microsoft/signalr';
import { showSpinner, hideSpinner } from '@syncfusion/ej2-popups';
import { DialogModule, DialogComponent } from '@syncfusion/ej2-angular-popups';
import { DataService } from '../data.service';

DocumentEditor.Inject(CollaborativeEditingHandler);

@Component({
  selector: 'app-detail',
  standalone: true,
  imports: [FormsModule, DialogModule, DocumentEditorContainerModule, CommonModule],
  templateUrl: 'document-editor.component.html',
  styleUrls: ['document-editor.component.scss'],
  providers: [ToolbarService],
})
export class DocumentEditorComponent {
  documentId?: string;
  documentName?: string;
  userName = '';
  isUserNameEntered = false;
  currentUser = 'Guest user';
  currentRoomName = '';
  private serviceUrl = 'http://localhost:5212/';
  connection?: HubConnection;
  titleBar?: TitleBar;
  connectionId = '';
  roomId = '';
  showDialog = false;
  users = ['Kathryn Fuller', 'Tamer Fuller', 'Martin Nancy', 'Davolio Leverling', 'Nancy Fuller', 'Fuller Margaret', 'Leverling Andrew'];
  public toolbarItems = ['Undo', 'Redo', 'Separator', 'Image', 'Table', 'Hyperlink', 'Bookmark', 'TableOfContents', 'Separator', 'Header', 'Footer', 'PageSetup', 'PageNumber', 'Break', 'InsertFootnote', 'InsertEndnote', 'Separator', 'Find', 'Separator', 'Comments', 'TrackChanges', 'Separator', 'LocalClipboard', 'RestrictEditing', 'Separator', 'FormFields', 'UpdateFields', 'ContentControl']
  @ViewChild('ejDialog') ejDialog: DialogComponent | any;
  @ViewChild('documenteditor_default') private container!: DocumentEditorContainerComponent;

  constructor(private route: ActivatedRoute, private dataService: DataService) {}

  ngOnInit(): void {
    this.loadRouteParams();
    this.initializeUser();
  }

  // Load parameters from the route
  loadRouteParams() {
    this.route.params.subscribe((params) => {
      this.documentId = params['documentID'];
      this.documentName = params['fileName'];
      this.roomId = params['roomId'];
    });
  }

  // Initialize the user based on the service or default assignment
  initializeUser() {
    const isAuthorOpened = this.dataService.getIsAuthorOpened();

    if (isAuthorOpened) {
      this.userName = this.dataService.getAuthorName();
      this.currentUser = this.userName;
      this.isUserNameEntered = true;
    } else {
      this.assignRandomUserName();
    }
  }

  // Assign a random user name and show the dialog
  assignRandomUserName() {
    this.userName = this.users[Math.floor(Math.random() * this.users.length)];
    this.currentUser = this.userName;
    this.showDialog = true;
  }

  // Select the text inside the input field when the dialog opens
  onDialogOpen(): void {
    this.dataService.selectText('userNameInput')
  }

  // Dialog buttons configuration (OK and Cancel)
  dialogButtons = [
    {
      'click': this.onOkClick.bind(this),
      buttonModel: { content: 'OK', isPrimary: true },
    },
  ];

  // Handle OK button click
  onOkClick() {
    if (this.userName.trim()) {
      this.ejDialog.hide();
      this.isUserNameEntered = true;
      this.currentUser = this.userName;
    } else {
      alert('Please enter your name');
    }
  }

  // Called when the document editor is created
  onCreated() {

    if (this.showDialog) {
      this.ejDialog.show();
    }

    this.container.documentEditor.documentName = this.documentName!;
    this.container.documentEditor.enableCollaborativeEditing = true;
    this.initializeTitleBar();
    this.initializeSignalR();
    this.loadDocumentFromServer();
  }

  // Initialize title bar with document editor
  initializeTitleBar() {
    this.titleBar = new TitleBar(
      document.getElementById('documenteditor_titlebar') as HTMLElement,
      this.container.documentEditor,
      true,
      this.dataService
    );
    this.titleBar.updateDocumentTitle();
  }

  // Handle content changes during collaborative editing
  onContentChange = (args: ContainerContentChangeEventArgs) => {
    this.container.documentEditor.collaborativeEditingHandlerModule.sendActionToServer(args.operations as Operation[]);
  };

   // Initialize SignalR for real-time collaborative editing
   initializeSignalR = (): void => {
    this.connection = new HubConnectionBuilder().withUrl(this.serviceUrl + 'documenteditorhub', {
      skipNegotiation: true,
      transport: HttpTransportType.WebSockets
    }).withAutomaticReconnect().build();

    // Register event listener for receiving data from SignalR server
    this.connection.on('dataReceived', this.onDataReceived.bind(this));

    // Handle connection close
    this.connection.onclose(async () => {
      if (this.connection && this.connection.state === HubConnectionState.Disconnected) {
        alert('Connection lost. Please reload the browser to continue.');
      }
    });

    // Handle reconnection
    this.connection.onreconnected(() => {
      if (this.connection && this.currentRoomName != null) {
        this.connection.send('JoinGroup', { roomName: this.currentRoomName, currentUser: this.currentUser });
      }
      console.log('Server reconnected!');
    });
  }

  // Handle received data from the SignalR server
  onDataReceived(action: string, data: any) {
    if (this.container.documentEditor.collaborativeEditingHandlerModule) {
      if (action == 'connectionId') {
        this.connectionId = data; 
      } else if (this.connectionId != data.connectionId) {
        if (this.titleBar) {
          if (action == 'action' || action == 'addUser') {
            console.log('Data:', data);
            this.titleBar.addUser(data); 
          } else if (action == 'removeUser') {
            this.titleBar.removeUser(data);
          }
        }
      }
      this.container.documentEditor.collaborativeEditingHandlerModule.applyRemoteAction(action, data); // Apply the remote action
    }
  }

  // Open the document with the response data
  openDocument(responseText: string, roomName: string): void {
    showSpinner(document.getElementById('container') as HTMLElement);
    let data = JSON.parse(responseText);
    if (this.container) {
      this.container.documentEditor.collaborativeEditingHandlerModule.updateRoomInfo(roomName, data.version, this.serviceUrl + 'api/CollaborativeEditing/');
      this.container.documentEditor.open(data.sfdt);
      setTimeout(() => {
        if (this.container) {
          this.connectToRoom({ action: 'connect', roomName: roomName, currentUser: this.currentUser });
        }
      });
    }
    hideSpinner(document.getElementById('container') as HTMLElement);
  }

  // Load the document from the server
  loadDocumentFromServer() {
    var httpRequest = new XMLHttpRequest();
    httpRequest.open('Post', this.serviceUrl + 'api/CollaborativeEditing/ImportFile', true);
    httpRequest.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    httpRequest.onreadystatechange = () => {
      if (httpRequest.readyState === 4) {
        if (httpRequest.status === 200 || httpRequest.status === 304) {
          this.openDocument(httpRequest.responseText, this.roomId); 
        } else {
          hideSpinner(document.getElementById('container') as HTMLElement);
          alert('Failed to load the document'); 
        }
      }
    };

    console.log(this.documentName);
    httpRequest.send(JSON.stringify({ fileName: this.documentName, documentOwner: this.roomId }));
  }

  // Connect to the SignalR room for collaboration
  public connectToRoom(data: any) {
    try {
      this.currentRoomName = data.roomName;
      if (this.connection) {
        this.connection.start().then(() => {
          if (this.connection) {
            this.connection.send('JoinGroup', { roomName: data.roomName, currentUser: data.currentUser });
          }
          console.log('Server connected!');
        });
      }
    } catch (err) {
      console.log(err);
      // Retry connection after 5 seconds
      setTimeout(this.connectToRoom, 5000); 
    }
  }
}
