import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap, Shield, Globe } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="logo-area">
          <Sparkles size={24} className="accent-icon" />
          <span className="logo-text">Aura</span>
        </div>
        <div className="nav-actions">
          <button className="nav-link" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn-primary" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </nav>

      <main className="landing-main">
        <section className="hero-section">
          <div className="badge">✨ Next-Generation AI Platform</div>
          <h1 className="hero-title">Experience the Power of <br/><span className="text-gradient">Aura Intelligence</span></h1>
          <p className="hero-subtitle">
            A premium, distraction-free environment for interacting with state-of-the-art language models. Elevate your workflow with Aura.
          </p>
          <div className="hero-actions">
            <button className="btn-primary large" onClick={() => navigate('/register')}>
              Start Chatting Now <ArrowRight size={18} />
            </button>
          </div>
        </section>

        <section className="features-section">
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon"><Zap size={24} /></div>
              <h3>Lightning Fast</h3>
              <p>Built on an optimized architecture for zero-latency responses and seamless real-time interactions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Shield size={24} /></div>
              <h3>Private & Secure</h3>
              <p>Your conversations are fully encrypted and stored locally. You own your data, completely.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Globe size={24} /></div>
              <h3>Model Agnostic</h3>
              <p>Seamlessly switch between multiple state-of-the-art models including Claude 3.5 Sonnet and more.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Aura Platform. All rights reserved.</p>
      </footer>
    </div>
  );
}
