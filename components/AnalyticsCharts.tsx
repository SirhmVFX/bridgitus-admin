/** Reusable analytics chart visuals (pie + IXL-style mountain). */

export const CATEGORY_COLORS = [
  "#00c1ff", "#22c55e", "#f59e0b", "#8b5cf6", "#ef4444",
  "#0ea5e9", "#84cc16", "#f97316", "#ec4899", "#14b8a6",
];

export interface CategorySlice {
  topic: string;
  subject: string;
  count: number;
  pct: number;
}

/** Donut / pie chart for practice-by-category. */
export function PracticePieChart({ rows }: { rows: CategorySlice[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-gray-400 py-8 text-center">No practice data yet.</p>;
  }

  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 70;
  const stroke = 28;
  const circumference = 2 * Math.PI * r;

  let offset = 0;
  const segments = rows.map((row, i) => {
    const len = (row.pct / 100) * circumference;
    const seg = {
      ...row,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      dasharray: `${len} ${circumference - len}`,
      dashoffset: -offset,
    };
    offset += len;
    return seg;
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
        {segments.map((seg) => (
          <circle
            key={seg.topic}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={seg.dasharray}
            strokeDashoffset={seg.dashoffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-gray-900" style={{ fontSize: 22, fontWeight: 800 }}>
          {rows.reduce((s, r) => s + r.count, 0)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10, fontWeight: 600 }}>
          questions
        </text>
      </svg>

      <div className="space-y-2.5 w-full min-w-0">
        {segments.map((seg) => (
          <div key={seg.topic} className="flex items-start gap-2">
            <span className="w-3 h-3 mt-1 shrink-0" style={{ background: seg.color }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-800 truncate">
                <span className="font-bold">{seg.pct}%</span> {seg.topic}
              </p>
              <p className="text-xs text-gray-400">{seg.subject} · {seg.count} q</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** IXL-style mountain skill-progress chart. */
export function SkillMountainChart({
  mastered,
  proficient,
  practised,
}: {
  mastered: number;
  proficient: number;
  practised: number;
}) {
  return (
    <div className="relative">
      <p className="text-center text-sm font-semibold text-gray-500 mb-3">Skill progress</p>
      <div className="flex items-stretch gap-4 sm:gap-6">
        <div className="flex flex-col justify-between py-2 min-w-[7.5rem] sm:min-w-[9rem]">
          {[
            { value: mastered, label: "SKILLS MASTERED" },
            { value: proficient, label: "SKILLS PROFICIENT" },
            { value: practised, label: "SKILLS PRACTISED" },
          ].map((row) => (
            <div key={row.label} className="relative pr-3">
              <p className="text-2xl sm:text-3xl font-black text-gray-900 leading-none">{row.value}</p>
              <p className="text-[10px] sm:text-xs font-bold text-gray-500 tracking-wide mt-0.5">{row.label}</p>
              <div className="absolute right-0 top-1/2 w-3 sm:w-5 border-t border-gray-300" />
            </div>
          ))}
        </div>

        <div className="flex-1 min-h-[160px] sm:min-h-[200px]">
          <svg viewBox="0 0 320 220" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
            <path d="M0 220 L40 140 L70 165 L100 90 L140 150 L160 120 L200 180 L220 150 L260 190 L280 160 L320 220 Z"
              fill="#dbeafe" opacity="0.7" />
            <path d="M20 220 L55 155 L85 180 L120 110 L155 160 L190 130 L230 185 L270 145 L320 220 Z"
              fill="#bfdbfe" opacity="0.55" />
            <path d="M40 220 L160 55 L280 220 Z" fill="#16a34a" />
            <path
              d="M55 220 L70 185 L85 170 L100 185 L115 168 L130 185 L145 165 L160 180 L175 165 L190 185 L205 168 L220 185 L235 170 L250 185 L265 220 Z"
              fill="#15803d"
            />
            <path
              d="M85 155 L160 55 L235 155 L220 155 L205 140 L190 155 L175 138 L160 152 L145 138 L130 155 L115 140 L100 155 L85 155 Z"
              fill="#86efac"
            />
            <path d="M95 145 L160 55 L225 145 L210 145 L195 128 L180 145 L165 125 L160 130 L155 125 L140 145 L125 128 L110 145 Z"
              fill="#4ade80"
            />
            <path
              d="M130 100 L160 55 L190 100 L175 100 L168 90 L160 98 L152 90 L145 100 Z"
              fill="#ffffff"
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <path d="M140 88 L160 55 L180 88 L170 88 L165 78 L160 85 L155 78 L150 88 Z" fill="#f8fafc" />
            <ellipse cx="250" cy="48" rx="22" ry="10" fill="#cbd5e1" opacity="0.55" />
            <ellipse cx="262" cy="44" rx="14" ry="8" fill="#e2e8f0" opacity="0.7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
