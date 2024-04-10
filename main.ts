import { addIcon, Plugin, Modal } from 'obsidian';
import { MainUI } from './lib/ui/main_ui';


interface MyPluginSettings {
	flomoTarget: string,
	memoTarget: string,
	optionsMoments: string,
	optionsCanvas: string,
	expOptionAllowbilink: boolean,
	canvasSize: string,
	mergeByDate: boolean
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	flomoTarget: 'flomo',
	memoTarget: 'memos',
	optionsMoments: "copy_with_link",
	optionsCanvas: "copy_with_content",
	expOptionAllowbilink: true,
	canvasSize: 'M',
	mergeByDate: false
}

export default class FlomoImporterPlugin extends Plugin {
	settings: MyPluginSettings;
	async onload() {

		await this.loadSettings();
		const mainUI: Modal = new MainUI(this.app, this);

		addIcon("target", `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-target"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`);
		const ribbonIconEl = this.addRibbonIcon('target', 'Flomo Importer', (evt: MouseEvent) => {
			mainUI.open();
		});

		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// Flomo Importer Command
		this.addCommand({
			id: 'open-flomo-importer',
			name: 'Open Flomo Importer',
			callback: () => { 
				mainUI.open();
			},
		});
	}

	
	onunload() { }

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);

	}

}