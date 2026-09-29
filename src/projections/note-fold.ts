import type { Note } from '@/domain/atoms/note';
import type { LogEntry } from '@/domain/events';
import { withOptional } from '@/domain/optional';

/** The Note fold. Shared by `task_detail` and, later, the Notes mode's list. */
export function applyNoteEntry(notes: readonly Note[], entry: LogEntry): readonly Note[] {
  switch (entry.type) {
    case 'note.created': {
      const { note_id, body, title, attached_to } = entry.payload;
      const note: Note = { id: note_id, body, attached_to, deleted: false };
      return [...notes, withOptional(note, { title })];
    }
    case 'note.edited': {
      // "Carries the whole body", so an absent title means *no title* rather
      // than *unchanged* — the same optional-absent rule as every other payload.
      const { note_id, body, title } = entry.payload;
      return notes.map((note) =>
        note.id === note_id ? withOptional(note, { body, title }) : note,
      );
    }
    case 'note.reattached': {
      const { note_id, to } = entry.payload;
      return notes.map((note) => (note.id === note_id ? { ...note, attached_to: to } : note));
    }
    case 'note.deleted': {
      const { note_id } = entry.payload;
      return notes.map((note) => (note.id === note_id ? { ...note, deleted: true } : note));
    }
    default:
      return notes;
  }
}
