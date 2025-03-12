"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

export default function Admin() {
  const [images, setImages] = useState<
    { url: string; name: string; category: string }[]
  >([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "manage">("upload");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState("");

  const fetchImages = async () => {
    const res = await fetch("/api/images", { cache: "no-store" });
    const data = await res.json();
    setImages(data);
  };

  const fetchCategories = async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const adminPassword =
      process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
    if (password === adminPassword) {
      setIsLoggedIn(true);
      setStatusMessage({ type: "success", text: "Logged in successfully" });
      setPassword("");
    } else {
      setStatusMessage({ type: "error", text: "Invalid password" });
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setStatusMessage({ type: "success", text: "Logged out successfully" });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        setStatusMessage({ type: "success", text: result.message });
        fetchImages();
        fetchCategories();
        setSelectedFile(null);
      } else {
        setStatusMessage({
          type: "error",
          text: result.error || "Upload failed",
        });
      }
    } catch (error) {
      setStatusMessage({
        type: "error",
        text: "Upload failed: Network error" + error,
      });
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDelete = async (key: string) => {
    console.log("Attempting to delete:", key);
    try {
      const res = await fetch("/api/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      console.log("Delete response status:", res.status);
      const result = await res.json();
      console.log("Delete response:", result);
      if (res.ok) {
        setStatusMessage({ type: "success", text: result.message });
        fetchImages();
      } else {
        setStatusMessage({
          type: "error",
          text: result.error || "Delete failed",
        });
      }
    } catch (error) {
      console.error("Delete fetch error:", error);
      setStatusMessage({ type: "error", text: "Delete failed: Network error" });
    }
    setTimeout(() => setStatusMessage(null), 5000);
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchImages();
      fetchCategories();
    }
  }, [isLoggedIn]);

  const filteredImages = selectedCategory
    ? images.filter((img) => img.category === selectedCategory)
    : images;

  const getKeyFromUrl = (url: string) => {
    const baseUrl =
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL;
    if (!baseUrl) {
      console.error("NEXT_PUBLIC_R2_PUBLIC_URL not set");
      return url;
    }
    const key = url.replace(baseUrl, "").replace(/^\/+/, "");
    console.log("URL:", url, "Base:", baseUrl, "Extracted key:", key);
    return key;
  };

  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.description}>
            {isLoggedIn
              ? "Upload new photos or manage your portfolio."
              : "Enter the password to access the admin panel."}
          </p>

          {!isLoggedIn ? (
            <form className={styles.authForm} onSubmit={handleLogin}>
              <div className={styles.formGroup}>
                <label className={styles.labelHeading}>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>
              <button type="submit" className={styles.button}>
                Log In
              </button>
            </form>
          ) : (
            <>
              <div className={styles.header}>
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tabButton} ${
                      activeTab === "upload" ? styles.activeTab : ""
                    }`}
                    onClick={() => setActiveTab("upload")}
                  >
                    Upload Photos
                  </button>
                  <button
                    className={`${styles.tabButton} ${
                      activeTab === "manage" ? styles.activeTab : ""
                    }`}
                    onClick={() => setActiveTab("manage")}
                  >
                    Manage Photos
                  </button>
                </div>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  Log Out
                </button>
              </div>

              {activeTab === "upload" && (
                <form className={styles.uploadForm} onSubmit={handleSubmit}>
                  <div className={styles.formGroup}>
                    <label className={styles.labelHeading}>Upload Photo</label>
                    <label className={styles.fileInputLabel}>
                      <div className={styles.fileInputButton}>
                        {selectedFile ? "Change File" : "Select Photo"}
                      </div>
                      <input
                        type="file"
                        name="photo"
                        accept="image/*"
                        required
                        className={styles.fileInput}
                        onChange={handleFileChange}
                      />
                      {selectedFile && (
                        <span className={styles.selectedFile}>
                          {selectedFile.name}
                        </span>
                      )}
                    </label>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.labelHeading}>Category</label>
                    <select name="category" className={styles.input} required>
                      <option value="">Select Category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className={styles.button}>
                    Upload Photo
                  </button>
                </form>
              )}

              {activeTab === "manage" && (
                <div className={styles.managePanel}>
                  <div className={styles.managePanelHeader}>
                    <h2 className={styles.labelHeading}>Current Photos</h2>
                    <button
                      onClick={fetchImages}
                      className={styles.refreshButton}
                    >
                      Refresh
                    </button>
                  </div>

                  <div className={styles.categorySelector}>
                    <h3 className={styles.labelHeading}>Filter by Category</h3>
                    <div className={styles.categoryButtons}>
                      <button
                        className={`${styles.categoryButton} ${
                          selectedCategory === null
                            ? styles.activeCategoryButton
                            : ""
                        }`}
                        onClick={() => setSelectedCategory(null)}
                      >
                        All
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          className={`${styles.categoryButton} ${
                            selectedCategory === cat
                              ? styles.activeCategoryButton
                              : ""
                          }`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredImages.length === 0 ? (
                    <div className={styles.emptyWrapper}>
                      <p className={styles.emptyMessage}>
                        No images found
                        {selectedCategory ? ` for ${selectedCategory}` : ""}.
                      </p>
                    </div>
                  ) : (
                    <div className={styles.imageGrid}>
                      {filteredImages.map((image) => (
                        <div key={image.url} className={styles.imageCard}>
                          <div className={styles.imageWrapper}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={image.url}
                              alt={image.name}
                              className={styles.thumbnailImage}
                            />
                            <button
                              className={styles.deleteButton}
                              onClick={() =>
                                handleDelete(getKeyFromUrl(image.url))
                              }
                            >
                              ✕
                            </button>
                          </div>
                          <p className={styles.imagePath}>
                            {image.category}/{image.name}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {statusMessage && (
            <div className={`${styles.message} ${styles[statusMessage.type]}`}>
              {statusMessage.text}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
