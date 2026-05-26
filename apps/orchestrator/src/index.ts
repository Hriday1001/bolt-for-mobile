/// <reference path="../../../types/global.d.ts" />
import express from "express";
import cors from "cors";
import {AuthMiddleware} from "@repo/auth";
import * as k8s from "@kubernetes/client-node";
import stream from 'node:stream';
import prisma from "@repo/db/client";

const app = express();
app.use(express.json())
app.use(cors())

type projectTypes = "EXPO"

const PROJECT_BASEFOLDER_MAP = {
    "EXPO" : "/tmp/expo-base-app"
}

const activeProjects : {userId : string , projectId : string}[] = []

const kc = new k8s.KubeConfig();
kc.loadFromDefault();

const k8sV1Api = kc.makeApiClient(k8s.AppsV1Api);
const k8sCoreApi = kc.makeApiClient(k8s.CoreV1Api)

async function init(){
    const namespaces = await k8sCoreApi.listNamespace()
    const project_namespace = namespaces.items.filter((namespace) => namespace.metadata?.name === "user-projects")
    const namespaceExists = project_namespace.length > 0
    console.log(namespaceExists)

    if(!namespaceExists) {
        try {
            await k8sCoreApi.createNamespace({body : {metadata : {name : "user-projects"}}})
        } catch (error) {
            console.log(error);
            return;
        }
    }

    const daemonsets = await k8sV1Api.listNamespacedDaemonSet({namespace : "user-projects"})
    const project_ds= daemonsets.items.filter((ds) => ds.metadata?.name === "prepullimage")
    const dsExists = project_ds.length > 0
    console.log(dsExists)

    if(!dsExists){
        try {
            await k8sV1Api.createNamespacedDaemonSet({namespace : "user-projects" , body : {
                metadata : {
                    name : "prepullimage"
                },
                spec : {
                    selector : {
                        matchLabels : {
                            name : "prepullimage"
                        }
                    },
                    template : {
                        metadata : {
                            labels : {
                                name : "prepullimage"
                            }
                        },
                        spec : {
                            initContainers :[
                                {
                                    name : "prepullimage-code",
                                    image : "vampweeknd2021/code-server-custom-amd64:v2",
                                    imagePullPolicy : "IfNotPresent",
                                    command : ["sleep" , "1"]
                                },
                                {
                                    name : "prepullimage-worker",
                                    image : "vampweeknd2021/bolt-worker:v2",
                                    imagePullPolicy : "IfNotPresent",
                                    command : ["sleep" , "1"]
                                },
                                {
                                    name : "prepullimage-ws-relayer",
                                    image : "vampweeknd2021/bolt-ws-relayer:v1",
                                    imagePullPolicy : "IfNotPresent",
                                    command : ["sleep" , "1"]
                                },
                            ],
                            containers : [
                                {
                                    name : "pause-container",
                                    image : "gcr.io/google_containers/pause"
                                }
                            ]
                        }
                    }
                }
            }})
        } catch (error) {
            console.log(error);
            return;
        }
    }
}

init()

