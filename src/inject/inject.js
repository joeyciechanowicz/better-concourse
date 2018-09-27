function annotatePlan() {
	let options = {
		'credentials': 'include',
		'headers': {},
		'referrer': 'https://concourse.halfpipe.io/teams/sigma/pipelines/mee.web-ui',
		'referrerPolicy': 'no-referrer-when-downgrade',
		'body': null,
		'method': 'GET',
		'mode': 'cors'
	};

	let jobsUrl = window.location.href.replace('.io', '.io/api/v1') + '/jobs';

	fetch(jobsUrl, options).then(function (response) {
		return response.json();
	}).then(function (stages) {
		const stageElements = document.querySelectorAll('.node.job');

		stages.forEach((stage, i) => {
			if (!stage.finished_build || stageElements[i].hasAnnotation) {
				return;
			}

			const url = `${window.location.origin}/${stage.finished_build.api_url}/resources`;
			return fetch(url, options)
				.then(x => x.json())
				.then(resources => {
					const gitInputs = resources.inputs.filter(x => x.type === 'git');
					if (gitInputs.length === 0) {
						return;
					}

					console.log(gitInputs[0]);

					const message = gitInputs[0].metadata.filter(x => x.name === 'message')[0].value;
					stageElements[i].innerHTML += `<text y="-10">${message}</text>`;
					stageElements[i].hasAnnotation = true;
				});
		});
	});
}



chrome.storage.sync.get(['someOption'], function (items) {

	readyStateCheckInterval = setInterval(function () {
		if (document.readyState === 'complete') {
			clearInterval(readyStateCheckInterval);

			console.log('Settings retrieved', items);

			if (window.location.href.indexOf('/pipelines/') !== -1) {
				const intervalId = setInterval(() => {
					const svg = document.querySelector('svg.pipeline-graph');

					if (svg) {
						const config = {attributes: true, childList: false, subtree: false};
						const observer = new MutationObserver(annotatePlan);
						observer.observe(svg, config);
						clearInterval(intervalId);

						annotatePlan();
					}
				}, 50);
			}
		}
	}, 10);
});

