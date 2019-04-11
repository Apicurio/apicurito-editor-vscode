/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// This script will be run within the webview itself
(function () {

	// due to security model issue cannot inline script with "onclick" attribute, 
	// so I have to attach event handlers programmatically
	console.log("my script loaded");
	document.addEventListener("DOMContentLoaded", function(event) { 
		console.log("my document event handler ready loaded");
		const addEventListenerForSendButton = () => {
			console.log("my click event handler ready loaded");
			var el = document.getElementById("sendButton");
			if (el !== null) {
				el.addEventListener('click', clickHandler);
			}
		};
		const clickHandler = () => {
			console.log("doSubmit invoked");
			var el = document.getElementById("my_input");
			// Send a message back to the extension
			vscode.postMessage({
				command: 'msgm',
				text: el.value
			});
		}

		addEventListenerForSendButton();
	  });

	//connect to the vscode api
	const vscode = acquireVsCodeApi();

	// Handle messages sent from the extension to the webview
	window.addEventListener('message', event => {
		console.log("Event sent: " + event);
		const message = event.data; // The json data that the extension sent
		console.log("Message sent: " + message);
		let jsonObj = JSON.parse(message);
		switch (jsonObj.command) {
			case 'sendMessage':
				console.log("sendMessage: " + jsonObj.data);
				var el = document.getElementById("messageArea");
				el.value = jsonObj.data;
		}
	});
}());