import React, { useRef, useEffect } from "react";

interface Token {
  type: string;
  value: string;
}

function tokenize(code: string): Token[] {
  // Regexes for typescript / javascript / python syntax and custom post-quantum visual telemetry
  const rules = [
    { type: 'comment', regex: /^\/\/.*|^\/\*[\s\S]*?\*\/|^#.*/ },
    { type: 'string', regex: /^"(?:[^"\\]|\\.)*"|^'(?:[^'\\]|\\.)*'|^`(?:[^`\\]|\\.)*`/ },
    // Glowing post-quantum cryptographic standards (Green)
    { type: 'pqc-keyword', regex: /^(?:ML-KEM-768|ML-KEM-1024|Kyber-1024|Kyber-768|ML-DSA-65|ML-DSA-87|Dilithium-3|Dilithium-5|SLH-DSA-256s|SPHINCS\+|FN-DSA-512|Falcon-512|Falcon|Kyber|Dilithium|XMSS|LMS|SPHINCS)\b/i },
    // Vulnerable, classical sidechannel targets & legacy crypto (Red)
    { type: 'weak-crypto', regex: /^(?:RSA-1024|RSA-2048|modulusLength|MD5|SHA-1|SHA1|ECC P-256|P-256|Diffie-Hellman|entropy_leak|timing_sidechannel|sidechannel|md5|sha1|rsa|ecdsa|aes-128-cbc)\b/i },
    // Main programming language keywords
    { type: 'keyword', regex: /^(?:const|let|var|function|return|import|export|class|new|await|async|if|else|for|while|from|default|interface|type|public|private|protected|static|extends|implements|try|catch|finally|throw|typeof|instanceof|void|in|of|as|any|string|number|boolean|def|elif|import|from|return|import|as|with|lambda)\b/ },
    { type: 'boolean', regex: /^(?:true|false|null|undefined|None)\b/ },
    { type: 'number', regex: /^\b\d+(?:\.\d+)?\b/ },
    { type: 'function-call', regex: /^[a-zA-Z_]\w*(?=\()/ },
    { type: 'punctuation', regex: /^[{}()\[\].,:;]/ },
    { type: 'operator', regex: /^[+\-*/%&|^!=<>?~:]+/ },
    { type: 'text', regex: /^[\s\S]/ } // Single-character fallback
  ];

  const tokens: Token[] = [];
  let remaining = code;
  const maxIterations = 50000;
  let iterations = 0;

  while (remaining.length > 0 && iterations < maxIterations) {
    iterations++;
    let matched = false;

    for (const rule of rules) {
      const match = remaining.match(rule.regex);
      if (match && match.index === 0) {
        const val = match[0];
        if (val.length > 0) {
          tokens.push({ type: rule.type, value: val });
          remaining = remaining.slice(val.length);
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      tokens.push({ type: 'text', value: remaining[0] });
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

interface SyntaxHighlightedEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SyntaxHighlightedEditor({
  value,
  onChange,
  placeholder = "",
  className = ""
}: SyntaxHighlightedEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const tokens = tokenize(value);

  // Synchronize scroll offsets
  const syncScroll = () => {
    if (textareaRef.current && preRef.current) {
      preRef.current.scrollTop = textareaRef.current.scrollTop;
      preRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    syncScroll();
  }, [value]);

  return (
    <div className={`relative w-full h-80 font-mono text-[11.5px] leading-relaxed select-text rounded border border-white/5 bg-[#030611] overflow-hidden ${className}`}>
      {/* Background container for syntax-highlighted render */}
      <pre
        ref={preRef}
        aria-hidden="true"
        className="absolute inset-0 w-full h-full m-0 p-3 pb-12 pointer-events-none select-none overflow-auto whitespace-pre-wrap break-all font-mono text-[11.5px] leading-relaxed text-slate-200"
      >
        {tokens.map((token, idx) => {
          let classes = "";
          if (token.type === "comment") {
            classes = "text-slate-500/80 italic font-mono";
          } else if (token.type === "string") {
            classes = "text-orange-300 font-mono font-medium";
          } else if (token.type === "pqc-keyword") {
            classes = "text-emerald-400 font-mono font-extrabold bg-emerald-500/10 px-0.5 rounded border border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.15)]";
          } else if (token.type === "weak-crypto") {
            classes = "text-red-400 font-mono font-extrabold bg-red-500/10 px-0.5 rounded border border-red-500/20 shadow-[0_0_8px_rgba(248,113,113,0.15)] animate-pulse";
          } else if (token.type === "keyword") {
            classes = "text-fuchsia-400 font-mono font-bold";
          } else if (token.type === "boolean") {
            classes = "text-sky-400 font-mono font-semibold";
          } else if (token.type === "number") {
            classes = "text-cyan-300 font-mono font-medium";
          } else if (token.type === "function-call") {
            classes = "text-[#14f7ff] font-mono font-semibold";
          } else if (token.type === "operator") {
            classes = "text-purple-400/90 font-mono";
          } else if (token.type === "punctuation") {
            classes = "text-slate-400 font-mono";
          }

          return (
            <span key={idx} className={classes}>
              {token.value}
            </span>
          );
        })}
        {/* Ensures the pre matches text wrapping with extra blank line when typing on newlines */}
        {value.endsWith("\n") && <span className="font-mono text-transparent">{" "}</span>}
      </pre>

      {/* Interactive textarea overlaid directly on top */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        placeholder={placeholder}
        spellCheck="false"
        className="absolute inset-0 w-full h-full m-0 p-3 pb-12 bg-transparent text-transparent caret-[#14f7ff] selection:bg-blue-500/30 selection:text-white outline-none border-none resize-none overflow-auto whitespace-pre-wrap break-all font-mono text-[11.5px] leading-relaxed"
      />
    </div>
  );
}
