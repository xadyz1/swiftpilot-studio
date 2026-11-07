import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import {
  ArrowRight,
  Check,
  Globe2,
  Moon,
  Play,
  Sparkles,
  Sun,
  WandSparkles,
  CalendarDays,
  Layers3,
  Send,
  MousePointer2,
  Image,
  Video,
  Palette,
  LogIn,
  Layers,
  Clapperboard,
  ShieldCheck,
  Maximize2,
  FileCheck,
  Download,
  Share2,
  X,
  Building,
  Mail,
  User,
  Hash,
} from 'lucide-react';
import './landing.css';

type Lang = 'pt' | 'en';
type AspectRatioKey = '1:1' | '4:5' | '9:16' | '16:9';

const copy = {
  pt: {
    nav: ['Funcionalidades', 'Como Funciona', 'Preços', 'Pedir Orçamento'],
    eyebrow: 'GERAÇÃO ALIMENTADA POR IA / SOCIAL STUDIO',
    titleMain: 'O Seu Estúdio Social',
    titleGradient: 'Autopilotado.',
    sub: 'A partir do seu website, extraímos a sua identidade, criamos o seu calendário de conteúdos e preparamos posts prontos para publicar.',
    primary: 'Começar Agora',
    login: 'Login / Dashboard',
    secondary: 'Ver Funcionalidades',
    proof: 'Uma identidade. Todos os canais. Mais ritmo e escala para as suas marcas.',
    featuresHeader: 'Tudo o que precisa para crescer.',
    featuresSub: 'Funcionalidades desenhadas para automação máxima e rigor criativo sem esforço.',
    features: [
      {
        id: 'brand',
        badge: 'Extração Automática',
        title: 'Identidade de Marca Automática',
        desc: 'Fazemos crawl seguro ao seu website e extraímos as suas cores primárias, tom de voz, tipografia Poppins e imagens com proveniência real.',
        icon: 'palette',
      },
      {
        id: 'calendar',
        badge: 'Planeamento Inteligente',
        title: 'Plano de Calendário Inteligente',
        desc: 'Gere automaticamente meses de conteúdo estruturado, distribuído de forma otimizada para a sua audiência no Instagram e TikTok.',
        icon: 'calendar',
      },
      {
        id: 'studio',
        badge: 'Novo Visual Studio',
        title: 'Visual Studio Multi-Formato & Live Preview',
        desc: 'Desenhe e edite criativos em tempo real com live preview WYSIWYG nas proporções 1:1, 4:5, 9:16 e 16:9 sem surpresas no download.',
        icon: 'maximize',
      },
      {
        id: 'presets',
        badge: 'Design Flexível',
        title: '6 Presets de Design de Alto Impacto',
        desc: 'Alterne instantaneamente entre Bold Editorial, Cinematic Bleed, Framed Minimalist, Modern Split Card, Product Spotlight e Quote / Manifesto.',
        icon: 'layers',
      },
      {
        id: 'carousels',
        badge: 'Engage Máximo',
        title: 'Carrosséis Multi-Slide & Reels 9:16',
        desc: 'Construa carrosséis de várias páginas com exportação sequencial automática em alta resolução e gere vídeos com animações suaves de zoom e texto.',
        icon: 'video',
      },
      {
        id: 'publishing',
        badge: 'Sincronização',
        title: 'Publicação Postiz & Exportação Retina 2x',
        desc: 'Ligue a sua instância Postiz para agendar diretamente ou exporte em PNG 2x Retina Ultra-HD, pacotes de texto e ficheiros CSV.',
        icon: 'send',
      },
    ],
    interactiveTitle: 'Experimente os formatos em direto:',
    workflowHeader: 'Como o SwiftPilot funciona.',
    workflowSub: 'Do endereço web até ao criativo pronto para ser publicado em 4 passos simples.',
    steps: [
      ['01', 'Crawl Seguro do Website', 'Introduza o URL público da sua marca. Analisamos o robots.txt e recolhemos páginas, produtos e imagens sem scripts lentos.'],
      ['02', 'Extração de Cores & Poppins', 'Identificamos a paleta cromática, as fontes e os recursos visuais para criar um Brand Kit consistente.'],
      ['03', 'Geração Fatual & Visual Studio', 'A IA formula propostas de conteúdo baseadas 100% em factos do seu site. Edite textos, cores e posições no canvas interativo.'],
      ['04', 'Agendamento & Exportação', 'Guarde no calendário interno, exporte em PNG Retina 2x de ultra-definição ou sincronize com o Postiz.'],
    ],
    showcaseTitle: 'Um Visual Studio completo.',
    showcaseSub: 'Quatro rácios sociais, sete tamanhos de anúncio e seis presets de design — tudo com a sua marca aplicada em direto.',
    showcaseSizesTitle: 'Todos os formatos, um só canvas',
    showcaseThemesTitle: 'Seis presets de design',
    pricing: 'Planos simples.',
    pricingNote: 'Preços sem IVA · faturação anual = 10× mensal (2 meses grátis).',
    pricingTiers: [
      { name: 'Starter', price: '€10', period: '/mês', tagline: '1 website',
        features: ['Importação de website & Brand Kit', 'Visual Studio (4 rácios sociais)', 'Calendário com drag-and-drop', 'Exportações PNG Retina 2x', '1 website / projeto'], cta: 'Começar Agora' },
      { name: 'Pro', price: '€25', period: '/mês', tagline: 'Websites ilimitados',
        features: ['Tudo no Starter', '7 tamanhos de anúncio + HTML5', 'GIF & WebM animados', 'Projetos e marcas ilimitados', 'Integração Postiz', 'Suporte prioritário'], cta: 'Pedir Pro' },
    ],
    modalTitle: 'Pedir Orçamento',
    modalSub: 'Preencha os dados abaixo e entraremos em contacto brevemente com uma proposta feita à medida.',
    modalName: 'Nome completo',
    modalEmail: 'Email profissional',
    modalBrands: 'Número de websites / marcas',
    modalNotes: 'Notas ou URL do projeto (opcional)',
    modalSubmit: 'Enviar Pedido de Orçamento',
    modalSuccess: 'Obrigado! O seu pedido foi registado com sucesso.',
    ctaTitle: 'A sua próxima campanha começa no seu website.',
    ctaSub: 'Transforme o conteúdo que já tem num motor visual e constante de crescimento social.',
    ctaButton: 'Abrir SwiftPilot Studio',
    footer: 'SwiftPilot Social Studio · O seu estúdio autopilotado.',
  },
  en: {
    nav: ['Features', 'How It Works', 'Pricing', 'Request Pricing'],
    eyebrow: 'AI-POWERED GENERATION / SOCIAL STUDIO',
    titleMain: 'Your Social Studio',
    titleGradient: 'On Autopilot.',
    sub: 'From your website, we extract your brand identity, generate your content calendar, and prepare posts ready to publish.',
    primary: 'Get Started',
    login: 'Login / Dashboard',
    secondary: 'View Features',
    proof: 'One identity. Every channel. Real momentum and scale for your brands.',
    featuresHeader: 'Everything you need to grow.',
    featuresSub: 'Features engineered for maximum automation and creative precision.',
    features: [
      {
        id: 'brand',
        badge: 'Auto Extraction',
        title: 'Automatic Brand Identity',
        desc: 'Safely crawl your website and extract primary & secondary colors, tone of voice, Poppins typography, and media with authentic provenance.',
        icon: 'palette',
      },
      {
        id: 'calendar',
        badge: 'Smart Planning',
        title: 'Smart Content Calendar',
        desc: 'Automatically generate months of structured, factual content optimally distributed for your audience across Instagram and TikTok.',
        icon: 'calendar',
      },
      {
        id: 'studio',
        badge: 'New Visual Studio',
        title: 'Multi-Format Visual Studio & Live Preview',
        desc: 'Design and customize posts in real time with true WYSIWYG live preview across 1:1, 4:5, 9:16, and 16:9 aspect ratios without download surprises.',
        icon: 'maximize',
      },
      {
        id: 'presets',
        badge: 'Flexible Design',
        title: '6 High-Impact Design Layout Presets',
        desc: 'Instantly toggle between Bold Editorial, Cinematic Bleed, Framed Minimalist, Modern Split Card, Product Spotlight, and Quote / Manifesto.',
        icon: 'layers',
      },
      {
        id: 'carousels',
        badge: 'High Engagement',
        title: 'Multi-Slide Carousels & 9:16 Video Reels',
        desc: 'Craft multi-page carousel swipeable cards with automatic sequential Retina export, or generate vertical video reels with smooth motion presets.',
        icon: 'video',
      },
      {
        id: 'publishing',
        badge: 'Seamless Sync',
        title: 'Postiz Publishing & 2x Retina Export',
        desc: 'Connect your Postiz instance to schedule directly to Instagram and TikTok, or download 2x Ultra-HD Retina PNGs, copy packages, and CSVs.',
        icon: 'send',
      },
    ],
    interactiveTitle: 'Test live formats in real time:',
    workflowHeader: 'How SwiftPilot works.',
    workflowSub: 'From your website URL to publish-ready creatives in 4 simple steps.',
    steps: [
      ['01', 'Safe Public Website Crawl', 'Enter your public website URL. We respect robots.txt and collect pages, products, and media safely.'],
      ['02', 'Color & Poppins Extraction', 'We extract your color palette, typography, and visual assets into a persistent, reusable Brand Kit.'],
      ['03', 'Grounded AI & Visual Studio', 'AI generates content strictly grounded in your site claims. Fine-tune headlines, layouts, and copy on the live canvas.'],
      ['04', 'Schedule & Export', 'Save to your calendar, export in 2x Retina Ultra-HD PNGs, or queue directly into Postiz.'],
    ],
    showcaseTitle: 'A complete Visual Studio.',
    showcaseSub: 'Four social ratios, seven ad sizes and six design presets — all with your brand applied live.',
    showcaseSizesTitle: 'Every format, one canvas',
    showcaseThemesTitle: 'Six design presets',
    pricing: 'Simple plans.',
    pricingNote: 'Prices ex. VAT · annual billing = 10× monthly (2 months free).',
    pricingTiers: [
      { name: 'Starter', price: '€10', period: '/mo', tagline: '1 website',
        features: ['Website import & Brand Kit', 'Visual Studio (4 social ratios)', 'Drag-and-drop calendar', 'Retina 2x PNG exports', '1 website / project'], cta: 'Start Now' },
      { name: 'Pro', price: '€25', period: '/mo', tagline: 'Unlimited websites',
        features: ['Everything in Starter', '7 ad sizes + HTML5 export', 'Animated GIF & WebM', 'Unlimited projects & brands', 'Postiz integration', 'Priority support'], cta: 'Get Pro' },
    ],
    modalTitle: 'Request Pricing',
    modalSub: 'Fill in your details below and we will contact you shortly with a tailored proposal.',
    modalName: 'Full Name',
    modalEmail: 'Work Email',
    modalBrands: 'Number of websites / brands',
    modalNotes: 'Project URL or notes (optional)',
    modalSubmit: 'Submit Request',
    modalSuccess: 'Thank you! Your request has been received.',
    ctaTitle: 'Your next campaign starts on your website.',
    ctaSub: 'Turn existing assets into a consistent, visual growth engine for every channel.',
    ctaButton: 'Open SwiftPilot Studio',
    footer: 'SwiftPilot Social Studio · Your autopilot studio.',
  },
};

