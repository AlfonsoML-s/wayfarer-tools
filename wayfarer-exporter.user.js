// ==UserScript==
// @name         Wayfarer Exporter
// @version      0.6.1
// @description  Export nominations data from Wayfarer to IITC in Wayfarer Planner
// @namespace    https://gitlab.com/AlfonsoML/wayfarer/
// @downloadURL  https://gitlab.com/AlfonsoML/wayfarer/raw/master/wayfarer-exporter.user.js
// @homepageURL  https://gitlab.com/AlfonsoML/wayfarer/
// @match        https://wayfarer.nianticlabs.com/*
// ==/UserScript==

/* eslint-env es6 */
/* eslint no-var: "error" */

function init() {
	//const w = typeof unsafeWindow === 'undefined' ? window : unsafeWindow;
	let tryNumber = 15;

	//let nominationController;

	// queue of updates to send
	const pendingUpdates = [];
	// keep track of how many request are being sent at the moment
	let sendingUpdates = 0;
	// limit to avoid errors with Google
	const maxSendingUpdates = 8;
	// counters for the log
	let totalUpdates = 0;
	let sentUpdates = 0;

	// logger containers
	let updateLog;
	let logger;
	let msgLog;

	/*
	const initWatcher = setInterval(() => {
		if (tryNumber === 0) {
			clearInterval(initWatcher);
			w.document.querySelector('body')
				.insertAdjacentHTML('afterBegin', '<div class="alert alert-danger"><strong><span class="glyphicon glyphicon-remove"></span> Wayfarer Exporter initialization failed, refresh page</strong></div>');
			return;
		}
		if (w.angular) {
			initScript();
			clearInterval(initWatcher);
		}
		tryNumber--;
	}, 1000);

	*/
	/**
	 * Overwrite the open method of the XMLHttpRequest.prototype to intercept the server calls
	 */
	(function (open) {
		XMLHttpRequest.prototype.open = function (method, url) {

			if (url == '/api/v1/vault/manage') {
				if (method == 'GET') {
					this.addEventListener('load', parseNominations, false);
				}
			}
			open.apply(this, arguments);
		};
	})(XMLHttpRequest.prototype.open);

	addConfigurationButton();

	/*
	function initScript() {
		const el = w.document.querySelector('.nominations-controller');
		if (!el) {
			//console.log('not in nominations');
			return;
		}

		nominationController = w.angular.element(el).scope().nomCtrl;

		if (nominationController !== null) {
			addConfigurationButton();

			analyzeCandidates();
		}
	}
	*/

	let sentNominations;
	function parseNominations(e) {
		try {
			const response = this.response;
			const json = JSON.parse(response);
			sentNominations = json && json.result && json.result.nominations;
			if (!sentNominations) {
				logMessage('Failed to parse nominations from Wayfarer');
				return;
			}
			analyzeCandidates();

		} catch (e)	{
			console.log(e); // eslint-disable-line no-console
		}

	}

	let currentCandidates;
	function analyzeCandidates(result) {

		if (!sentNominations) {
			setTimeout(analyzeCandidates, 200);
			return;
		}

		getAllCandidates()
			.then(function (candidates) {
				if (!candidates)
					return;

				currentCandidates = candidates;
				logMessage(`Analyzing ${sentNominations.length} nominations.`);
				let modifiedCandidates = false;
				sentNominations.forEach(nomination => {
					if (checkNomination(nomination))
						modifiedCandidates = true;
				});
				if (modifiedCandidates) {
					localStorage['wayfarerexporter-candidates'] = JSON.stringify(currentCandidates);
				} else {
					logMessage('No modifications detected on the nominations.');
					logMessage('Closing in 5 secs.');
					setTimeout(removeLogger, 5 * 1000);
				}
			});
	}

	/*
		returns true if it has modified the currentCandidates object and we must save it to localStorage after the loop ends
	*/
	function checkNomination(nomination) {
	//	console.log(nomination);
		const id = nomination.id;
		// if we're already tracking it...
		const existingCandidate = currentCandidates[id];

		if (existingCandidate) {
			if (nomination.status == 'ACCEPTED') {
				// Ok, we don't have to track it any longer.
				logMessage(`Approved candidate ${nomination.title}`);
				deleteCandidate(nomination);
				delete currentCandidates[id];
				return true;
			}
			if (nomination.status == 'REJECTED') {
				rejectCandidate(nomination, existingCandidate);
				//can be appealed, so keeping
				updateLocalCandidate(id, nomination); 
				return true;
			}
			if (nomination.status == 'DUPLICATE') {
				rejectCandidate(nomination, existingCandidate);
				delete currentCandidates[id];
				return true;
			}
			if (nomination.status == 'WITHDRAWN') {
				rejectCandidate(nomination, existingCandidate);
				delete currentCandidates[id];
				return true;
			}
			if (nomination.status == 'APPEALED') {
				updateLocalCandidate(id, nomination);	
				appealCandidate(nomination, existingCandidate);
				return true;
			}			
			//catches following changes: held -> nominated, nominated -> held, held -> nominated -> voting
			if (statusConvertor(nomination.status) != existingCandidate.status){
				updateLocalCandidate(id, nomination);				
				updateCandidate(nomination, 'status');
				return true;
			}

			return false;
		}

		if (nomination.status == 'NOMINATED' || nomination.status == 'VOTING' || nomination.status == 'HELD' || nomination.status == 'APPEALED') {
			/*
			Try to find nominations added manually in IITC:
			same name in the same level 17 cell
			*/
			const cell17 = S2.S2Cell.FromLatLng(nomination, 17);
			const cell17id = cell17.toString();
			Object.keys(currentCandidates).forEach(idx => {
				const candidate = currentCandidates[idx];
				// if it finds a candidate in the same level 17 cell and less than 20 meters away, handle it as the nomination for this
				if (candidate.cell17id == cell17id && getDistance(candidate, nomination) < 20) {
					// if we find such candidate, remove it because we're gonna add now the new one with a new id
					logMessage(`Found manual candidate for ${candidate.title}`);
					deleteCandidate({id: idx});
				}
			});
			addCandidate(nomination);
			currentCandidates[nomination.id] = {
				cell17id: S2.S2Cell.FromLatLng(nomination, 17).toString(),
				title: nomination.title,
				lat: nomination.lat,
				lng: nomination.lng,
				status: statusConvertor(nomination.status)
			};
			return true;
		}
		return false;
	}

	// https://stackoverflow.com/a/1502821/250294
	function getDistance(p1, p2) {
		const rad = function (x) {
			return x * Math.PI / 180;
		};

		const R = 6378137; // Earth’s mean radius in meter
		const dLat = rad(p2.lat - p1.lat);
		const dLong = rad(p2.lng - p1.lng);
		const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(rad(p1.lat)) * Math.cos(rad(p2.lat)) * Math.sin(dLong / 2) * Math.sin(dLong / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c; // returns the distance in meter
	}

	function statusConvertor(status){		
		if (status == 'HELD') {
			return 'held';
		}
		if (status == 'NOMINATED' || status == 'VOTING') {
			return 'submitted';
		}
		if (status == 'REJECTED' || status == 'DUPLICATE' || status == 'WITHDRAWN') {
			return 'rejected';
		}
		if (status == 'APPEALED') {
			return 'appealed';
		}

		return status;
	}

	function updateLocalCandidate(id, nomination){
		currentCandidates[id].status = statusConvertor(nomination.status)
		//needed only if changes in title and description are tracked and detected
		currentCandidates[id].title = nomination.title
		currentCandidates[id].description = nomination.description
	}

	function addCandidate(nomination) {
		logMessage(`New candidate ${nomination.title}`);
		console.log('Tracking new nomination', nomination);
		updateStatus(nomination, statusConvertor(nomination.status));
	}

	function updateCandidate(nomination, change) {
		logMessage(`Updated candidate ${nomination.title} - changed ${change}`);
		console.log('Updated existing nomination', nomination);
		updateStatus(nomination, statusConvertor(nomination.status));
	}

	function deleteCandidate(nomination) {
		console.log('Deleting nomination', nomination);
		updateStatus(nomination, 'delete');
	}

	function rejectCandidate(nomination, existingCandidate) {
		if (existingCandidate.status == 'rejected')
			return;

		logMessage(`Rejected nomination ${nomination.title}`);
		console.log('Rejected nomination', nomination);
		updateStatus(nomination, 'rejected');
	}

	function appealCandidate(nomination, existingCandidate) {
		if (existingCandidate.status == 'appealed')
			return;

		logMessage(`Appealed nomination ${nomination.title}`);
		console.log('Appealed nomination', nomination);
		updateStatus(nomination, statusConvertor(nomination.status));
	}

	function updateStatus(nomination, newStatus) {
		const formData = new FormData();
		// if there's an error, let's retry 3 times. This is a custom property for us.
		formData.retries = 3;

		formData.append('status', newStatus);
		formData.append('id', nomination.id);
		formData.append('lat', nomination.lat);
		formData.append('lng', nomination.lng);
		formData.append('title', nomination.title);
		formData.append('description', nomination.description);
		formData.append('submitteddate', nomination.day);
		formData.append('candidateimageurl', nomination.imageUrl);
		getName()
			.then( 
				name => {
					formData.append('nickname', name)
				} 
			)
			.catch( 
				error => {
					console.log('Catched load name error', error);
					formData.append('nickname', 'wayfarer')
				}
			)
			.finally(
				() => {
					pendingUpdates.push(formData);
					totalUpdates++;
					sendUpdate();
				}
			)
	}

	let name;
	function getName() {
		return new Promise(
			function(resolve, reject) {
				if(name){
					resolve(name);
				}
				
				const url = 'https://wayfarer.nianticlabs.com/api/v1/vault/properties';
				fetch(url)
					.then(
						response  => {
							response.json()
								.then(
									json => {
										name = json.result.socialProfile.name;
										logMessage(`Loaded name ${name}`);
										resolve(name);
									}
								)
						}								
					)
					.catch(
						error => {
							console.log('Catched fetch error', error);
							logMessage(`Loading name failed. Using wayfarer`);
							name = 'wayfarer';
							resolve(name);
						}
					)
			}
		);
	}

	// Send updates one by one to avoid errors from Google
	function sendUpdate() {
		updateProgressLog();

		if (sendingUpdates >= maxSendingUpdates)
			return;
		if (pendingUpdates.length == 0)
			return;

		sentUpdates++;
		sendingUpdates++;
		updateProgressLog();

		const formData = pendingUpdates.shift();
		const options = {
			method: 'POST',
			body: formData
		};

		fetch(getUrl(), options)
			.then(data => {})
			.catch(error => {
				console.log('Catched fetch error', error); // eslint-disable-line no-console
				logMessage(error);
				// one retry less
				formData.retries--;
				if (formData.retries > 0) {
					// if we should still retry, put it at the end of the queue
					pendingUpdates.push(formData);
				}
			})
			.finally(() => {sendingUpdates--; sendUpdate();});
	}
	
	function updateProgressLog() {
		const count = pendingUpdates.length;

		if (count == 0)
			updateLog.textContent = 'All updates sent.';
		else
			updateLog.textContent = `Sending ${sentUpdates}/${totalUpdates} updates to the spreadsheet.`;
	}

	function getUrl() {
		return localStorage['wayfarerexporter-url'];
	}

	function addConfigurationButton() {
		const ref = document.querySelector('.sidebar-link[href$="nominations"]');

		if (!ref) {
			if (tryNumber === 0) {
				document.querySelector('body')
					.insertAdjacentHTML('afterBegin', '<div class="alert alert-danger"><strong><span class="glyphicon glyphicon-remove"></span> Wayfarer Exporter initialization failed, refresh page</strong></div>');
				return;
			}
			setTimeout(addConfigurationButton, 1000);
			tryNumber--;
			return;
		}

		addCss();

		const link = document.createElement('a');
		link.className = 'mat-tooltip-trigger sidebar-link sidebar-wayfarerexporter';
		link.title = 'Configure Exporter';
		link.innerHTML = '<svg viewBox="0 0 24 24" class="sidebar-link__icon"><path d="M12,1L8,5H11V14H13V5H16M18,23H6C4.89,23 4,22.1 4,21V9A2,2 0 0,1 6,7H9V9H6V21H18V9H15V7H18A2,2 0 0,1 20,9V21A2,2 0 0,1 18,23Z" /></svg><span> Exporter</span>';
		//const ref = document.querySelector('.sidebar__item--nominations');

		ref.parentNode.insertBefore(link, ref.nextSibling);

		link.addEventListener('click', function (e) {
			e.preventDefault();

			const currentUrl = getUrl();
			const url = window.prompt('Script Url for Wayfarer Planner', currentUrl);
			if (!url)
				return;

			loadPlannerData(url)
				.then(analyzeCandidates);
		});
	}

	function addCss() {
		const css = `
			.sidebar-wayfarerexporter svg {
				width: 24px;
				height: 24px;
				filter: none;
				fill: currentColor;
			}

			.wayfarer-exporter_log {
				background: #fff;
				box-shadow: 0 2px 5px 0 rgba(0, 0, 0, .16), 0 2px 10px 0 rgba(0, 0, 0, .12);
				display: flex;
				flex-direction: column;
				max-height: 100%;
				padding: 5px;
				position: absolute;
				top: 0;
				z-index: 2;
			}
			.wayfarer-exporter_log h3 {
				margin-right: 1em;
				margin-top: 0;
			}
			.wayfarer-exporter_closelog	{
				cursor: pointer;
				position: absolute;
				right: 0;
			}
			.wayfarer-exporter_log-wrapper {
				overflow: auto;
			}
			`;
		const style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = css;
		document.querySelector('head').appendChild(style);
	}

	function getAllCandidates() {
		const promesa = new Promise(function (resolve, reject) {

			const storedData = localStorage['wayfarerexporter-candidates'];
			const lastUpdate = localStorage['wayfarerexporter-lastupdate'] || 0;
			const now = (new Date()).getTime();
			// cache it for 12 hours
			if (!storedData || (now - lastUpdate) > 12 * 60 * 60 * 1000) {
				resolve(loadPlannerData());
				return;
			}
			resolve(JSON.parse(storedData));
		});

		return promesa;
	}

	function loadPlannerData(newUrl) {
		let url = newUrl || getUrl();
		if (!url) {
			url = window.prompt('Script Url for Wayfarer Planner');
			if (!url)
				return null;
		}
		if (!url.startsWith('https://script.google.com/macros/')) {
			alert('The url of the script seems to be wrong, please paste the URL provided after "creating the webapp"');
			return null;
		}
		if (url.includes('echo') || !url.endsWith('exec')) {
			alert('You must use the short URL provided by "creating the webapp", not the long one after executing the script.');
			return null;
		}
		if (url.includes(' ')) {
			alert('Warning, the URL contains at least one space. Check that you\'ve copied it properly.');
			return null;
		}
		const fetchOptions = {
			method: 'GET'
		};

		return fetch(url, fetchOptions)
			.then(function (response) {return response.text();})
			.then(function (data) {return JSON.parse(data);})
			.then(function (allData) {
				const submitted = allData.filter(c => c.status == 'submitted' || c.status == 'potential' || c.status == 'held' || c.status == 'rejected' || c.status == 'appealed');

				const candidates = {};
				submitted.forEach(c => {
					candidates[c.id] = {
						cell17id: S2.S2Cell.FromLatLng(c, 17).toString(),
						title: c.title,
						lat: c.lat,
						lng: c.lng,
						status: c.status
					};
				});
				localStorage['wayfarerexporter-url'] = url;
				localStorage['wayfarerexporter-lastupdate'] = (new Date()).getTime();
				localStorage['wayfarerexporter-candidates'] = JSON.stringify(candidates);
				const tracked = Object.keys(candidates).length;
				logMessage(`Loaded a total of ${allData.length} candidates from the spreadsheet.`);
				logMessage(`Currently tracking: ${tracked}.`);

				return candidates;
			})
			.catch(function (e) {
				console.log(e); // eslint-disable-line no-console
				alert('Wayfarer Planner. Failed to retrieve data from the scriptURL.\r\nVerify that you\'re using the right URL and that you don\'t use any extension that blocks access to google.');
				return null;
			});
	}

	function removeLogger() {
		logger.parentNode.removeChild(logger);
		logger = null;
	}

	function logMessage(txt) {
		if (!logger) {
			logger = document.createElement('div');
			logger.className = 'wayfarer-exporter_log';
			document.body.appendChild(logger);
			const img = document.createElement('img');
			img.src = '/img/sidebar/clear-24px.svg';
			img.className = 'wayfarer-exporter_closelog';
			img.height = 24;
			img.width = 24;
			img.addEventListener('click', removeLogger);
			logger.appendChild(img);
			const title = document.createElement('h3');
			title.textContent = 'Wayfarer exporter';
			logger.appendChild(title);

			updateLog = document.createElement('div');
			updateLog.className = 'wayfarer-exporter_log-counter';
			logger.appendChild(updateLog);

			msgLog = document.createElement('div');
			msgLog.className = 'wayfarer-exporter_log-wrapper';
			logger.appendChild(msgLog);
		}
		const div = document.createElement('div');
		div.textContent = txt;
		msgLog.appendChild(div);
	}

	/**
	 S2 extracted from Regions Plugin
	 https:static.iitc.me/build/release/plugins/regions.user.js
	*/
	const S2 = {};
	const d2r = Math.PI / 180.0;

	function LatLngToXYZ(latLng) {
		const phi = latLng.lat * d2r;
		const theta = latLng.lng * d2r;
		const cosphi = Math.cos(phi);

		return [Math.cos(theta) * cosphi, Math.sin(theta) * cosphi, Math.sin(phi)];
	}

	function largestAbsComponent(xyz) {
		const temp = [Math.abs(xyz[0]), Math.abs(xyz[1]), Math.abs(xyz[2])];

		if (temp[0] > temp[1]) {
			if (temp[0] > temp[2]) {
				return 0;
			}
			return 2;
		}

		if (temp[1] > temp[2]) {
			return 1;
		}

		return 2;
	}

	function faceXYZToUV(face,xyz) {
		let u, v;

		switch (face) {
			case 0: u =	xyz[1] / xyz[0];	v = xyz[2] / xyz[0]; break;
			case 1: u = -xyz[0] / xyz[1];	v = xyz[2] / xyz[1]; break;
			case 2: u = -xyz[0] / xyz[2];	v = -xyz[1] / xyz[2]; break;
			case 3: u =	xyz[2] / xyz[0];	v = xyz[1] / xyz[0]; break;
			case 4: u =	xyz[2] / xyz[1];	v = -xyz[0] / xyz[1]; break;
			case 5: u = -xyz[1] / xyz[2];	v = -xyz[0] / xyz[2]; break;
			default: throw {error: 'Invalid face'};
		}

		return [u, v];
	}

	function XYZToFaceUV(xyz) {
		let face = largestAbsComponent(xyz);

		if (xyz[face] < 0) {
			face += 3;
		}

		const uv = faceXYZToUV(face, xyz);

		return [face, uv];
	}

	function UVToST(uv) {
		const singleUVtoST = function (uv) {
			if (uv >= 0) {
				return 0.5 * Math.sqrt (1 + 3 * uv);
			}
			return 1 - 0.5 * Math.sqrt (1 - 3 * uv);

		};

		return [singleUVtoST(uv[0]), singleUVtoST(uv[1])];
	}

	function STToIJ(st,order) {
		const maxSize = 1 << order;

		const singleSTtoIJ = function (st) {
			const ij = Math.floor(st * maxSize);
			return Math.max(0, Math.min(maxSize - 1, ij));
		};

		return [singleSTtoIJ(st[0]), singleSTtoIJ(st[1])];
	}

	// S2Cell class
	S2.S2Cell = function () {};

	//static method to construct
	S2.S2Cell.FromLatLng = function (latLng, level) {
		const xyz = LatLngToXYZ(latLng);
		const faceuv = XYZToFaceUV(xyz);
		const st = UVToST(faceuv[1]);
		const ij = STToIJ(st,level);

		return S2.S2Cell.FromFaceIJ(faceuv[0], ij, level);
	};

	S2.S2Cell.FromFaceIJ = function (face, ij, level) {
		const cell = new S2.S2Cell();
		cell.face = face;
		cell.ij = ij;
		cell.level = level;

		return cell;
	};

	S2.S2Cell.prototype.toString = function () {
		return 'F' + this.face + 'ij[' + this.ij[0] + ',' + this.ij[1] + ']@' + this.level;
	};

}

init();

