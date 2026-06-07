export type CommunityRoomId =
  | 'Banking Intelligence'
  | 'Technology Structure'
  | 'Market Behaviour'
  | 'Volatility Environment'
  | 'Institutional Flow'
  | 'Earnings Analysis';

const ROOM_ORDER: CommunityRoomId[] = [
  'Banking Intelligence',
  'Technology Structure',
  'Market Behaviour',
  'Volatility Environment',
  'Institutional Flow',
  'Earnings Analysis',
];

function getRoomLabel(room: CommunityRoomId) {
  return room;
}

export function CommunityRoomRail({
  activeRoom,
  onChange,
}: {
  activeRoom: CommunityRoomId;
  onChange: (room: CommunityRoomId) => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-[28px] border border-white/10 bg-black/20 p-3 shadow-[0_0_40px_rgba(0,0,0,0.35)]"
      role="tablist"
      aria-label="Community rooms"
    >
      {ROOM_ORDER.map((room) => {
        const isActive = room === activeRoom;
        return (
          <button
            key={room}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(room)}
            className={[
              'px-4 py-2 rounded-[18px] text-sm font-medium transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-white/20',
              isActive
                ? 'bg-white/10 border border-white/15 text-white'
                : 'bg-black/15 border border-white/10 text-white/70 hover:bg-white/5 hover:text-white',
            ].join(' ')}
          >
            {getRoomLabel(room)}
          </button>
        );
      })}
    </div>
  );
}

export default CommunityRoomRail;