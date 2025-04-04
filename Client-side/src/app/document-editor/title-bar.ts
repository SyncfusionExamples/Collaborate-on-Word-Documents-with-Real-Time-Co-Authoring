import { createElement } from '@syncfusion/ej2-base';
import { ActionInfo, DocumentEditor } from '@syncfusion/ej2-documenteditor';
import { Button } from '@syncfusion/ej2-buttons';
import { Dialog } from '@syncfusion/ej2-popups';
import { DataService } from '../data.service';

/**
 * TitleBar class manages the header area above the Syncfusion DocumentEditor.
 * It include's a back icon which redirects to the filemanager, a document title,
 * a "Share" button, and a user avatar list for collaborative editing.
 */
export class TitleBar {
    /**
     * If true, a back arrow icon is shown in the title bar
     */
    public showBackwardIcon: boolean = false;
    /**
     * The root HTML container for the title bar.
     */
    private tileBarDiv: HTMLElement;
    /**
     * Reference to the document title element (e.g., "Collaborative Editing").
     */
    private documentTitle?: HTMLElement;
    /**
     * A container element holding the back arrow (if shown) and the document title.
     */
    private documentTitleContentEditor?: HTMLElement;
    /**
     * Reference to the "Share" button added to the title bar.
     */
    private shareButton?: Button;
    /**
     * The Syncfusion DocumentEditor instance to which this title bar is attached.
     */
    private documentEditor: DocumentEditor;
    /**
     * A container that holds the avatars of connected users (for collaboration).
     */
    private userList?: HTMLElement;
    /**
     * A map of connectionId -> avatar HTMLElement, used to keep track of users.
     */
    public userMap: any = {};
    private dataService: DataService;
    private dialogObj?: Dialog;
    /**
     * A callback function that triggers when the user clicks the back icon.
     * Typically used to navigate back to the file manager.
     */
    private onBackClick?: () => void;

    /**
    * @param element   The HTML element in which to render this title bar.
    * @param docEditor The Syncfusion DocumentEditor instance.
    * @param isShareNeeded Whether a "Share" button should be added.
    * @param dataService Service to get or set data, such as author status.
    * @param onBackClick Optional callback for handling a back arrow click.
    */
    constructor(element: HTMLElement, docEditor: DocumentEditor, isShareNeeded: Boolean, dataService: DataService, onBackClick?: () => void) {
        this.tileBarDiv = element;
        this.documentEditor = docEditor;
        this.dataService = dataService;
        this.onBackClick = onBackClick;
        // Use dataService to check if the current user is recognized as the author
        // If true, showBackwardIcon is set to true
        this.showBackwardIcon = this.dataService.getIsAuthorOpened();
        // Initialize the title bar UI
        this.initializeTitleBar(isShareNeeded);
        this.wireEvents();
    }

    /**
     * initializeTitleBar: Sets up the DOM structure for the title bar,
     * including optional back arrow, document title, share button, and user list.
     */
    private initializeTitleBar = (isShareNeeded: Boolean): void => {
        let shareText: string = 'Share';
        let shareToolTip: string = 'Share this link';
        let documentTileText: string = '';

        // Create a container for the document title
        this.documentTitleContentEditor = createElement('div', {
            id: 'documenteditor_title_contentEditor',
            className: 'single-line',
        });
        // 2) If the user is recognized as the author, display a back icon
        if (this.showBackwardIcon) {
            let backwardIconToolTip: string = 'Click to go bakc to the file manager';

            // Create the back icon element
            const backIcon = createElement('span', {
                id: 'backward-icon',
                className: 'e-icons e-arrow-left', // Syncfusion icon class for back arrow
                attrs: { title: backwardIconToolTip },
            });

            // Attach event for back navigation
            backIcon.addEventListener('click', () => {
                // Call the parent component's callback
                if (this.onBackClick) {
                    this.onBackClick();
                }
            });
            // Append the back icon to the title container
            this.documentTitleContentEditor.appendChild(backIcon);
        }

        // Create the document title element
        this.documentTitle = createElement('label', {
            id: 'documenteditor_title_name',
        });
        
        // Append title element to its container
        this.documentTitleContentEditor.appendChild(this.documentTitle);
        this.tileBarDiv.appendChild(this.documentTitleContentEditor);
        this.documentTitleContentEditor.setAttribute('title', documentTileText);

        // Create and add the share button to the title bar
        this.shareButton = this.addButton(shareText, shareToolTip, false) as Button;
        this.shareButton.element.id = 'share-button';

        // Create a container for displaying users
        this.userList = createElement('div', { id: 'de_userInfo' });
        this.tileBarDiv.appendChild(this.userList);

        // Initialize the dialog for sharing
        this.initDialog();
    }

    /**
    * wireEvents: Attach any required event listeners to the newly created DOM elements,
    * such as the click event for the "Share" button.
    */
    private wireEvents = (): void => {
        // If the shareButton exists, show the share dialog when clicked
        this.shareButton?.element.addEventListener('click', () => {
            this.dialogObj?.show();
        });
    }

