const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");
const dotenv = require("dotenv");

// Dynamic import for the SDK because it might be an ESM-only package in some versions,
// or we use standard require if supported.
// However, to be safe with the specific package "@google/genai", we'll initialize it inside the route
// or use a try-require pattern if you are on CommonJS.
// Ideally, for "@google/genai", the syntax is:
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

// Initialize the client once
// It automatically picks up GEMINI_API_KEY from process.env if not passed explicitly,
// but passing it explicitly is safer for some environments.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * HELPER: generateWithRetry
 * Wraps the SDK call with Exponential Backoff to handle 429 errors.
 */
const generateWithRetry = async (
  modelName,
  prompt,
  retries = 5,
  backoff = 2000
) => {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });
    return response;
  } catch (err) {
    // Check if the error is a rate limit (429)
    // The SDK error object usually contains a status or code
    if (
      (err.status === 429 ||
        err.code === 429 ||
        err.message?.includes("429")) &&
      retries > 0
    ) {
      console.log(
        `[AI-RETRY] Rate limit hit. Waiting ${backoff}ms... (${retries} retries left)`
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
      // Double the wait time
      return generateWithRetry(modelName, prompt, retries - 1, backoff * 2);
    }
    throw err;
  }
};

// --- AI Suggestion Route ---
router.post("/suggest", auth, async (req, res) => {
  const { mainTaskTitle } = req.body;

  if (!mainTaskTitle) {
    return res.status(400).json({ msg: "Please provide a main task title." });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res
      .status(500)
      .json({ msg: "AI service not configured: API key missing." });
  }

  try {
    // Using 'gemini-1.5-flash' as it is the current stable workhorse.
    // You can switch to 'gemini-2.5-flash' if your API key has access to it.
    const modelName = "gemini-2.5-flash";

    const prompt = `Given the main task "${mainTaskTitle}", suggest 5-8 concise sub-tasks. Respond ONLY with a JSON array of strings, e.g., ["Subtask 1", "Subtask 2"].`;

    // Call the SDK via our retry helper
    const response = await generateWithRetry(modelName, prompt);

    // The SDK response structure is cleaner
    // In the new @google/genai SDK, .text is a property, not a function.
    const jsonString = response.text;

    let suggestions = [];
    try {
      if (!jsonString) {
        throw new Error("Empty text response from AI");
      }
      const cleanJsonString = jsonString.replace(/```json|```/g, "").trim();
      suggestions = JSON.parse(cleanJsonString);
    } catch (parseError) {
      // Fallback: split by newlines if JSON parsing fails
      if (jsonString) {
        suggestions = jsonString
          .split("\n")
          .filter((line) => line.trim() !== "");
      } else {
        throw new Error("Could not parse suggestions from AI response");
      }
    }

    res.json({ suggestions });
  } catch (err) {
    console.error("AI Route Error:", err);

    // Handle specific SDK errors
    if (err.status === 429 || err.message?.includes("429")) {
      return res.status(429).json({
        msg: "AI service is busy. Please wait a moment and try again.",
      });
    }

    res.status(500).json({
      msg: "Server Error during AI generation.",
      details: err.message,
    });
  }
});

// --- Standard CRUD Routes ---

router.post("/", auth, async (req, res) => {
  try {
    const newTask = new Task({ ...req.body, userId: req.user.id });
    const task = await newTask.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.put("/:id", auth, async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task || task.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized or not found" });
    }
    task = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(task);
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task || task.userId.toString() !== req.user.id) {
      return res.status(401).json({ msg: "Not authorized" });
    }
    await Task.findByIdAndDelete(req.params.id);
    res.json({ msg: "Task removed" });
  } catch (err) {
    res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;
