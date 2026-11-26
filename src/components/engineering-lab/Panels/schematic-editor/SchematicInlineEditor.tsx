'use client';

import React, { useState, useEffect } from 'react';
import { CircuitComponent, SchematicTextNote, SchematicNetLabel, SchematicTitleBlock } from '@/modules/engineering-lab/types';

export type InlineEditorTarget =
  | { type: 'component'; component: CircuitComponent }
  | { type: 'text'; textNote: SchematicTextNote }
  | { type: 'netlabel'; netLabel: SchematicNetLabel }
  | { type: 'titleblock'; titleBlock?: SchematicTitleBlock; projectTitle: string };

interface SchematicInlineEditorProps {
  target: InlineEditorTarget | null;
  onClose: () => void;
  onSaveComponent: (updated: CircuitComponent) => void;
  onSaveTextNote: (updated: SchematicTextNote) => void;
  onSaveNetLabel: (updated: SchematicNetLabel) => void;
  onSaveTitleBlock: (updated: SchematicTitleBlock) => void;
}

/**
 * Double-Click Inline Editing Popover Modal
 * Allows quick in-place modification of Reference Designators, Values, Notes, Net Labels, and Title Block.
 */
export function SchematicInlineEditor({
  target,
  onClose,
  onSaveComponent,
  onSaveTextNote,
  onSaveNetLabel,
  onSaveTitleBlock,
}: SchematicInlineEditorProps) {
  // Component fields
  const [designator, setDesignator] = useState('');
  const [value, setValue] = useState('');

  // Text note fields
  const [noteText, setNoteText] = useState('');
  const [fontSize, setFontSize] = useState(12);

  // Net label fields
  const [netName, setNetName] = useState('');

  // Title block fields
  const [tbTitle, setTbTitle] = useState('');
  const [tbRev, setTbRev] = useState('1.0');
  const [tbCompany, setTbCompany] = useState('');
  const [tbAuthor, setTbAuthor] = useState('');

  useEffect(() => {
    if (!target) return;
    if (target.type === 'component') {
      setDesignator(target.component.designator || '');
      setValue(target.component.value || '');
    } else if (target.type === 'text') {
      setNoteText(target.textNote.text || '');
      setFontSize(target.textNote.fontSize || 12);
    } else if (target.type === 'netlabel') {
      setNetName(target.netLabel.name || '');
    } else if (target.type === 'titleblock') {
      setTbTitle(target.titleBlock?.title || target.projectTitle || '');
      setTbRev(target.titleBlock?.revision || '1.0');
      setTbCompany(target.titleBlock?.company || 'EI HOUSE ENGINEERING');
      setTbAuthor(target.titleBlock?.author || 'EI House Lab Engineer');
    }
  }, [target]);

  if (!target) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (target.type === 'component') {
      onSaveComponent({
        ...target.component,
        designator: designator.trim() || target.component.designator,
        value: value.trim() || target.component.value,
      });
    } else if (target.type === 'text') {
      onSaveTextNote({
        ...target.textNote,
        text: noteText.trim() || target.textNote.text,
        fontSize: Number(fontSize) || 12,
      });
    } else if (target.type === 'netlabel') {
      onSaveNetLabel({
        ...target.netLabel,
        name: netName.trim().toUpperCase() || target.netLabel.name,
      });
    } else if (target.type === 'titleblock') {
      onSaveTitleBlock({
        title: tbTitle.trim(),
        revision: tbRev.trim(),
        company: tbCompany.trim(),
        author: tbAuthor.trim(),
        date: new Date().toISOString().split('T')[0],
        sheet: target.titleBlock?.sheet || '1 / 1',
      });
    }
    onClose();
  };

  return (
    <div
      data-testid="sch-inline-editor-modal"
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-4 w-80 max-w-full text-xs font-mono text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <span className="font-bold text-emerald-400 uppercase">
            {target.type === 'component'
              ? 'Edit Component'
              : target.type === 'text'
              ? 'Edit Text Note'
              : target.type === 'netlabel'
              ? 'Edit Net Label'
              : 'Edit Title Block'}
          </span>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {target.type === 'component' && (
            <>
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">REFERENCE DESIGNATOR</label>
                <input
                  data-testid="inline-edit-designator"
                  type="text"
                  value={designator}
                  onChange={(e) => setDesignator(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">NOMINAL VALUE</label>
                <input
                  data-testid="inline-edit-value"
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </>
          )}

          {target.type === 'text' && (
            <>
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">NOTE TEXT</label>
                <textarea
                  data-testid="inline-edit-note"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-emerald-500 h-20 resize-none font-sans"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">FONT SIZE (PX)</label>
                <input
                  type="number"
                  min="8"
                  max="48"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </>
          )}

          {target.type === 'netlabel' && (
            <div>
              <label className="block text-slate-400 text-[10px] mb-1">NET NAME</label>
              <input
                data-testid="inline-edit-netname"
                type="text"
                value={netName}
                onChange={(e) => setNetName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-cyan-400 font-bold uppercase focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>
          )}

          {target.type === 'titleblock' && (
            <>
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">PROJECT TITLE</label>
                <input
                  data-testid="inline-edit-tbtitle"
                  type="text"
                  value={tbTitle}
                  onChange={(e) => setTbTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">REVISION</label>
                  <input
                    type="text"
                    value={tbRev}
                    onChange={(e) => setTbRev(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">AUTHOR</label>
                  <input
                    type="text"
                    value={tbAuthor}
                    onChange={(e) => setTbAuthor(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-1">COMPANY / ORG</label>
                <input
                  type="text"
                  value={tbCompany}
                  onChange={(e) => setTbCompany(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
            >
              Cancel
            </button>
            <button
              data-testid="inline-edit-save-btn"
              type="submit"
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold"
            >
              Apply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
