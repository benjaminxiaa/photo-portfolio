import styles from "./page.module.css";
import Nav from "../components/nav";
import Social from "../components/social";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Navigation */}
      <Nav />

      {/* Social Links Sidebar */}
      <Social />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
          <h1 className={styles.title}>Contact Me</h1>
          <p className={styles.description}>
            If you have any questions or would like to get in touch, please feel
            free to contact me.
          </p>
          <a href="mailto:benjamin@xiaa.org">
            <button className={styles.button}>Email Me</button>
          </a>
        </div>
      </main>

      {/* Name Watermark */}
      <div className={styles.watermark}>benjamin@xiaa.org</div>
    </div>
  );
}
