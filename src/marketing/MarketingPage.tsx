import { useRef, useState, type FormEvent, type PointerEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  MoveRight,
  RotateCcw,
  Search,
} from "lucide-react";
import { ImportDialog } from "../components/ImportDialog";
import { useLibrary } from "../lib/store";
import { isLowEndDevice, marketingMotion } from "./motion";
import "./marketing.css";

const clusters = ["PLACES", "RECIPES", "DESIGN", "SOMEDAY", "STUDY"];
const scraps = [
  ["place", "The quiet blue door", "/marketing/place-small.webp"],
  ["recipe", "Sunday lemon pasta", "/marketing/pasta-small.webp"],
  ["poster", "Poster with the circles", "/marketing/poster-small.webp"],
  ["quote", "Make time for the strange idea", ""],
  ["note", "book with the yellow cover", ""],
  ["map", "A tiny street near the water", ""],
  ["link", "The chair that folds flat", ""],
] as const;

const chapterMotion = {
  hidden: { opacity: 0, y: marketingMotion.distance.medium },
  visible: { opacity: 1, y: 0 },
};

export default function MarketingPage() {
  const { library, demo, user, loading, startDemo } = useLibrary();
  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  const returning = !loading && Boolean(library.items.length || demo || user);
  const enterSample = async () => {
    await startDemo();
    navigate("/app");
  };
  return (
    <div className="marketing-page">
      <a href="#marketing-main" className="skip-link">
        Skip to the story
      </a>
      <header className="marketing-nav">
        <Link to="/" className="brand" aria-label="Crate home">
          <span className="crate-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          crate<span className="brand-period">.</span>
        </Link>
        <div className="marketing-nav-actions">
          <a href="#how-it-works">How it works</a>
          {returning && (
            <Link className="button quiet" to="/app">
              Open Crate
            </Link>
          )}
          <button className="button purple" onClick={() => setImporting(true)}>
            Add my saves
          </button>
        </div>
      </header>
      <main id="marketing-main">
        <Hero
          onImport={() => setImporting(true)}
          onSample={enterSample}
          returning={returning}
        />
        <Story />
        <Shelf />
        <SearchDemo />
        <DragDemo />
        <Finale
          onImport={() => setImporting(true)}
          onSample={enterSample}
          returning={returning}
        />
      </main>
      <footer className="marketing-footer">
        <Link to="/" className="brand">
          crate<span className="brand-period">.</span>
        </Link>
        <p>Your original export stays on your device. No analytics. No ads.</p>
        <div>
          <Link to="/app/privacy">Privacy</Link>
          <Link to="/app/help">Help</Link>
        </div>
      </footer>
      {importing && (
        <ImportDialog
          onClose={() => setImporting(false)}
          onImported={() => navigate("/app")}
        />
      )}
    </div>
  );
}

function Hero({
  onImport,
  onSample,
  returning,
}: {
  onImport: () => void;
  onSample: () => void;
  returning: boolean;
}) {
  const reduce = useReducedMotion();
  return (
    <section className="marketing-hero">
      <div className="hero-copy">
        <p className="marketing-kicker">YOUR SAVES, OUT OF THE SCROLL</p>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: marketingMotion.duration.story,
            ease: marketingMotion.ease,
          }}
        >
          You saved it
          <br />
          <em>for a reason.</em>
        </motion.h1>
        <p className="marketing-lede">
          Crate turns the things you meant to remember into a private library
          you can actually find again.
        </p>
        <div className="hero-actions">
          <button className="button purple" onClick={onImport}>
            Bring in my saves <ArrowRight size={18} />
          </button>
          <button className="scribble-link" onClick={onSample}>
            Take a look around first <ArrowUpRight size={17} />
          </button>
          {returning && (
            <Link className="open-crate" to="/app">
              Go to my library <ArrowRight size={17} />
            </Link>
          )}
        </div>
        <p className="hero-privacy">
          <Check size={15} /> Your file is read in your browser. Keep this tab
          open while it imports.
        </p>
      </div>
      <div className="hero-collage" aria-hidden="true">
        <motion.div
          className="hero-photo hero-photo-place"
          initial={reduce ? false : { rotate: -11, y: 36 }}
          animate={{ rotate: -7, y: 0 }}
          transition={marketingMotion.spring}
        >
          <img src="/marketing/place.webp" alt="" />
        </motion.div>
        <motion.div
          className="hero-photo hero-photo-pasta"
          initial={reduce ? false : { rotate: 14, y: -24 }}
          animate={{ rotate: 8, y: 0 }}
          transition={marketingMotion.spring}
        >
          <img src="/marketing/pasta.webp" alt="" />
        </motion.div>
        <div className="hero-paper-note">
          why did I<br />
          save this?
        </div>
        <span className="hero-arrow">
          <MoveRight size={66} strokeWidth={1.3} />
        </span>
        <div className="hero-tape" />
      </div>
      <a className="scroll-cue" href="#how-it-works">
        See what happens <ArrowDown size={17} />
      </a>
    </section>
  );
}

