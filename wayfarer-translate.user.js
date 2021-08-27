// ==UserScript==
// @name         Wayfarer Translate
// @version      0.1.0
// @description  Add translate option to Wayfarer
// @namespace    https://gitlab.com/AlfonsoML/wayfarer/
// @downloadURL  https://gitlab.com/AlfonsoML/wayfarer/raw/master/wayfarer-translate.user.js
// @homepageURL  https://gitlab.com/AlfonsoML/wayfarer/
// @match        https://wayfarer.nianticlabs.com/*
// ==/UserScript==

/* eslint-env es6 */
/* eslint no-var: "error" */

function init() {
	let tryNumber = 15;

	let translateButton;
	let candidate;

	/**
	 * Overwrite the open method of the XMLHttpRequest.prototype to intercept the server calls
	 */
	(function (open) {
		XMLHttpRequest.prototype.open = function (method, url) {
			if (url == '/api/v1/vault/review') {
				if (method == 'GET') {
					this.addEventListener('load', parseCandidate, false);
				}
				if (method == 'POST') {
					this.addEventListener('load', hideButton, false);
				}
			}
			open.apply(this, arguments);
		};
	})(XMLHttpRequest.prototype.open);

	addCss();

	function parseCandidate(e) {
		try {
			const response = this.response;
			const json = JSON.parse(response);
			candidate = json && json.result;
			if (!candidate) {
				alert('Failed to parse candidate from Wayfarer');
				return;
			}
			addTranslateButton();

		} catch (e)	{
			console.log(e); // eslint-disable-line no-console
		}

	}

	function addTranslateButton() {
		const ref = document.querySelector('wf-logo');

		if (!ref) {
			if (tryNumber === 0) {
				document.querySelector('body')
					.insertAdjacentHTML('afterBegin', '<div class="alert alert-danger"><strong><span class="glyphicon glyphicon-remove"></span> Wayfarer Translate initialization failed, refresh page</strong></div>');
				return;
			}
			setTimeout(addTranslateButton, 1000);
			tryNumber--;
			return;
		}


		const link = document.createElement('a');
		link.className = 'mat-tooltip-trigger wayfarertranslate';
		link.title = 'Translate nomination';
		link.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04M18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12m-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg><span> Translate</span>';
		link.target = '_blank';

		const container = ref.parentNode.parentNode;
		container.appendChild(link);

		translateButton = link;

		if (candidate.type == 'NEW') {

			const text = candidate.title + '\r\n' + candidate.description + '\r\n' + candidate.statement;
			translateButton.href = 'https://translate.google.com/?sl=auto&q=' + encodeURIComponent(text);
			translateButton.classList.add('wayfarertranslate__visible');
		}
		if (candidate.type == 'EDIT') {
			const title = candidate.titleEdits.map(d=>d.value).join('\r\n');
			const description = candidate.descriptionEdits.map(d=>d.value).join('\r\n');
			const text = title + '\r\n\r\n' + description;
			translateButton.href = 'https://translate.google.com/?sl=auto&q=' + encodeURIComponent(text);
			translateButton.classList.add('wayfarertranslate__visible');
		}
	}

	function hideButton() {
		translateButton.classList.remove('wayfarertranslate__visible');
	}

	function addCss() {
		const css = `

			.wayfarertranslate {
				color: #333;
				margin-left: 2em;
				padding-top: 1.1em;
				text-align: center;
				/*display: none;*/
			}

			.wayfarertranslate__visible {
				display: inline;
			}

			.wayfarertranslate svg {
				width: 24px;
				height: 24px;
				filter: none;
				fill: currentColor;
				margin: 0 auto;
			}

			.wayfarer-translate_log {
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
			.wayfarer-translate_log h3 {
				margin-right: 1em;
				margin-top: 0;
			}
			.wayfarer-translate_closelog	{
				cursor: pointer;
				position: absolute;
				right: 0;
			}
			.wayfarer-translate_log-wrapper {
				overflow: auto;
			}
			`;
		const style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = css;
		document.querySelector('head').appendChild(style);
	}

}

init();

