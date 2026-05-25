import { Request } from "express";

declare global {
    type CustomRequest = Request & {
      userId?: string;
    };
}

export {};