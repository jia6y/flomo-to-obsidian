import * as path from 'path';
import * as os from 'os';
import *  as fs from 'fs-extra';

import { App } from 'obsidian';
import decompress from 'decompress';
import * as parse5 from "parse5"
import { Flomo } from './flomo';
import { generateMoments } from './obIntegration/moments';
import { generateCanvas } from './obIntegration/canvas';

const FLOMO_CACHE_LOC = path.join(os.homedir(), ".flomo/cache/");


export class FlomoImporter {
    private config: Record<string, any>;
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

    private async importMemos(flomo: Flomo): Promise<Flomo> {
        const allowBilink: boolean = this.config["expOptionAllowbilink"];
        const margeByDate: boolean = this.config["mergeByDate"];

        for (const [idx, memo] of flomo.memos.entries()) {

            const memoSubDir = `${this.config["flomoTarget"]}/${this.config["memoTarget"]}/${memo["date"]}`;
            const memoFilePath = margeByDate ? `${memoSubDir}/memo@${memo["date"]}.md` : `${memoSubDir}/memo@${memo["title"]}_${flomo.memos.length - idx}.md`;

            await fs.mkdirp(`${this.config["baseDir"]}/${memoSubDir}`);
            const content = (() => {
                const res = memo["content"].replace(/!\[\]\(file\//gi, "\n![](flomo/");

                if (allowBilink == true) {
                    return res.replace(`\\[\\[`, "[[").replace(`\\]\\]`, "]]")
                }

                return res;

            })();

            if (!(memoFilePath in flomo.files)) {
                flomo.files[memoFilePath] = []
            }

            flomo.files[memoFilePath].push(content);
        }

        for (const filePath in flomo.files) {
            await this.app.vault.adapter.write(
                filePath,
                flomo.files[filePath].join("\n\n")
            );
        }

        return flomo;
    }

    async import(): Promise<Flomo> {

        // 1. create workspace
        const tmpDir = path.join(FLOMO_CACHE_LOC, "data")
        await fs.mkdirp(tmpDir);

        // 2. unzip flomo_backup.zip to workspace
        const files = await decompress(this.config["rawDir"], tmpDir)

        // 3. copy attachments to ObVault
        const obVaultConfig = await fs.readJson(`${this.config["baseDir"]}/${this.app.vault.configDir}/app.json`)
        const attachementDir = obVaultConfig["attachmentFolderPath"] + "/flomo/";

        for (const f of files) {
            if (f.type == "directory" && f.path.endsWith("/file/")) {
                console.debug(`DEBUG: copying from ${tmpDir}/${f.path} to ${this.config["baseDir"]}/${attachementDir}`)
                await fs.copy(`${tmpDir}/${f.path}`, `${this.config["baseDir"]}/${attachementDir}`);
                break
            }

        }

        // 4. import Memos
        const backupData = await this.sanitize(`${tmpDir}/${files[0].path}/index.html`)
        const flomo = new Flomo(backupData);

        const memos = await this.importMemos(flomo)

        // 5. Ob Intergations
        // If Generate Moments
        if (this.config["optionsMoments"] != "skip") {
            await generateMoments(app, memos, this.config);
        }

        
        // If Generate Canvas
        if (this.config["optionsCanvas"] != "skip") {
            await generateCanvas(app, memos, this.config);
        }
    

        // 6. Cleanup Workspace
        await fs.remove(tmpDir);

        return flomo
        
    }

}
