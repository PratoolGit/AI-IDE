import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { useAppStore } from "../../stores/appStore";

export function TerminalPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<XTerm | null>(null);
  const sessionId = useRef<string | null>(null);
  const projectRoot = useAppStore((s) => s.projectRoot);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const term = new XTerm({
      theme: { background: "#0a0b0d", foreground: "#d4d8de" },
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 13,
      cursorBlink: true,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(containerRef.current);
    fit.fit();
    termRef.current = term;

    let unsubData: (() => void) | undefined;
    let unsubExit: (() => void) | undefined;

    (async () => {
      const result = await window.ide.terminal.create(projectRoot ?? "");
      if (!result.ok) {
        setNotice(
          `Terminal shell isn't available yet: ${result.reason}. Run "npx electron-rebuild" after ` +
            `npm install to build node-pty's native binding for your Electron version, then reopen this panel.`
        );
        return;
      }
      sessionId.current = result.id!;
      unsubData = window.ide.terminal.onData((id, data) => {
        if (id === sessionId.current) term.write(data);
      });
      unsubExit = window.ide.terminal.onExit((id) => {
        if (id === sessionId.current) term.write("\r\n[process exited]\r\n");
      });
      term.onData((data) => {
        if (sessionId.current) window.ide.terminal.write(sessionId.current, data);
      });
    })();

    const resizeObserver = new ResizeObserver(() => {
      fit.fit();
      if (sessionId.current) window.ide.terminal.resize(sessionId.current, term.cols, term.rows);
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      unsubData?.();
      unsubExit?.();
      resizeObserver.disconnect();
      if (sessionId.current) window.ide.terminal.kill(sessionId.current);
      term.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectRoot]);

  return (
    <div className="h-full bg-base-950 flex flex-col">
      <div className="px-3 py-1.5 text-xs uppercase tracking-wide text-slate-400 border-b border-base-700">
        Terminal
      </div>
      {notice && (
        <div className="mx-3 mt-2 text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/40 rounded p-2">
          {notice}
        </div>
      )}
      <div ref={containerRef} className="flex-1 px-2 py-1" />
    </div>
  );
}
