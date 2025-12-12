import Lottie from 'lottie-react';
import danceCatAnimation from '../../dance-cat.json';

interface CatAnimationProps {
  size?: number;
  className?: string;
}

export function CatAnimation({ size = 120, className = '' }: CatAnimationProps) {
  return (
    <div className={className} style={{ width: size, height: size }}>
      <Lottie animationData={danceCatAnimation} loop autoplay />
    </div>
  );
}

export default CatAnimation;
