"use client";
import { usePathname } from "next/navigation";
import styles from "./nav.module.css";
import Link from "next/link";

export default function Nav() {
  const currentPath = usePathname() ?? "";

  const isActive = (path: string): boolean =>
    path === "/" ? currentPath === path : currentPath.startsWith(path);

  return (
    <nav className={styles.navigation}>
      <ul>
        <li>
          <Link href="/" className={isActive("/") ? styles.activeLink : ""}>
            Home
          </Link>
        </li>
        <li className={styles.dropdownContainer}>
          Photo
          <ul className={styles.dropdown}>
            <li>
              <Link href="/photo/wildlife">Wildlife</Link>
            </li>
            <li>
              <Link href="/photo/architecture">Architecture</Link>
            </li>
            <li>
              <Link href="/photo/landscape">Landscape</Link>
            </li>
          </ul>
        </li>
        <li>
          <Link
            href="/contact"
            className={isActive("/contact") ? styles.activeLink : ""}
          >
            Contact
          </Link>
        </li>
      </ul>
    </nav>
  );
}
