import { Router, Response } from "express";
import pool from "../db.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { createTodoSchema, updateTodoSchema } from "../validators/todos.js";

const router = Router();

router.use(authenticate);

function isZodError(err: unknown): err is { name: string; errors: unknown[] } {
  return err instanceof Error && err.name === "ZodError";
}

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT * FROM todos WHERE user_id = $1 ORDER BY created_at DESC",
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get todos error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, priority, due_date } = createTodoSchema.parse(req.body);
    const result = await pool.query(
      "INSERT INTO todos (user_id, title, description, priority, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [req.userId, title, description || null, priority || 0, due_date || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (isZodError(err)) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("Create todo error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, is_done, priority, due_date } = updateTodoSchema.parse(req.body);

    const result = await pool.query(
      `UPDATE todos SET title = COALESCE($1, title), description = COALESCE($2, description),
       is_done = COALESCE($3, is_done), priority = COALESCE($4, priority),
       due_date = COALESCE($5, due_date), updated_at = NOW()
       WHERE id = $6 AND user_id = $7 RETURNING *`,
      [title, description, is_done, priority, due_date, id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    if (isZodError(err)) {
      res.status(400).json({ error: "Validation failed", details: err.errors });
      return;
    }
    console.error("Update todo error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "DELETE FROM todos WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Todo not found" });
      return;
    }
    res.json({ message: "Todo deleted" });
  } catch (err) {
    console.error("Delete todo error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
