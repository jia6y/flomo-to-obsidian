import * as path from 'path';
import * as os from 'os';
import *  as fs from 'fs-extra';

import { App } from 'obsidian';
import decompress from 'decompress';
import * as parse5 from "parse5"

import { FlomoCore } from './core';
import { generateMoments } from '../obIntegration/moments';
import { generateCanvas } from '../obIntegration/canvas';

import { FLOMO_CACHE_LOC } from './const'
//const FLOMO_CACHE_LOC = path.join(os.homedir(), "/.flomo/cache/");


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

    private async importMemos(flomo: FlomoCore): Promise<FlomoCore> {
        const allowBilink: boolean = this.config["expOptionAllowbilink"];
        const margeByDate: boolean = this.config["mergeByDate"];

        for (const [idx, memo] of flomo.memos.entries()) {

            const memoSubDir = `${this.config["flomoTarget"]}/${this.config["memoTarget"]}/${memo["date"]}`;
            const memoFilePath = margeByDate ? `${memoSubDir}/memo@${memo["date"]}.md` : `${memoSubDir}/memo@${memo["title"]}_${flomo.memos.length - idx}.md`;

            await fs.mkdirp(`${this.config["baseDir"]}/${memoSubDir}`);
            const content = (() => {
                // @Mar-31, 2024 Fix: #20 - Support <mark>.*?<mark/>
                // Break it into 2 stages, too avoid "==" translating to "\=="
                //  1. Replace <mark> & </mark> with FLOMOIMPORTERHIGHLIGHTMARKPLACEHOLDER (in lib/flomo/core.ts)
                //  2. Replace FLOMOIMPORTERHIGHLIGHTMARKPLACEHOLDER with ==
                const res = memo["content"].replaceAll("FLOMOIMPORTERHIGHLIGHTMARKPLACEHOLDER", "==");

                if (allowBilink == true) {
                    return res.replace(`\\[\\[`, "[[").replace(`\\]\\]`, "]]");
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
                flomo.files[filePath].join("\n\n---\n\n")
            );
        }

        return flomo;
    }

    async import(): Promise<FlomoCore> {

        // 1. Create workspace
        const tmpDir = path.join(FLOMO_CACHE_LOC, "data")
        await fs.mkdirp(tmpDir);

        // 2. Unzip flomo_backup.zip to workspace
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

        // 4. Import Memos
        // Fix for newer flomo export structure: Handle directory name changes and find HTML file
        let rootDir = files[0].path;

        // Handle both old and new flomo export structures
        // New structure: flomo@username-date/
        // Old structure: userid/

        // Ensure we're working with the root directory
        // Handle both old and new flomo export structures
        if (files.some(f => f.path.endsWith('/file/') || f.path.includes('@'))) {
            // New flomo export structure detected
            const rootDirFiles = files.filter(f => f.path.includes('@') && f.path.includes('/'));
            if (rootDirFiles.length > 0) {
                rootDir = rootDirFiles[0].path;
            }
        } else {
            // For older export formats, the first item should be the root directory
            rootDir = files.find(f => f.type === 'directory')?.path || files[0].path;
        }

        const htmlDir = `${tmpDir}/${rootDir}`;
        console.debug(`DEBUG: Looking for HTML files in directory: ${htmlDir}`);

        const allFiles = await fs.readdir(htmlDir);
        console.debug(`DEBUG: Files in directory:`, allFiles);

        const htmlFiles = allFiles.filter(fn => fn.endsWith('.html'));
        console.debug(`DEBUG: Found HTML files:`, htmlFiles);

        if (htmlFiles.length === 0) {
            throw new Error(`No HTML files found in flomo export. Directory: ${htmlDir}, Files: ${allFiles.join(', ')}`);
        }

        // Use the first HTML file found
        const defaultPage = htmlFiles[0];
        const dataExport = await this.sanitize(`${htmlDir}/${defaultPage}`);
        const flomo = new FlomoCore(dataExport);

        const memos = await this.importMemos(flomo);

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
