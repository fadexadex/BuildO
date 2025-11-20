'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { registerCircomLanguage } from '../../lib/monaco-circom';

// Dynamically import Monaco to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });
const MonacoDiffEditor = dynamic(() => import('@monaco-editor/react').then(mod => mod.DiffEditor), { ssr: false });

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  onMount?: (editor: any, monaco: any) => void;
}

export function CodeEditor({ code, onChange, readOnly = false, onMount }: CodeEditorProps) {
  
  const handleEditorDidMount = (editor: any, monaco: any) => {
      registerCircomLanguage(monaco);
      
      if (onMount) {
          onMount(editor, monaco);
      }
  };

  return (
    <div className="h-full w-full overflow-hidden bg-[#1e1e1e]">
      <MonacoEditor
        height="100%"
        language="circom"
        theme="vs-dark"
        value={code}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        loading={<div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="animate-spin mr-2" /> Loading editor...</div>}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          readOnly,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}

interface CodeDiffEditorProps {
    original: string;
    modified: string;
}

export function CodeDiffEditor({ original, modified }: CodeDiffEditorProps) {
    const handleDiffEditorDidMount = (editor: any, monaco: any) => {
        registerCircomLanguage(monaco);
    };

    return (
        <div className="h-full w-full overflow-hidden bg-[#1e1e1e]">
            <MonacoDiffEditor
                height="100%"
                language="circom"
                theme="vs-dark"
                original={original}
                modified={modified}
                onMount={handleDiffEditorDidMount}
                loading={<div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="animate-spin mr-2" /> Loading diff...</div>}
                options={{
                    readOnly: true,
                    renderSideBySide: true,
                    automaticLayout: true,
                    fontSize: 14,
                }}
            />
        </div>
    );
}

