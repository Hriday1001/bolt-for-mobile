import { WORKER_URL } from "@/config";
import InitProject from "@/components/InitProject";

interface Params {
	params: Promise<{ projectId: string }>
}

export default async function ProjectPage({ params }: Params) {
	const projectId = (await params).projectId
    const workerUrl = WORKER_URL;

	return <InitProject
		projectId={projectId} 
		workerUrl={workerUrl} 
	/>
}