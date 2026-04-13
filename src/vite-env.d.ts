/// <reference types="vite/client" />

declare module 'fsrs' {
  export type Rating = 0 | 1 | 2 | 3;
  
  export interface Card {
    due: Date;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    reps: number;
    lapses: number;
    state: 0 | 1 | 2 | 3;
  }
  
  export interface RecordLogItem {
    card: Card;
    rating: Rating;
  }
  
  export interface RepeatResult {
    [key: number]: RecordLogItem;
  }
  
  export interface FSRS {
    repeat(card: Card, now: Date): RepeatResult;
  }
  
  export function generator(parameters?: number[]): FSRS;
}

declare module 'lucide-react' {
  import { SVGProps } from 'react';
  
  export interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
  }
  
  export const BookOpen: React.FC<IconProps>;
  export const RefreshCw: React.FC<IconProps>;
  export const Upload: React.FC<IconProps>;
  export const Trophy: React.FC<IconProps>;
  export const X: React.FC<IconProps>;
  export const Check: React.FC<IconProps>;
  
  // Export all other icons as needed
  const LucideReact: any;
  export default LucideReact;
}
