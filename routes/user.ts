import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db/db";
import { comparePassword, hashPassword } from "../utils/user";
import { isAuth } from "../middleware/isAuth";

const secret = process.env.SECRET_KEY;

const router = express.Router();

router.post("/register", async (req, res) => {
  let { name, email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    } else {
      password = await hashPassword(password);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password,
        },
      });
      res.status(201).json({
        success: true,
        message: "User created successfully",
      });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/register-admin", async (req, res) => {
  let { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: "Please enter all fields" });
  }
  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    } else {
      password = await hashPassword(password);
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password,
          isAdmin: true,
        },
      });
      res.status(201).json({
        success: true,
        message: "User created successfully",
      });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/login", async (req, res) => {
  let { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Please enter all fields" });
  } else {
    try {
      const user = await prisma.user.findUnique({
        where: {
          email,
        },
      });
      if (!user) {
        return res.status(400).json({ message: "User does not exist" });
      } else {
        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
          return res.status(400).json({ message: "Invalid credentials" });
        } else {
          const payload = {
            id: user.id,
          };
          const token = jwt.sign(payload, secret!, {
            expiresIn: 3600,
          });
          res.status(200).json({
            success: true,
            token,
          });
        }
      }
    } catch (err) {
      res.status(500).json(err);
    }
  }
});

router.get("/user", isAuth, async (req, res) => {
  const user = req.body.user;
  res.status(200).json(user);
});

router.get("/products", isAuth, async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        Category: true,
      },
    });
    res.status(200).json({
      success: true,
      message: "Products fetched successfully",
      products,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/products/:id", isAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: {
        id,
      },
      include: {
        Category: true,
      },
    });
    res.status(200).json({
      success: true,
      message: "Product fetched successfully",
      product,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/orders", isAuth, async (req, res) => {
  const { user } = req.body;
  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: user.id,
      },
      include: {
        products: true,
      },
    });
    res.status(200).json({
      success: true,
      message: "Orders fetched successfully",
      orders,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get("/categories", isAuth, async (req, res) => {
  try {
    const categories = await prisma.category.findMany();
    res.status(200).json({
      success: true,
      message: "Categories fetched successfully",
      categories,
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/create-product", isAuth, async (req, res) => {
  const { title, price, description, image, category, rating, count } =
    req.body;
  try {
    const { user } = req.body;
    const userInDb = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });
    if (!userInDb) {
      return res.status(404).json({ message: "User not found" });
    } else if (userInDb.isAdmin === false) {
      return res.status(401).json({ message: "Unauthorized" });
    } else {
      const product = await prisma.product.create({
        data: {
          title,
          price,
          description,
          image,
          Category: {
            connectOrCreate: {
              create: {
                name: category,
              },
              where: {
                name: category,
              },
            },
          },
          rating,
          count,
        },
      });
      res.status(201).json({
        success: true,
        message: "Product created successfully",
        product,
      });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

router.post("/create-order", isAuth, async (req, res) => {
  const { products } = req.body; // array of product ids
  try {
    const { user } = req.body;
    const userInDb = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });
    if (!userInDb) {
      return res.status(404).json({ message: "User not found" });
    } else {
      // calculate price
      const price = await prisma.product.findMany({
        where: {
          id: {
            in: products,
          },
        },
      });
      let totalPrice = 0;
      price.forEach((product) => {
        totalPrice += product.price;
      });
      const order = await prisma.order.create({
        data: {
          price: totalPrice,
          products: {
            connect: products.map((product: string) => {
              return {
                id: product,
              };
            }),
          },
          User: {
            connect: {
              id: user.id,
            },
          },
        },
      });
      res.status(201).json({
        success: true,
        message: "Order created successfully",
        order,
      });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

router.put("/update-product/:id", isAuth, async (req, res) => {
  const { id } = req.params;
  const { title, price, description, image, category, rating, count } =
    req.body;
  try {
    const { user } = req.body;
    const userInDb = await prisma.user.findUnique({
      where: {
        id: user.id,
      },
    });
    if (!userInDb) {
      return res.status(404).json({ message: "User not found" });
    } else if (userInDb.isAdmin === false) {
      return res.status(401).json({ message: "Unauthorized" });
    } else {
      const product = await prisma.product.update({
        where: {
          id,
        },
        data: {
          title,
          price,
          description,
          image,
          Category: {
            connectOrCreate: {
              create: {
                name: category,
              },
              where: {
                name: category,
              },
            },
          },
          rating,
          count,
        },
      });
      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        product,
      });
    }
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
