import { Link } from 'react-router-dom';
import { Sparkles, BookmarkPlus, PencilLine, ShoppingBasket, ArrowRight } from 'lucide-react';
import { Mesh, TopBar } from '../components/Layout';
import { Img, MatchRing } from '../components/ui';
import { mealsApi } from '../api';
import useAsync from '../hooks/useAsync';
import useDocumentTitle from '../hooks/useDocumentTitle';

const FEATURES = [
  { icon: Sparkles, title: 'Match your pantry', text: 'Type what you have and get recipes ranked by how much you can already make.' },
  { icon: BookmarkPlus, title: 'Save from 300+ recipes', text: 'Browse TheMealDB by name, ingredient, category or cuisine.' },
  { icon: PencilLine, title: 'Write your own', text: "Keep family recipes next to the ones you've saved, with notes and ratings." },
  { icon: ShoppingBasket, title: 'Smart shopping list', text: 'Missing ingredients go straight onto your list in one tap.' },
];

export default function Landing() {
  useDocumentTitle('Cook with what you already have');
  // Real food photos for the hero collage (public endpoint, cached by the API).
  const { data } = useAsync(() => mealsApi.byCategory('Vegetarian'), []);
  const photos = (data?.results || []).slice(3, 7);

  return (
    <>
      <Mesh />
      <TopBar />
      <main className="page">
        <section className="bento landing-hero">
          <div className="tile glass span-7 row-3 hero-copy">
            <span className="eyebrow">Your kitchen companion</span>
            <h1 className="display">Cook with what you already have.</h1>
            <p className="muted hero-sub">
              Tell Cookly what's in your fridge and get recipes ranked by match, with missing ingredients ready for
              your shopping list.
            </p>

            <div className="chip-input hero-demo" aria-hidden>
              <span className="chip">🥚 eggs</span>
              <span className="chip">🧅 onion</span>
              <span className="chip">🍅 tomato</span>
              <span className="muted small" style={{ marginLeft: 4 }}>
                + add more…
              </span>
            </div>

            <div className="row row--wrap">
              <Link to="/register" className="btn btn--primary btn--lg">
                Find recipes <ArrowRight size={18} />
              </Link>
              <Link to="/login" className="btn btn--secondary btn--lg">
                I have an account
              </Link>
            </div>
          </div>

          {[0, 1, 2].map((i) => (
            <div key={i} className={`tile photo-tile hero-photo hero-photo--${i}`}>
              <Img src={photos[i]?.image} alt={photos[i]?.title || ''} emoji={['🥗', '🍝', '🍛'][i]} />
              {i === 0 && (
                <div className="photo-tile__top">
                  <span />
                  <div className="glass hero-ring">
                    <MatchRing percent={80} size={58} stroke={6} />
                    <div>
                      <div style={{ fontWeight: 700 }}>Ready to cook</div>
                      <div className="caption">4 of 5 ingredients</div>
                    </div>
                  </div>
                </div>
              )}
              {i === 0 && photos[i] && (
                <div className="photo-tile__caption">
                  <div className="caption">Tonight's idea</div>
                  <div style={{ fontWeight: 700 }}>{photos[i].title}</div>
                </div>
              )}
            </div>
          ))}
        </section>

        <section className="bento" aria-label="Features">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="tile span-3 feature">
              <div className="stat__icon">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p className="muted small">{text}</p>
            </div>
          ))}
        </section>

        <section className="bento">
          <div className="tile span-8 how">
            <span className="eyebrow">How it works</span>
            <ol className="how__steps">
              <li>
                <span className="how__num">1</span>
                <div>
                  <strong>Add your ingredients</strong>
                  <p className="muted small">Eggs, an onion, half a tomato. Whatever's there.</p>
                </div>
              </li>
              <li>
                <span className="how__num">2</span>
                <div>
                  <strong>See ranked recipes</strong>
                  <p className="muted small">From TheMealDB and your own cookbook, best match first.</p>
                </div>
              </li>
              <li>
                <span className="how__num">3</span>
                <div>
                  <strong>Shop only what's missing</strong>
                  <p className="muted small">One tap adds the gaps to your shopping list.</p>
                </div>
              </li>
            </ol>
          </div>
          <div className="tile tile--tint-primary span-4 cta">
            <h2>Ready when you are.</h2>
            <p className="muted">Free, no credit card, just recipes.</p>
            <div className="stack mt-auto">
              <Link to="/register" className="btn btn--primary btn--block">
                Create free account
              </Link>
              <Link to="/login" className="btn btn--ghost btn--block">
                Log in
              </Link>
            </div>
          </div>
        </section>

        <p className="caption" style={{ textAlign: 'center', marginTop: 32 }}>
          Recipe data from TheMealDB. Built with React, Express and MongoDB.
        </p>
      </main>
    </>
  );
}
