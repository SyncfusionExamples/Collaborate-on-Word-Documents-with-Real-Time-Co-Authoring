import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class DataService {

  private authorName: string = '';
  private isAuthorOpened: boolean = false;

  // Setter to set the author name
  setAuthorName(name: string): void {
    this.authorName = name;
  }

  // Getter to get the author name
  getAuthorName(): string {
    return this.authorName;
  }

  // Setter to set the isAuthorOpened flag
  setIsAuthorOpened(isOpened: boolean): void {
    this.isAuthorOpened = isOpened;
  }

  // Getter to get the isAuthorOpened flag
  getIsAuthorOpened(): boolean {
    return this.isAuthorOpened;
  }

  // Function to select the text inside the input field
  selectText(inputId: string): void {
    const inputElement = document.getElementById(inputId) as HTMLInputElement;
    if (inputElement) {
      inputElement.select();
    }
  }
}
