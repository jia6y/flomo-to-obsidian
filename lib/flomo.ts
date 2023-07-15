import { parse, HTMLElement } from 'node-html-parser';
import { NodeHtmlMarkdown } from 'node-html-markdown';
export class Flomo {
    memos: Record<string, string>[];
    tags: string[];
    files: Record<string, string[]>;

    constructor(flomoData: string) {
        const root = parse(flomoData);
        this.memos = this.loadMemos(root.querySelectorAll(".memo"));
        this.tags = this.loadTags(root.getElementById("tag").querySelectorAll("option"));
        this.files = {};
    }


    private loadMemos(memoNodes: Array<HTMLElement>): Record<string, string>[] {
        const res: Record<string, string>[] = [];
        const extrtactTitle = (item: string) => { return item.replace(/(-|:|\s)/gi, "_") }
        const extractContent = (content: string) => {
            return NodeHtmlMarkdown.translate(content).replace('\[', '[').replace('\]', ']')
        }

        memoNodes.forEach(i => {

            const dateTime = i.querySelector(".time").textContent;
            const title = extrtactTitle(dateTime);
            const content = extractContent(i.querySelector(".content").innerHTML) + "\n" +
                extractContent(i.querySelector(".files").innerHTML);

            res.push({
                "title": title,
                "date": dateTime.split(" ")[0],
                "content": "`" + dateTime + "`\n" + content,
            })

        });

        return res;
    }

    private loadTags(tagNodes: Array<HTMLElement>): string[] {
        const res: string[] = [];

        tagNodes.slice(1).forEach(i => { res.push(i.textContent); })

        return res;

    }

}