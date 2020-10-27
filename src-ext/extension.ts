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
import * as fs from 'fs';


export class VscodeMessage {

    public type: string;
    public data: any;

    constructor(type: string, data: any) {
        this.type = type;
        this.data = data;
    }

    public static Ready(data?: string) { return new VscodeMessage("ready", data ? data : null); }
    public static Alert(data: string) { return new VscodeMessage("alert", data); }
}


export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('apicurito.start', async (node) => {
            if (node && node.fsPath) {
                const filePath = node.fsPath;
                ApicuritoPanelContainer.get(context).createOrShow(filePath);
            }            
        })
    );
}


const buildDir = "dist";


class ApicuritoPanelContainer {


    private panels: { [filePath: string]: ApicuritoPanel } = {};
    private extensionPath: string;
    private static instance: ApicuritoPanelContainer;

    constructor(extensionPath: string) {
        this.extensionPath = extensionPath;
    }

    public static get(context: vscode.ExtensionContext) {
        if(!this.instance) {
            this.instance = new ApicuritoPanelContainer(context.extensionPath);
        }
        return this.instance;
    }

    public createOrShow(filePath: string): ApicuritoPanel {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : vscode.ViewColumn.Active;
        if (!this.panels[filePath]) {
            this.panels[filePath] = new ApicuritoPanel(this, this.extensionPath, column || vscode.ViewColumn.One, filePath);
        }
        this.panels[filePath].reveal();
        return this.panels[filePath];
    }

    public dispose(panel: ApicuritoPanel) {
        delete this.panels[panel.getFilePath()];
        panel.dispose();
    }
}


/**
 * Manages a webview panel
 */
class ApicuritoPanel {

    private static readonly viewType = 'apicurito';
    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionPath: string;
    private filePath: string;
    private column: vscode.ViewColumn;
    private container: ApicuritoPanelContainer;

    public reveal() {
        this._panel.reveal(this.column);
    }

    public getFilePath() {
        return this.filePath;
    }

    public constructor(container: ApicuritoPanelContainer, extensionPath: string, column: vscode.ViewColumn, filePath: string) {
        this.container = container;
        this.filePath = filePath;
        this._extensionPath = extensionPath;
        this.column = column;

        this._panel = vscode.window.createWebviewPanel(
            ApicuritoPanel.viewType,
            "Apicurito - " + path.basename(filePath),
            column,
            {
                enableScripts: true,
                localResourceRoots: [ vscode.Uri.file(path.join(this._extensionPath, buildDir)) ],
                retainContextWhenHidden: true
            });

        this._panel.webview.html = this._getHtmlForWebview();

        this._panel.onDidDispose(() => this.container.dispose(this), null, []);

        this._panel.webview.onDidReceiveMessage(rawMessage => {
            let message: VscodeMessage = rawMessage;
            switch (message.type) {
                case 'alert':
                    vscode.window.showErrorMessage(message.data);
                    return;
                case 'ready':
                    fs.readFile(this.filePath, "utf-8", (err, data) => {
                        if (err) {
                            vscode.window.showErrorMessage(`Error: ${err}`);
                        } else {
                            let m = new VscodeMessage("open", data);
                            this.sendMessage(m);
                        }
                    });
                    return;
                case 'save-req':
                    fs.writeFile(this.filePath, message.data, (err) => {
                        vscode.window.showInformationMessage(`Saved "${this.getFilePath()}"`);
                        this.sendMessage(new VscodeMessage("save-res", null));
                      });
                    return;
            }
        }, null, []);

    }

    public sendMessage(message: any) {
        this._panel.webview.postMessage(message);
    }

    public dispose() {
        this._panel.dispose();
    }

    private _getHtmlForWebview() {

        const basePath = vscode.Uri.file(path.join(this._extensionPath, buildDir));
        const baseUri = basePath.with({ scheme: 'vscode-resource' });
        const nonce = getNonce();

        let html = `
        <!doctype html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>Apicurito</title>
            <base href="${baseUri}/">

            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="icon" type="image/x-icon" href="favicon.ico">

            <script type="text/javascript" src="./version.js"></script>
            <script type="text/javascript" src="./config/config.js"></script>

            <style>
                #app-loading {
                    padding-top: 90px;
                    margin: auto;
                    text-align: center;
                }
            </style>

        </head>
        <body>
        <app-root>
            <div class="container container-fluid" id="load-container">
                <div id="app-loading">
                    <img src="assets/app-loading.gif">
                </div>
            </div>
        </app-root>
        <script nonce="${nonce}" type="text/javascript" src="runtime.js"></script>
        <script nonce="${nonce}" type="text/javascript" src="es2015-polyfills.js" nomodule></script>
        <script nonce="${nonce}" type="text/javascript" src="polyfills.js"></script>
        <script nonce="${nonce}" type="text/javascript" src="styles.js"></script>
        <script nonce="${nonce}" type="text/javascript" src="scripts.js"></script>
        <script nonce="${nonce}" type="text/javascript" src="vendor.js"></script>
        <script nonce="${nonce}" type="text/javascript" src="main.js"></script>
        </body>
        </html>
        `;
        return html;
    }
}

function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
