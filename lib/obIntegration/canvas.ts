import { App } from 'obsidian';
import { v4 as uuidv4 } from 'uuid';
import { Flomo } from '../flomo';

const canvasJson = {
    "nodes": [],
    "edges": []
}

const canvasSize = {
    "L": [500, 500],
    "M": [300, 350],
    "S": [230, 280]
}

export async function generateCanvas(app: App, flomo: Flomo, config: Record<string, string>): Promise<void> {
    const size: number[] = canvasSize[config["canvasSize"]];
    if (flomo.stat["memo"] > 0) {
        const buffer: Record<string, string>[] = [];
        const canvas_file = `${config["flomoTarget"]}/Flomo Canvas.canvas`;

        for (const [idx, memo] of flomo.memos().entries()) {
            const _id: string = uuidv4();
            const _x: number = (idx % 8) * (size[0] + 20); //  margin: 20px, length: 8n
            const _y: number = (Math.floor(idx / 8)) * (size[1] + 20); //  margin: 20px

            const content = (() => {
                const res = memo["content"].replace(/!\[\]\(file\//gi, "![](flomo/");
                if (config["expOptionAllowbilink"] == true) {
                    return res.replace(`\\[\\[`, "[[").replace(`\\]\\]`, "]]")
                }
                return res;
            })();

            const canvasNode: Record<string, any> = (() => {
                if (config["optionsCanvas"] == "copy_with_link") {
                    return {
                        "type": "file",
                        "file": `${config["flomoTarget"]}/${config["memoTarget"]}/${memo["date"].split(" ")[0]}/memo@${memo["title"]}_${flomo.stat["memo"] - idx}.md`,
                        "id": _id,
                        "x": _x,
                        "y": _y,
                        "width": size[0],
                        "height": size[1]
                    };
                } else {
                    return {
                        "type": "text",
                        "text": content,
                        "id": _id,
                        "x": _x,
                        "y": _y,
                        "width": size[0],
                        "height": size[1]
                    };
                }
            })()

            buffer.push(canvasNode);
        };

        const canvasJson = { "nodes": buffer, "edges": [] }
        await app.vault.adapter.write(canvas_file, JSON.stringify(canvasJson));
    }
}