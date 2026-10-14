import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import './App.css'

const features = [
  {
    title: 'Live worldwide',
    copy: 'Sports, news, and local channels stream in crisp HD with an EPG that stays out of your way.',
  },
  {
    title: 'On-demand library',
    copy: 'Movies and series ready when you are — start on one screen, finish on another.',
  },
  {
    title: 'Stable by design',
    copy: 'Adaptive bitrate and multi-CDN routing keep playback smooth through busy nights.',
  },
]

const devices = [
  'Smart TVs',
  'Fire TV & Android',
  'Apple TV & iOS',
  'Windows & macOS',
  'Mag & Formuler',
]

const plans = [
  {
    id: 'month',
    name: 'Monthly',
    price: '$14',
    period: '/mo',
    desc: 'Full catalog, one screen, cancel anytime.',
  },
  {
    id: 'quarter',
    name: 'Quarterly',
    price: '$36',
    period: '/3 mo',
    desc: 'Two screens and priority support built in.',
  },
  {
    id: 'year',
    name: 'Annual',
    price: '$99',
    period: '/yr',
    desc: 'Best value — four screens for the whole home.',
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
}

function App() {
  const reduceMotion = useReducedMotion()
  const [selectedPlan, setSelectedPlan] = useState('quarter')

  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.7, ease: [0.22, 1, 0.36, 1] as const }

  return (
    <div className="site">
      <header className="nav">
        <a className="nav-brand" href="#top">
          Kayla <span>IPTV</span>
        </a>
        <nav className="nav-links" aria-label="Primary">
          <a href="#experience">Experience</a>
          <a href="#devices">Devices</a>
          <a href="#plans">Plans</a>
          <a className="nav-cta" href="#plans">
            Start watching
          </a>
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-label="Kayla IPTV">
          <div className="hero-media" aria-hidden="true">
            <img
              src="https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=2400&q=80"
              alt=""
              width={2400}
              height={1600}
            />
            <div className="hero-scan" />
          </div>

          <div className="hero-copy">
            <motion.p
              className="brand-mark"
              initial={reduceMotion ? false : { opacity: 0, y: 36 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: reduceMotion ? 0 : 0.05 }}
            >
              Kayla <em>IPTV</em>
            </motion.p>
            <motion.h1
              className="hero-headline"
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: reduceMotion ? 0 : 0.18 }}
            >
              Television that follows your night.
            </motion.h1>
            <motion.p
              className="hero-support"
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: reduceMotion ? 0 : 0.3 }}
            >
              Live channels, sports, and on-demand — tuned for every screen in the house.
            </motion.p>
            <motion.div
              className="cta-row"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...transition, delay: reduceMotion ? 0 : 0.42 }}
            >
              <a className="btn btn-primary" href="#plans">
                Choose a plan
              </a>
              <a className="btn btn-ghost" href="#experience">
                See how it plays
              </a>
            </motion.div>
          </div>
        </section>

        <section className="section experience" id="experience">
          <motion.div
            className="section-head"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            transition={transition}
          >
            <p className="section-kicker">The experience</p>
            <h2 className="section-title">One stream. Zero fuss.</h2>
            <p className="section-copy">
              Kayla keeps the interface quiet so the picture stays loud — from kickoff to late-night reruns.
            </p>
          </motion.div>

          <div className="feature-rail">
            {features.map((feature, index) => (
              <motion.article
                className="feature-item"
                key={feature.title}
                variants={fadeUp}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.35 }}
                transition={{ ...transition, delay: reduceMotion ? 0 : index * 0.08 }}
              >
                <span className="feature-index">0{index + 1}</span>
                <div>
                  <h3>{feature.title}</h3>
                  <p>{feature.copy}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="section devices" id="devices">
          <motion.div
            className="section-head"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            transition={transition}
          >
            <p className="section-kicker">Everywhere</p>
            <h2 className="section-title">Watch where you already live.</h2>
            <p className="section-copy">
              Install once on the screen you use most — then cast or sign in on the rest.
            </p>
          </motion.div>

          <motion.div
            className="device-stage"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={transition}
          >
            <img
              src="https://images.unsplash.com/photo-1461151304267-38535e780c79?auto=format&fit=crop&w=2000&q=80"
              alt="Living room television with ambient lighting"
              width={2000}
              height={1200}
            />
            <div className="device-copy">
              <h3 className="section-title" style={{ fontSize: '1.65rem' }}>
                Built for the living room first.
              </h3>
              <ul className="device-list">
                {devices.map((device) => (
                  <li key={device}>{device}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        </section>

        <section className="section plans" id="plans">
          <motion.div
            className="section-head"
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            transition={transition}
          >
            <p className="section-kicker">Plans</p>
            <h2 className="section-title">Pick the night that fits.</h2>
            <p className="section-copy">
              Simple pricing. Instant activation. No hardware lock-in.
            </p>
          </motion.div>

          <div className="plan-picker" role="listbox" aria-label="Subscription plans">
            {plans.map((plan) => {
              const selected = selectedPlan === plan.id
              return (
                <button
                  key={plan.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`plan${selected ? ' is-selected' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-price">
                    {plan.price}
                    <span>{plan.period}</span>
                  </div>
                  <p className="plan-desc">{plan.desc}</p>
                </button>
              )
            })}
          </div>
          <p className="plan-note">
            Selected: <strong style={{ color: 'var(--snow)' }}>{plans.find((p) => p.id === selectedPlan)?.name}</strong>
            {' — '}demo pricing for this marketing site.
          </p>
        </section>

        <section className="finale" aria-label="Get started">
          <p className="section-kicker">Ready when you are</p>
          <h2 className="section-title">Press play on Kayla tonight.</h2>
          <p className="section-copy">
            Start with a plan, open your favorite player, and settle in.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#plans">
              Get Kayla IPTV
            </a>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>© 2026 Kayla IPTV</span>
        <span>Marketing demo — bring your own licensed content source.</span>
      </footer>
    </div>
  )
}

export default App
