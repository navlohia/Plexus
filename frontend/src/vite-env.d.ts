/// <reference types="vite/client" />
import type { ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {
      line: any;
      [elemName: string]: any;
    }
  }
}
