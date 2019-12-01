// ==UserScript==
// @id           wayfarer-planner@alfonsoml
// @name         IITC plugin: Wayfarer Planner
// @category     Layer
// @version      1.8.1
// @namespace    https://gitlab.com/AlfonsoML/wayfarer/
// @downloadURL  https://gitlab.com/AlfonsoML/wayfarer/raw/master/wayfarer-planner.user.js
// @homepageURL  https://gitlab.com/AlfonsoML/wayfarer/
// @description  Place markers on the map for your candidates in Wayfarer.
// @match        https://intel.ingress.com/*
// @grant none
// ==/UserScript==
/* forked from https://github.com/Wintervorst/iitc/raw/master/plugins/totalrecon/ */

/* eslint-env es6 */
/* eslint no-var: "error" */
/* globals L, map */
/* globals GM_info, $, dialog */

;function wrapper(plugin_info) {
	'use strict';

	// PLUGIN START ///////////////////////////////////////////////////////

	let editmarker = null;
	let isPlacingMarkers = false;

	let markercollection = [];
	let plottedmarkers = {};
	let plottedtitles = {};
	let plottedsubmitrange = {};

	// Define the layers created by the plugin, one for each marker status
	const mapLayers = {
		potential: {
			color: 'grey',
			title: 'Potentials',
			optionTitle: 'Potential'
		},
		submitted: {
			color: 'orange',
			title: 'Submitted',
			optionTitle: 'Submitted'
		},
		live: {
			color: 'green',
			title: 'Accepted',
			optionTitle: 'Live'
		},
		rejected: {
			color: 'red',
			title: 'Rejected',
			optionTitle: 'Rejected'
		},
		potentialedit: {
			color: 'cornflowerblue',
			title: 'Potential edit',
			optionTitle: 'Edit location. Potential'
		},
		sentedit: {
			color: 'purple',
			title: 'Sent edit',
			optionTitle: 'Edit location. Sent'
		},
	};

	const defaultSettings = {
		showTitles: true,
		showRadius: false,
		scriptURL: ''
	}
	let settings = defaultSettings;

	function saveSettings() {
		localStorage['wayfarer_planner_settings'] = JSON.stringify(settings);
	}

	function loadSettings() {
		const tmp = localStorage['wayfarer_planner_settings'];
		if (!tmp) {
			upgradeSettings();
			return;
		}

		try	{
			settings = JSON.parse(tmp);
		} catch (e) { // eslint-disable-line no-empty
		}
	}

	// importing from totalrecon_settings will be removed after a little while
	function upgradeSettings() {
		const tmp = localStorage['totalrecon_settings']; 
		if (!tmp)
			return;

		try	{
			settings = JSON.parse(tmp);
		} catch (e) { // eslint-disable-line no-empty
		}
		saveSettings();
		localStorage.removeItem('totalrecon_settings');
	}

	function getStoredData() {
		const url = settings.scriptURL;
		if (!url)
			return;

		$.ajax({
			url: url,
			type: 'GET',
			dataType: 'text',
			success: function (data, status, header) {
				try
				{
					markercollection = JSON.parse(data);
				}
				catch (e)
				{
					console.log('Wayfarer Planner. Exception parsing response: ', e); // eslint-disable-line no-console
					alert('Wayfarer Planner. Exception parsing response.');
					return;
				}
				drawMarkers();
			},
			error: function (x, y, z) {
				console.log('Wayfarer Planner. Error message: ', x, y, z); // eslint-disable-line no-console
				alert('Wayfarer Planner. Failed to retrieve data from the scriptURL.');
			}
		});
	};

	function drawMarker(candidate) {
		if (candidate != undefined && candidate.lat != '' && candidate.lng != '') {
			addMarkerToLayer(candidate);
			addTitleToLayer(candidate);
			addCircleToLayer(candidate);
		}
	};

	function addCircleToLayer(candidate) {
		if (settings.showRadius) {
			const latlng = L.latLng(candidate.lat, candidate.lng);

			// Specify the no submit circle options
			const circleOptions = {color: 'black', opacity: 1, fillColor: 'grey', fillOpacity: 0.40, weight: 1, clickable: false, interactive: false};
			const range = 20; // Hardcoded to 20m, the universal too close for new submit range of a portal

			// Create the circle object with specified options
			const circle = new L.Circle(latlng, range, circleOptions);
			// Add the new circle 
			const existingMarker = plottedmarkers[candidate.id];
			existingMarker.layer.addLayer(circle);

			plottedsubmitrange[candidate.id] = circle;
		}
	};

	function removeExistingCircle(guid) {
		const existingCircle = plottedsubmitrange[guid];
		if (existingCircle !== undefined) {
			const existingMarker = plottedmarkers[guid];
			existingMarker.layer.removeLayer(existingCircle);
			delete plottedsubmitrange[guid];
		}
	};

	function addTitleToLayer(candidate) {
		if (settings.showTitles) {
			const title = candidate.title;
			if (title != '') {
				const portalLatLng = L.latLng(candidate.lat, candidate.lng);
				const titleMarker = L.marker(portalLatLng, {
					icon: L.divIcon({
						className: 'wayfarer-planner-name',
						iconAnchor: [100,5],
						iconSize: [200,10],
						html: title
					}),
					data: candidate
				});
				const existingMarker = plottedmarkers[candidate.id];
				existingMarker.layer.addLayer(titleMarker);

				plottedtitles[candidate.id] = titleMarker;
			}
		}
	};

	function removeExistingTitle(guid) {
		const existingTitle = plottedtitles[guid];
		if (existingTitle !== undefined) {
			const existingMarker = plottedmarkers[guid];
			existingMarker.layer.removeLayer(existingTitle);
			delete plottedtitles[guid];
		}
	};

	function removeExistingMarker(guid) {
		const existingMarker = plottedmarkers[guid];
		if (existingMarker !== undefined) {
			existingMarker.layer.removeLayer(existingMarker.marker);
			removeExistingTitle(guid);
			removeExistingCircle(guid);
		}
	}

	function addMarkerToLayer(candidate) {
		removeExistingMarker(candidate.id);

		const portalLatLng = L.latLng(candidate.lat, candidate.lng);

		const layerData = mapLayers[candidate.status];
		const markerColor = layerData.color;
		const markerLayer = layerData.layer;

		const marker = createGenericMarker(portalLatLng, markerColor, {
			title: candidate.title,
			id: candidate.id,
			data: candidate,
			draggable: true
		});

		marker.on('dragend', function (e) {
			const data = e.target.options.data;
			const latlng = marker.getLatLng();
			data.lat = latlng.lat;
			data.lng = latlng.lng;

			drawInputPopop(latlng, data);
		});

		marker.on('dragstart', function (e) { 
			const guid = e.target.options.data.id;
			removeExistingTitle(guid);
			removeExistingCircle(guid);
		});

		markerLayer.addLayer(marker);
		plottedmarkers[candidate.id] = {'marker': marker, 'layer': markerLayer};
	};

	function clearAllLayers() {
		Object.values(mapLayers).forEach(data => data.layer.clearLayers());

		/* clear marker storage */
		plottedmarkers = {};
		plottedtitles = {};
		plottedsubmitrange = {};
	};

	function drawMarkers() {
		clearAllLayers();
		markercollection.forEach(drawMarker);
	};

	function onMapClick(e) {
		if (isPlacingMarkers) {
			if (editmarker != null) {
				map.removeLayer(editmarker);
			}

			const marker = createGenericMarker(e.latlng, 'pink', {
				title: 'Place your mark!'
			});

			editmarker = marker;
			marker.addTo(map);

			drawInputPopop(e.latlng);
		}
	};

	function drawInputPopop(latlng, markerData) {
		const formpopup = L.popup();

		let title = '';
		let description = '';
		let id = '';
		let submitteddate = '';
		let lat = '';
		let lng = '';
		let status = 'potential';
		let imageUrl = '';

		if (markerData !== undefined) {
			id = markerData.id;
			title = markerData.title;
			description = markerData.description;
			submitteddate = markerData.submitteddate;
			status = markerData.status;
			imageUrl = markerData.candidateimageurl;
			lat = parseFloat(markerData.lat).toFixed(6);
			lng = parseFloat(markerData.lng).toFixed(6);
		} else {
			lat = latlng.lat.toFixed(6);
			lng = latlng.lng.toFixed(6);
		}

		formpopup.setLatLng(latlng);

		const options = Object.keys(mapLayers)
			.map(id => '<option value="' + id + '"' + (id == status ? ' selected="selected"' : '') + '>' + mapLayers[id].optionTitle + '</option>')
			.join('');

		let formContent = `<div style="width:200px;"><form id="submit-to-wayfarer">
			<label>Status
			<select name="status">${options}</select>
			</label>
			<label>Title
			<input name="title" type="text" autocomplete="off" placeholder="Title (required)" required value="${title}">
			</label>
			<label>Description
			<input name="description" type="text" autocomplete="off" placeholder="Description" value="${description}">
			</label>
			<label>Submitted date
			<input name="submitteddate" type="text" autocomplete="off" placeholder="dd-mm-jjjj" value="${submitteddate}">
			</label>
			<label>Image
			<input name="candidateimageurl" type="text" autocomplete="off" placeholder="http://?.googleusercontent.com/***" value="${imageUrl}">
			</label>
			<input name="id" type="hidden" value="${id}">
			<input name="lat" type="hidden" value="${lat}">
			<input name="lng" type="hidden" value="${lng}">
			<input name="nickname" type="hidden" value="${window.PLAYER.nickname}">
			<button type="submit" style="width:100%; height:30px;">Send</button>
			</form>`;

		if (id !== '') {
			formContent += '<a style="padding:4px; display: inline-block;" id="deletePortalCandidate">Delete 🗑️</a>';
		}

		if (imageUrl !== '' && imageUrl !== undefined) {
			formContent += ' <a href="' + imageUrl + '" style="padding:4px; float:right;" target="_blank">Image</a>';
		}
		formContent += ` <a href="https://www.google.com/maps?layer=c&cbll=${lat},${lng}" style="padding:4px; float:right;" target="_blank">Street View</a>`;

		formpopup.setContent(formContent + '</div>');
		formpopup.openOn(map);

		const deleteLink = formpopup._contentNode.querySelector('#deletePortalCandidate');
		if (deleteLink != null) {
			deleteLink.addEventListener('click', e => confirmDeleteCandidate(e, id));
		}
	};

	function confirmDeleteCandidate(e, id) {
		e.preventDefault();

		if (!confirm('Do you want to remove this candidate?'))
			return;

		const formData = new FormData();
		formData.append('status', 'delete');
		formData.append('id', id);

		$.ajax({
			url: settings.scriptURL,
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: function (data, status, header) {
				removeExistingMarker(id);
				map.closePopup();
			},
			error: function (x, y, z) {
				console.log('Wayfarer Planner. Error message: ', x, y, z); // eslint-disable-line no-console
				alert('Wayfarer Planner. Failed to send data to the scriptURL');
			}
		});
	}

	function markerClicked(event) {
		// bind data to edit form
		if (editmarker != null) {
			map.removeLayer(editmarker);
			editmarker = null;
		}
		drawInputPopop(event.layer.getLatLng(), event.layer.options.data);
	};

	function getGenericMarkerSvg(color) {
		const markerTemplate = `<?xml version="1.0" encoding="UTF-8"?>
			<svg xmlns="http://www.w3.org/2000/svg" baseProfile="full" viewBox="0 0 25 41">
				<path d="M1.362 18.675a12.5 12.5 0 1 1 22.276 0L12.5 40.534z" fill="%COLOR%"/>
				<path d="M1.808 18.448a12 12 0 1 1 21.384 0L12.5 39.432z" stroke="#000" stroke-opacity=".15" fill="none"/>
				<path d="M2.922 17.88a10.75 10.75 0 1 1 19.156 0L12.5 36.68z" stroke="#fff" stroke-width="1.5" stroke-opacity=".35" fill="none"/>
				<path d="M19.861 17.25L12.5 21.5l-7.361-4.25v-8.5L12.5 4.5l7.361 4.25zm-12.124-7h9.526L12.5 18.5zM12.5 13l-4.763-2.75M12.5 13l4.763-2.75M12.5 13v5.5m7.361-1.25l-3.464-2m-11.258 2l3.464-2M12.5 4.5v4" stroke="#fff" stroke-width="1.25" fill="none"/>
			</svg>`;

		return markerTemplate.replace(/%COLOR%/g, color);
	};

	function getGenericMarkerIcon(color, className) {
		return L.divIcon({
			iconSize: new L.Point(25, 41),
			iconAnchor: new L.Point(12, 41),
			html: getGenericMarkerSvg(color),
			className: className || 'leaflet-iitc-divicon-generic-marker'
		});
	};

	function createGenericMarker(ll, color, options) {
		options = options || {};

		const markerOpt = $.extend({
			icon: getGenericMarkerIcon(color || '#a24ac3')
		}, options);

		return L.marker(ll, markerOpt);
	};

	function showDialog() {
		if (window.isSmartphone())
			window.show('map');

		const html = 
			`<p><label for="txtScriptUrl">Url for the script</label><br><input type="url" id="txtScriptUrl" spellcheck="false" placeholder="https://script.google.com/macros/***/exec"></p>
			 <p><a class='wayfarer-refresh'>Update candidate data</a></p>
			 <p><input type="checkbox" id="chkShowTitles"><label for="chkShowTitles">Show titles</label></p>
			 <p><input type="checkbox" id="chkShowRadius"><label for="chkShowRadius">Show submit radius</label></p>
			 <p><input type="checkbox" id="chkPlaceMarkers"><label for="chkPlaceMarkers">Click on the map to add markers</label></p>
			`;

		const container = dialog({
			width: 'auto',
			html: html,
			title: 'Wayfarer Planner',
			buttons: {
				OK: function () {
					const newUrl = txtInput.value;
					if (!txtInput.reportValidity())
						return;

					if (newUrl != settings.scriptURL) {
						settings.scriptURL = txtInput.value;
						saveSettings();
						getStoredData();
					}

					container.dialog('close');					
				}
			}
		});

		const div = container[0];
		const txtInput = div.querySelector('#txtScriptUrl');
		txtInput.value = settings.scriptURL;

		const linkRefresh = div.querySelector('.wayfarer-refresh');
		linkRefresh.addEventListener('click', () => {
			settings.scriptURL = txtInput.value;
			saveSettings();
			getStoredData();
		});

		const chkShowTitles = div.querySelector('#chkShowTitles');
		chkShowTitles.checked = settings.showTitles;

		chkShowTitles.addEventListener('change', e => {
			settings.showTitles = chkShowTitles.checked;
			saveSettings();
			drawMarkers();
		});

		const chkShowRadius = div.querySelector('#chkShowRadius');
		chkShowRadius.checked = settings.showRadius;
		chkShowRadius.addEventListener('change', e => {
			settings.showRadius = chkShowRadius.checked;
			saveSettings();
			drawMarkers();
		});

		const chkPlaceMarkers = div.querySelector('#chkPlaceMarkers');
		chkPlaceMarkers.checked = isPlacingMarkers;
		chkPlaceMarkers.addEventListener('change', e => {
			isPlacingMarkers = chkPlaceMarkers.checked;
			if (!isPlacingMarkers && editmarker != null) {
				map.closePopup();
				map.removeLayer(editmarker);
				editmarker = null;
			}
			//settings.isPlacingMarkers = chkPlaceMarkers.checked;
			//saveSettings();
		});

		if (!settings.scriptURL) {
			chkPlaceMarkers.disabled = true;
			chkPlaceMarkers.parentNode.classList.add('wayfarer-planner__disabled');
			linkRefresh.classList.add('wayfarer-planner__disabled');
		}
		txtInput.addEventListener('input', e => {
			chkPlaceMarkers.disabled = !txtInput.value;
			chkPlaceMarkers.parentNode.classList.toggle('wayfarer-planner__disabled', !txtInput.value);
			linkRefresh.classList.toggle('wayfarer-planner__disabled', !txtInput.value);
		});
	}

	// Initialize the plugin
	const setup = function () {
		loadSettings();

		$('<style>')
			.prop('type', 'text/css')
			.html(`.wayfarer-planner-name {
				font-size: 12px;
				font-weight: bold;
				color: gold;
				opacity: 0.7;
				text-align: center;
				text-shadow: -1px -1px #000, 1px -1px #000, -1px 1px #000, 1px 1px #000, 0 0 2px #000; 
				pointer-events: none;
			}
			#txtScriptUrl {
				width: 100%;
			}
			.wayfarer-planner__disabled {
				opacity: 0.8;
				pointer-events: none;
			}
			#submit-to-wayfarer input,
			#submit-to-wayfarer select {
				width: 100%;
			}
			#submit-to-wayfarer label {
				margin-top: 5px;
				display: block;
				color: #fff;
			}
			`)
			.appendTo('head');

		$('body').on('submit','#submit-to-wayfarer', function (e) {
			e.preventDefault();
			map.closePopup();
			$.ajax({
				url: settings.scriptURL,
				type: 'POST',
				data: new FormData(e.currentTarget),
				processData: false,
				contentType: false,
				success: function (data, status, header) {
					drawMarker(data);
					if (editmarker != null) {
						map.removeLayer(editmarker);
						editmarker = null;
					}
				},
				error: function (x, y, z) {
					console.log('Wayfarer Planner. Error message: ', x, y, z); // eslint-disable-line no-console
					alert('Wayfarer Planner. Failed to send data to the scriptURL');
				}
			});
		});

		map.on('click', onMapClick);

		Object.values(mapLayers).forEach(data => {
			const layer = new L.featureGroup();
			data.layer = layer;
			window.addLayerGroup('Wayfarer - ' + data.title, layer, true);
			layer.on('click', markerClicked);
		});

		const toolbox = document.getElementById('toolbox');

		const toolboxLink = document.createElement('a');
		toolboxLink.textContent = 'Wayfarer';
		toolboxLink.title = 'Settings for Wayfarer Planner';
		toolboxLink.addEventListener('click', showDialog);
		toolbox.appendChild(toolboxLink);

		if (settings.scriptURL) {
			getStoredData();
		} else {
			showDialog();
		}
	};

	// PLUGIN END //////////////////////////////////////////////////////////

	setup.info = plugin_info; //add the script info data to the function as a property
	// if IITC has already booted, immediately run the 'setup' function
	if (window.iitcLoaded) {
		setup();
	} else {
		if (!window.bootPlugins) {
			window.bootPlugins = [];
		}
		window.bootPlugins.push(setup);
	}
}
// wrapper end

(function() {
	const plugin_info = {};
	if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
		plugin_info.script = {
			version: GM_info.script.version,
			name: GM_info.script.name,
			description: GM_info.script.description
		};
	}

	// Greasemonkey. It will be quite hard to debug
	if (typeof unsafeWindow != 'undefined' || typeof GM_info == 'undefined' || GM_info.scriptHandler != 'Tampermonkey') {
		// inject code into site context
		const script = document.createElement('script');
		script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(plugin_info) + ');'));
		(document.body || document.head || document.documentElement).appendChild(script);
	} else {
		// Tampermonkey, run code directly
		wrapper(plugin_info);
	}
})();