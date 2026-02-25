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

    private sanitizeHtml(flomoData: string): string {
        const document = parse5.parse(flomoData);
        return parse5.serialize(document);
    }

    private async sanitizePath(rawPath: string): Promise<string> {
        const flomoData = await fs.readFile(rawPath, "utf8");
        return this.sanitizeHtml(flomoData);
    }

    private resolveManualTargetDir(): { targetDir: string, isAbsoluteTarget: boolean } {
        const configured = this.config["manualDailyMergeTargetDir"] || `${this.config["flomoTarget"]}/${this.config["memoTarget"]}`;
        const expandedTarget = configured.replace(/^~(?=\/|$)/, os.homedir());
        return {
            targetDir: expandedTarget,
            isAbsoluteTarget: path.isAbsolute(expandedTarget)
        };
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

    private async importHtmlMemosByDate(flomo: FlomoCore): Promise<FlomoCore> {
        const { targetDir, isAbsoluteTarget } = this.resolveManualTargetDir();
        const mergedCountByDate: Record<string, number> = {};

        if (isAbsoluteTarget) {
            await fs.mkdirp(targetDir);
        } else {
            await fs.mkdirp(path.join(this.config["baseDir"], targetDir));
        }

        for (const memo of flomo.memos) {
            const date = memo["date"];
            const content = memo["content"].replaceAll("FLOMOIMPORTERHIGHLIGHTMARKPLACEHOLDER", "==");
            const filePath = isAbsoluteTarget ? path.join(targetDir, `${date}.md`) : `${targetDir}/${date}.md`;

            let existing = "";
            if (isAbsoluteTarget) {
                if (await fs.pathExists(filePath)) {
                    existing = await fs.readFile(filePath, "utf8");
                }
            } else if (await this.app.vault.adapter.exists(filePath)) {
                existing = await this.app.vault.adapter.read(filePath);
            }

            if (existing.includes(content)) {
                continue;
            }

            const merged = existing.trim().length > 0 ? `${existing}\n\n---\n\n${content}` : content;
            if (isAbsoluteTarget) {
                await fs.writeFile(filePath, merged, "utf8");
            } else {
                await this.app.vault.adapter.write(filePath, merged);
            }

            mergedCountByDate[date] = (mergedCountByDate[date] || 0) + 1;
        }

        console.log(`[FlomoImporter] 手工 HTML 按天合并完成，目标目录: ${targetDir}，涉及 ${Object.keys(mergedCountByDate).length} 天`);
        return flomo;
    }

    private async importZipWorkspace(rawZip: string | Buffer): Promise<FlomoCore> {
        const tmpDir = path.join(FLOMO_CACHE_LOC, "data");
        await fs.mkdirp(tmpDir);

        try {
            const files = await decompress(rawZip, tmpDir);
            if (files.length === 0) {
                throw new Error("ZIP 文件内容为空或无法解析，请重新导出后重试。");
            }

            const rootDir = files.find((f) => f.type === "directory");
            if (rootDir == null) {
                throw new Error("ZIP 结构不符合预期，缺少根目录。");
            }

            const rootPath = `${tmpDir}/${rootDir.path}`;
            const htmlFiles = (await fs.readdir(rootPath)).filter((fn) => fn.toLowerCase().endsWith('.html'));
            const defaultPage = htmlFiles[0];
            if (defaultPage == null) {
                throw new Error("ZIP 中未找到可导入的 HTML 文件。");
            }

            const obVaultConfig = await fs.readJson(`${this.config["baseDir"]}/${this.app.vault.configDir}/app.json`);
            const attachmentRoot = obVaultConfig["attachmentFolderPath"] || "attachments";
            const attachementDir = `${attachmentRoot}/flomo/`;

            for (const f of files) {
                if (f.type == "directory" && f.path.endsWith("/file/")) {
                    console.debug(`DEBUG: copying from ${tmpDir}/${f.path} to ${this.config["baseDir"]}/${attachementDir}`);
                    await fs.copy(`${tmpDir}/${f.path}`, `${this.config["baseDir"]}/${attachementDir}`);
                    break;
                }
            }

            const dataExport = await this.sanitizePath(`${rootPath}/${defaultPage}`);
            const flomo = new FlomoCore(dataExport);
            const memos = await this.importMemos(flomo);

            if (this.config["optionsMoments"] != "skip") {
                await generateMoments(this.app, memos, this.config);
            }

            if (this.config["optionsCanvas"] != "skip") {
                await generateCanvas(this.app, memos, this.config);
            }

            return flomo;
        } finally {
            await fs.remove(tmpDir);
        }
    }

    async importFromContent(payload: { fileName: string, htmlText?: string, zipBytes?: Buffer }): Promise<FlomoCore> {
        const lowerFileName = payload.fileName.toLowerCase();
        console.log(`[FlomoImporter] 内容导入入口: ${payload.fileName}`);

        if (lowerFileName.endsWith(".html")) {
            if (typeof payload.htmlText !== "string" || payload.htmlText.trim() === "") {
                throw new Error("HTML 文件读取失败，内容为空。");
            }
            const sanitized = this.sanitizeHtml(payload.htmlText);
            const flomo = new FlomoCore(sanitized);
            return this.importHtmlMemosByDate(flomo);
        }

        if (lowerFileName.endsWith(".zip")) {
            if (payload.zipBytes == null || payload.zipBytes.length === 0) {
                throw new Error("ZIP 文件读取失败，内容为空。");
            }
            return this.importZipWorkspace(payload.zipBytes);
        }

        throw new Error("仅支持 .zip 或 .html 文件。");
    }

    async import(): Promise<FlomoCore> {
        const rawPath: string = this.config["rawDir"];
        const normalizedRawPath = typeof rawPath === "string" ? rawPath.trim() : "";
        if (normalizedRawPath === "") {
            console.log("[FlomoImporter] 导入入口参数异常: rawDir 为空");
            throw new Error("未选择导入文件路径，请先选择 .zip 或 .html 文件。");
        }

        console.log(`[FlomoImporter] 导入入口 rawPath: ${normalizedRawPath}`);
        if (normalizedRawPath.toLowerCase().endsWith(".html")) {
            console.log(`[FlomoImporter] 检测到手工导出 HTML: ${normalizedRawPath}`);
            const dataExport = await this.sanitizePath(normalizedRawPath);
            const flomo = new FlomoCore(dataExport);
            return this.importHtmlMemosByDate(flomo);
        }
        console.log("[FlomoImporter] 检测到 ZIP 导入分支");
        return this.importZipWorkspace(normalizedRawPath);
    }

}
