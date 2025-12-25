const express = require("express");
const router = express.Router();
const Task = require("../models/Task");
const auth = require("../middleware/authMiddleware");
const fetch = require("node-fetch");
const dotenv = require("dotenv");

dotenv.config();

/**
 * HELPER: fetchWithRetry
 * Handles the 429 (Too Many Requests) error automatically.
 * It uses Exponential Backoff to wait longer between each retry.
 */
const fetchWithRetry = async (url, options, retries = 5, backoff = 2000) => {
  try {
    const response = await fetch(url, options);

    // If rate limited (429), wait and retry
    if (response.status === 429 && retries > 0) {
      console.log(
        `[AI-RETRY] Rate limit hit. Waiting ${backoff}ms... (${retries} retries left)`
      );
      await new Promise((resolve) => setTimeout(resolve, backoff));
      // Double the wait time for the next attempt (2s, 4s, 8s, 16s...)
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }

    return response;
  } catch (err) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
};

// --- AI Suggestion Route ---
// @route   POST /api/tasks/suggest
// @desc    Get AI-powered sub-task suggestions for a given main task title
// @access  Private
router.post("/suggest", auth, async (req, res) => {
  const { mainTaskTitle } = req.body;

  if (!mainTaskTitle) {
    return res.status(400).json({ msg: "Please provide a main task title." });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ msg: "AI service not configured: API key missing." });
    }

    // Using 1.5-flash for higher rate limits on shared hosting IPs
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Given the main task "${mainTaskTitle}", suggest 3-5 concise sub-tasks. Respond as a JSON array of strings, like ["Subtask 1", "Subtask 2"]. Do not include markdown or the word "json".`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };

    const apiResponse = await fetchWithRetry(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!apiResponse.ok) {
      if (apiResponse.status === 429) {
        return res.status(429).json({
          msg: "AI service is currently busy. Please wait 30 seconds and try again.",
        });
      }
      const errorBody = await apiResponse.json();
      return res
        .status(apiResponse.status)
        .json({ msg: "AI request failed.", details: errorBody });
    }

    const result = await apiResponse.json();

    if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
      const jsonString = result.candidates[0].content.parts[0].text;
      let suggestions = [];
      try {
        const cleanJsonString = jsonString.replace(/```json|```/g, "").trim();
        suggestions = JSON.parse(cleanJsonString);
      } catch (parseError) {
        suggestions = jsonString
          .split("\n")
          .filter((line) => line.trim() !== "");
      }
      res.json({ suggestions });
    } else {
      res.status(500).json({ msg: "AI response was empty." });
    }
  } catch (err) {
    console.error("AI Route Error:", err.message);
    res.status(500).json({ msg: "Server Error during AI generation." });
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
