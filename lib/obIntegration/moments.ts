import { App } from 'obsidian';
import { Flomo } from '../flomo';


export async function generateMoments(app: App, flomo: Flomo, config: Record<string, any>): Promise<void> {
    if (flomo.memos.length > 0) {
        const buffer: string[] = [];
        const tags: string[] = [];
        const index_file = `${config["flomoTarget"]}/Flomo Moments.md`;
        const memoFiles = Object.keys(flomo.files);

        buffer.push(`updated at: ${(new Date()).toLocaleString()}\n\n`);

        for (const tag of flomo.tags) { tags.push(`#${tag}`);};

        buffer.push(tags.join(' ') + "\n\n---\n\n");

        for (const [idx, memoFile] of memoFiles.entries()) {
            buffer.push(`![[${memoFile}]]\n\n---\n\n`);
        };

        await app.vault.adapter.write(index_file, buffer.join("\n"));
    }
}