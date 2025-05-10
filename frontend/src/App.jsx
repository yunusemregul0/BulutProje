import { useState, useEffect } from "react";
import { auth } from "./firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import axios from "axios";
import { Toaster, toast } from "react-hot-toast";
import {
  FiShare2,
  FiHeart,
  FiGitBranch,
  FiCopy,
  FiTrash2,
  FiEdit2,
  FiClock,
  FiFolder,
  FiFolderPlus,
  FiUpload,
} from "react-icons/fi";
import SyntaxHighlighter from "react-syntax-highlighter";
import {
  atomOneDark,
  atomOneLight,
  docco,
  github,
  monokai,
  vs,
  xcode,
} from "react-syntax-highlighter/dist/esm/styles/hljs";
import "./App.css";

// Create axios instance with default config
const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || "https://codesnippet-black.vercel.app",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

// Add request interceptor for auth token
api.interceptors.request.use(
  async (config) => {
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken(true);
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // Try to get token from localStorage if no current user
        const storedToken = localStorage.getItem("authToken");
        if (storedToken) {
          config.headers.Authorization = `Bearer ${storedToken}`;
        }
      }
      return config;
    } catch (error) {
      console.error("Error in request interceptor:", error);
      return Promise.reject(error);
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error);

    // Handle CORS errors
    if (error.message === "Network Error") {
      console.error("CORS or Network Error:", error);
      return Promise.reject(
        new Error("Unable to connect to the server. Please try again later.")
      );
    }

    if (!error.response) {
      return Promise.reject(
        new Error("Network error. Please check your connection.")
      );
    }

    // Handle specific HTTP errors
    switch (error.response?.status) {
      case 401:
        toast.error("Session expired. Please log in again.");
        // Sign out user on 401
        signOut(auth).catch(console.error);
        break;
      case 403:
        toast.error("You do not have permission to perform this action.");
        break;
      case 404:
        toast.error("Resource not found.");
        break;
      case 429:
        toast.error("Too many requests. Please try again later.");
        break;
      case 500:
        toast.error("Server error. Please try again later.");
        break;
      default:
        toast.error(
          error.response?.data?.message || "An unexpected error occurred."
        );
    }

    return Promise.reject(error);
  }
);

// Utility functions for file processing
const processUploadedFiles = async (files) => {
  const processedFiles = await Promise.all(
    Array.from(files).map(async (file) => {
      const content = await file.text();
      const extension = file.name.split(".").pop().toLowerCase();

      // Map file extensions to languages
      const languageMap = {
        js: "javascript",
        jsx: "javascript",
        ts: "typescript",
        tsx: "typescript",
        py: "python",
        java: "java",
        cpp: "cpp",
        rb: "ruby",
        go: "go",
        rs: "rust",
        php: "php",
        html: "html",
        css: "css",
        json: "json",
        md: "markdown",
        sql: "sql",
        xml: "xml",
        yaml: "yaml",
        yml: "yaml",
      };

      return {
        name: file.name,
        path: file.webkitRelativePath || file.name,
        content,
        language: languageMap[extension] || "text",
        size: file.size,
      };
    })
  );

  return processedFiles;
};

const createSnippet = async (snippetData) => {
  try {
    const response = await api.post("/api/snippets", snippetData);
    return response.data;
  } catch (error) {
    console.error("Error creating snippet:", error);
    throw error;
  }
};

// Update the API endpoints to match the backend structure
const API_ENDPOINTS = {
  folders: "/api/folders",
  snippets: "/api/snippets",
  mySnippets: "/api/snippets/my-snippets",
  sharedSnippets: "/api/snippets/shared",
};

