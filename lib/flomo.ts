import * as path from 'path';
import * as os from 'os';
import *  as fs from 'fs-extra';

import { parse, HTMLElement } from 'node-html-parser';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { App } from 'obsidian';
import decompress from 'decompress';


class Flomo {
    private memoNodes: Array<HTMLElement>;
    private tagNodes: Array<HTMLElement>;

    stat: Record<string, number>

    constructor(path: string) {
        const flomoData = fs.readFileSync(path, "utf8");
        const root = parse(flomoData);
        this.memoNodes = root.querySelectorAll(".memo");
        this.tagNodes = root.getElementById("tag").querySelectorAll("option");
        this.stat = { "memo": this.memoNodes.length, 
                      "tag": this.tagNodes.length }
    }

    memos(fn: (title: string, tsp_date: string, memo: string) => any): void {
        this.memoNodes.forEach(i => {
            const title = this.extrtactTitle(i.querySelector(".time").textContent);
            const tspDate = i.querySelector(".time").textContent.split(" ")[0];
            const mdContent = `Created at:  ${this.extractContent(i.innerHTML)}`
            fn(title, tspDate, mdContent)
        });
    }

    tags(fn: (tag: string) => any): void {
        this.tagNodes.slice(1).forEach(i => {
            fn(i.textContent)
        })
    }

    private extrtactTitle(item: string): string {
        const r = /(-|:|\s)/gi
        return item.replace(r, "_")
    }

    private extractContent(content: string): string {
        return NodeHtmlMarkdown.translate(content)
    }

}


export class Importer {
    private app: App
    private flomo: Flomo;
    private sourceDataPath: string;
  
    constructor(app: App, sourceDataPath: string) {
        this.app = app;
        this.sourceDataPath = sourceDataPath;
        this.flomo = new Flomo(sourceDataPath);
    }

    import(targetRoot:string, memoRoot:string, isDeltaLoadMode: string, cb: (flomo: Flomo) => any):void { 
        const memoDir = `${targetRoot}/${memoRoot}`;
        const basePath = this.app.vault.adapter.basePath;

        // import memos
        this.flomo.memos((title, date, memo): void => {
            const memoSubFolder = `${memoDir}/${date}`;
            const memoFilePath = `${memoSubFolder}/memo@${title}.md`;
            fs.mkdirpSync(`${basePath}/${memoSubFolder}`);
        
            if(!(fs.existsSync(`${basePath}/${memoFilePath}`) && isDeltaLoadMode == "Yes")){
                this.app.vault.adapter.write(
                    `${memoFilePath}`, 
                    memo.replace(/!\[\]\(file\//gi, "![](flomo/")
                );
                console.debug(`DEBUG: creating ${memoFilePath}`)
            }else{
                console.debug(`DEBUG: DeltaLoad, skipping ${memoFilePath}`)
            }
        })

        // generate moments
        if (this.flomo.stat["memo"] > 0) {
            const buffer: string[] = [];
            const tags: string[] = [];
            const index_file = `${targetRoot}/Flomo Moments.md`;

            buffer.push(`updated at: ${(new Date()).toLocaleString()}\n\n`);
            this.flomo.tags((tag) => {tags.push(`#${tag}`);});
            buffer.push(tags.join(' ') + "\n\n---\n\n");

            this.flomo.memos((title, tsp, memo) => {
                buffer.push(`![[${memoDir}/${tsp.split(" ")[0]}/memo@${title}]]\n\n---\n\n`);
            });

            this.app.vault.adapter.write(index_file, buffer.join("\n"));
        }

        // copy attachments over to vault
        const attachementDir = fs.readJsonSync(`${basePath}/${this.app.vault.configDir}/app.json`)["attachmentFolderPath"] + "/flomo/";
        const tmpRoot = path.join(os.homedir(), ".flomo/cache/");
        const tmpDir = path.join(tmpRoot, "data")
        fs.mkdirpSync(tmpDir);

        decompress(this.sourceDataPath, tmpDir)
            .then((files) => {
                for (const f of files) {
                    if (f.type == "directory" && f.path.endsWith("/file/")) {
                        console.debug(`DEBUG: copying from ${tmpDir}/${f.path} to ${basePath}/${attachementDir}`)
                        fs.copySync(`${tmpDir}/${f.path}`, `${basePath}/${attachementDir}`);
                        fs.removeSync(tmpDir);
                        break
                    }
                }
                cb(this.flomo);
            })
    }
}