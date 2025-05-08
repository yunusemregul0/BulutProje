const express = require("express");
const router = express.Router();
const Snippet = require("../models/Snippet");
const auth = require("../middleware/auth");

// Get all folders for the user
router.get(["/", "/folders"], auth, async (req, res) => {
  try {
    console.log("Fetching folders for user:", req.user.uid);

    // Find all snippets for the user
    const snippets = await Snippet.find({
      $or: [
        { userId: req.user.uid },
        { sharedWith: req.user.email },
        { isPublic: true },
      ],
    }).select("-__v");

    // Extract and process folder paths
    const folders = new Set(["/"]);

    // Process snippets to extract folders
    snippets.forEach((snippet) => {
      if (snippet.folderPath) {
        // Add the current folder
        folders.add(snippet.folderPath);

        // Add all parent folders
        const parts = snippet.folderPath.split("/").filter(Boolean);
        let currentPath = "";
        parts.forEach((part) => {
          currentPath += "/" + part;
          folders.add(currentPath);
        });
      }
    });

    // Convert to array and sort
    const sortedFolders = Array.from(folders).sort((a, b) => {
      const depthA = a.split("/").length;
      const depthB = b.split("/").length;
      if (depthA === depthB) {
        return a.localeCompare(b);
      }
      return depthA - depthB;
    });

    console.log("Folders found:", sortedFolders);
    res.status(200).json(sortedFolders);
  } catch (error) {
    console.error("Error fetching folders:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get snippets in a specific folder
router.get("/folders/:folderPath(*)", auth, async (req, res) => {
  try {
    const folderPath = "/" + (req.params.folderPath || "");
    console.log("Fetching snippets for folder:", folderPath);

    const snippets = await Snippet.find({
      folderPath,
      $or: [
        { isPublic: true },
        { userId: req.user.uid },
        { sharedWith: req.user.email },
      ],
    })
      .select("-__v")
      .sort({ createdAt: -1 });

    // Process snippets to ensure all required fields are present
    const processedSnippets = snippets.map((snippet) => {
      const processedSnippet = snippet.toObject();
      return {
        ...processedSnippet,
        folderPath: processedSnippet.folderPath || "/",
        title: processedSnippet.title || "Untitled",
        code: processedSnippet.code || "",
        language: processedSnippet.language || "text",
        description: processedSnippet.description || "",
        tags: Array.isArray(processedSnippet.tags) ? processedSnippet.tags : [],
        isPublic: !!processedSnippet.isPublic,
        sharedWith: Array.isArray(processedSnippet.sharedWith)
          ? processedSnippet.sharedWith
          : [],
        canEdit: Array.isArray(processedSnippet.canEdit)
          ? processedSnippet.canEdit
          : [],
      };
    });

    console.log(
      `Found ${processedSnippets.length} snippets in folder ${folderPath}`
    );
    // Always return 200 with the snippets array, even if empty
    res.status(200).json(processedSnippets);
  } catch (error) {
    console.error("Error fetching folder snippets:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all public snippets and user's private snippets
router.get("/", auth, async (req, res) => {
  try {
    console.log("Fetching all snippets for user:", req.user.uid);
    const folderPath = req.query.folderPath || "/";

    // Find all snippets that the user has access to
    const snippets = await Snippet.find({
      $or: [
        { isPublic: true },
        { userId: req.user.uid },
        { sharedWith: req.user.email },
      ],
    })
      .select("-__v") // Exclude version field
      .sort({ createdAt: -1 });

    // Process snippets to ensure all required fields are present
    const processedSnippets = snippets.map((snippet) => {
      const processedSnippet = snippet.toObject();
      return {
        ...processedSnippet,
        folderPath: processedSnippet.folderPath || "/",
        title: processedSnippet.title || "Untitled",
        code: processedSnippet.code || "",
        language: processedSnippet.language || "text",
        description: processedSnippet.description || "",
        tags: Array.isArray(processedSnippet.tags) ? processedSnippet.tags : [],
        isPublic: !!processedSnippet.isPublic,
        sharedWith: Array.isArray(processedSnippet.sharedWith)
          ? processedSnippet.sharedWith
          : [],
        canEdit: Array.isArray(processedSnippet.canEdit)
          ? processedSnippet.canEdit
          : [],
        isFolderMarker: !!processedSnippet.isFolderMarker,
      };
    });

    console.log(`Found ${processedSnippets.length} snippets`);
    // Always return 200 with data, even if empty array
    res.status(200).json(processedSnippets);
  } catch (error) {
    console.error("Error fetching snippets:", error);
    res.status(500).json({
      message: "Failed to fetch snippets",
      error: error.message,
    });
  }
});

// Get user's snippets
router.get("/my-snippets", auth, async (req, res) => {
  try {
    console.log("Fetching user snippets for:", req.user.uid);
    const snippets = await Snippet.find({
      userId: req.user.uid,
      isFolderMarker: { $ne: true }, // Exclude folder markers
    })
      .select("-__v")
      .sort({ createdAt: -1 });

    // Process snippets to ensure all required fields are present
    const processedSnippets = snippets.map((snippet) => {
      const processedSnippet = snippet.toObject();
      return {
        ...processedSnippet,
        folderPath: processedSnippet.folderPath || "/",
        title: processedSnippet.title || "Untitled",
        code: processedSnippet.code || "",
        language: processedSnippet.language || "text",
        description: processedSnippet.description || "",
        tags: Array.isArray(processedSnippet.tags) ? processedSnippet.tags : [],
        isPublic: !!processedSnippet.isPublic,
        sharedWith: Array.isArray(processedSnippet.sharedWith)
          ? processedSnippet.sharedWith
          : [],
        canEdit: Array.isArray(processedSnippet.canEdit)
          ? processedSnippet.canEdit
          : [],
      };
    });

    console.log(`Found ${processedSnippets.length} user snippets`);
    // Always return 200 with data, even if empty array
    res.status(200).json(processedSnippets);
  } catch (error) {
    console.error("Error fetching user snippets:", error);
    res.status(500).json({
      message: "Failed to fetch user snippets",
      error: error.message,
    });
  }
});

// Get shared snippets
router.get("/shared", auth, async (req, res) => {
  try {
    console.log("Fetching shared snippets for user:", req.user.email);
    const snippets = await Snippet.find({
      sharedWith: req.user.email,
      isFolderMarker: { $ne: true }, // Exclude folder markers
    })
      .select("-__v")
      .sort({ createdAt: -1 });

    // Process snippets to ensure all required fields are present
    const processedSnippets = snippets.map((snippet) => {
      const processedSnippet = snippet.toObject();
      return {
        ...processedSnippet,
        folderPath: processedSnippet.folderPath || "/",
        title: processedSnippet.title || "Untitled",
        code: processedSnippet.code || "",
        language: processedSnippet.language || "text",
        description: processedSnippet.description || "",
        tags: Array.isArray(processedSnippet.tags) ? processedSnippet.tags : [],
        isPublic: !!processedSnippet.isPublic,
        sharedWith: Array.isArray(processedSnippet.sharedWith)
          ? processedSnippet.sharedWith
          : [],
        canEdit: Array.isArray(processedSnippet.canEdit)
          ? processedSnippet.canEdit
          : [],
        userId: processedSnippet.userId || "",
        userEmail: processedSnippet.userEmail || "",
        userName: processedSnippet.userName || "Unknown",
      };
    });

    console.log(`Found ${processedSnippets.length} shared snippets`);
    res.json(processedSnippets);
  } catch (error) {
    console.error("Error fetching shared snippets:", error);
    res.status(500).json({
      message: "Failed to fetch shared snippets",
      error: error.message,
    });
  }
});

// Get a specific snippet
router.get("/:id", auth, async (req, res) => {
  try {
    console.log("Fetching specific snippet:", req.params.id);
    const snippet = await Snippet.findById(req.params.id).select("-__v");

    if (!snippet) {
      return res.status(404).json({ message: "Snippet not found" });
    }

    // Check if user has access to this snippet
    if (
      !snippet.isPublic &&
      snippet.userId !== req.user.uid &&
      !snippet.sharedWith.includes(req.user.email)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Process snippet to ensure all required fields are present
    const processedSnippet = snippet.toObject();
    const result = {
      ...processedSnippet,
      folderPath: processedSnippet.folderPath || "/",
      title: processedSnippet.title || "Untitled",
      code: processedSnippet.code || "",
      language: processedSnippet.language || "text",
      description: processedSnippet.description || "",
      tags: Array.isArray(processedSnippet.tags) ? processedSnippet.tags : [],
      isPublic: !!processedSnippet.isPublic,
      sharedWith: Array.isArray(processedSnippet.sharedWith)
        ? processedSnippet.sharedWith
        : [],
      canEdit: Array.isArray(processedSnippet.canEdit)
        ? processedSnippet.canEdit
        : [],
      userId: processedSnippet.userId || "",
      userEmail: processedSnippet.userEmail || "",
      userName: processedSnippet.userName || "Unknown",
      editHistory: Array.isArray(processedSnippet.editHistory)
        ? processedSnippet.editHistory
        : [],
    };

    console.log("Snippet found and processed");
    res.json(result);
  } catch (error) {
    console.error("Error fetching specific snippet:", error);
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Invalid snippet ID format" });
    }
    res.status(500).json({
      message: "Failed to fetch snippet",
      error: error.message,
    });
  }
});

// Create a new snippet
router.post("/", auth, async (req, res) => {
  const snippet = new Snippet({
    title: req.body.title,
    code: req.body.code,
    language: req.body.language,
    description: req.body.description,
    tags: req.body.tags,
    folderPath: req.body.folderPath || "/",
    userId: req.user.uid,
    userEmail: req.user.email,
    userName: req.user.name,
    isPublic: req.body.isPublic || false,
    sharedWith: req.body.sharedWith || [],
    canEdit: req.body.canEdit || [],
  });

  try {
    const newSnippet = await snippet.save();
    res.status(201).json(newSnippet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update a snippet
router.put("/:id", auth, async (req, res) => {
  try {
    const snippet = await Snippet.findById(req.params.id);
    if (!snippet) {
      return res.status(404).json({ message: "Snippet not found" });
    }

    // Check if user has edit permission
    if (
      snippet.userId !== req.user.uid &&
      !snippet.canEdit.includes(req.user.email)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Create edit history entry
    const editHistoryEntry = {
      userId: req.user.uid,
      userName: req.user.name,
      userEmail: req.user.email,
      changes: {
        title: req.body.title,
        code: req.body.code,
        language: req.body.language,
        description: req.body.description,
        tags: req.body.tags,
      },
    };

    // Update fields
    const updates = {
      title: req.body.title,
      code: req.body.code,
      language: req.body.language,
      description: req.body.description,
      tags: req.body.tags,
      isPublic: req.body.isPublic,
      $push: { editHistory: editHistoryEntry },
    };

    const updatedSnippet = await Snippet.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    res.json(updatedSnippet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Share a snippet
router.post("/:id/share", auth, async (req, res) => {
  try {
    const snippet = await Snippet.findById(req.params.id);
    if (!snippet) {
      return res.status(404).json({ message: "Snippet not found" });
    }

    // Check if user owns this snippet
    if (snippet.userId !== req.user.uid) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { sharedWith, canEdit } = req.body;

    // Add new users to share with
    const newSharedUsers = sharedWith.filter(
      (email) => !snippet.sharedWith.includes(email)
    );

    // Add new users who can edit
    const newEditUsers = canEdit.filter(
      (email) => !snippet.canEdit.includes(email)
    );

    snippet.sharedWith = [
      ...new Set([...snippet.sharedWith, ...newSharedUsers]),
    ];
    snippet.canEdit = [...new Set([...snippet.canEdit, ...newEditUsers])];

    await snippet.save();

    res.json(snippet);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get edit history
router.get("/:id/history", auth, async (req, res) => {
  try {
    const snippet = await Snippet.findById(req.params.id);
    if (!snippet) {
      return res.status(404).json({ message: "Snippet not found" });
    }

    // Check if user has access to this snippet
    if (
      !snippet.isPublic &&
      snippet.userId !== req.user.uid &&
      !snippet.sharedWith.includes(req.user.email)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json(snippet.editHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a snippet
router.delete("/:id", auth, async (req, res) => {
  try {
    const snippet = await Snippet.findById(req.params.id);

    // If snippet doesn't exist, return 404
    if (!snippet) {
      return res.status(404).json({ message: "Snippet not found" });
    }

    // Check if user owns this snippet
    if (snippet.userId !== req.user.uid) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Use findByIdAndDelete instead of remove
    await Snippet.findByIdAndDelete(req.params.id);

    res.json({ message: "Snippet deleted successfully" });
  } catch (error) {
    console.error("Error deleting snippet:", error);
    // If it's an invalid ObjectId, return 404
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Snippet not found" });
    }
    res
      .status(500)
      .json({ message: "Failed to delete snippet", error: error.message });
  }
});

// Share a folder
router.post("/folders/share", auth, async (req, res) => {
  try {
    const { folderPath, sharedWith, canEdit } = req.body;

    // Update all snippets in the folder
    const result = await Snippet.updateMany(
      {
        folderPath: { $regex: `^${folderPath}` },
        userId: req.user.uid,
      },
      {
        $addToSet: {
          sharedWith: { $each: sharedWith },
          canEdit: { $each: canEdit },
        },
      }
    );

    res.json({
      message: "Folder shared successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a folder
router.delete("/folders/:folderPath(*)", auth, async (req, res) => {
  try {
    const folderPath = "/" + (req.params.folderPath || "");

    // Delete all snippets in the folder and its subfolders
    await Snippet.deleteMany({
      folderPath: { $regex: `^${folderPath}` },
      userId: req.user.uid,
    });

    res.json({ message: "Folder deleted successfully" });
  } catch (error) {
    console.error("Error deleting folder:", error);
    res.status(500).json({ message: error.message });
  }
});

// Rename a folder
router.put("/folders/rename", auth, async (req, res) => {
  try {
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res
        .status(400)
        .json({ message: "Both old and new paths are required" });
    }

    // Update all snippets in the folder and its subfolders
    await Snippet.updateMany(
      {
        folderPath: { $regex: `^${oldPath}` },
        userId: req.user.uid,
      },
      {
        $set: {
          folderPath: function () {
            return this.folderPath.replace(oldPath, newPath);
          },
        },
      }
    );

    res.json({ message: "Folder renamed successfully" });
  } catch (error) {
    console.error("Error renaming folder:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create a new folder
router.post(["/", "/folders"], auth, async (req, res) => {
  try {
    const { path } = req.body;
    console.log("Creating folder with path:", path);

    if (!path) {
      return res.status(400).json({ message: "Folder path is required" });
    }

    // Normalize the path
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    // Validate path format
    if (!/^\/[a-zA-Z0-9-_/]+$/.test(normalizedPath)) {
      return res.status(400).json({
        message:
          "Invalid folder path. Use only letters, numbers, hyphens, and underscores.",
      });
    }

    // Check if folder already exists
    const existingFolder = await Snippet.findOne({
      $or: [
        { folderPath: normalizedPath, userId: req.user.uid },
        { folderPath: normalizedPath, isFolderMarker: true },
      ],
    });

    if (existingFolder) {
      return res.status(400).json({ message: "Folder already exists" });
    }

    // Create an empty snippet as folder marker
    const folderMarker = new Snippet({
      title: ".folder",
      code: "",
      language: "text",
      description: "Folder marker",
      folderPath: normalizedPath,
      userId: req.user.uid,
      userEmail: req.user.email,
      userName: req.user.name || "Unknown",
      isPublic: false,
      isFolderMarker: true,
    });

    await folderMarker.save();
    console.log("Folder created successfully:", normalizedPath);
    res.status(201).json({ path: normalizedPath });
  } catch (error) {
    console.error("Error creating folder:", error);
    if (error.code === 11000) {
      // MongoDB duplicate key error
      res.status(400).json({ message: "Folder already exists" });
    } else {
      res
        .status(500)
        .json({ message: "Failed to create folder", error: error.message });
    }
  }
});

module.exports = router;
