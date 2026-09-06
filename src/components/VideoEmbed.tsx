function toYoutubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com") || parsed.hostname.includes("youtu.be")) {
      if (parsed.pathname.startsWith("/embed/")) return url;
      const id = parsed.hostname.includes("youtu.be")
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {
    return null;
  }
  return null;
}

export function VideoEmbed({ url }: { url: string }) {
  const youtubeEmbed = toYoutubeEmbedUrl(url);

  if (youtubeEmbed) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-2xl shadow-card">
        <iframe
          src={youtubeEmbed}
          title="Recipe video"
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <video controls className="w-full rounded-2xl shadow-card" src={url}>
      Your browser does not support embedded video.
    </video>
  );
}
