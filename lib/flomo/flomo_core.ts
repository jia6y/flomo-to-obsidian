import { parse, HTMLElement } from 'node-html-parser';
//import { NodeHtmlMarkdown} from 'node-html-markdown';
import turndown from 'turndown';
import DOMPurify from 'dompurify';

export class FlomoCore {
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
            const td = new turndown({bulletListMarker: '-'});
            //const p_rule = {
            //    filter: 'p',
            //    replacement: function (content) {
            //      return '\n' + content + '\n'
            //    }
            //  }
            const liRule = {
                filter: 'li',
              
                replacement: function (content, node, options) {
                  content = content
                    .replace(/^\n+/, '') // remove leading newlines
                    .replace(/\n+$/, '\n') // replace trailing newlines with just a single one
                    .replace(/\n/gm, '\n    ') // indent
                    //.replace(/\<p\>/gi, '')
                    //.replace(/\<\/p\>/gi, '')
                  var prefix = options.bulletListMarker + ' '
                  var parent = node.parentNode
                  if (parent.nodeName === 'OL') {
                    var start = parent.getAttribute('start')
                    var index = Array.prototype.indexOf.call(parent.children, node)
                    prefix = (start ? Number(start) + index : index + 1) + '.  '
                  }
                  return (
                    prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : '')
                  )
                }
              }
              
            td.addRule('listItem', liRule);

            return td.turndown(content).replace(/\\\[/g, '[')
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

            // @Mar-31, 2024 Fix: #20 - Support <mark>.*?<mark/>
            const contentBody = i.querySelector(".content").innerHTML.replaceAll("<mark>", "FLOMOIMPORTERHIGHLIGHTMARKPLACEHOLDER").replaceAll("</mark>", "FLOMOIMPORTERHIGHLIGHTMARKPLACEHOLDER");
            const contentFile = i.querySelector(".files").innerHTML

            const content = extractContent(contentBody) + "\n" + extractContent(contentFile);

            res.push({
                "title": title,
                "date": dateTime.split(" ")[0],
                "content": "📅 [[" + dateTime.split(" ")[0] + "]]"+ " " + dateTime.split(" ")[1] + "\n\n" + content,
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