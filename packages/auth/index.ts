/// <reference path="../../types/global.d.ts" />
import * as express from "express";
import jwt from "jsonwebtoken"

export function AuthMiddleware(req : CustomRequest , res : express.Response , next : express.NextFunction){
    const token = req.headers.authorization?.split(" ")[1];
    if(!token){
        res.status(403).json({
            "message" : "Unauthorized"
        })
        return;
    }
    const decoded = jwt.verify(token , process.env.JWT_PUBLIC_KEY as string , {algorithms : ["RS256"]}) as jwt.JwtPayload;
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