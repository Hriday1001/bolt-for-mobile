import { WORKER_URL , K8S_URL } from "@/config";
import InitProject from "@/components/InitProject";
import { auth } from "@clerk/nextjs/server";
import axios from "axios";

interface Params {
	params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: Params) {
	const projectId = (await params).projectId
    const workerUrl = WORKER_URL;
	const user = await auth()
	const token = await user.getToken()

	const res = await axios.get(
		`${K8S_URL}/worker/${projectId}`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
			},
		},
	);

	console.log(res)

	return <InitProject
		projectId={projectId} 
		workerUrl={workerUrl} 
	/>
}