async function createProjectDeployment(projectId : string , userId : string) {
    console.log("entered deployment creation")
    try {
        await k8sV1Api.createNamespacedDeployment({
            namespace : 'user-projects',
            body : {
                metadata : {
                    name : `user-${userId.split('user_')[1]?.toLowerCase()}-project-${projectId}-deployment`
                },
                spec : {
                    minReadySeconds : 5,
                    replicas : 1,
                    selector : {
                        matchLabels : {
                            user : userId.split('user_')[1]!.toLowerCase(),
                            project : projectId
                        }
                    },
                    template : {
                        metadata : {
                            labels : {
                                user : userId.split('user_')[1]!.toLowerCase(),
                                project : projectId
                            }
                        },
                        spec : {
                            containers : [
                                {
                                    name : "vscode-browser",
                                    image : "vampweeknd2021/code-server-custom-amd64:v2",
                                    imagePullPolicy : "IfNotPresent",
                                    ports : [{containerPort : 8080} , {containerPort : 8081}]
                                },
                                {
                                    name : "worker",
                                    image : "vampweeknd2021/bolt-worker:v2",
                                    imagePullPolicy : "IfNotPresent",
                                    ports : [{containerPort : 3002}],
                                    env : [
                                        {
                                            name : "DATABASE_URL",
                                            value : "postgresql://postgres:mysecretpassword@host.docker.internal:5432/postgres"
                                        },
                                        {
                                            name : "GEMINI_API_KEY",
                                            value : process.env.GEMINI_API_KEY
                                        },
                                        {
                                            name : "WS_RELAYER_URL",
                                            value : process.env.WS_RELAYER_URL
                                        }
                                    ]
                                },
                                {
                                    name : "ws-relayer",
                                    image : "vampweeknd2021/bolt-ws-relayer:v1",
                                    imagePullPolicy : "IfNotPresent",
                                    ports : [{containerPort : 8082}]
                                }
                            ]
                        }
                    }
                }
            }
        })
    } catch (error) {
        console.log(error);
        return;
    }
    
    try {
        await k8sCoreApi.createNamespacedService({namespace : 'user-projects' , body : {
            metadata : {
                name : `code-${userId.split('user_')[1]?.toLowerCase().slice(0,8)}-${projectId.slice(0,8)}`
            },
            spec : {
                selector : {
                    user : userId.split('user_')[1]!.toLowerCase(),
                    project : projectId
                },
                type : "NodePort",
                ports : [{port : 8080 , targetPort : 8080 , nodePort : 30007 , protocol : 'TCP' , name : 'code'}]
            }
        }})
    } catch (error) {
        console.log(error);
        return;
    }

    try {
        await k8sCoreApi.createNamespacedService({namespace : 'user-projects' , body : {
            metadata : {
                name : `preview-${userId.split('user_')[1]?.toLowerCase().slice(0,8)}-${projectId.slice(0,8)}`
            },
            spec : {
                selector : {
                    user : userId.split('user_')[1]!.toLowerCase(),
                    project : projectId
                },
                type : "NodePort",
                ports : [{port : 8080 , targetPort : 8081 , nodePort : 30009 , protocol : 'TCP' , name : 'preview'}]
            }
        }})
    } catch (error) {
        console.log(error);
        return;
    }

    try {
        await k8sCoreApi.createNamespacedService({namespace : 'user-projects' , body : {
            metadata : {
                name : `worker-${userId.split('user_')[1]?.toLowerCase().slice(0,8)}-${projectId.slice(0,8)}`
            },
            spec : {
                selector : {
                    user : userId.split('user_')[1]!.toLowerCase(),
                    project : projectId
                },
                type : "NodePort",
                ports : [{port : 3002 , targetPort : 3002 , nodePort : 30008, protocol : 'TCP' , name : 'worker'}]
            }
        }})
    } catch (error) {
        console.log(error);
        return;
    }

    activeProjects.push({userId , projectId});
}

async function checkPodReady(projectId : string) {
    let attempts = 0;
    let timeout = 1000;
    while(true){
        const pods = await k8sCoreApi.listNamespacedPod({namespace : 'user-projects'}) 
        const userPodforProject = pods.items.filter((pod) => pod.metadata?.labels?.project == projectId)
        const userPod = userPodforProject.at(0)
        
        if(userPod?.status?.phase == "Running"){
            console.log("User pod Ready : " , userPod.metadata?.name)
            return userPod
        }
        if(attempts > 10){
            throw new Error("Error while creating pod")
        }

        console.log("Attemp no : " , attempts);
        
        await new Promise((resolve) => setTimeout(resolve , timeout))
        attempts++
        timeout *= 2;
    }
} 

