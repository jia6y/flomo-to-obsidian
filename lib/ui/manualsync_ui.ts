import { App, Modal, Plugin, Setting, Notice } from 'obsidian';
import { createExpOpt } from './common';


export class ManualSyncUI extends Modal {
    plugin: Plugin;
    rawPath: string;
    selectedFile: File | null;

    constructor(app: App, plugin: Plugin) {
        super(app);
        this.plugin = plugin;
        this.rawPath = "";
        this.selectedFile = null;
    }

    onOpen() {

        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h3", { text: "AdHoc Import" });

        // const ctrlUploadBox = new Setting(contentEl)
        // ctrlUploadBox.setName("Select flomo@<uid>-<date>.zip");
        const fileLocContol: HTMLInputElement = contentEl.createEl("input", { type: "file", cls: "uploadbox" })
        fileLocContol.setAttr("accept", ".zip");
        fileLocContol.onchange = (ev) => {
            const selectedFile = ev.currentTarget?.files?.[0] ?? null;
            this.selectedFile = selectedFile;
            this.rawPath = "";
            if (selectedFile == null) {
                console.log("[ManualSyncUI] 文件选择结果: <empty>");
                return;
            }
            console.log(`[ManualSyncUI] 文件选择结果: ${selectedFile.name} (${selectedFile.size} bytes)`);
        };

        contentEl.createEl("br");
    
        new Setting(contentEl)
        .addButton((btn) => {
            btn.setButtonText("Cancel")
                .setCta()
                .onClick(async () => {
                    await this.plugin.saveSettings();
                    this.close();
                })
        })
        .addButton((btn) => {
            btn.setButtonText("Import")
                .setCta()
                .onClick(async () => {
                    await this.plugin.saveSettings();
                    this.close();
                })
        });


    }

}