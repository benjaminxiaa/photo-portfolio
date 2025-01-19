import Link from 'next/link';
import { Github, Linkedin } from 'lucide-react';
import styles from './social.module.css';

export default function Social() {
  return (
    <div className={styles.socialSidebar}>
      <div className={styles.socialLinks}>
        <Link href="https://github.com">
          <Github size={20} />
        </Link>
        <Link href="https://linkedin.com">
          <Linkedin size={20} />
        </Link>
      </div>
    </div>
  );
}