    /**
     * updateDocumentTitle: Updates the displayed document title. 
     * If none is set, defaults to "Untitled."
     */
    public updateDocumentTitle = (): void => {
        if (this.documentEditor.documentName === '') {
            this.documentEditor.documentName = 'Untitled';
        }
        if (this.documentTitle) {
            this.documentTitle.textContent = "Collaborative Editing";
        }
    }

    /**
     * addButton: Helper to create and append a Syncfusion Button.
     * @param btnText - The label to display on the button
     * @param tooltipText - The tooltip text on hover
     * @param isDropDown - Whether this is a dropdown button (not used here)
     */
    private addButton(btnText: string, tooltipText: string, isDropDown: boolean,) {
        let button: HTMLButtonElement = createElement('button') as HTMLButtonElement;
        this.tileBarDiv.appendChild(button);
        button.setAttribute('title', tooltipText);
        let ejButton: Button = new Button({ content: btnText }, button);
        return ejButton;
    }

    /**
     * addUser: Adds a user avatar to the user list, showing the user’s initials.
     * If multiple ActionInfo objects are passed, each is processed.
     */
    public addUser(actionInfos: ActionInfo | ActionInfo[]): void {
        if (!(actionInfos instanceof Array)) {
            actionInfos = [actionInfos];
        }

        for (let i: number = 0; i < actionInfos.length; i++) {
            let actionInfo: ActionInfo = actionInfos[i];

            // If we already have an avatar for this connectionId, or 
            // if the user is the recognized author (dataService.getAuthorName()),
            // skip adding a new avatar.
            if (this.userMap[actionInfo.connectionId as string] || actionInfo.currentUser === this.dataService?.getAuthorName()) {
                continue;
            }
            // Construct the avatar
            let avatar: HTMLElement = createElement('div', {
                className: 'e-avatar e-avatar-xsmall e-avatar-circle',
                id: 'user-avatar',
                innerHTML: this.constructInitial(actionInfo.currentUser as string)
            });
            avatar.title = actionInfo.currentUser as string;
            // Append the avatar to the user list
            if (this.userList) {
                this.userList.appendChild(avatar);
            }
            // Keep track of this avatar in the userMap
            this.userMap[actionInfo.connectionId as string] = avatar;
        }
    }

    /**
     * removeUser: Removes the user’s avatar from the user list if it exists.
     * @param conectionId - The connection ID of the user to remove
     */
    public removeUser(conectionId: string): void {
        if (this.userMap[conectionId]) {
            if (this.userList) {
                this.userList.removeChild(this.userMap[conectionId]);
            }
            delete this.userMap[conectionId];
        }
    }

    /**
     * constructInitial: Builds the user’s initials from user name.
     * For example, "John Doe" -> "JD"
     */
    private constructInitial(authorName: string): string {
        const splittedName: string[] = authorName.split(' ');
        let initials: string = '';
        for (let i: number = 0; i < splittedName.length; i++) {
            if (splittedName[i].length > 0 && splittedName[i] !== '') {
                initials += splittedName[i][0];
            }
        }
        return initials;
    }

    /**
     * initDialog: Creates a Syncfusion Dialog for sharing the document URL.
     * This dialog is opened when the user clicks the "Share" button.
     */
    private initDialog() {
        this.dialogObj = new Dialog({
            header: 'Share ' + this.documentEditor.documentName,
            animationSettings: { effect: 'None' },
            showCloseIcon: true,
            isModal: true,
            width: '500px',
            visible: false,
            buttons: [{
                click: this.copyURL.bind(this),
                buttonModel: { content: 'Copy URL', isPrimary: true }
            }],
            open: function () {
                 // When the dialog opens, select the text in the #share_url input
                let urlTextBox = document.getElementById("share_url") as HTMLInputElement;
                if (urlTextBox) {
                    urlTextBox.value = window.location.href;
                    urlTextBox.select();
                }
            },
            beforeOpen: () => {
                // Update the dialog header to reflect the current document name
                if (this.dialogObj) {
                    this.dialogObj.header = 'Share ' + this.documentEditor.documentName;
                }
                // Show the #shareDialog container
                let dialogElement: HTMLElement = document.getElementById("shareDialog") as HTMLElement;
                if (dialogElement) {
                    dialogElement.style.display = "block";
                }
            },
        });
        // Attach the dialog to an element with ID "shareDialog"
        this.dialogObj.appendTo('#shareDialog');
    }

    /**
     * copyURL: Copies the current URL from #share_url to the clipboard
     * and closes the dialog.
     */
    private copyURL() {
        var copyText: HTMLInputElement = document.getElementById("share_url") as HTMLInputElement;

        if (copyText) {
            copyText.select();
            navigator.clipboard.writeText(copyText.value);

            if (this.dialogObj) {
                this.dialogObj.hide();
            }
        }
    }
}
