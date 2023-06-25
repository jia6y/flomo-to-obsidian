import { App } from 'obsidian';
import { Flomo } from '../flomo';


export async function generateMoments(app: App, flomo: Flomo, config: Record<string, string>): Promise<void> {
    if (flomo.stat["memo"] > 0) {
        const buffer: string[] = [];
        const tags: string[] = [];
        const index_file = `${config["flomoTarget"]}/Flomo Moments.md`;

        buffer.push(`updated at: ${(new Date()).toLocaleString()}\n\n`);

        for (const tag of flomo.tags()) { tags.push(`#${tag}`);};

        buffer.push(tags.join(' ') + "\n\n---\n\n");

        for (const [idx, memo] of flomo.memos().entries()) {
            buffer.push(`![[${config["memoTarget"]}/${memo["date"].split(" ")[0]}/memo@${memo["title"]}_${flomo.stat["memo"] - idx}]]\n\n---\n\n`);
        };

        await app.vault.adapter.write(index_file, buffer.join("\n"));
    }
}