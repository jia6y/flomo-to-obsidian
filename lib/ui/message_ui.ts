import { App, Modal, Plugin, Setting, Notice } from 'obsidian';
import { createExpOpt } from './common';


export class MessageUI extends Modal {
    message: string;

    constructor(app: App, msg: string) {
        super(app);
        this.message = msg;
    }

    onOpen() {

        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h5", { text: this.message });
            
        new Setting(contentEl)
        .addButton((btn) => {
            btn.setButtonText("Ok")
                .setCta()
                .onClick(async () => {
                    this.close();
                })
        });

    }
}