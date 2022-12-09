import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import express from "express";
import axios from "axios";
const prisma = new PrismaClient();
const app = express();
import userRoutes from "../routes/user";

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", async (req, res) => {
  const { data } = await axios.get(
    "https://official-joke-api.appspot.com/random_ten"
  );
  res.status(200).json(data);
});

app.use("/api", userRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
