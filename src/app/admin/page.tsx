// src/app/admin/page.tsx
"use client";

export const runtime = "nodejs";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import Image from "next/image";

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
}

type Category = "nature" | "wildlife" | "architecture" | "travel";
type TabType = "upload" | "manage";
type MessageType = "success" | "error" | "info" | "";

export default function AdminPortal() {
  // State management with proper types
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

  // References with proper types
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Authentication handler
  const authenticate = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
    console.log(
      "Admin password check:",
      adminPassword ? "Password is set" : "No password set"
    );

    if (password === adminPassword) {
      setAuthenticated(true);
      setMessage("");
      setMessageType("");
    } else {
      setMessage("Incorrect password");
      setMessageType("error");
    }
  };

  // Tab change handler
  const handleTabChange = (tab: TabType): void => {
    console.log("Changing tab to:", tab);
    setActiveTab(tab);

    if (tab === "manage") {
      setImages([]);
      setLoading(true);
      fetchImages(category);
    }
  };

  // Category change handler - separate function with direct category parameter
  const changeCategory = (newCategory: Category): void => {
    console.log("Changing category from", category, "to", newCategory);

    // Update category state
    setCategory(newCategory);

    // If we're in the manage tab, load the images for the new category
    if (activeTab === "manage") {
      setImages([]);
      setLoading(true);
      fetchImages(newCategory);
    }
  };

  // Image fetching function - accepts a specific category to fetch
  const fetchImages = async (categoryToFetch: Category): Promise<void> => {
    try {
      console.log("Fetching images for category:", categoryToFetch);
      setLoading(true);
      setMessage("");

      const response = await fetch(`/api/images?category=${categoryToFetch}`);

      // Handle non-OK responses
      if (!response.ok) {
        const text = await response.text();
        console.error("API error:", response.status, text);
        setMessage(`Error: Server returned ${response.status}`);
        setMessageType("error");
        setImages([]);
        return;
      }

      // Verify content type
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        setMessage("Error: Server did not return JSON");
        setMessageType("error");
        setImages([]);
        return;
      }

      // Parse response
      const data = (await response.json()) as ImagesResponse;
      console.log("Response data:", data);

      if (data.success) {
        setImages(data.images || []);
        // Clear any previous messages
        setMessage("");
        setMessageType("");
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
      setMessage(`Uploading to ${category}...`);
      setMessageType("");

      const file = fileInputRef.current.files[0];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as UploadResponse;

      if (data.success) {
        setMessage(`Successfully uploaded to ${category}!`);
        setMessageType("success");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        router.refresh();

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
      setMessageType("");

      console.log("Deleting image:", imageSrc, "from category:", category);

      const response = await fetch("/api/delete", {
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

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Admin Portal</h1>

          {!authenticated ? (
            <form onSubmit={authenticate} className={styles.authForm}>
              <p className={styles.description}>
                Please enter your admin password to continue
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
                <p className={`${styles.message} ${styles[messageType]}`}>
                  {message}
                </p>
              )}
            </form>
          ) : (
            <>
              <div className={styles.tabs}>
                <button
                  className={`${styles.tabButton} ${
                    activeTab === "upload" ? styles.activeTab : ""
                  }`}
                  onClick={() => handleTabChange("upload")}
                >
                  Upload Photos
                </button>
                <button
                  className={`${styles.tabButton} ${
                    activeTab === "manage" ? styles.activeTab : ""
                  }`}
                  onClick={() => handleTabChange("manage")}
                >
                  Manage Photos
                </button>
              </div>

              {activeTab === "upload" ? (
                <div className={styles.uploadPanel}>
                  <div className={styles.categorySelector}>
                    <p className={styles.labelHeading}>
                      Select category to upload to:
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
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <p className={styles.description}>
                    You are uploading to the <strong>{category}</strong>{" "}
                    category.
                  </p>

                  <form onSubmit={handleUpload} className={styles.uploadForm}>
                    <div className={styles.formGroup}>
                      <label htmlFor="image" className={styles.label}>
                        Select Image:
                      </label>
                      <input
                        type="file"
                        id="image"
                        ref={fileInputRef}
                        accept="image/*"
                        className={styles.fileInput}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className={styles.button}
                      disabled={uploading}
                    >
                      {uploading ? "Uploading..." : "Upload Photo"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className={styles.managePanel}>
                  <div className={styles.categorySelector}>
                    <p className={styles.labelHeading}>
                      Select category to manage:
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
                            disabled={loading || deleting}
                          >
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <p className={styles.description}>
                    Managing <strong>{category}</strong> category. Click the
                    delete button to remove an image.
                  </p>

                  {loading ? (
                    <div className={styles.loadingWrapper}>
                      <p className={styles.loadingMessage}>
                        Loading images from {category} category...
                      </p>
                    </div>
                  ) : images.length === 0 ? (
                    <div className={styles.emptyWrapper}>
                      <p className={styles.emptyMessage}>
                        No images found in {category} category.
                      </p>
                    </div>
                  ) : (
                    <div className={styles.imageGrid}>
                      {images.map((image, index) => (
                        <div key={index} className={styles.imageCard}>
                          <div className={styles.imageWrapper}>
                            <Image
                              src={image.src}
                              alt={`Gallery image ${index + 1}`}
                              className={styles.thumbnailImage}
                            />
                            <button
                              onClick={() => handleDelete(image.src)}
                              className={styles.deleteButton}
                              disabled={deleting}
                            >
                              Delete
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
                <p className={`${styles.message} ${styles[messageType]}`}>
                  {message}
                </p>
              )}

              <p className={styles.copyright}>
                Admin Portal v1.0 - © {new Date().getFullYear()}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
