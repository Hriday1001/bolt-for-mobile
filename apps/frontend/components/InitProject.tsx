"use client"
import Project from "@/app/project/[projectId]/Project";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useSearchParams } from "next/navigation"
import { useEffect } from "react";

export default function InitProject({
    projectId,
    workerUrl
}: {
    projectId : string,
    workerUrl : string
}){
    const queryParams = useSearchParams();
    const initPrompt = queryParams.get("initPrompt");
    const {getToken} = useAuth();

    const waitForWorker = async () => {
        while (true) {
            try {
                await axios.get(`${workerUrl}/health`);
                return;
            } catch {
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    };


    useEffect(() => {
        (async () => {
            const token = await getToken();
            try {
                await waitForWorker();
            } catch (error) {
                console.log(error)
            }
            try {
                await axios.post(`${workerUrl}/prompt` , {
                    projectId,
                    prompt : initPrompt
                } , {
                    headers : {
                        Authorization : `Bearer ${token}`
                    }
                })
            } catch (error) {
                console.log(error);
            }
        })()
    } , [projectId , initPrompt , workerUrl , getToken])

    return <Project
        projectId={projectId}
        workerUrl={workerUrl}
    />
}