
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

	const ws = new WebSocket("ws://host.docker.internal:8082");

	vscode.window.showInformationMessage('Hello World from bolt-command-exec!');
		
	const terminal = vscode.window.createTerminal({
		cwd : "/tmp/worker",
		name : "ai-cmd-exec"
	});
	terminal.show();

	ws.addEventListener('open', event => {
		console.log('WebSocket connection established!');
	});

	ws.addEventListener('message', event => {
		console.log('Message from server: ', event.data);
		terminal.sendText(event.data);
	});

	ws.addEventListener('close', event => {
		console.log('WebSocket connection closed:', event.code, event.reason);
	});

	ws.addEventListener('error', error => {
		console.error('WebSocket error:', error);
	});

}

export function deactivate() {}
