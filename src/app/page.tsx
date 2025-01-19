import styles from "./page.module.css";
import Nav from "./components/nav";
import Social from "./components/social";

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
          <p className={styles.greeting}>Hi! 👋 &ensp; My name is</p>
          <h1 className={styles.title}>Benjamin Xia</h1>
          <p className={styles.description}>
            I&apos;m a student who is passionate about photography, videography,
            and computer science. I started photography in late 2021,
            videography in late 2024, and computer science a few years ago. I
            love taking photos of the environment and other interesting
            subjects. I also love making videos of my adventures and other
            interesting things as well as filming events at my school.
          </p>
        </div>
      </main>

      {/* Name Watermark */}
      <div className={styles.watermark}>benjamin@xiaa.org</div>
    </div>
  );
}
