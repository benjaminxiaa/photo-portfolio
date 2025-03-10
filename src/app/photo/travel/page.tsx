// src/app/photo/wildlife/page.tsx
import { cache } from 'react';
import styles from "../gallery.module.css";
import Nav from "../../components/nav";
import { MasonryPhotoAlbum } from "react-photo-album";
import Copyright from "@/app/components/copyright";

interface GalleryImage {
  src: string;
  width: number;
  height: number;
}

// Cached fetch function to avoid duplicate requests
const getImages = cache(async (category: string): Promise<GalleryImage[]> => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const response = await fetch(`${apiUrl}/api/images?category=${category}`, {
      next: { revalidate: 60 } // Revalidate every minute
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${category} images: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    return data.success ? data.images : [];
  } catch (error) {
    console.error(`Error fetching ${category} images:`, error);
    return [];
  }
});

export default async function WildlifePage() {
  // Attempt to fetch images from R2 storage via API
  const dynamicImages = await getImages('travel');
  
  // Fallback static images in case dynamic loading fails
  const fallbackImages = [
    {
      src: "/static/portfolio/travel/DSC05860.jpg",
      width: 6000,
      height: 3376,
    },
    {
      src: "/static/portfolio/travel/DotonboriCanal-BenjaminXia.jpg",
      width: 1365,
      height: 2048,
    },
  ];
  
  // Use dynamic images if available, otherwise fall back to static ones
  const images = dynamicImages.length > 0 ? dynamicImages : fallbackImages;

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <Nav />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Wildlife</h1>
          <MasonryPhotoAlbum photos={images} columns={3} spacing={50} />
        </div>
      </main>

      <Copyright />
    </div>
  );
}