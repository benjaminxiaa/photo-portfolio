import Link from 'next/link';
import { LuLinkedin } from "react-icons/lu";
import styles from './social.module.css';

export default function Social() {
  return (
    <div className={styles.socialSidebar}>
      <div className={styles.socialLinks}>
        {/* <Link href="https://github.com/benjaminxiaa" target='_blank'>
          <Github size={20} />
        </Link> */}
        <Link href="https://linkedin.com/in/benjamin-xia-a68a502b7" target='_blank'>
          <LuLinkedin size={20} />
        </Link>
      </div>
    </div>
  );
}