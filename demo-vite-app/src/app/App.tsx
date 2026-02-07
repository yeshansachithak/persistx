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

/**
 * Root app shell.
 *
 * This file is intentionally "dumb":
 * - Providers wire the tutorial + persistx runtime
 * - Layout renders the 4 panels
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
          PersistX is a contract layer — schema evolution should be boring, safe, and reviewable.
        </footer>
      </div>
    </AppProviders>
  );
}
