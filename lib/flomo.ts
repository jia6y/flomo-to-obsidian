import { parse, HTMLElement } from 'node-html-parser';
//import { NodeHtmlMarkdown} from 'node-html-markdown';
import turndown from 'turndown';

export class Flomo {
    memos: Record<string, string>[];
    tags: string[];
    files: Record<string, string[]>;

    constructor(flomoData: string) {
        //const root = parse(DOMPurify.sanitize(flomoData));
        const root = parse(flomoData);
        this.memos = this.loadMemos(root.querySelectorAll(".memo"));
        this.tags = this.loadTags(root.getElementById("tag").querySelectorAll("option"));
        this.files = {};
    }

    private loadMemos(memoNodes: Array<HTMLElement>): Record<string, string>[] {

        const res: Record<string, string>[] = [];
        const extrtactTitle = (item: string) => { return item.replace(/(-|:|\s)/gi, "_") }
        const extractContent = (content: string) => {
            //return NodeHtmlMarkdown.translate(content, {bulletMarker: '-',}).replace('\[', '[').replace('\]', ']')
            //return NodeHtmlMarkdown.translate(content, {bulletMarker: '-',}).replace('\[', '[').replace('\]', ']')
            //return (new showdown.Converter({metadata: false})).makeMarkdown(content)
            //return NodeHtmlMarkdown.translate(content, {bulletMarker: '-'})
            return (new turndown()).turndown(content)
                                        .replace(/\\\[/g, '[')
                                        .replace(/\\\]/g, ']')
                                        //replace(/\\#/g, '#')
                                        .replace(/!\[\]\(file\//gi, "\n![](flomo/")
                                        //.replace(/\<\!--\s--\>/g, '')
                                        //.replace(/^\s*[\r\n]/gm,'')
                                        //.replace(/!\[null\]\(<file\//gi, "\n![](<flomo/");
        }

        memoNodes.forEach(i => {

            const dateTime = i.querySelector(".time").textContent;
            const title = extrtactTitle(dateTime);
            const content = extractContent(i.querySelector(".content").innerHTML) + "\n" +
                extractContent(i.querySelector(".files").innerHTML);

            res.push({
                "title": title,
                "date": dateTime.split(" ")[0],
                "content": "`📅 " + dateTime + "`\n\n" + content,
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