function Story() {
  const reduce = useReducedMotion();
  const animate = !reduce && !isLowEndDevice();
  const reveal = animate ? chapterMotion.hidden : chapterMotion.visible;
  return (
    <section id="how-it-works" className="story" aria-labelledby="story-title">
      <div className="story-intro">
        <p className="marketing-kicker">FROM SAVED TO FOUND</p>
        <h2 id="story-title">
          A home for every
          <br />
          <em>good thing.</em>
        </h2>
        <p>
          Three small moves turn a crowded export into a library that feels like
          yours.
        </p>
      </div>
      <div className="story-chapters">
        <motion.article
          className="story-chapter story-chapter-save"
          initial={reveal}
          whileInView={chapterMotion.visible}
          viewport={{ once: true, amount: 0.35 }}
          transition={marketingMotion.spring}
        >
          <div className="chapter-copy">
            <span>01 / SAVE</span>
            <h3>Keep the spark.</h3>
            <p>
              Bring the posts you already saved. The original words stay intact
              and private.
            </p>
          </div>
          <div
            className="chapter-illustration save-illustration"
            aria-hidden="true"
          >
            <div className="illustration-orbit" />
            <div className="illustration-scraps">
              {scraps.slice(0, 5).map(([kind, label, image], index) => (
                <motion.div
                  className={`mini-scrap mini-scrap-${index + 1} mini-scrap-${kind}`}
                  key={label}
                  initial={
                    animate
                      ? { opacity: 0, scale: marketingMotion.scale.in }
                      : false
                  }
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.7 }}
                  transition={{
                    ...marketingMotion.spring,
                    delay: index * marketingMotion.stagger.quick,
                  }}
                >
                  {image ? (
                    <img src={image} alt="" loading="lazy" />
                  ) : (
                    <span>{label}</span>
                  )}
                </motion.div>
              ))}
            </div>
            <span className="illustration-note">saved for later</span>
          </div>
        </motion.article>
        <motion.article
          className="story-chapter story-chapter-sort"
          initial={reveal}
          whileInView={chapterMotion.visible}
          viewport={{ once: true, amount: 0.35 }}
          transition={marketingMotion.spring}
        >
          <div className="chapter-copy">
            <span>02 / SORT</span>
            <h3>See the connections.</h3>
            <p>
              Crate suggests useful shelves. You review each one and decide what
              belongs.
            </p>
          </div>
          <div
            className="chapter-illustration sort-illustration"
            aria-hidden="true"
          >
            <div className="sort-lines">
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className="sort-center">
              YOUR
              <br />
              SAVES
            </div>
            {clusters.slice(0, 4).map((cluster, index) => (
              <motion.span
                className={`sort-label sort-label-${index + 1}`}
                key={cluster}
                initial={
                  animate
                    ? { opacity: 0, scale: marketingMotion.scale.in }
                    : false
                }
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.7 }}
                transition={{
                  ...marketingMotion.spring,
                  delay: index * marketingMotion.stagger.standard,
                }}
              >
                {cluster}
              </motion.span>
            ))}
          </div>
        </motion.article>
        <motion.article
          className="story-chapter story-chapter-find"
          initial={reveal}
          whileInView={chapterMotion.visible}
          viewport={{ once: true, amount: 0.35 }}
          transition={marketingMotion.spring}
        >
          <div className="chapter-copy">
            <span>03 / FIND</span>
            <h3>Remember one detail.</h3>
            <p>
              Describe what stuck—the tiny menu, the blue door, the yellow
              cover—and find it again.
            </p>
          </div>
          <div className="chapter-illustration find-illustration">
            <div className="story-query">
              <Search size={18} />
              <span>that pasta place with the tiny menu</span>
            </div>
            <motion.div
              className="bar-sera"
              data-testid="bar-sera-card"
              initial={
                animate
                  ? {
                      opacity: 0,
                      y: marketingMotion.distance.medium,
                      rotate: -5,
                    }
                  : false
              }
              whileInView={{ opacity: 1, y: 0, rotate: -2 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={marketingMotion.spring}
            >
              <picture>
                <source
                  media="(max-width: 600px)"
                  srcSet="/marketing/pasta-small.webp"
                />
                <img
                  src="/marketing/pasta.webp"
                  alt="A bowl of lemon pasta beside a tiny illustrated menu"
                  loading="lazy"
                />
              </picture>
              <div>
                <span className="save-age">SAVED 8 MONTHS AGO</span>
                <h3>Bar Sera</h3>
                <p>Tiny menu. Lemon pasta. The table by the window.</p>
              </div>
            </motion.div>
            <span className="found-mark" aria-hidden="true">
              FOUND IT!
            </span>
          </div>
        </motion.article>
      </div>
    </section>
  );
}

