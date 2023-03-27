import { Plugin, Modal } from 'obsidian';
import { ImporterUI } from './lib/ui';

interface MyPluginSettings {
	flomoTarget: string,
	memoTarget: string
	//isDeltaLoadMode: string,
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	flomoTarget: 'flomo',
	memoTarget: 'memos'
	//isDeltaLoadMode: 'No'
}

export default class FlomoImporterPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		await this.loadSettings();
		const importerUI: Modal = new ImporterUI(this.app, this);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Flomo Importer', (evt: MouseEvent) => {
			importerUI.open();
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// Flomo Importer Command
		this.addCommand({
			id: 'open-flomo-importer',
			name: 'Open Flomo Importer',
			callback: () => {
				importerUI.open();
			},
		});

	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}