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

    useEffect(() => {
        (async () => {
            const token = await getToken();
            await axios.post(`${workerUrl}/prompt` , {
                projectId,
                prompt : initPrompt
            } , {
                headers : {
                    Authorization : `Bearer ${token}`
                }
            })
        })()
    } , [projectId , initPrompt , workerUrl])

    return <Project
        projectId={projectId}
        workerUrl={workerUrl}
    />
}