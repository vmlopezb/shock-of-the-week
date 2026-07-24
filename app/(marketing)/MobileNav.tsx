"use client";

import { useState } from "react";
import styles from "./landing.module.css";

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.menuButton}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕" : "☰"}
      </button>

      <div className={styles.mobileMenu} data-open={open} onClick={() => setOpen(false)}>
        <a href="#how">How It Works</a>
        <a href="#mission">Our Mission</a>
        <a href="#learn">What You&rsquo;ll Learn</a>
        <a href="/login">Log In</a>
      </div>
    </>
  );
}
