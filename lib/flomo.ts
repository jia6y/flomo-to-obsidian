import * as path from 'path';
import * as os from 'os';
import *  as fs from 'fs-extra';

import { parse, HTMLElement } from 'node-html-parser';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { App } from 'obsidian';

import decompress from 'decompress';
import * as parse5 from "parse5"
//import * as CryptoJS from 'crypto-js';


const FLOMO_CACHE_LOC = path.join(os.homedir(), ".flomo/cache/");


class Flomo {
    private memoNodes: Array<HTMLElement>;
    private tagNodes: Array<HTMLElement>;

    stat: Record<string, number>

    constructor(flomoData: string) {
        const root = parse(flomoData);
        this.memoNodes = root.querySelectorAll(".memo");
        this.tagNodes = root.getElementById("tag").querySelectorAll("option");
        this.stat = { "memo": this.memoNodes.length, "tag": this.tagNodes.length }
    }

    memos(): Record<string, string>[] {
        const res: Record<string, string>[] = [];
        this.memoNodes.forEach(i => {
            res.push({
                "title": (this.extrtactTitle(i.querySelector(".time").textContent)) as string,
                "date": (i.querySelector(".time").textContent.split(" ")[0]) as string,
                "content": `Created at:  ${this.extractContent(i.innerHTML)} \n\n`
            })
        });
        return res;
    }

    tags(): string[] {
        const res: string[] = [];
        this.tagNodes.slice(1).forEach(i => {
            res.push(i.textContent);
        })
        return res;
    }

    private extrtactTitle(item: string): string {
        const r = /(-|:|\s)/gi
        return item.replace(r, "_")
    }

    private extractContent(content: string): string {
        return NodeHtmlMarkdown.translate(content)
    }

}


export class FlomoImporter {
    private config: Record<string, string>;
    private app: App;

    constructor(app: App, config: Record<string, string>) {
        this.config = config;
        this.app = app;
        
        this.config["baseDir"] = app.vault.adapter.basePath;
    }

    private async sanitize(path: string): Promise<string> {
        const flomoData = await fs.readFile(path, "utf8");
        const document = parse5.parse(flomoData);
        return parse5.serialize(document);
    }

    private async importMemos(flomo: Flomo): Promise<void> {
        for (const [idx, memo] of flomo.memos().entries()) {
            const memoSubDir = `${this.config["rootDir"]}/${this.config["memoDir"]}/${memo["date"]}`;
            const memoFilePath = `${memoSubDir}/memo@${memo["title"]}_${idx}.md`;

            await fs.mkdirp(`${this.config["baseDir"]}/${memoSubDir}`);
 
            const content = memo["content"].replace(/!\[\]\(file\//gi, "![](flomo/");
            await this.app.vault.adapter.write(
                `${memoFilePath}`,
                content
            );

        }
    }

    private async generateMoments(flomo: Flomo): Promise<void> {

        if (flomo.stat["memo"] > 0) {
            const buffer: string[] = [];
            const tags: string[] = [];
            const index_file = `${this.config["rootDir"]}/Flomo Moments.md`;

            buffer.push(`updated at: ${(new Date()).toLocaleString()}\n\n`);

            for (const tag of flomo.tags()) {
                tags.push(`#${tag}`);
            };

            buffer.push(tags.join(' ') + "\n\n---\n\n");

            for (const [idx, memo] of flomo.memos().entries()) {
                buffer.push(`![[${this.config["memoDir"]}/${memo["date"].split(" ")[0]}/memo@${memo["title"]}_${idx}]]\n\n---\n\n`);
            };

            await this.app.vault.adapter.write(index_file, buffer.join("\n"));

        }
    }

    async import(): Promise<Flomo> {
        // 1. create workspace
        const tmpDir = path.join(FLOMO_CACHE_LOC, "data")
        await fs.mkdirp(tmpDir);

        // 2. unzip flomo_backup.zip to workspace
        const files = await decompress(this.config["rawDir"], tmpDir)

        // 3. import Memos
        const backupData = await this.sanitize(`${tmpDir}/${files[0].path}/index.html`)
        const flomo = new Flomo(backupData);
        await this.importMemos(flomo)

        // 4. generate Moments
        await this.generateMoments(flomo);

        // 5. copy attachments to ObVault
        const obVaultConfig = await fs.readJson(`${this.config["baseDir"]}/${this.app.vault.configDir}/app.json`)
        const attachementDir = obVaultConfig["attachmentFolderPath"] + "/flomo/";
        for (const f of files) {
            if (f.type == "directory" && f.path.endsWith("/file/")) {
                console.debug(`DEBUG: copying from ${tmpDir}/${f.path} to ${this.config["baseDir"]}/${attachementDir}`)
                await fs.copy(`${tmpDir}/${f.path}`, `${this.config["baseDir"]}/${attachementDir}`);
                await fs.remove(tmpDir);
                break
            }
        }

        return flomo
    }

}