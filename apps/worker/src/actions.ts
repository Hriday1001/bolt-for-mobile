import prisma from "@repo/db/client";
import { patchProcessor } from "./artifactProcessor";
import WebSocket from "ws";

const BASE_WORKER_DIR = "/tmp/worker"

let ws: WebSocket | null = null;

export function initWebSocket() {
    if (ws) return ws;

    ws = new WebSocket("ws://localhost:8082");

    ws.addEventListener("open", () => {
        console.log("WS OPEN");
    });

    ws.addEventListener("close", () => {
        console.log("WS CLOSED");
    });

    ws.addEventListener("error", (err) => {
        console.error("WS ERROR:", err);
    });

    ws.addEventListener('message' , async (e)=>{
        console.log("Received : " , JSON.parse(e.data.toString()))
        const action = JSON.parse(e.data.toString());
        if(action.event === "user" && action.data.type === "userPatch"){
            const patchContents = action.data.content;
            const file = action.data.path;
            const contents = file.split('/tmp/worker/')
            const patchContentsNormalized = patchProcessor(contents[1] , patchContents);
            console.log(patchContentsNormalized);
            const projectId = action.data.project;

            const existingPatch = await prisma.patch.findFirst({
                where : {
                    projectId : projectId,
                    file : file
                }
            })

            if(existingPatch){
                await prisma.patch.update({
                    where : {
                        id : existingPatch.id
                    },
                    data : {
                        content : patchContentsNormalized
                    }
                })
            }
            else{
                await prisma.patch.create({
                    data : {
                        file : file,
                        content : patchContentsNormalized,
                        projectId : projectId
                    }
                })
            }
        }
    })

    return ws;
}

export async function onFileCommand(filePath : string , fileContent : string , projectId : string){
    await prisma.action.create({
        data : {
            projectId : projectId,
            content : `Updated file : ${filePath}`
        }
    })

    if(ws){
        ws.send(JSON.stringify({
            event : "agent",
            data : {
                type : "update-file",
                content : fileContent,
                path : `${BASE_WORKER_DIR}/${filePath}`,
                project : projectId
            }
        }))
    }
}

export async function onShellCommand(shellCommand : string , projectId : string){
    await prisma.action.create({
        data : {
            projectId : projectId,
            content : `Executed shell command : ${shellCommand}`
        }
    })

    if(ws){
        ws.send(JSON.stringify({
            event : "agent",
            data : {
                type : "shell-command",
                content : shellCommand.trim(),
                project : projectId
            }
        }))
    }
    
}