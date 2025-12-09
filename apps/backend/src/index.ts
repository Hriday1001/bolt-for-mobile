import prisma from "@repo/db/client";
import express from "express";
import cors from "cors";
import { AuthMiddleware } from "./middleware";

const app = express()
app.use(express.json())
app.use(cors());


app.post("/project" , AuthMiddleware , async (req : CustomRequest, res) => {
    const {prompt} = req.body;
    const userId = req.userId!;
    const description = prompt.split("\n")[0];
    try {
        const project = await prisma.project.create({
            data : {
                "description" : description,
                "prompts": {
                    create: {
                        content: prompt,
                        type : "INIT"
                    }
                },
                "userId" : userId
            }
        })
        res.status(200).json({
            "projectId" : project.id
        })
    } catch (error) {
        res.status(503).json({
            "message" : "Error while creating project",
            error
        })
    }
})

app.get("/projects" , AuthMiddleware , async (req : CustomRequest, res) => {
    const userId = req.userId!;
    try {
        const projects = await prisma.project.findMany({
            where : {
                userId : userId
            }
        });

        // const projects = await prisma.project.findMany();
    
        res.status(200).json({
            "projects" : projects
        })
    } catch (error) {
        res.status(503).json({
            "message" : "Error while fetching projects"
        })
    }

})

app.get("/projects/:projectId/prompts" , AuthMiddleware , async (req: CustomRequest , res) => {
    const projectId = req.params.projectId;

    try {
        const prompts = await prisma.prompt.findMany({
            where : {
                projectId : projectId
            }
        })

        res.status(200).json({
            prompts,
            message : "Retrieved all prompts"
        })
    } catch (error) {
        res.status(503).json({
            error,
            message : "Error in retrieving all prompts"
        })
    }
})

app.get("/projects/:projectId/actions" , AuthMiddleware , async (req: CustomRequest , res) => {
    const projectId = req.params.projectId;

    try {
        const actions = await prisma.action.findMany({
            where : {
                projectId : projectId
            }
        })

        res.status(200).json({
            actions,
            message : "Retrieved all prompts"
        })
    } catch (error) {
        res.status(503).json({
            error,
            message : "Error in retrieving all prompts"
        })
    }
})

app.listen(3001 , ()=>{
    console.log("Server running on port 3001");
});