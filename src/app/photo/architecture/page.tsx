import styles from "../gallery.module.css";
import Nav from "../../components/nav";

import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";
import Copyright from "@/app/components/copyright";

export default function Home() {
  const images = [
    {
      src: "/static/portfolio/architecture/DSC09383.jpg",
      width: 4672,
      height: 7008
    },
    {
      src: "/static/portfolio/architecture/DSC09436.jpg",
      width: 4672,
      height: 7008
    },
    {
      src: "/static/portfolio/architecture/DSC09471.jpg",
      width: 7008,
      height: 4672
    },
    {
      src: "/static/portfolio/architecture/DSC09473.jpg",
      width: 7008,
      height: 4672
    },
    {
      src: "/static/portfolio/architecture/DSC09702.jpg",
      width: 4672,
      height: 7008
    }
  ];

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <Nav />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Architecture</h1>
          <MasonryPhotoAlbum photos={images} columns={3} spacing={50} />
        </div>
      </main>
      
      <Copyright />
    </div>
  );
}
