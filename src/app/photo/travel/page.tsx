import styles from "../gallery.module.css";
import Nav from "../../components/nav";

import { MasonryPhotoAlbum } from "react-photo-album";
import Copyright from "@/app/components/copyright";

export default function Home() {
  const images = [
    {
      src: "/static/portfolio/architecture/DSC05860.jpg",
      width: 6000,
      height: 3376
    },
    {
      src: "/static/portfolio/architecture/DotonboriCanal-BenjaminXia.jpg",
      width: 1365,
      height: 2048
    }
  ];
  
  return (
    <div className={styles.container}>
      {/* Navigation */}
      <Nav />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Travel</h1>
          <MasonryPhotoAlbum photos={images} columns={3} spacing={50} />
        </div>
      </main>
      
      <Copyright />
    </div>
  );
}
