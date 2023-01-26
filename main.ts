import { Plugin, Modal } from 'obsidian';
import { CommandUI } from 'lib/command_ui';


export default class FlomoImporterPlugin extends Plugin {
	async onload() {
		const commandUI: Modal = new CommandUI(this.app, this);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Flomo Data Importer', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			commandUI.open();
		});

		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// ****** Flomo Importer Command
		this.addCommand({
			id: 'open-flomo-importer',
			name: 'Open Flomo Importer',
			callback: () => {
				commandUI.open();
			},
		});

	}

	onunload() {
	}

}
