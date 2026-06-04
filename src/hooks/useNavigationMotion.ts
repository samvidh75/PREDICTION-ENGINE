import { useAnimation } from 'framer-motion';

export const useNavigationMotion = () => {
  const controls = useAnimation();

  const triggerTransition = async (target: string) => {
    // Subtle cinematic out
    await controls.start({
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.18 },
    });

    // Rehydrate in with a soft ease
    await controls.start({
      opacity: 1,
      scale: 1,
      transition: { duration: 0.32, ease: 'easeOut' },
    });

    // Routing/side-effects intentionally handled by caller
  };

  return { controls, triggerTransition } as const;
};

export default useNavigationMotion;
