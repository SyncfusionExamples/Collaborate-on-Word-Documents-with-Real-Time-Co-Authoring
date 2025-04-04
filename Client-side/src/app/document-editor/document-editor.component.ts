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

// Enable CollaborativeEditingHandler in DocumentEditor
DocumentEditor.Inject(CollaborativeEditingHandler);

@Component({
  selector: 'app-detail',
  standalone: true,
  // Import required modules (Forms, Dialog, DocumentEditorContainer, Common)
  imports: [FormsModule, DialogModule, DocumentEditorContainerModule, CommonModule],
  templateUrl: 'document-editor.component.html',
  styleUrls: ['document-editor.component.scss'],
  providers: [ToolbarService],
})
export class DocumentEditorComponent {
  /**
   * ID of the document to be opened. Extracted from route params.
   */
  documentId?: string;
  /**
   * Name of the document to be opened. Extracted from route params.
   */
  documentName?: string;
  /**
   * The local user’s name, displayed in the DocumentEditor as the current user.
   */
  userName = '';
  /**
   * Indicates whether the user has entered their name. Used to show/hide the editor UI.
   */
  isUserNameEntered = false;
  /**
   * The name used by Syncfusion DocumentEditor for collaborative editing.
   * Defaults to 'Guest user', but is changed once the user enters their name.
   */
  currentUser = 'Guest user';
  /**
   * The name of the current SignalR room to which the user is connected.
   */
  currentRoomName = '';
  /**
   * Base URL for your back-end services, including SignalR and collaborative editing APIs.
   */
  private serviceUrl = 'http://localhost:5212/';
  /**
   * SignalR connection instance for real-time collaborative editing.
   */
  connection?: HubConnection;
  /**
   * Reference to a custom TitleBar class instance.
   * Used to manage the title bar, user avatars, and a back button.
   */
  titleBar?: TitleBar;
  /**
   * Unique connection ID assigned by the SignalR server.
   */
  connectionId = '';
  /**
   * The ID of the room used for grouping collaborative editing users.
   * Extracted from route params.
   */
  roomId = '';
  /**
   * Whether the “Enter Your Name” dialog is visible.
   */
  showDialog = false;
  /**
   * An array of possible random user names
   */
  users = ['Kathryn Fuller', 'Tamer Fuller', 'Martin Nancy', 'Davolio Leverling', 'Nancy Fuller', 'Fuller Margaret', 'Leverling Andrew'];
  /**
   * Toolbar items for the DocumentEditorContainer’s built-in toolbar.
   */
  public toolbarItems = ['Undo', 'Redo', 'Separator', 'Image', 'Table', 'Hyperlink', 'Bookmark', 'TableOfContents', 'Separator', 'Header', 'Footer', 'PageSetup', 'PageNumber', 'Break', 'InsertFootnote', 'InsertEndnote', 'Separator', 'Find', 'Separator', 'Comments', 'TrackChanges', 'Separator', 'LocalClipboard', 'RestrictEditing', 'Separator', 'FormFields', 'UpdateFields', 'ContentControl']
  /**
   * Reference to the Syncfusion Dialog component (Enter Your Name dialog).
   */
  @ViewChild('ejDialog') ejDialog: DialogComponent | any;
  /**
   * Reference to the DocumentEditorContainer component.
   * Used for direct access to the DocumentEditor instance.
   */
  @ViewChild('documenteditor_default') private container!: DocumentEditorContainerComponent;

  constructor(private route: ActivatedRoute, private dataService: DataService) { }

  /**
   * ngOnInit: Lifecycle hook that runs after the component is initialized.
   * We use it to read route params and set up the initial user name.
   */
  ngOnInit(): void {
    this.loadRouteParams();
    this.initializeUser();
  }

  /**
   * loadRouteParams: Retrieve parameters from the route and assigns them to local variables.
   * - documentID -> documentId
   * - fileName   -> documentName
   * - roomId     -> roomId
   */
  loadRouteParams() {
    this.route.params.subscribe((params) => {
      this.documentId = params['documentID'];
      this.documentName = params['fileName'];
      this.roomId = params['roomId'];
    });
  }

  // Initialize a random default name.
  initializeUser() {
    this.assignRandomUserName();
  }

  /**
   * assignRandomUserName: Picks a random name from the `users` array,
   * sets it as the currentUser, and shows the name dialog.
   */
  assignRandomUserName() {
    this.userName = this.users[Math.floor(Math.random() * this.users.length)];
    this.currentUser = this.userName;
    this.showDialog = true;
  }

  /**
   * onDialogOpen: Called when the Syncfusion Dialog is opened.
   * And selects the text inside the input field when the dialog opens.
   */
  onDialogOpen(): void {
    this.dataService.selectText('userNameInput')
  }

  /**
   * dialogButtons: Configuration for the dialog’s OK button.
   * Binds click to onOkClick().
   */
  dialogButtons = [
    {
      'click': this.onOkClick.bind(this),
      buttonModel: { content: 'OK', isPrimary: true },
    },
  ];

   /**
   * onOkClick: Triggered when the user clicks the OK button in the dialog.
   * If a valid user name is entered, we hide the dialog.
   */
  onOkClick() {
    if (this.userName.trim()) {
      this.ejDialog.hide();
      this.isUserNameEntered = true;
      this.currentUser = this.userName;
    } else {
      alert('Please enter your name');
    }
  }

