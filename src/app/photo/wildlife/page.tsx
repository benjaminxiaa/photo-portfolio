import styles from "../gallery.module.css";
import Nav from "../../components/nav";

import { MasonryPhotoAlbum } from "react-photo-album";
import Copyright from "@/app/components/copyright";

export default function Home() {
  const images = [
    {
      src: "/static/portfolio/wildlife/BreakingTheSurface-BenjaminXia.jpg",
      width: 2203,
      height: 1469
    },
    {
      src: "/static/portfolio/wildlife/CatchOfTheDay-BenjaminXia.jpg",
      width: 1872,
      height: 1248
    },
    {
      src: "/static/portfolio/wildlife/CradleInTheGreen-BenjaminXia.jpg",
      width: 2252,
      height: 4000
    }
  ];
  
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
