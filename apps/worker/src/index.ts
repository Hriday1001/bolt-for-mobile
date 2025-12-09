import express from "express"
import cors from "cors"
import { GoogleGenAI } from "@google/genai";
import prisma from "@repo/db/client";
import { ArtifactProcessor } from "./artifactProcessor";
import { onFileCommand, onShellCommand } from "./actions";
import { systemPrompt } from "./systemPrompt";

const app = express();
app.use(express.json());
app.use(cors());

app.post("/prompt" , async (req,res)=>{
    const {prompt , projectId} = req.body;
    const client = new GoogleGenAI({apiKey : process.env.GEMINI_API_KEY});

    await prisma.prompt.create({
        data : {
            "content" : prompt,
            "projectId" : projectId,
            "type" : "USER"
        }
    })

    const promptHistory = await prisma.prompt.findMany({
        where : {
            projectId : projectId
        },
        orderBy : {
            createdAt : "asc"
        }
    });

    let currentArtifact : string = "";
    const artifactProcessor = new ArtifactProcessor(currentArtifact , (filePath , fileContent) => onFileCommand(filePath , fileContent , projectId) , (shellCommand) => onShellCommand(shellCommand , projectId));

    const promptHistoryUser = promptHistory.filter((prompt : any) => prompt.type === 'USER').map((prompt : any) => {
        return {
            text : prompt.content
        }
    })

    const promptHistorySystem = promptHistory.filter((prompt : any) => prompt.type === 'SYSTEM').map((prompt : any) => {
        return {
            text : prompt.content
        }
    })

    const promptHistoryNormalized = [];

    if (promptHistoryUser.length > 0) {
        promptHistoryNormalized.push({
            role: "user",
            parts: promptHistoryUser,
        });
    }

    if (promptHistorySystem.length > 0) {
        promptHistoryNormalized.push({
            role: "model",
            parts: promptHistorySystem,
        });
    }

    const chat = client.chats.create({
        model : "gemini-2.5-flash",
        config : {
            maxOutputTokens : 8000
        },
        history : promptHistoryNormalized
    })

    const response = await chat.sendMessageStream({
        message : systemPrompt,
    })

    for await (const chunk of response) {
        // console.log("Response from model : ")
        // console.log(chunk.text);
        // console.log("\n")
        artifactProcessor.append(chunk.text!);
        artifactProcessor.parse();
        currentArtifact += chunk.text as string
    }

    await prisma.prompt.create({
        data : {
            "content" : currentArtifact,
            "projectId" : projectId,
            "type" : "SYSTEM"
        }
    })

    await prisma.action.create({
        data : {
            "content" : "Response generation completed",
            "projectId" : projectId,
        }
    })


    res.status(200).json({
        "response" : response
    })

})

app.listen(3002);