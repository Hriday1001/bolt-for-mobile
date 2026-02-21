/*
    <boltArtifact>
        <boltAction type="shell">
            npm run start
        </boltAction>
        <boltAction type="file" filePath="src/index.js">
            console.log("Hello, world!");
        </boltAction>
    </boltArtifact>
*/

export class ArtifactProcessor{
    private currentArtifact : string;
    private onFileCommand : (filePath : string , fileContents : string) => void;
    private onShellCommand : (shellCommand : string) => void;

    constructor (currentArtifact : string , onFileCommand : (filePath : string , fileContents : string) => void, onShellCommand : (shellCommand : string) => void){
        this.currentArtifact = currentArtifact;
        this.onFileCommand = onFileCommand;
        this.onShellCommand = onShellCommand;
    }

    append(text : string){
        this.currentArtifact += text
    }

    parse(){
        const latestActionStart = this.currentArtifact.split("\n").findIndex((instruction) => instruction.includes("<boltAction type="));
        const latestActionEnd = this.currentArtifact.split("\n").findIndex((instruction) => instruction.includes("</boltAction>"));

        if(latestActionStart == -1 || latestActionEnd == -1){
            return;
        }

        const latestActionType = this.currentArtifact.split("\n")[latestActionStart]!.split("type=")[1]!.split(" ")[0]?.split(">")[0];
        // console.log(this.currentArtifact.split("\n").slice(latestActionStart , latestActionEnd+1))
        const latestActionContent = this.currentArtifact.split("\n").slice(latestActionStart , latestActionEnd+1).join("\n");
        // console.log(latestActionContent)

        if(latestActionType === "\"shell\""){
            console.log("Entered shell")
            this.currentArtifact = this.currentArtifact.split(latestActionContent)[1]!;
            const shellCommand = latestActionContent.split("\n").slice(1,latestActionContent.split("\n").length - 1).join("\n");
            this.onShellCommand(shellCommand);
        }
        else if (latestActionType === "\"file\""){
            console.log("Entered file")
            const filePath = this.currentArtifact.split("\n")[latestActionStart]!.split("filePath=")[1]!.split(">")[0];
            this.currentArtifact = this.currentArtifact.split(latestActionContent)[1]!;
            const fileContent = latestActionContent.split("\n").slice(1,latestActionContent.split("\n").length - 1).join("\n");
            this.onFileCommand(filePath!.split("\"")[1]! , fileContent);
        }
    }
}