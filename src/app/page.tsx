"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

/* ─────────────────────────────────────────────
   Smooth scroll helper
───────────────────────────────────────────── */
function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const navHeight = 88;
  const top = el.getBoundingClientRect().top + window.scrollY - navHeight;
  window.scrollTo({ top, behavior: "smooth" });
}

/* ─────────────────────────────────────────────
   Nav link — blue active indicator
───────────────────────────────────────────── */
function NavLink({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative px-1 py-1 text-sm font-medium tracking-widest uppercase transition-colors duration-300"
      style={{ color: active ? "#60a5fa" : "#71717a" }}
    >
      {label}
      <motion.span
        className="absolute -bottom-0.5 left-0 right-0 h-[2px] rounded-full bg-blue-400"
        initial={false}
        animate={{ opacity: active ? 1 : 0, scaleX: active ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      />
    </button>
  );
}

/* ─────────────────────────────────────────────
   Background orb
───────────────────────────────────────────── */
function GradientOrb({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
      animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
      transition={{ duration: 9, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

/* ─────────────────────────────────────────────
   Feature card
───────────────────────────────────────────── */
function FeatureCard({
  icon, title, description, delay,
}: {
  icon: string; title: string; description: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="group relative rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 sm:p-8 backdrop-blur-sm
                 hover:border-blue-500/40 hover:bg-zinc-900/80 transition-colors duration-300"
    >
      <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500
                      bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
      <div className="text-3xl sm:text-4xl mb-4 sm:mb-5">{icon}</div>
      <h3 className="text-base sm:text-lg font-semibold text-white mb-2 sm:mb-3 tracking-tight">{title}</h3>
      <p className="text-sm sm:text-base leading-relaxed text-zinc-400">{description}</p>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Team member PHOTO CARD
   
   IMPORTANT: Your images should be in public/team/ folder.
   For example: public/team/member1.jpg
   
   The path in the array should be: "/team/member1.jpg" 
   (note the leading slash, and NO "public" in the path)
───────────────────────────────────────────── */
const TEAM_MEMBERS = [
  { name: "Xyrus Dylan Folloso", role: "Project Lead",       src: "/team/member1.jpg" },
  { name: "Marlon Kyle Delizo", role: "Backend Developer",  src: "/team/member2.jpg" },
  { name: "Xander Lou Abion", role: "Frontend Developer", src: "/team/member3.jpg" },
  { name: "Jaekob Rajan Tecson", role: "UI/UX Designer",     src: "/team/member4.jpg" },
  { name: "Harvey Vinuya", role: "Database Admin",     src: "/team/member5.jpg" },
  { name: "Zoren Acab", role: "QA & Testing",       src: "/team/member6.jpg" },
];

function TeamCard({
  member,
  delay,
}: {
  member: (typeof TEAM_MEMBERS)[0];
  delay: number;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        scale: 1.06,
        y: -8,
        rotate: 0,
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      }}
      className="group cursor-pointer"
      style={{ transformOrigin: "bottom center" }}
    >
      {/* Photo card — like a physical printed photo */}
      <div
        className="relative bg-zinc-900 border border-zinc-700/80 shadow-xl shadow-black/50
                   transition-all duration-300 group-hover:border-blue-500/50
                   group-hover:shadow-blue-900/30 group-hover:shadow-2xl"
        style={{ borderRadius: "4px" }}
      >
        {/* Photo area — portrait aspect ratio */}
        <div
          className="relative w-full overflow-hidden bg-zinc-800"
          style={{ aspectRatio: "3/4", borderRadius: "3px 3px 0 0" }}
        >
          {!imageError ? (
            <Image
              src={member.src}
              alt={member.name}
              fill
              className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : null}
          
          {/* Fallback — always rendered behind the image */}
          <div
            className={`absolute inset-0 bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900
                       flex flex-col items-center justify-center gap-2 ${imageError ? 'z-10' : '-z-10'}`}
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-zinc-700 border-2 border-zinc-600
                            flex items-center justify-center text-2xl sm:text-3xl font-bold text-zinc-400">
              {member.name.charAt(0)}
            </div>
            <span className="text-xs text-zinc-600 tracking-wide">No photo</span>
            <span className="text-[10px] text-zinc-700 max-w-[90%] text-center leading-tight px-2">
              <br/>
              <code className="text-zinc-600">public{member.src}</code>
            </span>
          </div>

          {/* Subtle gradient overlay at bottom of photo */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3
                          bg-gradient-to-t from-zinc-900/60 to-transparent pointer-events-none z-10" />
        </div>

        {/* Card footer — name + role */}
        <div className="px-3 py-3 sm:px-4 sm:py-3.5 border-t border-zinc-700/60">
          <p className="text-xs sm:text-sm font-semibold text-white leading-snug truncate">
            {member.name}
          </p>
          <p className="mt-0.5 text-[10px] sm:text-xs text-blue-400 tracking-wide truncate">
            {member.role}
          </p>
        </div>

        {/* Blue accent strip on hover — bottom edge */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 origin-left"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function Home() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 24);
      const sections = ["home", "about", "projects", "team"];
      for (const id of [...sections].reverse()) {
        const el = document.getElementById(id);
        if (el && window.scrollY + 120 >= el.offsetTop) {
          setActiveSection(id);
          break;
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleStart = () => {
    setLeaving(true);
    setTimeout(() => router.push("/clients/students/login"), 700);
  };

  const navLinks = [
    { label: "Home",        id: "home" },
    { label: "About",       id: "about" },
    { label: "Our Project", id: "projects" },
    { label: "Team",        id: "team" },
  ];

  return (
    <>
      {/* ── Exit overlay ── */}
      <AnimatePresence>
        {leaving && (
          <motion.div
            key="exit-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
            transition={{ duration: 0.45 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
              <span className="text-zinc-400 text-sm tracking-widest uppercase">Loading…</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!leaving && (
          <motion.div
            key="page"
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative flex min-h-screen flex-col items-center bg-[#050508] text-white overflow-x-hidden"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {/* Background orbs */}
            <GradientOrb className="w-[500px] h-[500px] sm:w-[640px] sm:h-[640px] bg-blue-700  -top-52 -left-40" delay={0} />
            <GradientOrb className="w-[420px] h-[420px] sm:w-[520px] sm:h-[520px] bg-indigo-700 top-1/3 -right-56" delay={3} />
            <GradientOrb className="w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] bg-sky-600   bottom-48 left-1/4" delay={5.5} />

            {/* Grid texture */}
            <div
              className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
              style={{
                backgroundImage:
                  "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
                backgroundSize: "72px 72px",
              }}
            />

            {/* ══════════════════ NAVBAR ══════════════════ */}
            <motion.nav
              initial={{ opacity: 0, y: -32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="fixed top-4 left-1/2 z-50 w-[94%] max-w-7xl -translate-x-1/2"
            >
              <motion.div
                animate={{
                  backgroundColor: scrolled ? "rgba(9,9,11,0.96)" : "rgba(24,24,27,0.82)",
                  boxShadow: scrolled
                    ? "0 8px 40px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.05)"
                    : "0 2px 20px rgba(0,0,0,0.25)",
                }}
                transition={{ duration: 0.35 }}
                className="flex items-center justify-between rounded-xl px-5 sm:px-8 py-3 sm:py-4
                           backdrop-blur-xl border border-zinc-700/60"
              >
                {/* Logo — fixed aspect ratio, no cropping */}
                <motion.div
                  className="flex items-center cursor-pointer select-none"
                  onClick={() => scrollToSection("home")}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* Use a fixed square wrapper with contain so the logo never stretches */}
                  <div className="relative flex-shrink-0" style={{ width: 50, height: 50 }}>
                    <Image
                      src="/tup-siivs-logos.png"
                      alt="TUP-SIIVS Logo"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                  <span className="hidden sm:block text-sm font-bold tracking-[0.14em] text-white uppercase">
                    TUP-SIIVS
                  </span>
                </motion.div>

                {/* Desktop nav links */}
                <div className="hidden md:flex items-center gap-8 lg:gap-10">
                  {navLinks.map((link) => (
                    <NavLink
                      key={link.id}
                      label={link.label}
                      active={activeSection === link.id}
                      onClick={() => scrollToSection(link.id)}
                    />
                  ))}
                </div>

                {/* Desktop CTA — blue */}
                <motion.button
                  onClick={handleStart}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                  className="hidden md:flex rounded-lg bg-blue-600 px-5 sm:px-6 py-2 sm:py-2.5 text-sm font-bold text-white
                             shadow-lg shadow-blue-900/40 transition-colors duration-200 hover:bg-blue-500"
                >
                  Get Started
                </motion.button>

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  aria-label="Toggle menu"
                >
                  <motion.span animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 8 : 0 }}
                    className="block w-5 h-0.5 bg-current rounded-full origin-center" />
                  <motion.span animate={{ opacity: menuOpen ? 0 : 1, scaleX: menuOpen ? 0 : 1 }}
                    className="block w-5 h-0.5 bg-current rounded-full" />
                  <motion.span animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -8 : 0 }}
                    className="block w-5 h-0.5 bg-current rounded-full origin-center" />
                </button>
              </motion.div>

              {/* Mobile dropdown */}
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scaleY: 0.9 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -10, scaleY: 0.9 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-2 mx-2 origin-top rounded-xl border border-zinc-700/60
                               bg-zinc-900/97 backdrop-blur-xl overflow-hidden"
                  >
                    <div className="flex flex-col p-4 gap-1">
                      {navLinks.map((link) => (
                        <button
                          key={link.id}
                          onClick={() => { scrollToSection(link.id); setMenuOpen(false); }}
                          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium tracking-wide
                                     transition-colors duration-200 text-left"
                          style={{ color: activeSection === link.id ? "#60a5fa" : "#71717a" }}
                        >
                          {activeSection === link.id && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                          )}
                          <span className={activeSection === link.id ? "" : "ml-[18px]"}>{link.label}</span>
                        </button>
                      ))}
                      <div className="pt-2 border-t border-zinc-800 mt-1">
                        <button
                          onClick={() => { handleStart(); setMenuOpen(false); }}
                          className="w-full rounded-lg bg-blue-600 py-3 text-sm font-bold text-white
                                     shadow-lg transition-colors hover:bg-blue-500"
                        >
                          Get Started
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.nav>

            {/* ══════════════════ HERO ══════════════════ */}
            <section
              id="home"
              className="relative z-10 flex w-full max-w-7xl flex-col items-center justify-center
                         px-5 sm:px-8 pt-36 sm:pt-48 pb-32 sm:pb-44 text-center"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mb-8 sm:mb-10 inline-flex items-center gap-2 rounded-full border border-blue-500/30
                           bg-blue-500/10 px-4 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold
                           text-blue-300 tracking-widest uppercase"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
                Technological University of the Philippines
              </motion.div>

              {/* Logo — fixed square, object-contain so it never bends */}
              <motion.div
                className="mb-10 sm:mb-12"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              >
                <motion.div
                  animate={{ y: [0, -12, 0] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  {/* Glow ring */}
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl scale-110" />
                  {/* Fixed square container — object-contain prevents any stretching */}
                  <div className="relative z-10" style={{ width: 180, height: 180 }}>
                    <Image
                      src="/tup-siivs-logos.png"
                      alt="TUP-SIIVS Logo"
                      fill
                      className="object-contain drop-shadow-2xl"
                      priority
                    />
                  </div>
                </motion.div>
              </motion.div>

              {/* Headline */}
              <motion.h1
                className="max-w-xs sm:max-w-2xl md:max-w-4xl text-4xl sm:text-5xl md:text-7xl
                           font-extrabold leading-[1.1] tracking-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              >
                Welcome to{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-blue-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                    TUP-SIIVS
                  </span>
                  <span className="absolute -inset-2 rounded-xl bg-blue-500/10 blur-xl -z-10" />
                </span>
              </motion.h1>

              <motion.p
                className="mt-6 sm:mt-8 max-w-xs sm:max-w-xl md:max-w-3xl text-base sm:text-lg md:text-xl
                           leading-relaxed text-zinc-400"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.7 }}
              >
                A student information and identification validation system designed
                for a faster, smarter, and more secure campus experience.
              </motion.p>

              {/* CTA group */}
              <motion.div
                className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 w-full sm:w-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                {/* Primary — blue */}
                <motion.button
                  onClick={handleStart}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex w-full sm:w-auto h-12 sm:h-14 items-center justify-center gap-2 rounded-lg
                             bg-blue-600 px-8 sm:px-12 text-sm sm:text-base font-bold text-white
                             shadow-xl shadow-blue-900/50 transition-colors hover:bg-blue-500"
                >
                  Get Started
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </motion.button>

                {/* Secondary — ghost */}
                <motion.button
                  onClick={() => scrollToSection("about")}
                  whileHover={{ scale: 1.03, borderColor: "rgba(96,165,250,0.5)" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex w-full sm:w-auto h-12 sm:h-14 items-center justify-center rounded-lg
                             border border-zinc-700 px-8 sm:px-12 text-sm sm:text-base font-semibold text-zinc-300
                             transition-colors duration-200 hover:text-white hover:border-zinc-500"
                >
                  Learn More
                </motion.button>
              </motion.div>

              {/* Scroll hint */}
              <motion.div
                className="hidden sm:flex absolute bottom-10 left-1/2 -translate-x-1/2 flex-col items-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                transition={{ delay: 1.4 }}
              >
                <span className="text-xs tracking-widest text-zinc-600 uppercase">Scroll</span>
                <motion.div
                  animate={{ y: [0, 7, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-[1px] h-8 bg-gradient-to-b from-zinc-600 to-transparent"
                />
              </motion.div>
            </section>

            {/* ══════════════════ ABOUT ══════════════════ */}
            <section id="about" className="relative z-10 w-full max-w-7xl px-5 sm:px-8 py-24 sm:py-36">
              <motion.p
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="mb-3 sm:mb-4 text-xs font-bold tracking-[0.22em] text-blue-400 uppercase"
              >About</motion.p>

              <motion.h2
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl"
              >
                What is <span className="text-blue-400">TUP-SIIVS?</span>
              </motion.h2>

              <motion.div
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
                viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 sm:mt-8 mb-10 sm:mb-14 h-[2px] w-16 sm:w-20 origin-left bg-gradient-to-r from-blue-400 to-transparent"
              />

              <div className="grid md:grid-cols-2 gap-8 sm:gap-14 items-start">
                <motion.p
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.65 }}
                  className="text-base sm:text-lg md:text-xl leading-[1.8] sm:leading-[1.85] text-zinc-300"
                >
                  TUP-SIIVS (Student Information and Identification Validation
                  System) is a digital platform developed to streamline student
                  verification and campus entry processes. The system enhances
                  campus security by validating student identities through modern
                  authentication methods while maintaining an organized student
                  information database.
                </motion.p>
                <motion.p
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: 0.22, duration: 0.65 }}
                  className="text-base sm:text-lg md:text-xl leading-[1.8] sm:leading-[1.85] text-zinc-400"
                >
                  By integrating secure identification, real-time validation, and
                  efficient data management, TUP-SIIVS ensures a safer and smarter
                  environment for students, faculty, and administrators alike.
                </motion.p>
              </div>

              {/* Stats */}
              <div className="mt-12 sm:mt-16 grid grid-cols-3 gap-px rounded-xl overflow-hidden border border-zinc-800 bg-zinc-800">
                {[
                  { value: "100%",      label: "Digital" },
                  { value: "Real-Time", label: "Validation" },
                  { value: "Secure",    label: "Campus Access" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                    viewport={{ once: true }} transition={{ delay: 0.1 * i, duration: 0.6 }}
                    className="flex flex-col items-center justify-center py-8 sm:py-12 bg-zinc-900/80 text-center px-2"
                  >
                    <span className="text-xl sm:text-3xl font-extrabold text-blue-400 tracking-tight">{stat.value}</span>
                    <span className="mt-1 sm:mt-2 text-xs sm:text-sm text-zinc-500 tracking-wide">{stat.label}</span>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* ══════════════════ OUR PROJECT ══════════════════ */}
            <section id="projects" className="relative z-10 w-full max-w-7xl px-5 sm:px-8 py-24 sm:py-36">
              <motion.p
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="mb-3 sm:mb-4 text-xs font-bold tracking-[0.22em] text-blue-400 uppercase"
              >Our Project</motion.p>

              <motion.h2
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl"
              >
                Built for the <span className="text-blue-400">modern campus</span>
              </motion.h2>

              <motion.div
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
                viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 sm:mt-8 mb-10 sm:mb-16 h-[2px] w-16 sm:w-20 origin-left bg-gradient-to-r from-blue-400 to-transparent"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <FeatureCard delay={0}   icon="🔐" title="Secure Identity Validation" description="Real-time student identity verification using modern authentication to prevent unauthorized campus access." />
                <FeatureCard delay={0.1} icon="📋" title="Student Information System" description="Centralized, organized database of student records accessible to authorized faculty and administrators." />
                <FeatureCard delay={0.2} icon="⚡" title="Instant Processing"         description="Sub-second validation responses ensure smooth campus entry without creating bottlenecks or queues." />
                <FeatureCard delay={0.3} icon="📊" title="Analytics Dashboard"        description="Comprehensive insights into campus traffic, entry patterns, and student activity for administrators." />
                <FeatureCard delay={0.4} icon="📱" title="Mobile-Ready Interface"     description="Fully responsive design that works seamlessly across all devices — desktops, tablets, and phones." />
                <FeatureCard delay={0.5} icon="🛡️" title="Privacy & Compliance"       description="Built with data privacy standards in mind, protecting sensitive student information at every level." />
              </div>
            </section>

            {/* ══════════════════ TEAM ══════════════════ */}
            <section id="team" className="relative z-10 w-full max-w-7xl px-5 sm:px-8 py-24 sm:py-36">
              <motion.p
                initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.5 }}
                className="mb-3 sm:mb-4 text-xs font-bold tracking-[0.22em] text-blue-400 uppercase"
              >The Team</motion.p>

              <motion.h2
                initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl"
              >
                Meet the <span className="text-blue-400">people behind it</span>
              </motion.h2>

              <motion.div
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }}
                viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                className="mt-6 sm:mt-8 mb-3 sm:mb-4 h-[2px] w-16 sm:w-20 origin-left bg-gradient-to-r from-blue-400 to-transparent"
              />

              <motion.p
                initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.15, duration: 0.55 }}
                className="mb-10 sm:mb-14 text-sm sm:text-base text-zinc-500 max-w-lg"
              >
                The dedicated group of students from TUP working together to build a smarter, safer campus.
              </motion.p>

              {/* Photo card grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5 sm:gap-6">
                {TEAM_MEMBERS.map((member, i) => (
                  <TeamCard key={i} member={member} delay={i * 0.08} />
                ))}
              </div>

             <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6, duration: 0.6 }}
              >
              </motion.div>

              {/* CTA banner */}
              <motion.div
                initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="mt-20 sm:mt-24 rounded-xl border border-blue-500/20 bg-gradient-to-br
                           from-blue-500/10 to-indigo-500/5 p-8 sm:p-14 text-center backdrop-blur-sm"
              >
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">Ready to get started?</h3>
                <p className="mt-4 sm:mt-5 text-base sm:text-lg text-zinc-400 max-w-xl mx-auto leading-relaxed">
                  Join the TUP-SIIVS platform and experience next-generation campus security today.
                </p>
                <motion.button
                  onClick={handleStart}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.97 }}
                  className="mt-8 sm:mt-10 inline-flex h-12 sm:h-14 items-center justify-center gap-2 rounded-lg
                             bg-blue-600 px-8 sm:px-12 text-sm sm:text-base font-bold text-white
                             shadow-xl shadow-blue-900/50 transition-colors hover:bg-blue-500"
                >
                  Get Started Now
                </motion.button>
              </motion.div>
            </section>

            {/* ══════════════════ FOOTER ══════════════════ */}
            <footer className="relative z-10 w-full border-t border-zinc-800/60 px-5 sm:px-8 py-10 sm:py-12">
              <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative flex-shrink-0" style={{ width: 28, height: 28 }}>
                    <Image src="/tup-siivs-logos.png" alt="TUP-SIIVS" fill className="object-contain" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold tracking-widest text-zinc-500 uppercase">TUP-SIIVS</span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-600 text-center">
                  © {new Date().getFullYear()} TUP-SIIVS · Built with Next.js
                </p>
                <div className="flex gap-5 sm:gap-8 text-xs sm:text-sm text-zinc-600 flex-wrap justify-center">
                  <button onClick={() => scrollToSection("home")}     className="hover:text-blue-400 transition-colors">Home</button>
                  <button onClick={() => scrollToSection("about")}    className="hover:text-blue-400 transition-colors">About</button>
                  <button onClick={() => scrollToSection("projects")} className="hover:text-blue-400 transition-colors">Project</button>
                  <button onClick={() => scrollToSection("team")}     className="hover:text-blue-400 transition-colors">Team</button>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}