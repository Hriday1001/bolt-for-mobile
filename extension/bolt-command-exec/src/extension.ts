
import * as vscode from 'vscode';
import * as path from 'path';
import {diffTrimmedLines} from 'diff';

let fileContentMap: Map<string, string> = new Map();

async function ensureFileExists(filePath: string, content: string = '') : Promise<vscode.Uri> {
	try {
	  const fileUri = vscode.Uri.file(filePath);
	  const dirPath = path.dirname(filePath);
	  try {
		await vscode.workspace.fs.stat(vscode.Uri.file(dirPath));
	  } catch {
		await vscode.workspace.fs.createDirectory(vscode.Uri.file(dirPath));
	  }
	  try {
		await vscode.workspace.fs.stat(fileUri);
	  } catch {
		await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf8'));
	  }
  
	  return fileUri;
	} catch (error) {
	  vscode.window.showErrorMessage(`Error ensuring file exists: ${error}`);
	  throw error;
	}
  }

export async function activate(context: vscode.ExtensionContext) {

	const ws = new WebSocket("ws://host.docker.internal:8082");
	// const ws = new WebSocket("ws://localhost:8082");

	vscode.window.showInformationMessage('Hello World from bolt-command-exec!');
		
	const terminal = vscode.window.createTerminal({
		cwd : "/tmp/worker",
		name : "ai-cmd-exec"
	});
	terminal.show();

	ws.addEventListener('open', event => {
		console.log('WebSocket connection established!');
	});

	ws.addEventListener('message', async event => {
		const command = JSON.parse(event.data);
		console.log(command);
		if(command.event === "agent"){
			const data = command.data;

			if(data.type === "update-file"){
				const fileUri = await ensureFileExists(data.path , data.content);
				const document = await vscode.window.showTextDocument(fileUri);
				const editor = new vscode.WorkspaceEdit();
				const range = new vscode.Range(new vscode.Position(0,0) , new vscode.Position(document.document.lineCount , 0));
				editor.replace(fileUri, range, data.content);
				await vscode.workspace.applyEdit(editor);
			}
			else if(data.type === "shell-command"){
				terminal.sendText(data.content);
			}
		}
		
	});

	ws.addEventListener('close', event => {
		console.log('WebSocket connection closed:', event.code, event.reason);
	});

	ws.addEventListener('error', error => {
		console.error('WebSocket error:', error);
	});

	vscode.workspace.onDidOpenTextDocument((e) => {
		const fileText = e.getText();
		const filePath = e.uri.fsPath;
		
		if(!fileContentMap.has(filePath)){
			fileContentMap.set(filePath , fileText);
		}
		
	});
	

	vscode.workspace.onDidSaveTextDocument(async(e) => {
		const fileUri = e.uri;
		let oldFileContent = fileContentMap.get(fileUri.fsPath);
		let newFileContent = await vscode.workspace.fs.readFile(fileUri);
		let linesChanged = diffTrimmedLines(oldFileContent!.toString() , newFileContent.toString());
		let lineNumber = 0;

		const changes = [];

		for (let i = 0;i<linesChanged.length ; i++) {
			const change = linesChanged[i];
			if(change.removed){
				const addedChange = linesChanged[i+1];
				const rangeStart = lineNumber + 1;
				const rangeEnd = lineNumber + change.count;
				changes.push({
					lineRemoved : change.value,
					lineAdded : addedChange.value,
					range : {
						start : rangeStart,
						end : rangeEnd
					}
				});
				i += 2;
			}
			else{
				lineNumber += change.count;
			}
		}

		if(changes.length !== 0){
			ws.send(JSON.stringify({
				event : "user",
				data : {
					type : "userPatch",
					path : fileUri.fsPath,
					content : changes
				}
			}));
		}
	});
	

}

export function deactivate() {}