async function assignPodtoProject(projectId : string , userId : string , project_type : projectTypes) {
    const pods = await k8sCoreApi.listNamespacedPod({ namespace: 'user-projects' })
    const activePods = pods.items.filter((pod) => pod.status?.phase == "Running" || pod.status?.phase == "Pending")
    let userPodforProject = activePods.filter((pod) => pod.metadata?.labels?.user === userId.split('user_')[1]?.toLowerCase() && pod.metadata?.labels?.project === projectId)[0]
    if(!userPodforProject){
        await createProjectDeployment(projectId , userId)
    }
    
    try {
        userPodforProject = await checkPodReady(projectId)
    } catch (error) {
        console.log(error)
        return -1
    }

    const exec = new k8s.Exec(kc)
    const baseFolderPath = PROJECT_BASEFOLDER_MAP[project_type]
    let stdout = "";
    let stderr = "";

    await exec.exec('user-projects' , userPodforProject.metadata?.name! , "vscode-browser" , ["/bin/sh" , "-c" , `mv ${baseFolderPath}/* /tmp/worker/`], new stream.Writable({
        write(chunk, encoding, callback) {
            stdout += chunk;
            callback()
        },
    }) , new stream.Writable({
        write(chunk , encoding , callback){
            stderr += chunk;
            callback()
        }
    }) , null , false , (status: k8s.V1Status) => {
        console.log('Exited with status:');
        console.log(JSON.stringify(status, null, 2));
    })

    console.log("OUT : ", stdout)
    console.log("ERROR : " ,stderr)

    await new Promise((resolve) => setTimeout(resolve, 10000));

    
    console.log(`Assigned pod ${userPodforProject.metadata?.name} to project ${projectId}`)

}

app.get("/worker/:projectId" , AuthMiddleware , async (req : CustomRequest , res) => {
    const projectId = req.params.projectId!;
    const userId = req.userId!;

    try {
        const project = await prisma.project.findFirst({
            where : {
                id : projectId
            }
        })
    
        if(!project){
            res.status(404).json({
                message : "Project not found"
            })
            return;
        }
    
        const projectType = project.type;
        await assignPodtoProject(projectId , userId , projectType)
        res.status(200).json({
            message : "Pod assigned successfully",
        })
    } catch (error) {
        res.status(503).json({
            message : "Error while assigning pod",
            error
        })
        return;
    }

})

app.listen(3003)

async function deleteProjectResources(userId : string , projectId : string){
    const deploymentName = `user-${userId.split('user_')[1]?.toLowerCase()}-project-${projectId}-deployment`;
    
    try {
        await k8sV1Api.deleteNamespacedDeployment({
            namespace: "user-projects",
            name: deploymentName
        });

        const serviceNames = [
            `code-${userId.split('user_')[1]?.toLowerCase().slice(0, 8)}-${projectId.slice(0, 8)}`,
            `preview-${userId.split('user_')[1]?.toLowerCase().slice(0, 8)}-${projectId.slice(0, 8)}`,
            `worker-${userId.split('user_')[1]?.toLowerCase().slice(0, 8)}-${projectId.slice(0, 8)}`
        ];

        for (const serviceName of serviceNames) {
            try {
                await k8sCoreApi.deleteNamespacedService({
                    namespace: "user-projects",
                    name: serviceName
                });
            } catch (error) {
                console.log(`Service ${serviceName} not found or already deleted`);
            }
        }

        const index = activeProjects.findIndex((project) => (project.projectId === projectId && project.userId === userId))
        if(index != -1){
            activeProjects.splice(index , 1);
        }
        console.log(`Cleaned up resources for project ${projectId}`);
    } catch (error) {
        console.error(`Error deleting resources for project ${projectId}:`, error);
    }
}

async function shutdown (){
    console.log("Cleaning resources on shutdown")
    for (const {userId , projectId} of activeProjects){
        console.log({userId , projectId});
        await deleteProjectResources(userId , projectId);
    }
    process.exit(0)
}

process.on("SIGINT" , shutdown);
process.on("SIGTERM" , shutdown);