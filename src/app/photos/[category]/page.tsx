"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./gallery.module.css";
import Nav from "../../components/nav";
import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import Copyright from "../../components/copyright";

// Define the Image type
interface Image {
  category: string;
  url: string;
}

export default function CategoryPage() {
  const [images, setImages] = useState<
    { src: string; width: number; height: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const params = useParams();
  const category = (params.category as string)?.toLowerCase();

  const loadImageDimensions = (
    url: string
  ): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  };

  const fetchImages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/images", { cache: "no-store" });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      // Check if category is valid without storing categories
      const uniqueCategories = Array.from(
        new Set(data.map((img: Image) => img.category.toLowerCase()))
      );

      if (!uniqueCategories.includes(category)) {
        setError("Invalid category");
        setLoading(false);
        return;
      }

      const categoryImages = data.filter(
        (img: Image) => img.category.toLowerCase() === category
      );

      const imagesWithDimensions = await Promise.all(
        categoryImages.map(async (img: Image) => {
          const { width, height } = await loadImageDimensions(img.url);
          return { src: img.url, width, height };
        })
      );

      setImages(imagesWithDimensions);
      setError(null);
    } catch (err) {
      setError("Failed to load images");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <Nav />
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </h1>
          {loading ? (
            <div className={styles.loaderWrapper}>
              <div className={styles.loader}>
                <div className={styles.loaderWheel}></div>
                <div className={styles.loaderText}></div>
              </div>
            </div>
          ) : error ? (
            <p>{error}</p>
          ) : images.length === 0 ? (
            <p>
              No images found for{" "}
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </p>
          ) : (
            <MasonryPhotoAlbum
              photos={images}
              columns={3}
              spacing={50}
              padding={0}
            />
          )}
        </div>
      </main>
      <Copyright />
    </div>
  );
}
