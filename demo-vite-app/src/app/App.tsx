// src/app/App.tsx

import AppProviders from "./AppProviders";
import FourPanelLayout from "../ui/layout/FourPanelLayout";

import Header from "../ui/layout/Header";

import FormPanel from "../ui/panels/FormPanel";
import CodePanel from "../ui/panels/CodePanel";
import SchemaPanel from "../ui/panels/SchemaPanel";
import ResultPanel from "../ui/panels/ResultPanel";
import TutorialControls from "../ui/controls/TutorialControls";
import VisualDiff from "../ui/common/VisualDiff";

import { Globe, Github } from "lucide-react";

/**
 * Root app shell.
 *
 * This file is intentionally "dumb":
 * - Providers wire the tutorial + persistx runtime
 * - Layout renders the panels
 * - Panels read/write via TutorialContext
 */
export default function App() {
  return (
    <AppProviders>
      <div className="min-h-dvh bg-zinc-50">
        <Header />

        <main className="mx-auto max-w-7xl px-4 pb-10 pt-6">
          <div className="mb-4">
            <TutorialControls />
          </div>

          <div className="mb-4">
            <VisualDiff />
          </div>

          <FourPanelLayout
            a={<FormPanel />}
            b={<CodePanel />}
            c={<SchemaPanel />}
            d={<ResultPanel />}
          />
        </main>

        <footer className="mx-auto max-w-7xl px-4 pb-10 pt-6 text-center text-xs text-zinc-500">
          <div className="flex flex-col items-center gap-3">
            <div>
              PersistX is a contract layer — schema evolution should be boring, safe, and reviewable.
            </div>

            <div className="flex items-center gap-4 text-zinc-400">
              <a
                href="https://www.yeshanperera.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition hover:text-zinc-700"
              >
                <Globe className="h-3.5 w-3.5" />
                <span>yeshanperera.com</span>
              </a>

              <a
                href="https://github.com/yeshansachithak"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 transition hover:text-zinc-700"
              >
                <Github className="h-3.5 w-3.5" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </AppProviders>
  );
}
