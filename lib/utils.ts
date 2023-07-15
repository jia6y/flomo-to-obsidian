import { HTMLElement } from "node-html-parser";

export function flomoDate (daysAgo:number = 0) :string[] {
    const date = new Date();
    const last = new Date(date.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
    const dd = String(last.getDate()).padStart(2, '0');
    const mm = String(last.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = last.getFullYear().toString();
    return [yyyy, mm, dd]
}

export function createExpOpt(contentEl, label: string) :HTMLInputElement {
    const expOptionBlock: HTMLDivElement = contentEl.createEl("div", { cls: "expOptionBlock" });
    const expOptionLabel: HTMLLabelElement = expOptionBlock.createEl("label");
    const optBox: HTMLInputElement = expOptionLabel.createEl("input", { type: "checkbox", cls: "ckbox" })
    expOptionLabel.createEl("small", { text: label });
    return optBox;
}