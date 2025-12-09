import { BACKEND_URL } from "@/config";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { useEffect, useState } from "react";

interface Prompt{
    id: string;
    content: string;
    type: "USER" | "SYSTEM";
    createdAt: Date;
}

export function usePrompts(projectId : string){
    const [prompts , setPrompts] = useState<Prompt []>([]);
    const {getToken} = useAuth();

    useEffect(()=>{
        async function getPrompts(){
            const token = await getToken();
            const response = await axios.get(`${BACKEND_URL}/projects/${projectId}/prompts` , {
                headers : {
                    Authorization : `Bearer ${token}`
                }
            });
            setPrompts(response.data.prompts);
        }
        getPrompts()
        const intervalId = setInterval(getPrompts , 1000*3);
        return () => clearInterval(intervalId);
    } , [])

    return {
        prompts
    }
}