const SWIFTADS_SRC = 'https://swiftads.pt/sdk.js';
function useSwiftAds() {
  useEffect(() => {
    if (document.querySelector(`script[src="${SWIFTADS_SRC}"]`)) return;
    const script = document.createElement('script');
    script.async = true;
    script.src = SWIFTADS_SRC;
    script.dataset.siteKey = 'sspk_d7abe22d127142308338';
    document.head.appendChild(script);
  }, []);
}

function useReveal() {
  useEffect(() => {
    const nodes = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) entry.target.classList.add('is-visible');
        });
      },
      { threshold: 0.1 }
    );
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);
}

export default function Landing() {
  const [lang, setLang] = useState<Lang>('pt');
  const [dark, setDark] = useState(true);
  const [menu, setMenu] = useState(false);
  const [interactiveRatio, setInteractiveRatio] = useState<AspectRatioKey>('1:1');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Modal Form State
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formBrands, setFormBrands] = useState(1);
  const [formNotes, setFormNotes] = useState('');

  useReveal();
  useSwiftAds();
  const t = copy[lang];

  const logo = dark
    ? '/landing/swiftpilot-dark-reference.png'
    : '/landing/swiftpilot-light-reference.png';
  const mark = '/landing/swiftpilot-mark-reference.jpeg';

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await fetch('/api/studio/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, email: formEmail, brands: formBrands, notes: formNotes }) });
    } catch { /* lead capture must never block the UX */ }
    setSubmitted(true);
    setTimeout(() => {
      setIsModalOpen(false);
      setSubmitted(false);
      setFormName('');
      setFormEmail('');
      setFormBrands(1);
      setFormNotes('');
    }, 2000);
  };

  return (
    <div className={`landing ${dark ? 'landing-dark' : 'landing-light'}`}>
      {/* Background Ambience Orbs */}
      <div className="landing-orb orb-one" />
      <div className="landing-orb orb-two" />

      {/* 1. TOP NAVIGATION BAR */}
      <header className="landing-nav">
        <a className="landing-logo" href="/">
          <img src={logo} alt="SwiftPilot Social Studio" />
        </a>

        <nav className={menu ? 'open' : ''}>
          <a href="#features" onClick={() => setMenu(false)}>{t.nav[0]}</a>
          <a href="#workflow" onClick={() => setMenu(false)}>{t.nav[1]}</a>
          <a href="#pricing" onClick={() => setMenu(false)}>{t.nav[2]}</a>
          <button
            type="button"
            className="nav-quote-btn"
            onClick={() => {
              setMenu(false);
              setIsModalOpen(true);
            }}
          >
            {t.nav[3]}
          </button>
        </nav>

        <div className="nav-tools">
          <button
            className="lang-toggle"
            onClick={() => setLang(lang === 'en' ? 'pt' : 'en')}
            aria-label="Change language"
          >
            <Globe2 size={15} />
            <strong>{lang.toUpperCase()}</strong>
          </button>

          <button
            className="theme-toggle"
            onClick={() => setDark(!dark)}
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <a className="login-link" href="/studio">
            <LogIn size={15} />
            <span>{t.login}</span>
          </a>

          <a className="nav-cta" href="/studio">
            <span>{t.primary}</span>
            <ArrowRight size={15} />
          </a>

          <button
            className="menu-toggle"
            onClick={() => setMenu(!menu)}
            aria-label="Open menu"
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <main>
        {/* 2. HERO SECTION */}
        <section className="hero" id="hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="pulse" />
              <span>{t.eyebrow}</span>
            </div>

            <h1>
              {t.titleMain}
              <br />
              <span className="gradient-text">{t.titleGradient}</span>
            </h1>

            <p>{t.sub}</p>

            <div className="hero-actions">
              <a className="landing-button primary" href="/studio">
                <span>{t.primary}</span>
                <ArrowRight size={17} />
              </a>

              <a className="landing-button ghost" href="#features">
                <span className="play">
                  <Play size={12} fill="currentColor" />
                </span>
                <span>{t.secondary}</span>
              </a>
            </div>

            <div className="hero-proof">
              <div className="proof-avatars">
                <span>SP</span>
                <span>AI</span>
                <span>✦</span>
              </div>
              <span>{t.proof}</span>
            </div>
          </div>

          {/* Hero Stage / Visual Studio Mockup Window */}
          <div className="hero-stage">
            <div className="stage-glow" />
            <div className="stage-window">
              <div className="window-top">
                <span />
                <span />
                <span />
                <small>swiftpilot / visual studio · 1:1 square · poppins bold</small>
              </div>

              <div className="stage-content">
                <div className="stage-kicker">HUNGRY POCKETS · STREETWEAR</div>
                <h2>
                  STARTED ON
                  <br />
                  <strong>CONCRETE.</strong>
                </h2>
                <div className="stage-line" />

                <div className="stage-cards">
                  <div>
                    <CalendarDays size={16} />
                    <b>18</b>
                    <small>ideas planned</small>
                  </div>
                  <div>
                    <Layers3 size={16} />
                    <b>05</b>
                    <small>brands live</small>
                  </div>
                  <div>
                    <Send size={16} />
                    <b>2x</b>
                    <small>Retina HD</small>
                  </div>
                </div>

                <div className="stage-grid">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className="float-chip chip-a">
              <Sparkles size={14} />
              <span>Source-Grounded AI</span>
            </div>

            <div className="float-chip chip-b">
              <Check size={14} />
              <span>Poppins Bold Typography</span>
            </div>

            <div className="scroll-cue">
              <MousePointer2 size={14} />
              <span>SCROLL TO EXPLORE</span>
            </div>
          </div>
        </section>

        {/* Marquee Ticker */}
        <section className="marquee">
          <div>
            {[
              'BRAND CRAWLER',
              'POPPINS BOLD',
              'VISUAL STUDIO',
              '1:1 SQUARE',
              '9:16 REELS',
              '16:9 BANNER',
              'CAROUSELS',
              'RETINA 2X EXPORT',
              'POSTIZ PUBLISHING',
            ].map((word, i) => (
              <span key={i}>
                {word}
                <b>✦</b>
              </span>
            ))}
          </div>
        </section>

        {/* 3. DETAILED FEATURES SECTION (#features) */}
        <section className="features-section section" id="features">
          <div className="section-intro reveal">
            <span className="section-number">01 / 04 · FEATURES</span>
            <h2>{t.featuresHeader}</h2>
            <p>{t.featuresSub}</p>
          </div>

          <div className="features-grid">
            {t.features.map((feat, idx) => (
              <article
                key={feat.id}
                className="feature-card reveal"
                style={{ '--delay': `${idx * 80}ms` } as CSSProperties}
              >
                <div className="feature-card-top">
                  <div className={`feature-icon-box box-${feat.id}`}>
                    {feat.icon === 'palette' && <Palette size={22} />}
                    {feat.icon === 'calendar' && <CalendarDays size={22} />}
                    {feat.icon === 'maximize' && <Maximize2 size={22} />}
                    {feat.icon === 'layers' && <Layers size={22} />}
                    {feat.icon === 'video' && <Video size={22} />}
                    {feat.icon === 'send' && <Send size={22} />}
                  </div>
                  <span className="feature-badge">{feat.badge}</span>
                </div>

                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>

                {/* Specific interactive / rich micro-visuals per feature */}
                {feat.id === 'brand' && (
                  <div className="micro-brand-widget">
                    <div className="micro-color-dots">
                      <span style={{ background: '#1D84F5' }} title="Primary Blue" />
                      <span style={{ background: '#FF7300' }} title="Accent Flame" />
                      <span style={{ background: '#10141e' }} title="Deep Canvas" />
                      <span style={{ background: '#F8FAFC' }} title="Clean Text" />
                    </div>
                    <div className="micro-font-pill">
                      <strong>Poppins</strong> · Bold 700
                    </div>
                  </div>
                )}

                {feat.id === 'calendar' && (
                  <div className="micro-calendar-widget">
                    <div className="micro-cal-day"><span>12</span><small className="dot-blue" /></div>
                    <div className="micro-cal-day"><span>13</span><small className="dot-orange" /></div>
                    <div className="micro-cal-day active"><span>14</span><small className="dot-green" /></div>
                    <div className="micro-cal-day"><span>15</span><small className="dot-blue" /></div>
                    <div className="micro-cal-pill">Scheduled · 18:00</div>
                  </div>
                )}

                {feat.id === 'studio' && (
                  <div className="micro-studio-widget">
                    <div className="micro-ratio-toggles">
                      {(['1:1', '4:5', '9:16', '16:9'] as AspectRatioKey[]).map(r => (
                        <button
                          key={r}
                          type="button"
                          className={interactiveRatio === r ? 'active' : ''}
                          onClick={() => setInteractiveRatio(r)}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <div className={`micro-preview-card ratio-${interactiveRatio.replace(':', '-')}`}>
                      <div className="mini-card-overlay">
                        <span>{interactiveRatio}</span>
                        <strong>MAKE YOUR MOVE</strong>
                      </div>
                    </div>
                  </div>
                )}

                {feat.id === 'presets' && (
                  <div className="micro-presets-list">
                    <span className="preset-pill active">⚡ Bold Editorial</span>
                    <span className="preset-pill">🎬 Cinematic Bleed</span>
                    <span className="preset-pill">🖼️ Framed Minimal</span>
                    <span className="preset-pill">📐 Modern Split</span>
                    <span className="preset-pill">🏷️ Product Spotlight</span>
                    <span className="preset-pill">💬 Quote Manifesto</span>
                  </div>
                )}

                {feat.id === 'carousels' && (
                  <div className="micro-carousel-widget">
                    <div className="slide-counter">
                      <Layers size={13} />
                      <span>Slide 1 of 4</span>
                    </div>
                    <div className="motion-pill">
                      <Clapperboard size={13} />
                      <span>WebM 60fps Loop</span>
                    </div>
                  </div>
                )}

                {feat.id === 'publishing' && (
                  <div className="micro-postiz-widget">
                    <div className="postiz-badge">
                      <ShieldCheck size={14} />
                      <span>POSTIZ INTEGRATED</span>
                    </div>
                    <div className="social-tags">
                      <span>Instagram</span>
                      <span>TikTok</span>
                      <span>Retina 2x</span>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* 3.5 VISUAL STUDIO SHOWCASE */}
        <section className="studio-showcase section" id="studio">
          <div className="section-intro reveal">
            <span className="section-number">VISUAL STUDIO</span>
            <h2>{t.showcaseTitle}</h2>
            <p>{t.showcaseSub}</p>
          </div>
          <div className="showcase-grid reveal">
            <div className="showcase-card">
              <h3>{t.showcaseSizesTitle}</h3>
              <div className="size-chip-group">
                <span className="size-group-label">SOCIAL</span>
                <div className="size-chips">
                  {['1:1 · 1080×1080', '4:5 · 1080×1350', '9:16 · 1080×1920', '16:9 · 1920×1080'].map(sz => <span className="size-chip" key={sz}>{sz}</span>)}
                </div>
                <span className="size-group-label">ADS / IAB</span>
                <div className="size-chips">
                  {['728×90 Leaderboard', '970×250 Billboard', '336×280 Large Rect', '300×250 Medium Rect', '300×600 Half Page', '160×600 Skyscraper', '320×50 Mobile Banner'].map(sz => <span className="size-chip ad" key={sz}>{sz}</span>)}
                </div>
              </div>
              <div className="showcase-export-row">
                <span>PNG 2x Retina</span><span>Animated GIF</span><span>WebM</span><span>HTML5 code</span>
              </div>
            </div>
            <div className="showcase-card">
              <h3>{t.showcaseThemesTitle}</h3>
              <div className="preset-list">
                {[
                  ['⚡', 'Bold Editorial', 'Streetwear display headline'],
                  ['🎬', 'Cinematic Bleed', 'Edge-to-edge media + scrim'],
                  ['🖼️', 'Framed Minimalist', 'Luxury frame, whitespace'],
                  ['📐', 'Modern Split Card', '50/50 media + copy'],
                  ['🏷️', 'Product Spotlight', 'Center-stage + badge'],
                  ['💬', 'Quote / Manifesto', 'Oversized statement'],
                ].map(([icon, name, desc]) => (
                  <div className="preset-row" key={name}><span className="preset-icon">{icon}</span><div><strong>{name}</strong><small>{desc}</small></div></div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 4. WORKFLOW SECTION (#workflow) */}
        <section className="workflow section" id="workflow">
          <div className="section-intro reveal">
            <span className="section-number">02 / 04 · WORKFLOW</span>
            <h2>{t.workflowHeader}</h2>
            <p>{t.workflowSub}</p>
          </div>

          <div className="steps">
            {t.steps.map(([number, title, text], i) => (
              <article
                className="step reveal"
                key={number}
                style={{ '--delay': `${i * 120}ms` } as CSSProperties}
              >
                <span className="step-number">{number}</span>
                <div className="step-icon">
                  {i === 0 && <Globe2 size={24} />}
                  {i === 1 && <WandSparkles size={24} />}
                  {i === 2 && <Layers3 size={24} />}
                  {i === 3 && <Send size={24} />}
                </div>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="step-arrow">↗</span>
              </article>
            ))}
          </div>
        </section>

        {/* 5. PRICING SECTION (#pricing) */}
        <section className="pricing-section section" id="pricing">
          <div className="section-intro reveal">
            <span className="section-number">PRICING</span>
            <h2>{t.pricing}</h2>
            <p>{t.pricingNote}</p>
          </div>
          <div className="pricing-grid reveal">
            {t.pricingTiers.map((tier, i) => (
              <div key={i} className={`pricing-tier ${i === 1 ? 'featured' : ''}`}>
                {i === 1 && <span className="tier-flag">PRO</span>}
                <h3>{tier.name}</h3>
                <span className="tier-tag">{tier.tagline}</span>
                <div className="tier-price"><strong>{tier.price}</strong><span>{tier.period}</span></div>
                <div className="pricing-checklist">
                  {tier.features.map((feat, j) => (
                    <div key={j} className="pricing-check-item"><Check size={16} /><span>{feat}</span></div>
                  ))}
                </div>
                {i === 1 ? (
                  <button type="button" className="landing-button primary" onClick={() => setIsModalOpen(true)}>
                    <span>{tier.cta}</span><ArrowRight size={17} />
                  </button>
                ) : (
                  <a className="landing-button ghost" href="/studio">
                    <span>{tier.cta}</span><ArrowRight size={17} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 6. BOTTOM CTA SECTION */}
        <section className="cta-section section">
          <div className="cta-card reveal">
            <div className="cta-mark">
              <img src={mark} alt="SwiftPilot mark" />
            </div>
            <h2>{t.ctaTitle}</h2>
            <p>{t.ctaSub}</p>
            <div className="cta-buttons">
              <a className="landing-button primary" href="/studio">
                <span>{t.ctaButton}</span>
                <ArrowRight size={17} />
              </a>
              <button
                type="button"
                className="landing-button ghost"
                onClick={() => setIsModalOpen(true)}
              >
                <span>{t.modalTitle}</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* 6.5 SWIFTADS ZONE */}
      <section className="swiftads-section section">
        <div className="swiftads-slot">
          <div data-swiftads-zone="ecosystem_billboard_970x250"></div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="landing-footer">
        <div className="footer-left">
          <a className="landing-logo" href="/">
            <img src={logo} alt="SwiftPilot Social Studio" />
          </a>
          <p>{t.footer}</p>
        </div>

        <div className="footer-links">
          <a href="#features">{t.nav[0]}</a>
          <a href="#workflow">{t.nav[1]}</a>
          <a href="#pricing">{t.nav[2]}</a>
          <a href="/studio">Dashboard</a>
        </div>

        <div className="footer-copy">
          <span>&copy; {new Date().getFullYear()} SwiftPilot Social Studio. All rights reserved.</span>
        </div>
      </footer>

      {/* 8. LEAD CAPTURE MODAL ("Pedir Orçamento") */}
      {isModalOpen && (
        <div className="landing-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="landing-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-top">
              <div>
                <span className="tiny-tag">SWIFTPILOT SOCIAL</span>
                <h3>{t.modalTitle}</h3>
              </div>
              <button
                type="button"
                className="icon-button modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <p className="modal-description">{t.modalSub}</p>

            {submitted ? (
              <div className="modal-success-box">
                <Check size={32} />
                <h4>{t.modalSuccess}</h4>
                <p>Nossa equipa entrará em contacto nas próximas 24 horas.</p>
              </div>
            ) : (
              <form onSubmit={handleModalSubmit} className="modal-form">
                <label>
                  <span>{t.modalName}</span>
                  <div className="input-wrap">
                    <User size={16} />
                    <input
                      required
                      placeholder="e.g. Maria Santos"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                    />
                  </div>
                </label>

                <label>
                  <span>{t.modalEmail}</span>
                  <div className="input-wrap">
                    <Mail size={16} />
                    <input
                      type="email"
                      required
                      placeholder="maria@suaempresa.pt"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                    />
                  </div>
                </label>

                <label>
                  <span>{t.modalBrands}</span>
                  <div className="input-wrap">
                    <Building size={16} />
                    <input
                      type="number"
                      min={1}
                      max={50}
                      required
                      value={formBrands}
                      onChange={e => setFormBrands(Number(e.target.value))}
                    />
                  </div>
                </label>

                <label>
                  <span>{t.modalNotes}</span>
                  <textarea
                    rows={3}
                    placeholder="https://oseuwebsite.com ou detalhes sobre as suas marcas..."
                    value={formNotes}
                    onChange={e => setFormNotes(e.target.value)}
                  />
                </label>

                <button type="submit" className="landing-button primary full-width modal-submit-btn">
                  <span>{t.modalSubmit}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
