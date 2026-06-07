import { motion } from 'framer-motion';
import type { CommunityMessage } from './CinematicConversationInterface';

export type CommunityMessageCardProps = {
  message: CommunityMessage;
  glowCss?: string;
  isBeginner?: boolean;
};

const riskBadgeText: Record<CommunityMessage['riskLevel'], string> = {
  LOW: 'Safe',
  MEDIUM: 'Needs care',
  HIGH: 'High risk',
};

export default function CommunityMessageCard({
  message,
  glowCss,
  isBeginner,
}: CommunityMessageCardProps) {
  const isHigh = message.riskLevel === 'HIGH';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-[28px] border border-white/10 bg-black/20 shadow-[0_0_40px_rgba(0,0,0,0.35)] overflow-hidden"
      style={glowCss ? { boxShadow: glowCss } : undefined}
    >
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm text-white/75 truncate">{message.author}</div>
            <div className="text-xs text-white/40">
              {new Date(message.createdAt).toLocaleString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
                month: 'short',
                day: '2-digit',
              })}
            </div>
          </div>

          <div
            className={[
              'shrink-0 rounded-full border px-3 py-1 text-xs font-medium',
              isHigh
                ? 'border-amber-300/30 bg-amber-300/10 text-amber-200'
                : message.riskLevel === 'MEDIUM'
                  ? 'border-sky-300/30 bg-sky-300/10 text-sky-200'
                  : 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
            ].join(' ')}
          >
            {riskBadgeText[message.riskLevel]}
          </div>
        </div>

        <div className="mt-3 relative">
          {!isHigh ? (
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[14px] leading-relaxed text-white/85"
            >
              {isBeginner ? message.displayText : message.displayText}
            </motion.p>
          ) : (
            <div className="relative">
              {/* Blurred preview (never unmodified) */}
              <div className="absolute inset-x-0 top-0 px-1 pt-1 pointer-events-none">
                <p className="blur-[6px] select-none text-[14px] leading-relaxed text-white/25">
                  {message.text}
                </p>
              </div>

              {/* Muted educational overlay + safe reframe */}
              <div className="rounded-[18px] border border-white/10 bg-black/35 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-amber-200">⚑</div>
                  <div>
                    <div className="text-sm font-semibold text-white/90">
                      {isBeginner ? 'Let’s make it safer' : 'Safe reframe suggestion'}
                    </div>
                    <p className="mt-1 text-[14px] leading-relaxed text-white/70">
                      {message.displayText}
                    </p>

                    <div className="mt-2 text-xs text-white/40">
                      {isBeginner
                        ? "Tip: keep it respectful and focus on solutions."
                        : "Tip: keep it constructive, focus on solutions, and avoid harsh language."}
                    </div>

                    {message.moderationRationale && (
                      <div className="mt-3 rounded-[14px] border border-white/10 bg-black/30 p-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-amber-200/80">
                          System moderation rationale
                        </div>
                        <p className="mt-2 text-[13px] leading-relaxed text-white/75">{message.moderationRationale}</p>

                        {message.moderationFlags && message.moderationFlags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {message.moderationFlags.slice(0, 6).map((f) => (
                              <span
                                key={f}
                                className="rounded-full border border-amber-200/20 bg-amber-200/10 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-100/90"
                                title={f}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
