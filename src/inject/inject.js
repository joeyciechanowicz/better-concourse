let lastRun = (new Date).getTime();

function getVersionRef(resources) {
	const gitResources = resources.filter(x => x.type === 'git')
		.map(x => x.version.ref);

	if (gitResources.length > 0) {
		return gitResources[0];
	}
	return undefined;
}

function getCommitsBetweenRefs(startRef, finishRef, gitCommits) {
	const commits = [];
	for (let i = 0; i < gitCommits.length && gitCommits[i].version.ref !== finishRef; i++) {
		commits.push(gitCommits[i]);
	}
	return commits;
}

function decorateJobSvgElement(element, gitCommits,) {
	let messages = gitCommits.map(commit => commit.metadata ? commit.metadata.filter(y => y.name === 'message')[0].value : commit.version.ref)
		.map(x => x.length > 27 ? x.substr(0, 27) + '...' : x);

	const message = messages
		.map((x, i) => `<text y="-${(i + 1) * 13}">${x}</text>`)
		.join('');

	element.innerHTML += message;
}

function annotatePlan() {

	if ((new Date).getTime() - lastRun < 50) {
		return;
	}
	lastRun = (new Date).getTime()

	let options = {
		'credentials': 'include',
		'headers': {},
		'body': null,
		'method': 'GET',
		'mode': 'cors'
	};

	const jobsUrl = window.location.href.replace('/teams/', '/api/v1/teams/') + '/jobs';
	const gitVersionsUrl = window.location.href.replace('/teams/', '/api/v1/teams/') + '/resources/git/versions';


	Promise.all([jobsUrl, gitVersionsUrl].map(x => fetch(x, options).then(r => r.json())))
		.then(([jobs, gitVerions]) => {
			const jobElements = document.querySelectorAll('.node.job');

			// console.log('Stuff', jobs, gitVerions, jobElements);

			Promise.all(jobs.map((job, i) => {
				const build = job.next_build || job.finished_build;

				if (!build) {
					return;
				}

				const resourcesUrl = `${window.location.origin}/${build.api_url}/resources`;
				const buildsUrl = `${window.location.origin}/api/v1/teams/${build.team_name}/pipelines/${build.pipeline_name}/jobs/${build.job_name}/builds`;

				return fetch(buildsUrl, options).then(x => x.json())
					.then(builds => {
						if (builds.length < 2) {
							return;
						}

						const previousBuildResourcesUrl = `${window.location.origin}/api/v1/builds/${builds[1].id}/resources`

						return Promise.all([resourcesUrl, previousBuildResourcesUrl].map(x => fetch(x, options).then(r => r.json())))
							.then(([resources, previousResources]) => {
								const currentRef = getVersionRef(resources.inputs);
								const previousRef = getVersionRef(previousResources.inputs);
								const commits = getCommitsBetweenRefs(currentRef, previousRef, gitVerions);


								return {
									i,
									commits,
									elem: jobElements[i],
									job
								};
							});
					});
			})).then(stageDetails => {
				stageDetails.sort((a, b) => a.i - b.i);

				const seenTop = stageDetails[0].elem.getBoundingClientRect().top;

				stageDetails.filter(x => x)
					.forEach(details => {
						if (details.elem.getBoundingClientRect().top > seenTop) {
							return;
						}

						decorateJobSvgElement(details.elem, details.commits);

						if (details.job.inputs.filter(input => input.trigger).length === 0) {
							// We should add a trigger button
							details.elem.innerHTML += `
<foreignObject x="17" y="35"><button onclick="doDeploy('${encodeURIComponent(details.job.name)}')" class="build-action custom-build-action" role="button" aria-label="Trigger Build" title="Trigger Build"><i class="fa fa-plus-circle"></i></button></foreignObject>
							`;
						}
					});
			});
		});
}

function doDeploy(jobName) {
	const deployUrl = `${window.location.href.replace('/teams/', '/api/v1/teams/')}/jobs/${jobName}/builds`;
	console.log('Running build', deployUrl);

	fetch(deployUrl, {
		'credentials': 'include',
		'headers': {
			'x-csrf-token': window.localStorage.csrf_token
		},
		'body': null,
		'method': 'POST',
		'mode': 'cors'
	}).then(x => {
		console.log('Build ran');
	});
}


function start() {
	if (window.location.href.indexOf('/pipelines/') !== -1) {
		const intervalId = setInterval(() => {
			const svg = document.querySelector('svg.pipeline-graph');
			const svgNodes = document.querySelectorAll('.node.job');

			if (svg && svgNodes && svgNodes.length > 0) {
				clearInterval(intervalId);

				const config = {attributes: true, childList: false, subtree: false};
				const observer = new MutationObserver(annotatePlan);
				observer.observe(svg, config);

				annotatePlan();
			}
		}, 50);
	}
}


if (!chrome.storage || !chrome.storage.sync) {
	const intervalId = setInterval(() => {
		const svg = document.querySelector('svg.pipeline-graph');

		if (svg) {
			start();
			clearInterval(intervalId);
		}
	}, 50);

	start();
} else {
	chrome.storage.sync.get(['someOption'], function (items) {

		readyStateCheckInterval = setInterval(function () {
			if (document.readyState === 'complete') {
				clearInterval(readyStateCheckInterval);

				start();
			}
		}, 10);
	});
}