function App() {
  const [user, setUser] = useState(null);
  const [snippets, setSnippets] = useState([]);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("all");
  const [showHistory, setShowHistory] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState("/");
  const [newFolder, setNewFolder] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [codeTheme, setCodeTheme] = useState("atomOneDark");
  const [showFolderShareModal, setShowFolderShareModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [folderShareEmail, setFolderShareEmail] = useState("");
  const [showFolderRenameModal, setShowFolderRenameModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState(new Set(["/"]));

  const themes = {
    atomOneDark,
    atomOneLight,
    docco,
    github,
    monokai,
    vs,
    xcode,
  };

  useEffect(() => {
    let isMounted = true;

    const handleAuthChange = async (user) => {
      try {
        if (!isMounted) return;

        setUser(user);
        setLoading(true);

        if (user) {
          // Get the ID token and store it
          const token = await user.getIdToken();
          localStorage.setItem("authToken", token);

          await Promise.all([
            fetchFolders().catch(console.error),
            fetchSnippets().catch(console.error),
          ]);
        } else {
          // Clear stored token on logout
          localStorage.removeItem("authToken");
          setSnippets([]);
          setFolders([]);
        }
      } catch (error) {
        console.error("Error in auth change:", error);
        if (isMounted) {
          setError(error.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Set up auth state listener
    const unsubscribe = onAuthStateChanged(auth, handleAuthChange);

    // Check for stored token on mount
    const storedToken = localStorage.getItem("authToken");
    if (storedToken && !user) {
      // If we have a stored token but no user, try to restore the session
      auth.currentUser?.getIdToken(true).catch(console.error);
    }

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [view, currentFolder]);

  useEffect(() => {
    const initializeData = async () => {
      if (user && !isInitialized) {
        try {
          console.log("Initializing data...");
          await Promise.all([fetchFolders(), fetchSnippets()]);
          setIsInitialized(true);
        } catch (error) {
          console.error("Error initializing data:", error);
          toast.error("Failed to load initial data");
        }
      }
    };

    initializeData();
  }, [user]);

  const fetchFolders = async () => {
    try {
      console.log("Fetching folders...");
      const response = await api.get(API_ENDPOINTS.folders);
      console.log("Folders response:", response.data);

      if (response.data && Array.isArray(response.data)) {
        setFolders(response.data);
      } else {
        console.error("Invalid folders data:", response.data);
        setFolders(["/"]);
      }
    } catch (error) {
      console.error("Error fetching folders:", error);
      setFolders(["/"]);
      toast.error("Failed to fetch folders");
    }
  };

  const fetchSnippets = async () => {
    try {
      if (!user) {
        setSnippets([]);
        return;
      }

      const endpoint =
        view === "my-snippets"
          ? API_ENDPOINTS.mySnippets
          : view === "shared"
          ? API_ENDPOINTS.sharedSnippets
          : API_ENDPOINTS.snippets;

      console.log("Fetching snippets from endpoint:", endpoint);

      const params = {
        folderPath: currentFolder === "/" ? undefined : currentFolder,
      };

      console.log("With params:", params);

      const response = await api.get(endpoint, { params });

      if (!response.data) {
        throw new Error("No data received from server");
      }

      console.log("Received snippets:", response.data);

      // Eğer gelen veri bir dizi ve ilk elemanı string ise, bu klasör yollarıdır
      if (
        Array.isArray(response.data) &&
        typeof response.data[0] === "string"
      ) {
        // Sadece mevcut klasörün alt klasörlerini filtrele
        const filteredFolders = response.data.filter((folderPath) => {
          if (currentFolder === "/") {
            return folderPath.split("/").length === 2;
          }
          return (
            folderPath.startsWith(currentFolder) &&
            folderPath.split("/").length === currentFolder.split("/").length + 1
          );
        });

        // Klasörleri işle
        const processedFolders = filteredFolders.map((folderPath) => ({
          _id: `folder-${folderPath}`,
          title: folderPath === "/" ? "Root" : folderPath.split("/").pop(),
          code: "",
          language: "text",
          description: "Folder",
          tags: ["folder"],
          isPublic: false,
          folderPath: folderPath,
          isFolderMarker: true,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || "Unknown",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        setSnippets(processedFolders);
        return;
      }

      // Normal snippet işleme
      const processedSnippets = response.data
        .map((snippet) => {
          if (snippet.isFolderMarker) return null;
          if (snippet.folderPath !== currentFolder) return null;

          const isShared =
            Array.isArray(snippet.sharedWith) &&
            snippet.sharedWith.includes(user.email);

          return {
            _id: snippet._id,
            title: snippet.title || "Untitled",
            code: snippet.code || "",
            language: snippet.language || "text",
            description: snippet.description || "",
            tags: Array.isArray(snippet.tags) ? snippet.tags : [],
            isPublic: !!snippet.isPublic,
            sharedWith: Array.isArray(snippet.sharedWith)
              ? snippet.sharedWith
              : [],
            canEdit: Array.isArray(snippet.canEdit) ? snippet.canEdit : [],
            folderPath: snippet.folderPath || "/",
            userId: snippet.userId || "",
            userEmail: snippet.userEmail || "",
            userName: snippet.userName || "Unknown",
            createdAt: snippet.createdAt || new Date().toISOString(),
            updatedAt: snippet.updatedAt || new Date().toISOString(),
            isShared: isShared,
            isOwner: snippet.userId === user.uid,
          };
        })
        .filter(Boolean);

      console.log("Processed snippets:", processedSnippets);
      setSnippets(processedSnippets);
    } catch (error) {
      console.error("Error fetching snippets:", error);
      setSnippets([]);
      if (!error.message.includes("Network error")) {
        toast.error("Failed to fetch snippets. Please try again.");
      }
    }
  };

  // Update the buildFolderTree function to properly filter out folder markers and improve the folder tree rendering
  const buildFolderTree = (folders, snippets) => {
    const tree = [];
    const folderMap = new Map();

    // First, create the root folder
    const rootFolder = {
      type: "folder",
      name: "Root",
      path: "/",
      children: [],
    };
    tree.push(rootFolder);
    folderMap.set("/", rootFolder);

    // Process all folders
    folders.forEach((folderPath) => {
      if (folderPath === "/") return; // Skip root as it's already added

      const parts = folderPath.split("/").filter(Boolean);
      let currentPath = "";

      parts.forEach((part) => {
        currentPath += "/" + part;

        if (!folderMap.has(currentPath)) {
          const folder = {
            type: "folder",
            name: part,
            path: currentPath,
            children: [],
          };

          // Find parent folder
          const parentPath =
            currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";
          const parentFolder = folderMap.get(parentPath);

          if (parentFolder) {
            parentFolder.children.push(folder);
          }

          folderMap.set(currentPath, folder);
        }
      });
    });

    // Add snippets to their respective folders, excluding folder markers
    snippets.forEach((snippet) => {
      // Skip folder markers and snippets without a folder path
      if (snippet.isFolderMarker || !snippet.folderPath) return;

      const folderPath = snippet.folderPath;
      const folder = folderMap.get(folderPath);

      if (folder) {
        folder.children.push({
          type: "snippet",
          name: snippet.title || "Untitled",
          path: folderPath,
          ...snippet,
        });
      }
    });

    return tree;
  };

  // Update the renderFolderTree function to handle collapsible folders
  const renderFolderTree = (tree, level = 0) => {
    return (
      <div className="folder-tree" style={{ marginLeft: `${level * 20}px` }}>
        {tree.map((item) => {
          const isFolder = item.type === "folder";
          const isCurrentFolder = currentFolder === item.path;
          const hasChildren = item.children && item.children.length > 0;
          const isExpanded = expandedFolders.has(item.path);

          return (
            <div key={item.path} className="folder-item">
              <div
                className={`folder-name ${isCurrentFolder ? "active" : ""}`}
                onClick={() => {
                  if (isFolder) {
                    setCurrentFolder(item.path);
                    setExpandedFolders((prev) => {
                      const newSet = new Set(prev);
                      if (newSet.has(item.path)) {
                        newSet.delete(item.path);
                      } else {
                        newSet.add(item.path);
                      }
                      return newSet;
                    });
                  }
                }}
              >
                {isFolder ? (
                  <>
                    <FiFolder />
                    <span>{item.name}</span>
                    {hasChildren && (
                      <span className="folder-toggle">
                        {isExpanded ? "▼" : "▶"}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <FiGitBranch />
                    <span>{item.name}</span>
                  </>
                )}
              </div>
              {hasChildren &&
                isExpanded &&
                renderFolderTree(item.children, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  // Update the handleCreateFolder function
  const handleCreateFolder = async (folderName) => {
    try {
      if (!folderName || typeof folderName !== "string") {
        toast.error("Please enter a valid folder name");
        return;
      }

      const sanitizedName = folderName.trim().replace(/[^a-zA-Z0-9-_]/g, "-");
      if (!sanitizedName) {
        toast.error("Folder name cannot be empty");
        return;
      }

      // Construct the full path based on current folder
      const parentPath = currentFolder === "/" ? "" : currentFolder;
      const fullPath = `${parentPath}/${sanitizedName}`;

      console.log("Creating folder with path:", fullPath);
      const response = await api.post(API_ENDPOINTS.folders, {
        path: fullPath,
        title: ".folder",
        code: "Null",
        language: "text",
        description: "Folder marker",
        folderPath: fullPath,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || "Unknown",
        isPublic: false,
        isFolderMarker: true,
      });

      if (response.status === 201) {
        toast.success("Folder created successfully");
        await fetchFolders();
        setCurrentFolder(fullPath);
        setNewFolder("");
        setShowNewFolderInput(false);
        setExpandedFolders((prev) => new Set([...prev, fullPath]));
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      const message =
        error.response?.data?.message || "Failed to create folder";
      toast.error(message);
    }
  };

  const handleCreateFolderClick = async () => {
    try {
      if (!newFolder) {
        toast.error("Please enter a folder name");
        return;
      }
      await handleCreateFolder(newFolder);
    } catch (error) {
      console.error("Error in folder creation:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);

      // Validate required fields
      if (!title.trim()) {
        toast.error("Title is required");
        return;
      }
      if (!code.trim()) {
        toast.error("Code is required");
        return;
      }
      if (!user) {
        toast.error("You must be logged in to save snippets");
        return;
      }

      const snippetData = {
        title: title.trim(),
        code: code.trim(),
        language: language || "text",
        description: description.trim(),
        folderPath: currentFolder,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        isPublic,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || "Unknown",
      };

      if (isEditing) {
        await api.put(`${API_ENDPOINTS.snippets}/${editingId}`, snippetData);
        toast.success("Snippet updated successfully!");
      } else {
        await api.post(API_ENDPOINTS.snippets, snippetData);
        toast.success("Snippet created successfully!");
      }

      setTitle("");
      setCode("");
      setLanguage("javascript");
      setDescription("");
      setTags("");
      setIsPublic(false);
      setIsEditing(false);
      setEditingId(null);
      await fetchSnippets();
    } catch (error) {
      console.error("Error saving snippet:", error);
      toast.error(error.response?.data?.message || "Failed to save snippet");
    }
  };

  const handleShare = async (snippetId) => {
    try {
      if (!shareEmail.trim()) {
        return toast.error("Please enter an email address");
      }

      const response = await api.post(
        `${API_ENDPOINTS.snippets}/${snippetId}/share`,
        {
          sharedWith: [shareEmail],
          canEdit: [shareEmail], // Give edit permission to shared user
        }
      );

      if (response.status === 200 || response.status === 201) {
        toast.success("Snippet shared successfully!");
        setShareEmail("");
        // Snippet listesini güncelle
        await fetchSnippets();
      } else {
        throw new Error("Failed to share snippet");
      }
    } catch (error) {
      console.error("Error sharing snippet:", error);
      toast.error(error.response?.data?.message || "Failed to share snippet");
    }
  };

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  const handleDelete = async (id) => {
    if (!id) {
      toast.error("Invalid snippet ID");
      return;
    }

    try {
      const confirmed = window.confirm(
        "Are you sure you want to delete this snippet?"
      );
      if (!confirmed) return;

      const response = await api.delete(`/api/snippets/${id}`);

      if (response.status === 200) {
        // Update local state first
        setSnippets((prevSnippets) =>
          prevSnippets.filter((snippet) => snippet._id !== id)
        );
        toast.success("Snippet deleted successfully!");
      } else {
        throw new Error("Failed to delete snippet");
      }
    } catch (error) {
      console.error("Error deleting snippet:", error);

      // If it's a 404 or any other error, still remove from local state
      setSnippets((prevSnippets) =>
        prevSnippets.filter((snippet) => snippet._id !== id)
      );

      // Show appropriate error message
      const errorMessage =
        error.response?.data?.message || "Failed to delete snippet";
      toast.error(errorMessage);
    }
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Welcome back!");
    } catch (error) {
      toast.error(error.message || "Failed to login");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out successfully!");
    } catch (error) {
      toast.error(error.message || "Failed to logout");
    }
  };

  const fetchEditHistory = async (snippetId) => {
    try {
      const response = await api.get(`/api/snippets/${snippetId}/history`);
      setEditHistory(response.data);
      setShowHistory(true);
    } catch (error) {
      toast.error(error.message || "Failed to fetch edit history");
    }
  };

  // Add new folder management functions
  const handleFolderShare = async () => {
    try {
      if (!folderShareEmail.trim()) {
        return toast.error("Please enter an email address");
      }

      await api.post("/snippets/folders/share", {
        folderPath: selectedFolder,
        sharedWith: [folderShareEmail],
        canEdit: [folderShareEmail],
      });

      toast.success("Folder shared successfully!");
      setFolderShareEmail("");
      setShowFolderShareModal(false);
    } catch (error) {
      toast.error(error.message || "Failed to share folder");
    }
  };

  const handleFolderRename = async () => {
    try {
      if (!newFolderName.trim()) {
        return toast.error("Please enter a new folder name");
      }

      const newPath =
        selectedFolder.substring(0, selectedFolder.lastIndexOf("/") + 1) +
        newFolderName;

      await api.put("/api/folders/rename", {
        oldPath: selectedFolder,
        newPath,
      });

      toast.success("Folder renamed successfully!");
      setShowFolderRenameModal(false);
      setNewFolderName("");
      fetchFolders();
      if (currentFolder.startsWith(selectedFolder)) {
        setCurrentFolder(newPath);
      }
    } catch (error) {
      toast.error(error.message || "Failed to rename folder");
    }
  };

  const handleFolderUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsProcessing(true);
      const processedFiles = await processUploadedFiles(files);
      setUploadedFiles(processedFiles);
      setShowUploadModal(true);
    } catch (error) {
      console.error("Error processing files:", error);
      toast.error("Failed to process files");
    } finally {
      setIsProcessing(false);
    }
  };

  const saveUploadedFiles = async () => {
    try {
      setIsProcessing(true);
      const newFolders = new Set();

      // Extract unique folder paths
      uploadedFiles.forEach((file) => {
        const folderPath = file.path.split("/").slice(0, -1).join("/");
        if (folderPath) newFolders.add(folderPath);
      });

      // Create folders first
      for (const folderPath of newFolders) {
        const fullPath = `/${folderPath}`;
        await api.post(API_ENDPOINTS.folders, {
          path: fullPath,
          isFolderMarker: true,
          title: ".folder",
          code: "Folder marker",
          language: "text",
          description: "Folder marker",
          folderPath: fullPath,
          tags: ["folder"],
          isPublic: false,
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || "Unknown",
        });
      }

      // Then create snippets
      for (const file of uploadedFiles) {
        const folderPath = file.path.split("/").slice(0, -1).join("/");
        const snippetData = {
          title: file.name,
          code: file.content || "// Empty file",
          language: file.language || "text",
          folderPath: folderPath ? `/${folderPath}` : "/",
          isPublic: false,
          description: `Uploaded file: ${file.path}`,
          tags: ["uploaded", file.language || "text"],
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName || "Unknown",
        };

        // Ensure all required fields are present
        if (!snippetData.code) {
          snippetData.code = "// Empty file";
        }
        if (!snippetData.language) {
          snippetData.language = "text";
        }
        if (!snippetData.title) {
          snippetData.title = "Untitled";
        }

        await createSnippet(snippetData);
      }

      // Refresh folders and snippets
      await Promise.all([fetchFolders(), fetchSnippets()]);

      // Expand all newly created folders
      const newExpandedFolders = new Set(expandedFolders);
      newFolders.forEach((folder) => {
        newExpandedFolders.add(`/${folder}`);
      });
      setExpandedFolders(newExpandedFolders);

      setShowUploadModal(false);
      setUploadedFiles([]);
      toast.success("Files uploaded successfully!");
    } catch (error) {
      console.error("Error saving files:", error);
      toast.error(error.response?.data?.message || "Failed to save files");
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSnippetActions = (snippet) => {
    const canEdit =
      snippet.userId === user?.uid ||
      (snippet.canEdit &&
        Array.isArray(snippet.canEdit) &&
        snippet.canEdit.includes(user?.email));
    const isOwner = snippet.userId === user?.uid;

    return (
      <div className="snippet-actions">
        <button
          onClick={() => handleCopy(snippet.code || "")}
          className="btn btn-icon"
          title="Copy code"
        >
          <FiCopy />
        </button>

        {canEdit && (
          <button
            onClick={() => {
              setTitle(snippet.title || "");
              setCode(snippet.code || "");
              setLanguage(snippet.language || "text");
              setDescription(snippet.description || "");
              setTags((snippet.tags || []).join(", "));
              setIsPublic(!!snippet.isPublic);
              setIsEditing(true);
              setEditingId(snippet._id);
            }}
            className="btn btn-icon"
            title="Edit"
          >
            <FiEdit2 />
          </button>
        )}

        {isOwner && (
          <>
            <button
              onClick={() => handleDelete(snippet._id)}
              className="btn btn-icon danger"
              title="Delete"
            >
              <FiTrash2 />
            </button>
            <div className="share-container">
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="Enter email to share"
                className="share-input"
              />
              <button
                onClick={() => handleShare(snippet._id)}
                className="btn btn-icon"
                title="Share"
                disabled={!shareEmail.trim()}
              >
                <FiShare2 />
              </button>
            </div>
          </>
        )}

        <button
          onClick={() => fetchEditHistory(snippet._id)}
          className="btn btn-icon"
          title="View edit history"
        >
          <FiClock />
        </button>
      </div>
    );
  };

  // Update the new folder input styles
  const newFolderInputStyles = {
    backgroundColor: "#2d2d2d",
    color: "#ffffff",
    border: "1px solid #404040",
    padding: "8px 12px",
    borderRadius: "4px",
    width: "100%",
    marginBottom: "8px",
  };

  const renderSnippetCard = (snippet) => {
    if (!snippet || !snippet._id) return null;

    // Eğer bu bir klasör ise, farklı bir görünüm göster
    if (snippet.isFolderMarker) {
      return (
        <div key={snippet._id} className="snippet-card folder-card">
          <div className="snippet-header">
            <h3>
              <FiFolder /> {snippet.title}
            </h3>
            <div className="snippet-badges">
              <span className="folder-badge">Folder</span>
            </div>
          </div>
          <div className="snippet-meta">
            <span>Path: {snippet.folderPath}</span>
          </div>
          <div className="snippet-actions">
            <button
              onClick={() => setCurrentFolder(snippet.folderPath)}
              className="btn btn-primary"
            >
              Open Folder
            </button>
          </div>
        </div>
      );
    }

    // Normal snippet görünümü
    return (
      <div
        key={snippet._id}
        className={`snippet-card ${snippet.isShared ? "shared-snippet" : ""}`}
      >
        <div className="snippet-header">
          <h3>{snippet.title || "Untitled"}</h3>
          <div className="snippet-badges">
            <span className="language-badge">{snippet.language || "text"}</span>
            {snippet.isPublic && <span className="public-badge">Public</span>}
            {snippet.isShared && <span className="shared-badge">Shared</span>}
            {!snippet.isOwner && (
              <span className="shared-with-me-badge">Shared with me</span>
            )}
          </div>
        </div>

        <div className="snippet-meta">
          <span>By: {snippet.userName || "Unknown"}</span>
          <span>{new Date(snippet.createdAt).toLocaleDateString()}</span>
        </div>

        {snippet.description && (
          <p className="snippet-description">{snippet.description}</p>
        )}

        <div className="code-container">
          <SyntaxHighlighter
            language={snippet.language || "text"}
            style={themes[codeTheme]}
            customStyle={{
              padding: "1rem",
              borderRadius: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            {snippet.code || ""}
          </SyntaxHighlighter>
        </div>

        {snippet.tags &&
          Array.isArray(snippet.tags) &&
          snippet.tags.length > 0 && (
            <div className="snippet-tags">
              {snippet.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          )}

        {renderSnippetActions(snippet)}
      </div>
    );
  };

  // Update the snippets list section to use the new renderSnippetCard function
  const renderSnippetsList = () => {
    if (view === "my-snippets") {
      // Group snippets by folder and sort folders
      const groupedSnippets = snippets.reduce((acc, snippet) => {
        const folder = snippet.folderPath || "/";
        if (!acc[folder]) acc[folder] = [];
        acc[folder].push(snippet);
        return acc;
      }, {});

      return Object.entries(groupedSnippets)
        .sort(([folderA], [folderB]) => folderA.localeCompare(folderB))
        .map(([folder, folderSnippets]) => {
          if (folderSnippets.length === 0) return null;

          const folderDisplay =
            folder === "/" ? "Root" : folder.split("/").pop();
          const fullPath = folder === "/" ? "Root" : folder;

          return (
            <div key={folder} className="folder-group">
              <div className="folder-group-header">
                <div className="folder-group-title">
                  <FiFolder />
                  <h3>{folderDisplay}</h3>
                  <span className="folder-path">{fullPath}</span>
                </div>
                <div className="folder-group-actions">
                  <span className="snippet-count">
                    {folderSnippets.length} snippet
                    {folderSnippets.length !== 1 ? "s" : ""}
                  </span>
                  <button
                    onClick={() => setCurrentFolder(folder)}
                    className="btn btn-outline btn-sm"
                  >
                    Open Folder
                  </button>
                </div>
              </div>
              <div className="snippets-grid">
                {folderSnippets.map(renderSnippetCard)}
              </div>
            </div>
          );
        });
    } else {
      // Regular snippet display for other views
      return snippets.map(renderSnippetCard);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading your snippets...</p>
        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button
              onClick={() => {
                setError(null);
                if (user) {
                  Promise.all([
                    fetchFolders().catch(console.error),
                    fetchSnippets().catch(console.error),
                  ]).finally(() => setLoading(false));
                } else {
                  setLoading(false);
                }
              }}
              className="btn btn-primary"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      <Toaster position="top-right" />

      <nav className="navbar">
        <div className="nav-brand">CodeSnippet</div>
        <div className="nav-menu">
          {user && (
            <>
              <button
                className={`btn btn-text ${view === "all" ? "active" : ""}`}
                onClick={() => {
                  setView("all");
                  fetchSnippets();
                }}
              >
                All Snippets
              </button>
              <button
                className={`btn btn-text ${
                  view === "my-snippets" ? "active" : ""
                }`}
                onClick={() => {
                  setView("my-snippets");
                  fetchSnippets();
                }}
              >
                My Snippets
              </button>
              <button
                className={`btn btn-text ${view === "shared" ? "active" : ""}`}
                onClick={() => {
                  setView("shared");
                  fetchSnippets();
                }}
              >
                Shared with Me
              </button>
            </>
          )}
        </div>
        <div className="nav-auth">
          {user ? (
            <div className="user-info">
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="user-avatar"
              />
              <span>{user.displayName}</span>
              <button onClick={handleLogout} className="btn btn-outline">
                Logout
              </button>
            </div>
          ) : (
            <button onClick={handleLogin} className="btn btn-primary">
              Login with Google
            </button>
          )}
        </div>
      </nav>

      <main className="main-content">
        {error && <div className="error-message">{error}</div>}

        {user ? (
          <div className="content-wrapper">
            <div className="folder-sidebar">
              <div className="folder-sidebar-header">
                <h3>Folders</h3>
                <div className="folder-actions">
                  <label className="btn btn-icon" title="Upload local folder">
                    <input
                      type="file"
                      webkitdirectory="true"
                      directory="true"
                      multiple
                      style={{ display: "none" }}
                      onChange={handleFolderUpload}
                    />
                    <FiUpload />
                  </label>
                  <button
                    onClick={() => {
                      setSelectedFolder(currentFolder);
                      setShowNewFolderInput(true);
                    }}
                    className="btn btn-icon"
                    title="Create new folder"
                  >
                    <FiFolderPlus />
                  </button>
                </div>
              </div>

              <div className="folder-tree">
                {renderFolderTree(buildFolderTree(folders, snippets))}
              </div>

              {showNewFolderInput && (
                <div className="new-folder-input">
                  <input
                    type="text"
                    value={newFolder}
                    onChange={(e) => setNewFolder(e.target.value)}
                    placeholder="New folder name"
                    style={newFolderInputStyles}
                    autoFocus
                  />
                  <div className="folder-input-actions">
                    <button
                      onClick={handleCreateFolderClick}
                      className="btn btn-primary"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => {
                        setNewFolder("");
                        setShowNewFolderInput(false);
                      }}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="content-main">
              <section className="snippet-form">
                <h2>{isEditing ? "Edit Snippet" : "Create New Snippet"}</h2>
                <form onSubmit={handleSubmit}>
                  <div className="current-folder">
                    <FiFolder />
                    Current folder:{" "}
                    {currentFolder === "/" ? "Root" : currentFolder}
                  </div>
                  <div className="form-group">
                    <select
                      className="folder-select"
                      value={currentFolder}
                      onChange={(e) => setCurrentFolder(e.target.value)}
                    >
                      <option value="/">Root</option>
                      {folders
                        .filter((folder) => folder !== "/")
                        .map((folder) => (
                          <option key={folder} value={folder}>
                            {folder}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Snippet Title"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                        <option value="ruby">Ruby</option>
                        <option value="go">Go</option>
                        <option value="rust">Rust</option>
                        <option value="php">PHP</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder="Tags (comma-separated)"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Description (optional)"
                    />
                  </div>
                  <div className="form-group">
                    <textarea
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Your code here..."
                      required
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group checkbox">
                      <input
                        type="checkbox"
                        id="isPublic"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                      />
                      <label htmlFor="isPublic">Make Public</label>
                    </div>
                    <div className="form-group">
                      <select
                        value={codeTheme}
                        onChange={(e) => setCodeTheme(e.target.value)}
                      >
                        <option value="atomOneDark">Atom One Dark</option>
                        <option value="atomOneLight">Atom One Light</option>
                        <option value="docco">Docco</option>
                        <option value="github">GitHub</option>
                        <option value="monokai">Monokai</option>
                        <option value="vs">Visual Studio</option>
                        <option value="xcode">Xcode</option>
                      </select>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary">
                        {isEditing ? "Update" : "Save"}
                      </button>
                      {isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            setEditingId(null);
                            setTitle("");
                            setCode("");
                            setLanguage("javascript");
                            setDescription("");
                            setTags("");
                            setIsPublic(false);
                          }}
                          className="btn btn-secondary"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              </section>

              <section className="snippets-list">
                <h2>
                  {view === "my-snippets"
                    ? "My Snippets"
                    : view === "shared"
                    ? "Shared with Me"
                    : "All Snippets"}
                  {currentFolder !== "/" && ` in ${currentFolder}`}
                </h2>
                <div className="snippets-grid">{renderSnippetsList()}</div>
              </section>
            </div>
          </div>
        ) : (
          <div className="login-prompt">
            <h2>Welcome to CodeSnippet</h2>
            <p>Share and manage your code snippets with ease.</p>
            <button onClick={handleLogin} className="btn btn-primary">
              Login with Google
            </button>
          </div>
        )}
      </main>

      {/* Add folder share modal */}
      {showFolderShareModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Share Folder</h2>
            <p>Share folder: {selectedFolder}</p>
            <input
              type="email"
              value={folderShareEmail}
              onChange={(e) => setFolderShareEmail(e.target.value)}
              placeholder="Enter email to share with"
            />
            <div className="modal-actions">
              <button onClick={handleFolderShare} className="btn btn-primary">
                Share
              </button>
              <button
                onClick={() => {
                  setShowFolderShareModal(false);
                  setFolderShareEmail("");
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add folder rename modal */}
      {showFolderRenameModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Rename Folder</h2>
            <p>Current name: {selectedFolder.split("/").pop()}</p>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter new folder name"
            />
            <div className="modal-actions">
              <button onClick={handleFolderRename} className="btn btn-primary">
                Rename
              </button>
              <button
                onClick={() => {
                  setShowFolderRenameModal(false);
                  setNewFolderName("");
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="history-modal">
          <div className="history-content">
            <h2>Edit History</h2>
            <div className="history-list">
              {editHistory.map((edit, index) => (
                <div key={index} className="history-item">
                  <div className="history-header">
                    <span>Edited by: {edit.userName}</span>
                    <span>{new Date(edit.editedAt).toLocaleString()}</span>
                  </div>
                  <div className="history-changes">
                    {edit.changes.title && <p>Title: {edit.changes.title}</p>}
                    {edit.changes.language && (
                      <p>Language: {edit.changes.language}</p>
                    )}
                    {edit.changes.description && (
                      <p>Description: {edit.changes.description}</p>
                    )}
                    {edit.changes.code && (
                      <div className="code-preview">
                        <SyntaxHighlighter
                          language={edit.changes.language || "text"}
                          style={themes[codeTheme]}
                          customStyle={{
                            padding: "1rem",
                            borderRadius: "0.5rem",
                            fontSize: "0.9rem",
                          }}
                        >
                          {edit.changes.code}
                        </SyntaxHighlighter>
                      </div>
                    )}
                    {edit.changes.tags && edit.changes.tags.length > 0 && (
                      <div className="tags-preview">
                        <p>Tags: {edit.changes.tags.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowHistory(false)}
              className="btn btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showUploadModal && (
        <div className="modal">
          <div className="modal-content upload-modal">
            <h2>Upload Files</h2>
            <div className="upload-list">
              {uploadedFiles.map((file, index) => (
                <div key={index} className="upload-item">
                  <div className="upload-item-header">
                    <span className="file-name">{file.path}</span>
                    <span className="file-size">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <div className="code-preview">
                    <SyntaxHighlighter
                      language={file.language}
                      style={themes[codeTheme]}
                      customStyle={{
                        padding: "0.5rem",
                        borderRadius: "0.25rem",
                        fontSize: "0.8rem",
                        maxHeight: "100px",
                      }}
                    >
                      {file.content.slice(0, 500) +
                        (file.content.length > 500 ? "..." : "")}
                    </SyntaxHighlighter>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button
                onClick={saveUploadedFiles}
                className="btn btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? "Processing..." : "Save All Files"}
              </button>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadedFiles([]);
                }}
                className="btn btn-secondary"
                disabled={isProcessing}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
