import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import MobileNav from "./MobileNav";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Shock of the Week | Clinical Reasoning, One Case at a Time",
  description:
    "Shock of the Week is a collaborative medical education platform featuring weekly ECGs, imaging, POCUS, and clinical reasoning challenges.",
};

const INSTAGRAM_URL = "https://www.instagram.com/shockoftheweek/";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: challenge } = await supabase
    .from("challenges")
    .select("title, publish_at, categories(name)")
    .eq("status", "published")
    .lte("publish_at", new Date().toISOString())
    .order("publish_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const categoryName = (challenge?.categories as unknown as { name: string } | null)?.name;
  const caseTitle = challenge?.title ?? "Can you identify the rhythm?";
  const caseMeta = challenge
    ? `${categoryName ?? "Clinical Case"} • Released ${new Date(challenge.publish_at).toLocaleDateString()}`
    : "ECG Challenge • Intermediate • 3-minute case";

  return (
    <div className={styles.page}>
      <header className={styles.navWrap}>
        <nav className={`${styles.container} ${styles.navInner}`}>
          <a className={styles.brand} href="#top">
            <span className={styles.logoMark}>⚡</span>
            <span>Shock of the Week</span>
          </a>

          <div className={styles.navLinks}>
            <a href="#how">How It Works</a>
            <a href="#mission">Our Mission</a>
            <a href="#learn">What You&rsquo;ll Learn</a>
            <a className={styles.navCta} href="/login">
              View This Week&rsquo;s Case
            </a>
          </div>

          <MobileNav />
        </nav>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.ecgBg}></div>
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroText}>
              <div className={styles.eyebrow}>🫀 Weekly clinical challenge</div>
              <h1>
                Think fast.
                <br />
                <span>Learn deeply.</span>
              </h1>
              <p>
                Build confidence in ECG interpretation and clinical reasoning through
                real-world cases, concise teaching pearls, and collaborative learning.
                One challenge. Every week.
              </p>

              <div className={styles.actions}>
                <a className={styles.btnPrimary} href="/login">
                  Solve This Week&rsquo;s Case
                </a>
                <a className={styles.btnSecondary} href="#mission">
                  Explore the Mission
                </a>
              </div>
            </div>

            <div className={styles.heroCard} id="challenge">
              <div className={styles.monitor}>
                <div className={styles.monitorTop}>
                  <strong>This Week&rsquo;s Shock</strong>
                  <span className={styles.live}>
                    <i className={styles.dot}></i> LIVE CASE
                  </span>
                </div>
                <div className={styles.ecgWindow}>
                  <div className={styles.ecgLine}></div>
                </div>
                <div className={styles.caseTitle}>{caseTitle}</div>
                <div className={styles.caseMeta}>{caseMeta}</div>
                <a className={styles.miniBtn} href="/login">
                  Open the Weekly Challenge →
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.how} id="how">
          <div className={styles.container}>
            <div className={styles.sectionLabel}>How it works</div>
            <h2>From first glance to final diagnosis.</h2>
            <p className={styles.sectionIntro}>
              Each challenge is designed to help you move beyond pattern recognition
              and strengthen the way you reason through clinical problems.
            </p>

            <div className={styles.steps}>
              <article className={styles.step}>
                <div className={styles.stepNumber}>01</div>
                <h3>Analyze</h3>
                <p>Review the clinical vignette, ECG, imaging, or point-of-care findings.</p>
              </article>

              <article className={styles.step}>
                <div className={styles.stepNumber}>02</div>
                <h3>Diagnose</h3>
                <p>Commit to an interpretation and test your clinical reasoning.</p>
              </article>

              <article className={styles.step}>
                <div className={styles.stepNumber}>03</div>
                <h3>Learn</h3>
                <p>Review the explanation, teaching pearls, and key diagnostic clues.</p>
              </article>
            </div>
          </div>
        </section>

        <section id="mission">
          <div className={`${styles.container} ${styles.missionGrid}`}>
            <div className={styles.statCard}>
              <div className={styles.stat}>
                <strong>6</strong>
                <span>Internal Medicine residency programs participating across Maryland</span>
              </div>
              <div className={styles.stat}>
                <strong>1×</strong>
                <span>A new clinical challenge released every week</span>
              </div>
              <div className={styles.stat}>
                <strong>∞</strong>
                <span>Opportunities to improve diagnostic accuracy and confidence</span>
              </div>
            </div>

            <div>
              <div className={styles.sectionLabel}>Our mission</div>
              <h2>Make clinical education active, collaborative, and memorable.</h2>
              <p className={styles.sectionIntro}>
                Shock of the Week brings learners together around authentic clinical cases.
                We aim to create a welcoming educational community for medical students,
                residents, fellows, and attending physicians who never want to stop learning.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.features} id="learn">
          <div className={styles.container}>
            <div className={styles.sectionLabel}>What you&rsquo;ll learn</div>
            <h2>High-yield skills for real-world care.</h2>
            <p className={styles.sectionIntro}>
              Build expertise through ECG interpretation, cardiology, echocardiography, and
              clinical reasoning.
            </p>

            <div className={styles.featureGrid}>
              <article className={styles.feature}>
                <div className={styles.featureIcon}>⚡</div>
                <h3>ECG Interpretation</h3>
                <p>Rhythm, rate, axis, intervals, ischemia, and advanced pattern recognition.</p>
              </article>
              <article className={styles.feature}>
                <div className={styles.featureIcon}>🫀</div>
                <h3>Cardiology</h3>
                <p>Clinical reasoning across acute and chronic cardiovascular presentations.</p>
              </article>
              <article className={styles.feature}>
                <div className={styles.featureIcon}>📈</div>
                <h3>Echocardiography</h3>
                <p>Connect images with physiology and bedside decision-making.</p>
              </article>
              <article className={styles.feature}>
                <div className={styles.featureIcon}>🧠</div>
                <h3>Clinical Reasoning</h3>
                <p>Practice generating differentials and prioritizing diagnostic clues.</p>
              </article>
              <article className={styles.feature}>
                <div className={styles.featureIcon}>📚</div>
                <h3>Teaching Pearls</h3>
                <p>Concise, practical takeaways you can immediately apply to patient care.</p>
              </article>
              <article className={styles.feature}>
                <div className={styles.featureIcon}>🏆</div>
                <h3>Collaborative Learning</h3>
                <p>Learn alongside residents, faculty, and medical trainees across institutions.</p>
              </article>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div className={styles.container}>
            <div className={styles.ctaBox}>
              <div>
                <h2>Ready to crack the next case?</h2>
                <p>Follow Shock of the Week and turn on post notifications so you never miss a challenge.</p>
              </div>
              <a className={styles.ctaBoxBtn} href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                Follow on Instagram
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.siteFooter}>
        <div className={styles.container}>
          <div className={styles.footerGrid}>
            <div>
              <a className={styles.brand} href="#top">
                <span className={styles.logoMark}>⚡</span>
                <span>Shock of the Week</span>
              </a>
              <p className={styles.footerNote}>
                Clinical reasoning, one case at a time. Created for learners who believe
                that becoming a better clinician starts with never stopping learning.
              </p>
            </div>

            <div className={styles.footerLinks}>
              <a href="#how">How It Works</a>
              <a href="#mission">About</a>
              <a href="#learn">Learn</a>
              <a href="/contact">Contact</a>
            </div>
          </div>

          <div className={styles.copyright}>
            © {new Date().getFullYear()} Shock of the Week. Educational content only and not a
            substitute for clinical judgment.
          </div>
        </div>
      </footer>
    </div>
  );
}