function Shelf() {
  const reduce = useReducedMotion();
  const animate = !reduce && !isLowEndDevice();
  const cards = [
    ["PLACES", "Somewhere worth going", "/marketing/place.webp", "18 saves"],
    ["RECIPES", "Things worth making", "/marketing/pasta.webp", "26 saves"],
    ["DESIGN", "Ideas with good bones", "/marketing/poster.webp", "14 saves"],
    ["SOMEDAY", "Not today. Still good.", "/marketing/place.webp", "31 saves"],
    ["STUDY", "Come back curious", "/marketing/poster.webp", "22 saves"],
  ];
  return (
    <section className="shelf-section" aria-labelledby="shelf-title">
      <div className="shelf-heading">
        <p className="marketing-kicker">A PLACE FOR EVERY CURIOSITY</p>
        <h2 id="shelf-title">
          Your own little world.<sup>05</sup>
        </h2>
      </div>
      <div
        className="collection-shelf"
        tabIndex={0}
        role="list"
        aria-label="Example Crate collections"
      >
        {cards.map(([name, copy, image, count], i) => (
          <motion.article
            className={`shelf-card shelf-card-${i}`}
            role="listitem"
            key={name}
            initial={
              animate
                ? {
                    opacity: 0,
                    y: marketingMotion.distance.medium,
                    rotate: i % 2 ? 2 : -2,
                  }
                : false
            }
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{
              ...marketingMotion.spring,
              delay: i * marketingMotion.stagger.quick,
            }}
          >
            <img src={image} alt="" loading="lazy" />
            <span>{count}</span>
            <h3>{name}</h3>
            <p>{copy}</p>
          </motion.article>
        ))}
      </div>
      <p className="shelf-hint">
        Swipe to wander <ArrowRight size={16} />
      </p>
    </section>
  );
}

