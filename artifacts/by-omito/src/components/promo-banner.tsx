import { useEffect } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { getGetActiveBannersQueryKey, useGetActiveBanners, useTrackBannerEvent } from "@workspace/api-client-react";

export function PromoBanner({ placement }: { placement: "room" | "explore" | "journal" }) {
  const banners = useGetActiveBanners({ placement }, { query: { queryKey: getGetActiveBannersQueryKey({ placement }), retry: false } });
  const track = useTrackBannerEvent();
  const banner = banners.data?.[0];
  useEffect(() => {
    if (banner) track.mutate({ id: banner.id, data: { eventType: "impression", placement } });
  }, [banner?.id, placement]);
  if (!banner) return null;
  return <a href={banner.destinationUrl} target="_blank" rel="noreferrer" onClick={() => track.mutate({ id: banner.id, data: { eventType: "click", placement } })} data-testid={`banner-${placement}-${banner.id}`} className="group relative mt-8 block min-h-36 overflow-hidden rounded-2xl border border-[#b67ae2]/40 bg-[#29173a] p-5 shadow-[0_15px_40px_rgba(91,40,134,.26)]">
    <img src={banner.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35 transition duration-500 group-hover:scale-105 group-hover:opacity-45" />
    <div className="absolute inset-0 bg-gradient-to-r from-[#1a0d22] via-[#1a0d22]/90 to-[#5d2778]/25" />
    <div className="relative flex min-h-24 max-w-md flex-col justify-between gap-3">
      <div><p className="mono flex items-center gap-2 text-[9px] uppercase tracking-[.18em] text-[#f0b0e5]"><Sparkles size={12} />Featured signal</p><h2 className="display mt-2 text-2xl font-bold text-white">{banner.title}</h2>{banner.body && <p className="mt-1 text-xs text-[#dbc8e5]">{banner.body}</p>}</div>
      <span className="inline-flex items-center gap-2 text-xs font-bold text-[#f2d8ff]">Discover more <ArrowUpRight size={14} /></span>
    </div>
  </a>;
}