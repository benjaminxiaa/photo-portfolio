import styles from "../gallery.module.css";
import Nav from "../../components/nav";

export default function Home() {
  return (
    <div className={styles.container}>
      {/* Navigation */}
      <Nav />

      {/* Main Content */}
      <main className={styles.main}>
        <div className={styles.content}>
        </div>
      </main>
    </div>
  );
}