function SearchDemo() {
  const [query, setQuery] = useState("that pasta place with the tiny menu");
  const [message, setMessage] = useState("");
  const [found, setFound] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) {
      setFound(false);
      setMessage("Try describing anything you remember about the save.");
      return;
    }
    setFound(true);
    setMessage("Found Bar Sera in the demonstration library.");
  };
  return (
    <section className="search-demo" aria-labelledby="search-demo-title">
      <div>
        <p className="marketing-kicker">MEMORY IS MESSY. SEARCH CAN BE TOO.</p>
        <h2 id="search-demo-title">
          Describe the thing.
          <br />
          <em>Crate finds the save.</em>
        </h2>
        <p>No perfect keywords required. Use the detail that stuck.</p>
      </div>
      <div className="search-paper">
        <form onSubmit={submit}>
          <label htmlFor="demo-search">What do you remember?</label>
          <div>
            <input
              id="demo-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button aria-label="Search demonstration">
              <Search size={22} />
            </button>
          </div>
        </form>
        <p className="sr-only" aria-live="polite">
          {message}
        </p>
        {message && !found && (
          <p className="demo-help" role="status">
            {message}
          </p>
        )}
        <AnimatePresence>
          {found && (
            <motion.article
              className="search-result"
              initial={{ opacity: 0, y: 18, rotate: -2 }}
              animate={{ opacity: 1, y: 0, rotate: 1 }}
              transition={marketingMotion.spring}
            >
              <img
                src="/marketing/pasta-small.webp"
                alt="A bowl of lemon pasta"
              />
              <div>
                <span>SAVED 8 MONTHS AGO</span>
                <h3>Bar Sera</h3>
                <p>Tiny menu. Lemon pasta. The table by the window.</p>
              </div>
            </motion.article>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

function DragDemo() {
  const [placed, setPlaced] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, y: 0 });
  const target = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const place = () => {
    setPlaced(true);
    setPosition({ x: 0, y: 0 });
  };
  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (placed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragging && !placed)
      setPosition({
        x: e.clientX - start.current.x,
        y: e.clientY - start.current.y,
      });
  };
  const onPointerUp = (e: PointerEvent<HTMLButtonElement>) => {
    setDragging(false);
    const rect = target.current?.getBoundingClientRect();
    if (
      rect &&
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    )
      place();
    else if (!reduce) setPosition({ x: 0, y: 0 });
  };
  return (
    <section className="drag-demo" aria-labelledby="drag-title">
      <div className="drag-copy">
        <p className="marketing-kicker">YOUR HANDS ARE ALLOWED</p>
        <h2 id="drag-title">
          Toss it where
          <br />
          it belongs.
        </h2>
        <p>
          Drag the save into Recipes, or use the button. This demo never changes
          your library.
        </p>
        <button
          className="button quiet"
          onClick={placed ? () => setPlaced(false) : place}
        >
          {placed ? (
            <>
              <RotateCcw size={17} /> Reset demo
            </>
          ) : (
            <>
              Put in Recipes <ArrowRight size={17} />
            </>
          )}
        </button>
      </div>
      <div className="drag-board">
        <button
          className={`throw-card ${placed ? "is-placed" : ""}`}
          style={{
            transform: placed
              ? "translate(0, 0) rotate(2deg)"
              : `translate(${position.x}px, ${position.y}px) rotate(-5deg)`,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              place();
            }
          }}
          aria-label="Lemon pasta save. Drag to Recipes or press Enter to place it."
        >
          <img src="/marketing/pasta-small.webp" alt="" draggable={false} />
          <span>Lemon pasta for Sunday</span>
        </button>
        <div
          ref={target}
          className={`drop-collection ${placed ? "has-save" : ""}`}
        >
          <span>02 / COLLECTION</span>
          <h3>RECIPES</h3>
          <p>{placed ? "27 saves" : "Drop it here"}</p>
          {placed && <img src="/marketing/pasta-small.webp" alt="" />}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {placed
          ? "Lemon pasta was placed in Recipes."
          : "The drag demonstration is reset."}
      </p>
    </section>
  );
}

function Finale({
  onImport,
  onSample,
  returning,
}: {
  onImport: () => void;
  onSample: () => void;
  returning: boolean;
}) {
  return (
    <section className="marketing-finale">
      <div className="finale-star" aria-hidden="true">
        ✳
      </div>
      <p className="marketing-kicker">KEEP THE GOOD STUFF</p>
      <h2>
        Less scrolling.
        <br />
        <em>More finding.</em>
      </h2>
      <p>Bring your saved_posts.json. Crate handles it here in your browser.</p>
      <div>
        <button className="button purple" onClick={onImport}>
          Start my Crate <ArrowRight size={18} />
        </button>
        <button className="scribble-link" onClick={onSample}>
          Explore the sample
        </button>
        {returning && (
          <Link className="scribble-link" to="/app">
            Return to Crate
          </Link>
        )}
      </div>
    </section>
  );
}
