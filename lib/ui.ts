import { App, Modal, Plugin, Setting, Notice } from 'obsidian';
import { Importer } from './flomo';


export class ImporterUI extends Modal {
    plugin: Plugin;
    rawPath: string;

    constructor(app: App, plugin: Plugin) {
        super(app);
        this.plugin = plugin;
        this.rawPath = "";
    }

    onSubmit() {
        const targetMemoLocation = this.plugin.settings.flomoTarget + "/" + 
                                   this.plugin.settings.memoTarget;
        
        this.app.vault.adapter.exists(targetMemoLocation).then((res) => {
            if (!res) {
                console.debug(`DEBUG: creating memo root -> ${targetMemoLocation}`);
                this.app.vault.adapter.mkdir(`${targetMemoLocation}`);
            }

            try {
                
                const flomo_importer = new Importer(this.app, this.rawPath);
                flomo_importer.import(this.plugin.settings.flomoTarget, 
                                      this.plugin.settings.memoTarget, 
                                      this.plugin.settings.isDeltaLoadMode,
                    (flomo) => {
                        this.rawPath = "";
                        new Notice(`🎉 Import Completed.\nTotal: ${flomo.stat["memo"].toString()} memos`)
                    }
                );

            }catch (err) {
                this.rawPath = "";
                console.log(err);
                new Notice(`Flomo Importer Error. Details:\n${err}`);
            }
        });
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h3", { text: "Flomo to Obsidian: Importer" });
        contentEl.createEl("br");

        const fileLocContol: HTMLInputElement = contentEl.createEl("input", { type: "file" })
        fileLocContol.setAttr("accept", ".zip");
        fileLocContol.onchange = (ev) => {
            this.rawPath = ev.currentTarget.files[0]["path"];
            console.log(this.rawPath)
        };

        contentEl.createEl("br");
        contentEl.createEl("br");

        new Setting(contentEl)
            .setName('Target location')
            .setDesc('set the target location to import flomo memos')
            .addText(text => text
                .setPlaceholder('flomo')
                .setValue(this.plugin.settings.flomoTarget)
                .onChange(async (value) => {
                    this.plugin.settings.flomoTarget = value;
                }));

        new Setting(contentEl)
            .setName('Memos location')
            .setDesc('set the target location to store memos')
            .addText((text) => text
                .setPlaceholder('memos')
                .setValue(this.plugin.settings.memoTarget)
                .onChange(async (value) => {
                    this.plugin.settings.memoTarget = value;
                }));

        new Setting(contentEl)
            .setName('Skip existing memos?')
            .setDesc('Set for delta load or full load')
            .addDropdown((drp) => {
                drp.addOption("Yes", "Delta Load, skip existing memos")
                    .addOption("No", "Full Load, override existing memos")
                    .setValue(this.plugin.settings.isDeltaLoadMode)
                    .onChange(async (value) => {
                        this.plugin.settings.isDeltaLoadMode = value;
                    })
            });

        new Setting(contentEl)
            .addButton((btn) => {
                btn.setButtonText("Cancel")
                    .setCta()
                    .onClick(() => {
                        this.close();
                    })
            })
            .addButton((btn) => {
                btn.setButtonText("Import")
                    .setCta()
                    .onClick(async () => {
                        if (this.rawPath != "") {
                            this.onSubmit();
                            this.close();
                            await this.plugin.saveSettings();
                        }
                        else {
                            new Notice("No File Selected.")
                        }
                    })
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }

} 