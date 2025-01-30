import { createElement } from '@syncfusion/ej2-base';
import { ActionInfo, DocumentEditor } from '@syncfusion/ej2-documenteditor';
import { Button } from '@syncfusion/ej2-buttons';
import { Dialog } from '@syncfusion/ej2-popups';
import { DataService } from '../data.service';

/**
 * Represents document editor title bar.
 */
export class TitleBar {
    private tileBarDiv: HTMLElement;
    private documentTitle?: HTMLElement;
    private documentTitleContentEditor?: HTMLElement;
    private shareButton?: Button;
    private documentEditor: DocumentEditor;
    private userList?: HTMLElement;
    public userMap: any = {};
    private dataService?: DataService;
    private dialogObj?: Dialog;

    constructor(element: HTMLElement, docEditor: DocumentEditor, isShareNeeded: Boolean, dataService: DataService) {
        this.tileBarDiv = element;
        this.documentEditor = docEditor;
        this.dataService = dataService;
        this.initializeTitleBar(isShareNeeded);
        this.wireEvents();
    }

    private initializeTitleBar = (isShareNeeded: Boolean): void => {
        let shareText: string = 'Share';
        let shareToolTip: string = 'Share this link';
        let documentTileText: string = '';

        this.documentTitle = createElement('label', {
            id: 'documenteditor_title_name',
        });

        this.documentTitleContentEditor = createElement('div', {
            id: 'documenteditor_title_contentEditor',
            className: 'single-line',
        });
        this.documentTitleContentEditor.appendChild(this.documentTitle);
        this.tileBarDiv.appendChild(this.documentTitleContentEditor);
        this.documentTitleContentEditor.setAttribute('title', documentTileText);


        this.shareButton = this.addButton(shareText, shareToolTip, false) as Button;
        this.shareButton.element.id = 'share-button';

        this.userList = createElement('div', { id: 'de_userInfo' });
        this.tileBarDiv.appendChild(this.userList);
        this.initDialog();
    }

    private wireEvents = (): void => {
        this.shareButton?.element.addEventListener('click', () => {
            this.dialogObj?.show();
        });
    }

    public updateDocumentTitle = (): void => {
        if (this.documentEditor.documentName === '') {
            this.documentEditor.documentName = 'Untitled';
        }
        if (this.documentTitle) {
            this.documentTitle.textContent = "Collaborative Editing";
        }
    }

    private addButton(btnText: string, tooltipText: string, isDropDown: boolean, ) {
        let button: HTMLButtonElement = createElement('button') as HTMLButtonElement;
        this.tileBarDiv.appendChild(button);
        button.setAttribute('title', tooltipText);
        let ejButton: Button = new Button({ content: btnText }, button);
        return ejButton;
    }

    public addUser(actionInfos: ActionInfo | ActionInfo[]): void {
        if (!(actionInfos instanceof Array)) {
            actionInfos = [actionInfos];
        }

        for (let i: number = 0; i < actionInfos.length; i++) {
            let actionInfo: ActionInfo = actionInfos[i];
            
            if (this.userMap[actionInfo.connectionId as string] || actionInfo.currentUser === this.dataService?.getAuthorName()) {
                continue; 
            }
            let avatar: HTMLElement = createElement('div', {
                className: 'e-avatar e-avatar-xsmall e-avatar-circle',
                id: 'user-avatar',
                innerHTML: this.constructInitial(actionInfo.currentUser as string)
            });
            avatar.title = actionInfo.currentUser as string;
            if (this.userList) {
                this.userList.appendChild(avatar);
            }
            this.userMap[actionInfo.connectionId as string] = avatar;
        }
    }

    public removeUser(conectionId: string): void {
        if (this.userMap[conectionId]) {
            if (this.userList) {
                this.userList.removeChild(this.userMap[conectionId]);
            }
            delete this.userMap[conectionId];
        }
    }

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

    private initDialog() {
        this.dialogObj = new Dialog({
            header: 'Share ' + this.documentEditor.documentName + '.docx',
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
                let urlTextBox = document.getElementById("share_url") as HTMLInputElement;
                console.log(urlTextBox.value);
                if (urlTextBox) {
                    urlTextBox.value = window.location.href;
                    urlTextBox.select();
                }
            },
            beforeOpen: () => {
                if (this.dialogObj) {
                    this.dialogObj.header = 'Share "' + this.documentEditor.documentName + '.docx"';
                }
                let dialogElement: HTMLElement = document.getElementById("shareDialog") as HTMLElement;
                if (dialogElement) {
                    dialogElement.style.display = "block";
                }
            },
        });
        this.dialogObj.appendTo('#shareDialog');
    }

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
