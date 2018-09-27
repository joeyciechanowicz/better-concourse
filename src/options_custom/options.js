// Saves options to chrome.storage
function save_options() {
	const someOption = document.getElementById('some-option').checked;

	chrome.storage.sync.set({
			someOption
		},
		() => {
			const status = document.getElementById('status');
			status.textContent = 'Options saved.';
			setTimeout(() => status.textContent = '', 750);
		});
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
	chrome.storage.sync.get({
		someOption: false
	}, (items) => {
		document.getElementById('some-option').checked = items.someOption;
	});
}


document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click', save_options);