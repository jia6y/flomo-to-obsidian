import { App, Modal, Plugin, Setting, Notice } from 'obsidian';
import { createExpOpt } from './common';
import { MessageUI } from './message_ui'
import { FlomoAuth } from '../flomo/auth';


export class AuthUI extends Modal {
    plugin: Plugin;
    uid: string;
    passwd: string;

    constructor(app: App, plugin: Plugin) {
        super(app);
        this.plugin = plugin;
        this.uid = "";
        this.passwd = ""
    }

    onOpen() {

        const { contentEl } = this;
        contentEl.empty();
        contentEl.createEl("h3", { text: "Connecting to Flomo" });

        new Setting(contentEl)
            .setName('Flomo Signin')
            .setDesc("enter your flomo credential")
            .addText(text => text
                .setPlaceholder('Your userid')
                .onChange(async (value) => {
                    this.uid = value;
                }))
            .controlEl.createEl("input", {
                "type": "password",
                "placeholder": "Your password please"
            }).onchange = (ev) => {
                this.passwd = ev.target.value;
            };


        new Setting(contentEl)
            .setDesc("Prerequisite: npx playwright install")
            .addButton((btn) => {
                btn.setButtonText("Cancel")
                    .setCta()
                    .onClick(async () => {
                        await this.plugin.saveSettings();
                        this.close();
                    })
            })
            .addButton((btn) => {
                btn.setButtonText("Authenticate")
                    .setCta()
                    .onClick(async () => {
                        if (this.uid == "" || this.passwd == "") {
                            new Notice("Please Enter Your Flomo Username & Password.")
                        }
                        else {
                            await this.plugin.saveSettings();
                            //console.log(`${this.uid} + ${this.passwd}`);
                            btn.setButtonText("Authenticating...");
                            btn.setDisabled(true);
                            const authResult = await (new FlomoAuth().auth(this.uid, this.passwd))
                            btn.setDisabled(false);
                            btn.setButtonText("Authenticate");
                            if (authResult[0] == true) {
                                new MessageUI(this.app, "🤗 Sign-in was successful.").open();
                                //new Notice("Flomo Sign-in was successful.")
                                this.close();
                            } else {
                                new MessageUI(this.app, "🥺 Sign-in was failed.").open();
                                new Notice(`Flomo Sign-in was failed. Details:\n${authResult[1]}`)
                            }

                            //new MessageUI(this.app, "Sign-in was successful.").open();

                        }
                    })
            });


    }

}