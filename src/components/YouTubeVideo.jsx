import { useState } from "react";

// A YouTube video that loads only when played, using a local poster so the
// page stays fast. Plays from youtube-nocookie.com.
export function YouTubeVideo({ id, poster, title, caption }) {
  const [playing, setPlaying] = useState(false);
  return (
    <figure className="nc-promo-video">
      <div className="nc-promo-frame">
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" className="nc-promo-poster" onClick={() => setPlaying(true)} aria-label={`Play: ${title}`}>
            <img src={poster} alt="" loading="lazy" />
            <span className="nc-promo-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
          </button>
        )}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
