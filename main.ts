import { Plugin, Modal } from 'obsidian';
import { ImporterUI } from 'lib/impoter_ui';


export default class FlomoImporterPlugin extends Plugin {
	async onload() {
		const importerUI: Modal = new ImporterUI(this.app, this);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Flomo Importer', (evt: MouseEvent) => {
			importerUI.open();
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// ****** Flomo Importer Command
		this.addCommand({
			id: 'open-flomo-importer',
			name: 'Open Flomo Importer',
			callback: () => {
				importerUI.open();
			},
		});

	}

	onunload() {
	}

}
