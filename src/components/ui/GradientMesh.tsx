export default function GradientMesh() {
  return (
    <div className="absolute top-0 left-0 right-0 h-[480px] overflow-hidden pointer-events-none -z-0">
      <svg className="w-full h-full" viewBox="0 0 1440 480" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g1" cx="20%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#f5e9d4" stopOpacity="0.9"/>
            <stop offset="40%" stopColor="#f5e9d4" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="g2" cx="40%" cy="20%" r="45%">
            <stop offset="0%" stopColor="#fde6c4" stopOpacity="0.6"/>
            <stop offset="50%" stopColor="#fde6c4" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="g3" cx="60%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#d4c5f9" stopOpacity="0.5"/>
            <stop offset="40%" stopColor="#d4c5f9" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="g4" cx="75%" cy="25%" r="40%">
            <stop offset="0%" stopColor="#1A56DB" stopOpacity="0.10"/>
            <stop offset="60%" stopColor="#1A56DB" stopOpacity="0.04"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="g5" cx="85%" cy="45%" r="35%">
            <stop offset="0%" stopColor="#ea2261" stopOpacity="0.15"/>
            <stop offset="50%" stopColor="#ea2261" stopOpacity="0.04"/>
            <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1440" height="480" fill="white"/>
        <rect width="1440" height="480" fill="url(#g1)"/>
        <rect width="1440" height="480" fill="url(#g2)"/>
        <rect width="1440" height="480" fill="url(#g3)"/>
        <rect width="1440" height="480" fill="url(#g4)"/>
        <rect width="1440" height="480" fill="url(#g5)"/>
      </svg>
    </div>
  );
}
