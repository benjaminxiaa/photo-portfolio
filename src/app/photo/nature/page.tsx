import styles from "../gallery.module.css";
import Nav from "../../components/nav";

import { MasonryPhotoAlbum } from "react-photo-album";
import "react-photo-album/masonry.css";

export default function Home() {
  const images = [
    {
      src: "/static/portfolio/landscape/DSC05124.jpg",
      width: 2048,
      height: 1365
    },
    {
      src: "/static/portfolio/landscape/DSC05132.jpg",
      width: 1365,
      height: 2048
    },
    {
      src: "/static/portfolio/landscape/DSC05145.jpg",
      width: 1365,
      height: 2048
    },
    {
      src: "/static/portfolio/landscape/DSC07495.jpg",
      width: 3376,
      height: 6000
    },
    {
      src: "/static/portfolio/landscape/DSC07527.jpg",
      width: 6000,
      height: 3376
    },
    {
      src: "/static/portfolio/landscape/DSC07624.jpg",
      width: 3376,
      height: 6000
    },
    {
      src: "/static/portfolio/landscape/DSC07788.jpg",
      width: 6000,
      height: 3376
    },
    {
      src: "/static/portfolio/landscape/DSC07982.jpg",
      width: 6000,
      height: 3376
    },
    {
      src: "/static/portfolio/landscape/HydrangeaBlossoms-BenjaminXia.jpg",
      width: 4196,
      height: 5596
    },
    {
      src: "/static/portfolio/landscape/Image6.jpg",
      width: 2048,
      height: 1365
    },
    {
      src: "/static/portfolio/landscape/PurpleSerenity-BenjaminXia.jpg",
      width: 6000,
      height: 4000
    },
    {
      src: "/static/portfolio/landscape/SaltPondCosmos-BenjaminXia.jpg",
      width: 7008,
      height: 4672
    },
    {
      src: "/static/portfolio/landscape/SaltPortal-BenjaminXia.jpg",
      width: 3765,
      height: 5648
    },
    {
      src: "/static/portfolio/landscape/SaltStream-BenjaminXia.jpg",
      width: 1365,
      height: 2048
    },
    {
      src: "/static/portfolio/landscape/Splash-BenjaminXia.jpg",
      width: 2048,
      height: 1366
    },
    {
      src: "/static/portfolio/landscape/SymphonyOfViolet-BenjaminXia.jpg",
      width: 4818,
      height: 3212
    },
    {
      src: "/static/portfolio/landscape/b_4132739_deathvalley_mineraldeposits.jpg",
      width: 753,
      height: 500
    },
    {
      src: "/static/portfolio/landscape/DSC05282.jpg",
      width: 1365,
      height: 2048
    },
  ];
  
  return (
    <div className={styles.container}>
      {/* Navigation */}
      <Nav />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Nature</h1>
          <MasonryPhotoAlbum photos={images} columns={3} spacing={50} />
        </div>
      </main>
    </div>
  );
}
