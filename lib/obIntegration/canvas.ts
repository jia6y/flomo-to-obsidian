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

export async function generateCanvas(app: App, flomo: Flomo, config: Record<string, any>): Promise<void> {
    if (flomo.memos.length > 0) {
        const size: number[] = canvasSize[config["canvasSize"]];
        const buffer: Record<string, string>[] = [];
        const canvasFile = `${config["flomoTarget"]}/Flomo Canvas.canvas`;
        const memoFiles = Object.keys(flomo.files);

        for (const [idx, memoFile] of memoFiles.entries()) {
                
            const _id: string = uuidv4();
            const _x: number = (idx % 8) * (size[0] + 20); //  margin: 20px, length: 8n
            const _y: number = (Math.floor(idx / 8)) * (size[1] + 20); //  margin: 20px

            const content = flomo.files[memoFile];

            const canvasNode: Record<string, any> = (() => {
                if (config["optionsCanvas"] == "copy_with_link") {
                    return {
                        "type": "file",
                        "file": memoFile,
                        "id": _id,
                        "x": _x,
                        "y": _y,
                        "width": size[0],
                        "height": size[1]
                    };
                } else {
                    return {
                        "type": "text",
                        "text": "**" + memoFile.split("@")[1] + "**\n\n" + content.join("\n\n---\n\n"),
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
        await app.vault.adapter.write(canvasFile, JSON.stringify(canvasJson));
        
    }
}