import { App, DataAdapter, Modal, Plugin, Setting, Notice } from 'obsidian';
import { FlomoDataLoader } from './flomo_data_loader';
import *  as fs from 'fs-extra';
import decompress from 'decompress';
import * as path from 'path';
import * as os from 'os';



export class ImporterUI extends Modal {
    plugin: Plugin;
    fdl: FlomoDataLoader;
    flomoFolderPath: string;
    attachementPath: string;
    statusBar: HTMLElement;
    rawPath: string;
    fsa: DataAdapter;
    targetRoot: string;
    memoRoot: string;
    isDeltaLoadMode: string;

    constructor(app: App, plugin: Plugin) {
        super(app);
        this.plugin = plugin;
        //this.statusBar = this.plugin.addStatusBarItem();
        this.fdl = new FlomoDataLoader();
        this.fsa = this.app.vault.adapter;
        this.rawPath = "";
        this.targetRoot = "flomo";
        this.memoRoot = "memos";
        this.isDeltaLoadMode = "Yes";
        console.log("ImporterUI Class Loaded");
    }

    createFlomoIndex() {
        if (this.fdl.stat["memo"] > 0) {
            const index_file = `${this.targetRoot}/Flomo Moments.md`;
            this.fsa.write(index_file, `updated at: ${(new Date()).toLocaleString()}\n\n`)
            this.fdl.retrieveTags((tag) => {
                this.fsa.append(index_file, `#${tag} `)
            });
            this.fsa.append(index_file, "\n\n---\n\n")
            this.fdl.retrieveMemos((title, tsp, memo) => {
                this.fsa.append(index_file, `![[${this.targetRoot}/${this.memoRoot}/${tsp.split(" ")[0]}/memo@${title}]]\n\n---\n\n`)
            });
        }
    }

    importMemo() {
        if (this.fdl.stat["memo"] > 0) {
            var proogress = 0;
            this.fdl.retrieveMemos((title, tsp, memo) => {
                // update attachment path
                const re = /!\[\]\(file\//gi;
                const memoSubPath = `${this.targetRoot}/${this.memoRoot}/${tsp}`;
                memo = memo.replace(re, "![](flomo/");

                // create memo files
                this.fsa.exists(`${memoSubPath}`).then((memoFolderExists) => {
                    if (!memoFolderExists) {
                        this.fsa.mkdir(`${memoSubPath}`);
                        console.debug(`DEBUG: creating subfoder -> ${memoSubPath}`);
                    }

                    const memoFilePath = `${memoSubPath}/memo@${title}.md`;

                    this.fsa.exists(`${memoFilePath}`).then((memoFileExists) => {
                        if (!(memoFileExists && this.isDeltaLoadMode == "Yes")) {
                            console.debug(`DEBUG: creating memo -> ${memoSubPath}/memo@${title}.md`);
                            this.fsa.write(`${memoFilePath}`, memo);
                        } else {
                            console.debug(`DEBUG: Delta Load, skipp ${memoFilePath}`)
                        }
                    });

                    // update status in status bar
                    //this.statusBar.setText(`[${(++proogress).toString()}/${this.fdl.stat["memo"].toString()}] Flomo Memos imported.`);
                });
            })
        }
    }

    copyAttachments() {
        const attachementPath = fs.readJsonSync(`${this.app.vault.adapter.basePath}/${this.app.vault.configDir}/app.json`)["attachmentFolderPath"] + "/flomo/";
        console.debug(`DEBUG: get flomo attachment root -> ${attachementPath}`);

        this.fsa.mkdir(attachementPath)
        const tmp_flomo_home = path.join(os.tmpdir(), "flomo");

        if (!fs.existsSync(tmp_flomo_home)) {
            fs.mkdirSync(tmp_flomo_home)
        }

        const tmp_loc = fs.mkdtempSync(path.join(tmp_flomo_home, "data_"));
        decompress(this.rawPath, tmp_loc)
            .then((files) => {
                for (const f of files) {
                    if (f.type == "directory" && f.path.endsWith("/file/")) {
                        console.debug(`DEBUG: copy ${tmp_loc}/${f.path} -> ${this.app.vault.adapter.basePath + "/" + attachementPath}`);
                        fs.copySync(`${tmp_loc}/${f.path}`, this.app.vault.adapter.basePath + "/" + attachementPath);
                        fs.removeSync(tmp_loc);
                        break
                    }
                }
                new Notice(`🎉 Completed.\n Total: ${this.fdl.stat["memo"].toString()}  Flomo memos imported.`)
                console.debug("DEBUG: copy completed");
                console.debug("DEBUG: attachemnts are copied over to obsidian");
            })
    }

    async onSubmit() {
        if (this.targetRoot == "") {
            console.debug("DEBUG: targetRoot is empty, set it to 'flomo'");
            this.targetRoot = "flomo";
        }
        if (this.memoRoot == "") {
            console.debug("DEBUG: memoRoot is empty, set it to 'memos'");
            this.memoRoot = "memos";
        }
        await this.fsa.exists(`${this.targetRoot}/${this.memoRoot}`).then((res) => {
            if (!res) {
                console.debug(`DEBUG: creating memo root -> ${this.targetRoot}/${this.memoRoot}`);
                this.fsa.mkdir(`${this.targetRoot}/${this.memoRoot}`);
            }
            try {
                this.fdl.loadFlomoDataFrom(this.rawPath);
                this.importMemo();
                this.createFlomoIndex();
                this.copyAttachments();
                // reset flomo exported file path to empty.
                this.rawPath = "";
            }
            catch (err) {
                console.log(err);
                new Notice(`Failed to import Flomo files. Details:\n------------------------------\n${err}`);
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
                .setValue(this.targetRoot)
                .onChange(async (value) => {
                    this.targetRoot = value;
                    console.debug(`DEBUG: Updated targetRoot -> ${this.targetRoot}`);
                }));

        new Setting(contentEl)
            .setName('Memos location')
            .setDesc('set the target location to store memos')
            .addText((text) => text
                .setPlaceholder('memos')
                .setValue(this.memoRoot)
                .onChange(async (value) => {
                    this.memoRoot = value;
                    console.debug(`DEBUG: Updated memoRoot -> ${this.memoRoot}`);
                }));

        new Setting(contentEl)
            .setName('Skip existing memos?')
            .setDesc('Set for delta load or full load')
            .addDropdown((drp) => {
                drp.addOption("Yes", "Delta Load, skip existing memos")
                    .addOption("No", "Full Load, override existing memos")
                    .setValue(this.isDeltaLoadMode)
                    .onChange(async (value) => {
                        this.isDeltaLoadMode = value;
                        console.debug(`DEBUG: Updated deltaLoadMode -> ${this.isDeltaLoadMode}`);
                    })
            });

        new Setting(contentEl)
            .addButton((btn) => {
                btn.setButtonText("Import")
                    .setCta()
                    .onClick(() => {
                        if (this.rawPath != "") {
                            this.onSubmit();
                        }
                        else {
                            console.log("no file selected.")
                        }
                        this.close();
                    })
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
} 