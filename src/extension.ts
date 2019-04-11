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

 import * as path from 'path';
import * as vscode from 'vscode';

let currentPanel: vscode.WebviewPanel | undefined = undefined;

async function getInput() {
	// User Input to name Gist file
	const result = await vscode.window.showInputBox({
		placeHolder: "My Message"
	});
	return result;
}

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('msgm.start', () => {
			MessageMinderPanel.createOrShow(context.extensionPath);
		})
	);

	// Our new command
	context.subscriptions.push(
		vscode.commands.registerCommand('msgm.sendMessage', async () => {
			if (!MessageMinderPanel.currentPanel) {
				return;
			}

			const result = await getInput();
			// Send a message to our webview.
			// You can send any JSON serializable data.
			await MessageMinderPanel.postMessage(result);
		})
);

	if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(MessageMinderPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				MessageMinderPanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}
}

/**
 * Manages webview panel
 */
class MessageMinderPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: MessageMinderPanel | undefined;

	public static readonly viewType = 'msgm';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (MessageMinderPanel.currentPanel) {
			MessageMinderPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			MessageMinderPanel.viewType, 'msgm',
			column || vscode.ViewColumn.One,
			{
				// Enable javascript in the webview
				enableScripts: true,

				// And restrict the webview to only loading content from our extension's `media` directory.
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
			}
		);

		MessageMinderPanel.currentPanel = new MessageMinderPanel(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		MessageMinderPanel.currentPanel = new MessageMinderPanel(panel, extensionPath);
	}

	public static async postMessage(message: string) {
		if (!MessageMinderPanel.currentPanel) {
			return;
		}
		let jsonMsg:string = "{ \"command\": \"sendMessage\", \"data\": \"" + message + "\"}";
		console.log("outgoing message being posted: " + jsonMsg);
		MessageMinderPanel.currentPanel._panel.webview.postMessage(jsonMsg);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						return;
					case 'msgm':
						vscode.window.showInformationMessage("Message minder says " + JSON.stringify(message));
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		MessageMinderPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update() {
		this._panel.title = "Message Minder";
		this._panel.webview.html = this._getHtmlForWebview();
	}

	private _getHtmlForWebview() {
		// Local path to main script run in the webview
		const scriptPathOnDisk = vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'main.js')
		);

		// And the uri we use to load this script in the webview
		const scriptUri = scriptPathOnDisk.with({ scheme: 'vscode-resource' });

		// Use a nonce to whitelist which scripts can be run
		const nonce = getNonce();

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">

				<!--
				Use a content security policy to only allow loading images from https or from our extension directory,
				and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src vscode-resource: https:; script-src 'nonce-${nonce}';">

				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>Cat Coding</title>

			</head>
			<body>
				<form>
					<input id="my_input" />
					<input type="button" id="sendButton" value="send" />
					<textarea id="messageArea" rows="10" cols="30">Message area</textarea>
				</form>

				<script nonce="${nonce}" src="${scriptUri}"/>
			</body>
			</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
