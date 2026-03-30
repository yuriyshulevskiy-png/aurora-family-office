import { useState, useEffect, useCallback, useRef } from 'react';

const NEWS_FEEDS = [
  { url: '/api/bloomberg-rss/markets/news.rss', source: 'Bloomberg' },
  { url: '/api/bloomberg-rss/politics/news.rss', source: 'Bloomberg' },
  { url: '/api/bloomberg-rss/technology/news.rss', source: 'Bloomberg' },
  { url: '/api/euronews-rss/rss?level=theme&name=news', source: 'Euronews' },
  { url: '/api/skynews-rss/feeds/rss/world.xml', source: 'Sky News' },
];

function parseRSS(xml, feed) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    if (doc.querySelector('parsererror')) return [];
    const items = doc.querySelectorAll('item');
    const news = [];
    items.forEach((item, i) => {
      if (i >= 8) return;
      const titleEl = item.querySelector('title');
      const title = titleEl?.textContent?.trim() || '';
      const pubDate = item.querySelector('pubDate')?.textContent || '';
      if (title && title.length > 10) {
        news.push({ title, pubDate, source: feed.source });
      }
    });
    return news;
  } catch {
    return [];
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 0) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const SRC_COLORS = {
  'Bloomberg': 'bg-[#1a1f36]',
  'Euronews': 'bg-[#003d7a]',
  'Sky News': 'bg-[#c8102e]',
};

export default function BreakingNews() {
  const [news, setNews] = useState([]);
  const scrollRef = useRef(null);
  const animRef = useRef(null);
  const posRef = useRef(0);

  const fetchNews = useCallback(async () => {
    const results = await Promise.allSettled(
      NEWS_FEEDS.map(async (feed) => {
        const res = await fetch(feed.url);
        if (!res.ok) return [];
        const text = await res.text();
        return parseRSS(text, feed);
      })
    );
    const all = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value)
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    // Dedupe
    const seen = new Set();
    const unique = all.filter((item) => {
      const key = item.title.slice(0, 40).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    setNews(unique.slice(0, 20));
  }, []);

  useEffect(() => {
    fetchNews();
    const interval = setInterval(fetchNews, 600000);
    return () => clearInterval(interval);
  }, [fetchNews]);

  // JS-based smooth scroll for seamless loop
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || news.length === 0) return;

    let speed = 1.2; // px per frame
    let paused = false;

    const step = () => {
      if (!paused) {
        posRef.current += speed;
        const halfWidth = el.scrollWidth / 2;
        if (posRef.current >= halfWidth) posRef.current = 0;
        el.style.transform = `translate3d(-${posRef.current}px, 0, 0)`;
      }
      animRef.current = requestAnimationFrame(step);
    };

    const onEnter = () => { paused = true; };
    const onLeave = () => { paused = false; };

    el.parentElement.addEventListener('mouseenter', onEnter);
    el.parentElement.addEventListener('mouseleave', onLeave);
    animRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animRef.current);
      el.parentElement?.removeEventListener('mouseenter', onEnter);
      el.parentElement?.removeEventListener('mouseleave', onLeave);
    };
  }, [news]);

  if (news.length === 0) return null;

  // Double items for seamless loop
  const items = [...news, ...news];

  return (
    <div className="border border-[#e3e8ee] rounded-xl bg-white overflow-hidden">
      <div className="flex items-center">
        <div className="shrink-0 bg-[#cd3d64] text-white text-[11px] font-bold px-3 py-2.5 tracking-wide uppercase z-10">
          Breaking
        </div>

        <div className="flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            className="flex whitespace-nowrap py-2.5 px-3"
            style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
          >
            {items.map((item, i) => (
              <span key={i} className="inline-flex items-center gap-2 mr-8 shrink-0">
                <span className={`${SRC_COLORS[item.source] || 'bg-[#697386]'} text-white text-[9px] font-bold px-1.5 py-0.5 rounded`}>
                  {item.source}
                </span>
                <span className="text-[13px] text-[#1a1f36]">{item.title}</span>
                <span className="text-[11px] text-[#a3acb9]">{timeAgo(item.pubDate)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
