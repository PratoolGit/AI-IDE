import { useState } from "react";
import { Folder, FolderOpen, FileCode2, ChevronRight, ChevronDown } from "lucide-react";
import type { FileNode } from "../../../electron/ipc/fs";
import { useAppStore } from "../../stores/appStore";

function Node({ node, depth }: { node: FileNode; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileNode[] | null>(null);
  const openFile = useAppStore((s) => s.openFile);

  async function toggle() {
    if (node.isDirectory) {
      if (!expanded && children === null) {
        const kids = await window.ide.fs.readDir(node.path);
        setChildren(kids);
      }
      setExpanded(!expanded);
    } else {
      const content = await window.ide.fs.readFile(node.path);
      openFile(node.path, content);
    }
  }

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1 text-sm hover:bg-base-800 rounded cursor-pointer select-none"
        style={{ paddingLeft: depth * 14 + 8 }}
        onClick={toggle}
      >
        {node.isDirectory ? (
          expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
        ) : (
          <span className="w-[14px]" />
        )}
        {node.isDirectory ? (
          expanded ? <FolderOpen size={15} className="text-accent-dim" /> : <Folder size={15} className="text-accent-dim" />
        ) : (
          <FileCode2 size={15} className="text-slate-400" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {node.isDirectory && expanded && children && (
        <div>
          {children.map((child) => (
            <Node key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const { projectRoot, fileTree, setProject } = useAppStore();

  async function openProject() {
    const result = await window.ide.fs.openProjectDialog();
    if (result) setProject(result.root, result.tree);
  }

  return (
    <div className="h-full flex flex-col bg-base-900 border-r border-base-700">
      <div className="flex items-center justify-between px-3 py-2 border-b border-base-700">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Explorer</span>
        <button
          onClick={openProject}
          className="text-xs px-2 py-1 rounded bg-base-800 hover:bg-base-700 text-slate-300"
        >
          Open
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {!projectRoot && (
          <div className="text-xs text-slate-500 px-3 py-4">
            No project open. Click <span className="text-slate-300">Open</span> to pick a folder.
          </div>
        )}
        {fileTree.map((node) => (
          <Node key={node.path} node={node} depth={0} />
        ))}
      </div>
    </div>
  );
}
