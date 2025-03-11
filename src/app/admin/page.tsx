// src/app/admin/page.tsx
"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import Image from "next/image";
import styles from "./admin.module.css";
import { LuUpload, LuTrash2, LuLogOut, LuImage, LuRefreshCw, LuCheck, LuLoaderCircle } from "react-icons/lu";

// Define type interfaces
interface GalleryImage {
  src: string;
  width: number;
  height: number;
}

interface ApiResponse {
  success: boolean;
  message?: string;
}

interface ImagesResponse extends ApiResponse {
  images: GalleryImage[];
}

interface UploadResponse extends ApiResponse {
  filePath?: string;
  width?: number;
  height?: number;
}

type Category = "nature" | "wildlife" | "architecture" | "travel";
type TabType = "upload" | "manage";
type MessageType = "success" | "error" | "info" | "";

export default function AdminDashboard() {
  // State management
  const [category, setCategory] = useState<Category>("nature");
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [messageType, setMessageType] = useState<MessageType>("");
  const [password, setPassword] = useState<string>("");
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>("upload");
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [triggeringDeploy, setTriggeringDeploy] = useState<boolean>(false);
  const [deployStatus, setDeployStatus] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [selectedFileName, setSelectedFileName] = useState<string>("");

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for stored authentication on component mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('adminAuthenticated');
    if (storedAuth === 'true') {
      setAuthenticated(true);
    }
  }, []);

  // Authentication handler
  const authenticate = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;

    if (password === adminPassword) {
      setAuthenticated(true);
      localStorage.setItem('adminAuthenticated', 'true');
      setMessage("");
      setMessageType("");
    } else {
      setMessage("Incorrect password");
      setMessageType("error");
    }
  };

  // Logout handler
  const handleLogout = (): void => {
    setAuthenticated(false);
    localStorage.removeItem('adminAuthenticated');
    setPassword("");
  };

  // Tab change handler
  const handleTabChange = (tab: TabType): void => {
    setActiveTab(tab);
    setMessage("");
    setMessageType("");

    if (tab === "manage") {
      setImages([]);
      setLoading(true);
      fetchImages(category);
    }
  };

  // Category change handler
  const changeCategory = (newCategory: Category): void => {
    setCategory(newCategory);
    setMessage("");
    setMessageType("");

    if (activeTab === "manage") {
      setImages([]);
      setLoading(true);
      fetchImages(newCategory);
    }
  };

  // Image fetching function
  const fetchImages = async (categoryToFetch: Category): Promise<void> => {
    try {
      setLoading(true);
      setMessage("");
      setMessageType("");

      const response = await fetch(`/api/images?category=${categoryToFetch}`);

      if (!response.ok) {
        const text = await response.text();
        console.error("API error:", response.status, text);
        setMessage(`Error: Server returned ${response.status}`);
        setMessageType("error");
        setImages([]);
        return;
      }

      const data = (await response.json()) as ImagesResponse;

      if (data.success) {
        setImages(data.images || []);
        if (data.images?.length === 0) {
          setMessage(`No images found in ${categoryToFetch} category`);
          setMessageType("info");
        }
      } else {
        setMessage(`Error: ${data.message || "Unknown error"}`);
        setMessageType("error");
        setImages([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setMessage(
        `Error: ${
          error instanceof Error ? error.message : "Failed to fetch images"
        }`
      );
      setMessageType("error");
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  // File selection handler
  const handleFileSelect = (): void => {
    if (fileInputRef.current?.files?.length) {
      setSelectedFileName(fileInputRef.current.files[0].name);
    } else {
      setSelectedFileName("");
    }
  };

  // Upload handler
  const handleUpload = async (
    event: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    event.preventDefault();

    if (!fileInputRef.current?.files?.length) {
      setMessage("Please select a file");
      setMessageType("error");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      setMessage(`Uploading to ${category}...`);
      setMessageType("info");

      const file = fileInputRef.current.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      setUploadProgress(30);
      
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(70);
      
      const data = (await response.json()) as UploadResponse;

      if (data.success) {
        setUploadProgress(90);
        setMessage(`Successfully uploaded to ${category}!`);
        setMessageType("success");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
          setSelectedFileName("");
        }
        
        // Trigger deploy after successful upload
        triggerDeploy();

        // If we're viewing the same category we just uploaded to, refresh the images
        if (activeTab === "manage") {
          fetchImages(category);
        }
      } else {
        setMessage(`Error: ${data.message || "Upload failed"}`);
        setMessageType("error");
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage(
        `Error: ${error instanceof Error ? error.message : "Upload failed"}`
      );
      setMessageType("error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Delete handler
  const handleDelete = async (imageSrc: string): Promise<void> => {
    if (
      !confirm(
        `Are you sure you want to delete this image from the ${category} category?`
      )
    ) {
      return;
    }

    try {
      setDeleting(true);
      setMessage(`Deleting image from ${category}...`);
      setMessageType("info");

      const response = await fetch("/api/images", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          src: imageSrc,
          category,
        }),
      });

      const data = (await response.json()) as ApiResponse;

      if (data.success) {
        setMessage("Image deleted successfully");
        setMessageType("success");
        
        // Trigger deploy after successful deletion
        triggerDeploy();

        // Refresh the image list
        fetchImages(category);
      } else {
        setMessage(`Error: ${data.message || "Delete failed"}`);
        setMessageType("error");
      }
    } catch (error) {
      console.error("Delete error:", error);
      setMessage(
        `Error: ${error instanceof Error ? error.message : "Delete failed"}`
      );
      setMessageType("error");
    } finally {
      setDeleting(false);
    }
  };
  
  // Trigger Cloudflare Pages deployment
  const triggerDeploy = async (): Promise<void> => {
    try {
      setTriggeringDeploy(true);
      setDeployStatus("Triggering site deployment...");
      
      const response = await fetch("/api/webhook/trigger-deploy", {
        method: "POST",
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDeployStatus("Site deployment started! Changes will be live in a few minutes.");
        
        // Update the message to include deployment info
        setMessage(prev => `${prev} Site deployment triggered successfully.`);
      } else {
        console.error("Deploy trigger error:", data.message);
        setDeployStatus(`Failed to trigger deployment: ${data.message}`);
      }
    } catch (error) {
      console.error("Deploy trigger error:", error);
      setDeployStatus(`Error triggering deployment: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      // Keep triggering deploy status visible but mark the process as done
      setTriggeringDeploy(false);
      
      // Clear deploy status after 10 seconds
      setTimeout(() => {
        setDeployStatus("");
      }, 10000);
    }
  };

  // Refresh images handler
  const handleRefresh = (): void => {
    if (activeTab === "manage") {
      setImages([]);
      setLoading(true);
      fetchImages(category);
    }
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Photo Manager Dashboard</h1>

          {!authenticated ? (
            <form onSubmit={authenticate} className={styles.authForm}>
              <div className={styles.authPanel}>
                <p className={styles.description}>
                  Please enter your admin password to access the dashboard
                </p>
                <div className={styles.formGroup}>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Admin Password"
                    required
                  />
                </div>
                <button type="submit" className={styles.button}>
                  Login
                </button>

                {messageType && (
                  <div className={`${styles.message} ${styles[messageType]}`}>
                    {messageType === "error" && <LuLoaderCircle />}
                    {messageType === "success" && <LuCheck />}
                    {messageType === "info" && <LuLoaderCircle />}
                    <span>{message}</span>
                  </div>
                )}
              </div>
            </form>
          ) : (
            <>
              <div className={styles.header}>
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tabButton} ${
                      activeTab === "upload" ? styles.activeTab : ""
                    }`}
                    onClick={() => handleTabChange("upload")}
                  >
                    <LuUpload /> Upload Photos
                  </button>
                  <button
                    className={`${styles.tabButton} ${
                      activeTab === "manage" ? styles.activeTab : ""
                    }`}
                    onClick={() => handleTabChange("manage")}
                  >
                    <LuImage /> Manage Photos
                  </button>
                </div>
                <button
                  onClick={handleLogout}
                  className={styles.logoutButton}
                >
                  <LuLogOut /> Logout
                </button>
              </div>

              {deployStatus && (
                <div className={`${styles.deployStatus} ${triggeringDeploy ? styles.deploying : styles.deployed}`}>
                  <LuRefreshCw className={triggeringDeploy ? styles.spinning : ''} />
                  <span>{deployStatus}</span>
                </div>
              )}

              <div className={styles.categorySelector}>
                <p className={styles.labelHeading}>
                  Select category:
                </p>
                <div className={styles.categoryButtons}>
                  {["nature", "wildlife", "architecture", "travel"].map(
                    (cat) => (
                      <button
                        key={cat}
                        onClick={() => changeCategory(cat as Category)}
                        className={`${styles.categoryButton} ${
                          category === cat
                            ? styles.activeCategoryButton
                            : ""
                        }`}
                        disabled={uploading || deleting || triggeringDeploy}
                      >
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </button>
                    )
                  )}
                </div>
              </div>

              {activeTab === "upload" ? (
                <div className={styles.uploadPanel}>
                  <p className={styles.description}>
                    Upload new images to the <strong>{category}</strong> category
                  </p>

                  <form onSubmit={handleUpload} className={styles.uploadForm}>
                    <div className={styles.formGroup}>
                      <label className={styles.fileInputLabel}>
                        <div className={styles.fileInputButton}>
                          <LuUpload />
                          <span>Select Image</span>
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className={styles.fileInput}
                          onChange={handleFileSelect}
                          required
                        />
                        {selectedFileName && (
                          <div className={styles.selectedFile}>
                            <span>{selectedFileName}</span>
                          </div>
                        )}
                      </label>
                    </div>

                    {uploadProgress > 0 && (
                      <div className={styles.progressContainer}>
                        <div 
                          className={styles.progressBar} 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className={styles.button}
                      disabled={uploading || triggeringDeploy || !selectedFileName}
                    >
                      {uploading ? "Uploading..." : triggeringDeploy ? "Deploying..." : "Upload Photo"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className={styles.managePanel}>
                  <div className={styles.managePanelHeader}>
                    <p className={styles.description}>
                      Managing <strong>{category}</strong> images
                    </p>
                    <button 
                      className={styles.refreshButton}
                      onClick={handleRefresh}
                      disabled={loading}
                    >
                      <LuRefreshCw className={loading ? styles.spinning : ''} />
                      <span>Refresh</span>
                    </button>
                  </div>

                  {loading ? (
                    <div className={styles.loadingWrapper}>
                      <p className={styles.loadingMessage}>
                        <LuRefreshCw className={styles.spinning} />
                        <span>Loading images from {category} category...</span>
                      </p>
                    </div>
                  ) : images.length === 0 ? (
                    <div className={styles.emptyWrapper}>
                      <p className={styles.emptyMessage}>
                        No images found in {category} category
                      </p>
                    </div>
                  ) : (
                    <div className={styles.imageGrid}>
                      {images.map((image, index) => (
                        <div key={index} className={styles.imageCard}>
                          <div className={styles.imageWrapper}>
                            <Image
                              src={image.src}
                              width={200}
                              height={150}
                              alt={`${category} image ${index + 1}`}
                              className={styles.thumbnailImage}
                            />
                            <button
                              onClick={() => handleDelete(image.src)}
                              className={styles.deleteButton}
                              disabled={deleting || triggeringDeploy}
                              aria-label="Delete image"
                              title="Delete image"
                            >
                              <LuTrash2 />
                            </button>
                          </div>
                          <p className={styles.imagePath}>
                            {image.src.split("/").pop()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {messageType && (
                <div className={`${styles.message} ${styles[messageType]}`}>
                  {messageType === "error" && <LuLoaderCircle />}
                  {messageType === "success" && <LuCheck />}
                  {messageType === "info" && <LuLoaderCircle />}
                  <span>{message}</span>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}