import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getUnacknowledgedCount } from "../services/personalization/AlertStore";
import { colors } from "../design/tokens";

export function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(getUnacknowledgedCount());
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);

  if (count === 0) {
    return <Bell size={20} strokeWidth={1.75} />;
  }

  return (
    <span style={{ position: "relative", display: "inline-flex" }}>
      <Bell size={20} strokeWidth={1.75} />
      <span
        style={{
          position: "absolute",
          top: "-6px",
          right: "-8px",
          background: colors.danger,
          color: colors.onPrimary,
          fontSize: "10px",
          fontWeight: 700,
          minWidth: "16px",
          height: "16px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 4px",
          lineHeight: 1,
        }}
      >
        {count > 99 ? "99+" : count}
      </span>
    </span>
  );
}
