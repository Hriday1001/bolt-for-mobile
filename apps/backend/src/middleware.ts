import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export function AuthMiddleware(req : CustomRequest , res : Response , next : NextFunction){
    const token = req.headers.authorization?.split(" ")[1];
    if(!token){
        res.status(403).json({
            "message" : "Unauthorized"
        })
        return;
    }
    const decoded = jwt.verify(token , process.env.JWT_PUBLIC_KEY as string , {algorithms : ["RS256"]}) as JwtPayload;
    if(!decoded){
        res.status(403).json({
            "message" : "Unauthorized"
        })
        return;
    }

    const userId = (decoded as any).sub;

    if(!userId){
        res.status(403).json({
            "message" : "Unauthorized"
        })

        return;
    }

    req.userId = userId;

    next();
}