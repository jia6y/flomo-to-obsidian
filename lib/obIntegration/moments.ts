import { App } from 'obsidian';
import { FlomoCore } from '../flomo/core';


export async function generateMoments(app: App, flomo: FlomoCore, config: Record<string, any>): Promise<void> {
    if (flomo.memos.length > 0) {
        const buffer: string[] = [];
        const tags: string[] = [];
        const index_file = `${config["flomoTarget"]}/Flomo Moments.md`;
        const memoFiles = Object.keys(flomo.files);

        //buffer.push(`updated at: ${(new Date()).toLocaleString()}\n\n`);

        for (const tag of flomo.tags) { tags.push(`"${tag}"`);};

        buffer.push(`---\ncreatedDate: ${(new Date()).toLocaleString().split(' ')[0]}\ntags:\n  - ${tags.join("\n  - ")}\n---\n`);

        for (const [idx, memoFile] of memoFiles.entries()) {
            buffer.push(`![[${memoFile}]]\n\n---\n`);
        };

        await app.vault.adapter.write(index_file, buffer.join("\n"));
    }
}