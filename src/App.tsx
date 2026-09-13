import { useState } from "react";
import { TopBar } from "./components/TopBar/TopBar";
import { FileTree } from "./components/Sidebar/FileTree";
import { EditorPane } from "./components/Editor/EditorPane";
import { TerminalPanel } from "./components/Terminal/TerminalPanel";
import { ChatPanel } from "./components/Chat/ChatPanel";
import { SettingsPanel } from "./components/Settings/SettingsPanel";

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showTerminal, setShowTerminal] = useState(true);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-56 shrink-0">
          <FileTree />
        </div>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden">
            <EditorPane />
          </div>
          {showTerminal && (
            <div className="h-56 shrink-0 border-t border-base-700">
              <TerminalPanel />
            </div>
          )}
        </div>
        <div className="w-96 shrink-0">
          <ChatPanel />
        </div>
      </div>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
