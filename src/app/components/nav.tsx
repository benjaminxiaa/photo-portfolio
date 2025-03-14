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
          <span className={isActive("/photo") ? styles.activeLink : ""}>
            Photo
          </span>
          <ul className={styles.dropdown}>
            <li>
              <Link href="/photos/wildlife">Wildlife</Link>
            </li>
            <li>
              <Link href="/photos/architecture">Architecture</Link>
            </li>
            <li>
              <Link href="/photos/nature">Nature</Link>
            </li>
            <li>
              <Link href="/photos/travel">Travel</Link>
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
