import "dotenv/config";
import jwt from "jsonwebtoken";
import express from "express";
import { PrismaClient } from "@prisma/client";

const secret = process.env.SECRET_KEY;
const prisma = new PrismaClient();

interface JwtPayload {
  id: string;
}

export async function isAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  } else {
    try {
      const decoded = jwt.verify(token, secret!) as JwtPayload;
      const user = await prisma.user.findUnique({
        where: {
          id: decoded.id,
        },
      });
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      } else {
        req.body.user = user;
        next();
      }
    } catch (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }
}
