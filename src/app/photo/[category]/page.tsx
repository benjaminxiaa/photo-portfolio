// src/app/photo/[category]/page.tsx
import { cache } from "react";
import styles from "../gallery.module.css";
import Nav from "../../components/nav";
import { MasonryPhotoAlbum } from "react-photo-album";
import Copyright from "@/app/components/copyright";
import Social from "@/app/components/social";

// Params type for our dynamic route
interface PageParams {
  params: {
    category: string;
  };
}

interface GalleryImage {
  src: string;
  width: number;
  height: number;
}

// Cached fetch function to avoid duplicate requests during SSR
const getImages = cache(async (category: string): Promise<GalleryImage[]> => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    const response = await fetch(`${apiUrl}/api/images?category=${category}`, {
      next: { revalidate: 60 }, // Revalidate every minute
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch ${category} images: ${response.statusText}`
      );
      return [];
    }

    const data = await response.json();
    return data.success ? data.images : [];
  } catch (error) {
    console.error(`Error fetching ${category} images:`, error);
    return [];
  }
});

// Maps for category metadata
const categoryTitles: Record<string, string> = {
  nature: "Nature Photography",
  wildlife: "Wildlife Photography",
  architecture: "Architecture Photography",
  travel: "Travel Photography",
};

// Fallback images for each category (in case dynamic loading fails)
const fallbackImages: Record<string, GalleryImage[]> = {
  nature: [
    {
      src: "/static/portfolio/nature/DSC05124.jpg",
      width: 2048,
      height: 1365,
    },
    // ... more nature images
  ],
  wildlife: [
    {
      src: "/static/portfolio/wildlife/BreakingTheSurface-BenjaminXia.jpg",
      width: 2203,
      height: 1469,
    },
    // ... more wildlife images
  ],
  architecture: [
    {
      src: "/static/portfolio/architecture/DSC09383.jpg",
      width: 4672,
      height: 7008,
    },
    // ... more architecture images
  ],
  travel: [
    {
      src: "/static/portfolio/travel/DSC05860.jpg",
      width: 6000,
      height: 3376,
    },
    // ... more travel images
  ],
};

export default async function CategoryPage({ params }: PageParams) {
  const { category } = params;

  // Validate that this is a valid category
  if (!["nature", "wildlife", "architecture", "travel"].includes(category)) {
    // Could redirect to 404 here, but let's show a message instead
    return (
      <div className={styles.container}>
        <Nav />
        <main className={styles.main}>
          <div className={styles.content}>
            <h1 className={styles.title}>Category Not Found</h1>
            <p className={styles.description}>
              The requested category does not exist. Please check the URL and
              try again.
            </p>
          </div>
        </main>
        <Copyright />
      </div>
    );
  }

  // Attempt to fetch images from R2 storage via API
  const dynamicImages = await getImages(category);

  // Use dynamic images if available, otherwise fall back to static ones
  const images =
    dynamicImages.length > 0 ? dynamicImages : fallbackImages[category] || [];

  // Get the category title
  const title =
    categoryTitles[category] ||
    `${category.charAt(0).toUpperCase() + category.slice(1)} Photography`;

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <Nav />

      {/* Social Links Sidebar */}
      <Social />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>{title}</h1>
          {images.length > 0 ? (
            <MasonryPhotoAlbum
              photos={images}
              columns={(width) => {
                // Responsive columns based on screen width
                if (width < 500) return 1;
                if (width < 800) return 2;
                return 3;
              }}
              spacing={50}
            />
          ) : (
            <p className={styles.description}>
              No images found in this category. Check back soon!
            </p>
          )}
        </div>
      </main>

      <Copyright />
    </div>
  );
}
