import *  as fs from 'fs';
import { parse, HTMLElement } from 'node-html-parser';
import { NodeHtmlMarkdown } from 'node-html-markdown';

export class FlomoDataLoader {
    memoNodes: Array<HTMLElement>;
    tagNodes: Array<HTMLElement>;
    stat: Record<string, number>
    constructor() {
        this.memoNodes = [];
        this.tagNodes = [];
    }
    loadFlomoDataFrom(path: string): void {
        const flomoData = fs.readFileSync(path, "utf8");
        const root = parse(flomoData);
        this.memoNodes = root.querySelectorAll(".memo");
        this.tagNodes = root.getElementById("tag").querySelectorAll("option");
        this.stat = { "memo": this.memoNodes.length, "tag": this.tagNodes.length }
    }
    retrieveMemos(fn: (title: string, tsp_date: string, memo: string) => any): void {
        this.memoNodes.forEach(i => {
            const title = this.extrtactTitle(i.querySelector(".time").textContent);
            const tspDate = i.querySelector(".time").textContent.split(" ")[0];
            const mdContent = `Created at:  ${this.extractContent(i.innerHTML)}`
            fn(title, tspDate, mdContent)
        });
    }
    retrieveTags(fn: (tag: string) => any) {
        this.tagNodes.slice(1).forEach(i => {
            fn(i.textContent)
        })
    }
    private extrtactTitle(item: string): string {
        const re = /(-|:|\s)/gi;
        return item.replace(re, "_")
    }
    private extractContent(content: string): string {
        return NodeHtmlMarkdown.translate(content)
    }
}