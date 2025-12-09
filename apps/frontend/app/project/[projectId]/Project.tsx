"use client"
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VS_CODE_REMOTE_URL } from "@/config";
import { useActions } from "@/hooks/useActions";
import { usePrompts } from "@/hooks/usePrompts";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { Send } from "lucide-react";
import { useState } from "react";

export default function Project({projectId , workerUrl} : {projectId : string , workerUrl : string}){
    const {prompts} = usePrompts(projectId);
    const {actions} = useActions(projectId);
    const {getToken} = useAuth();
    const [prompt , setPrompt] = useState("");

    const onSubmit = async (e : React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const token = await getToken();
        axios.post(
            `${workerUrl}/prompt`,
            {
                projectId: projectId,
                prompt: prompt,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        );
        setPrompt("");
    }


    return (
        <>
            <div className="flex h-screen">
                <div className="w-1/4">
                    <div>
                        {prompts.filter((prompt) => prompt.type === "USER").map((prompt) => (
                            <span key={prompt.id} className="flex text-lg gap-2">
                                {prompt.content}
                            </span>
                        ))}
                    </div>
                    <div>
                        {actions.map((action) => (
                            <span key={action.id} className="flex text-lg gap-2">
                                {action.content}
                            </span>
                        ))}
                    </div>
                    <div className="fixed bottom-0 left-0 w-1/4 text-white p-4">
                        <form onSubmit={(e) => onSubmit(e)} className="relative w-full border-2 bg-gray-500/10 focus-within:outline-1 focus-within:outline-teal-300/30 rounded-xl">
                            <div>
                            <Textarea
                                        value={prompt}
                                        placeholder="Write a prompt..."
                                        onChange={(e) => setPrompt(e.target.value)}
                                        className="w-full placeholder:text-gray-400/60 bg-transparent border-none text-md rounded-none focus-visible:ring-0 min-h-16 max-h-80 resize-none outline-none"
                            />
                            </div>
                            <div className="absolute right-0 bottom-1.5">
                                <Button
                                    type="submit"
                                    className="h-10 w-10 cursor-pointer rounded-full bg-white flex items-center justify-center"
                                    disabled={!prompt}
                                >
                                    <Send/>
                                </Button>
                            </div>
                        </form>

                    </div>

                    
                </div>
                <div className="w-3/4">
                    <iframe src={`${VS_CODE_REMOTE_URL}`} width = {"100%"} height={"100%"}/>
                </div>
            </div>
        </>
    )

}