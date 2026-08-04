"use client";

import { useState } from "react";
import type { Recommendation, Region } from "@/lib/types";
import RecommendationCard from "./RecommendationCard";

const TABS: { region: Region; label: string }[] = [
  { region: "KR", label: "국내주식" },
  { region: "US", label: "미국주식" },
];

export default function RecommendationTabs({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  const [region, setRegion] = useState<Region>("KR");
  const filtered = recommendations.filter((r) => r.region === region);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {TABS.map((tab) => (
          <button
            key={tab.region}
            type="button"
            onClick={() => setRegion(tab.region)}
            className={
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors " +
              (region === tab.region
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:bg-slate-100")
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((rec) => (
            <RecommendationCard key={`${rec.region}-${rec.ticker}`} rec={rec} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">해당 지역의 추천 종목이 없습니다.</p>
      )}
    </div>
  );
}
