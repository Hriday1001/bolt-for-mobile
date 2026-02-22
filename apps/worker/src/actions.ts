import prisma from "@repo/db/client";
import { spawnSync } from "child_process";
import fs from "fs/promises";
import path from "path";

const ws = new WebSocket(process.env.WS_RELAYER_URL! || "ws://localhost:8082");
const BASE_WORKER_DIR = "/tmp/worker"

export async function onFileCommand(filePath : string , fileContent : string , projectId : string){
    await prisma.action.create({
        data : {
            projectId : projectId,
            content : `Updated file : ${filePath}`
        }
    })

    const fullPath = path.join(BASE_WORKER_DIR , filePath);
    if (!fullPath.startsWith(BASE_WORKER_DIR)) {
        throw new Error("Invalid file path");
    }
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, fileContent);

    ws.send(JSON.stringify({
        event : "agent",
        data : {
            type : "update-file",
            content : fileContent,
            path : `${BASE_WORKER_DIR}/${filePath}`
        }
    }))
}

export async function onShellCommand(shellCommand : string , projectId : string){
    await prisma.action.create({
        data : {
            projectId : projectId,
            content : `Executed shell command : ${shellCommand}`
        }
    })

    try {
        const cleanCommand = shellCommand.trim();
        const parts = cleanCommand.split(/\s+/);
        const command = parts[0];   
        const args = parts.slice(1);
        const result = spawnSync(command as string, args, {
            cwd : BASE_WORKER_DIR
        });
        if (result.error) {
            console.error('Error spawning process : ', result.error);
        } else {
            console.log('stdout : ', result.stdout);
            console.error('stderr : ', result.stderr);
        }
    } catch (error) {
        console.error('Failed executing shell command : ', error);
    }

    ws.send(JSON.stringify({
        event : "agent",
        data : {
            type : "shell-command",
            content : shellCommand,
        }
    }))
}