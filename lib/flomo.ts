import { parse, HTMLElement } from 'node-html-parser';
import { NodeHtmlMarkdown } from 'node-html-markdown';
export class Flomo {
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
            res.push({"title": (this.extrtactTitle(i.querySelector(".time").textContent)) as string,
                      "date": (i.querySelector(".time").textContent.split(" ")[0]) as string,
                      "content": `Created at:  ${this.extractContent(i.innerHTML)} \n\n`})
        });
        return res;
    }

    tags(): string[] {
        const res: string[] = [];
        this.tagNodes.slice(1).forEach(i => { res.push(i.textContent); })
        return res;
    }

    private extrtactTitle(item: string): string {
        return item.replace(/(-|:|\s)/gi, "_")
    }

    private extractContent(content: string): string {
        return NodeHtmlMarkdown.translate(content).replace('\[','[').replace('\]',']')
    }

}