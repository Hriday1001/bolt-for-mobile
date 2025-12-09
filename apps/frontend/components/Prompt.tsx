"use client";

import { Button } from "@/components/ui/button"
import { Send } from 'lucide-react'
import { TemplateButtons } from "./TemplateButtons"
import { Textarea } from "./ui/textarea";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import { BACKEND_URL } from "@/config";
import { useRouter } from "next/navigation";

export function Prompt() {
  const [prompt, setPrompt] = useState("");
  const { getToken } = useAuth();
  const router = useRouter();

  const handleTemplateClick = (text: string) => {
		setPrompt(text);
	};
  return (
    <div className="relative">
      <Textarea placeholder="Create a chess application..."
				value={prompt}
				onChange={(e) => setPrompt(e.target.value)}
				className="py-4 pl-4 pr-12 min-h-28 max-h-40 overflow-auto"
		/>
      {prompt && (
		<Button className="absolute top-4 right-4 cursor-pointer" onClick={async () => {
            const token = await getToken();
            const response = await axios.post(`${BACKEND_URL}/project` , {
                prompt : prompt
            } , {
                headers : {
                    Authorization : `Bearer ${token}`
                }
            })
            console.log(response.data);
            const projectId = response.data.projectId;
            router.push(`/project/${projectId}?initPrompt=${prompt}`);
        }}>
          <Send />
        </Button>
      )}
      <div className="max-w-2xl mx-auto pt-4">
				<TemplateButtons onTemplateClick={handleTemplateClick} />
			</div>
    </div>
  );
}