  /**
   * onCreated: Runs once the DocumentEditorContainer is created.
   * - If showDialog is true, display the name dialog.
   * - Configure the DocumentEditor with collaborative editing.
   * - Initialize custom TitleBar and SignalR connection.
   * - Finally, load the document from server.
   */
  onCreated() {

    if (this.showDialog) {
      this.ejDialog.show();
    }
    // Set the document name in the editor
    this.container.documentEditor.documentName = this.documentName!;
    // Enable collaborative editing
    this.container.documentEditor.enableCollaborativeEditing = true;
    // Initialize a custom TitleBar
    this.initializeTitleBar();
    // Set up SignalR for real-time updates
    this.initializeSignalR();
    // Load the document content from the server
    this.loadDocumentFromServer();
  }

  /**
   * leaveRoomAndRedirect: Leaves the SignalR room and redirects to the file manager.
   */
  leaveRoomAndRedirect() {
    if (this.connection && this.currentRoomName) {
      this.connection.send('LeaveGroup', { roomName: this.currentRoomName, currentUser: this.currentUser })
        .then(() => {
          window.location.href = 'http://localhost:4200'; // Redirect to file manager
        })
        .catch((error) => console.error('Error leaving room:', error));
    } else {
      // If not connected or no room name, just redirect to the file manager
      window.location.href = 'http://localhost:4200';
    }
  }

  /**
   * initializeTitleBar: Creates a new TitleBar instance and passes a callback
   * so that the user can click "Back icon" and return to the file manager.
   */
  initializeTitleBar() {
    // Define a callback that calls leaveRoomAndRedirect()
    const onBackClick = () => {
      this.leaveRoomAndRedirect();
    };
    this.titleBar = new TitleBar(
      document.getElementById('documenteditor_titlebar') as HTMLElement,
      this.container.documentEditor,
      true,
      this.dataService,
      onBackClick // <--- pass callback here
    );
    this.titleBar.updateDocumentTitle();
  }

  /**
   * onContentChange: Called whenever the local user changes the document content.
   * We forward these changes to the server for real-time collaboration.
   */
  onContentChange = (args: ContainerContentChangeEventArgs) => {
    this.container.documentEditor.collaborativeEditingHandlerModule.sendActionToServer(args.operations as Operation[]);
  };

  /**
   * initializeSignalR: Sets up a HubConnection with the specified service URL,
   * configures event listeners, and handles reconnection logic.
   */
  initializeSignalR = (): void => {
    this.connection = new HubConnectionBuilder().withUrl(this.serviceUrl + 'documenteditorhub', {
      skipNegotiation: true,
      transport: HttpTransportType.WebSockets
    }).withAutomaticReconnect().build();

    // Register event listener for receiving data from SignalR server and Handles incoming data from the server
    this.connection.on('dataReceived', this.onDataReceived.bind(this));

    // Handles connection closure
    this.connection.onclose(async () => {
      if (this.connection && this.connection.state === HubConnectionState.Disconnected) {
        alert('Connection lost. Please reload the browser to continue.');
      }
    });

    // Handles reconnection
    this.connection.onreconnected(() => {
      if (this.connection && this.currentRoomName != null) {
        this.connection.send('JoinGroup', { roomName: this.currentRoomName, currentUser: this.currentUser });
      }
    });
  }

  /**
   * onDataReceived: Invoked whenever data arrives from the server (e.g. actions from other users).
   * - If it’s a 'connectionId', store it.
   * - If it’s an 'action' or 'addUser' from a different connection, update TitleBar.
   * - If it’s 'removeUser', also update TitleBar.
   * - Apply the remote action in DocumentEditor.
   */
  onDataReceived(action: string, data: any) {
    if (this.container.documentEditor.collaborativeEditingHandlerModule) {
      if (action == 'connectionId') {
        this.connectionId = data;
      } else if (this.connectionId != data.connectionId) {
        if (this.titleBar) {
          if (action == 'action' || action == 'addUser') {
            this.titleBar.addUser(data);
          } else if (action == 'removeUser') {
            this.titleBar.removeUser(data);
          }
        }
      }
      // Apply the remote action in the document
      this.container.documentEditor.collaborativeEditingHandlerModule.applyRemoteAction(action, data);
    }
  }

  /**
   * openDocument: Called after the server responds with the document data (SFDT + version).
   * - Show a spinner while loading.
   * - Update the DocumentEditor with version info and open the SFDT.
   * - Then connect to the room via SignalR.
   * - Hide the spinner.
   */
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

  /**
   * loadDocumentFromServer: Sends an HTTP request to your server endpoint to retrieve
   * the document SFDT. On success, calls openDocument() with the response.
   */
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
    // Send JSON data with file name and room ID
    httpRequest.send(JSON.stringify({ fileName: this.documentName, documentOwner: this.roomId }));
  }

  /**
   * connectToRoom: After opening the document, establish a SignalR connection
   * and join the specified room for real-time collaboration.
   */
  public connectToRoom(data: any) {
    try {
      this.currentRoomName = data.roomName;
      if (this.connection) {
        this.connection.start().then(() => {
          if (this.connection) {
            this.connection.send('JoinGroup', { roomName: data.roomName, currentUser: data.currentUser });
          }
        });
      }
    } catch (error) {
      console.error(error);
      // Retry connection after 5 seconds
      setTimeout(this.connectToRoom, 5000);
    }
  }
}
