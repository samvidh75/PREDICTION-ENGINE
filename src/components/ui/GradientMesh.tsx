export default function GradientMesh() {
  return (
    <div className="absolute top-0 left-0 right-0 h-[480px] overflow-hidden pointer-events-none -z-0">
      <svg className="w-full h-full" viewBox="0 0 1440 480" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="g1" cx="20%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(255,184,28,0.12)" stopOpacity="0.9"/>
            <stop offset="40%" stopColor="rgba(255,184,28,0.06)" stopOpacity="0.3"/>
            <stop offset="100%" stopColor="#0F0F0F" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="g2" cx="50%" cy="20%" r="45%">
            <stop offset="0%" stopColor="rgba(45,212,191,0.08)" stopOpacity="0.6"/>
            <stop offset="50%" stopColor="rgba(45,212,191,0.04)" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#0F0F0F" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="g3" cx="70%" cy="35%" r="40%">
            <stop offset="0%" stopColor="rgba(255,184,28,0.08)" stopOpacity="0.5"/>
            <stop offset="50%" stopColor="rgba(255,184,28,0.03)" stopOpacity="0.15"/>
            <stop offset="100%" stopColor="#0F0F0F" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1440" height="480" fill="#0F0F0F"/>
        <rect width="1440" height="480" fill="url(#g1)"/>
        <rect width="1440" height="480" fill="url(#g2)"/>
        <rect width="1440" height="480" fill="url(#g3)"/>
      </svg>
    </div>
  );
}
