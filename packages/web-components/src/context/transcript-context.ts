import { createContext } from '@lit/context';
import type { TranscriptEntry } from '../components/UI/sw-ui-transcript-view.js';

export type { TranscriptEntry };

export interface TranscriptState {
  entries: TranscriptEntry[];
}

export const transcriptContext = createContext<TranscriptState>('transcript');
