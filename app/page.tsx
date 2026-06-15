"use client";

import { useDeck } from "@/lib/store";
import { DemoClock } from "@/components/DemoClock";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import { Topbar } from "@/components/Topbar";
import { LeadDrawer } from "@/components/LeadDrawer";
import { DeckView } from "@/components/views/DeckView";
import { LeadsView } from "@/components/views/LeadsView";
import { CallsView } from "@/components/views/CallsView";
import { WhatsAppView } from "@/components/views/WhatsAppView";
import { EmailsView } from "@/components/views/EmailsView";
import { SettingsView } from "@/components/views/SettingsView";
import { PipelineBoard } from "@/components/deck/PipelineBoard";
import { HQView } from "@/components/views/HQView";
import { MarketingView } from "@/components/views/MarketingView";
import { EngineeringView } from "@/components/views/EngineeringView";
import { BoardView } from "@/components/views/BoardView";
import { HRView } from "@/components/views/HRView";

export default function Page() {
  const area = useDeck((s) => s.area);
  const view = useDeck((s) => s.view);

  return (
    <div className="flex min-h-screen bg-bg">
      <div className="aurora pointer-events-none fixed inset-0" />
      <div className="pointer-events-none fixed inset-0 bg-grid-faint bg-[size:48px_48px] opacity-[0.18]" />
      <div className="pointer-events-none fixed inset-0 bg-radial-deck" />

      <DemoClock />
      <Sidebar />
      <MobileNav />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-5">
          {area === "hq" && <HQView />}

          {area === "comercial" && (
            <>
              {view === "deck" && <DeckView />}
              {view === "pipeline" && <PipelineBoard />}
              {view === "leads" && <LeadsView />}
              {view === "calls" && <CallsView />}
              {view === "whatsapp" && <WhatsAppView />}
              {view === "emails" && <EmailsView />}
              {view === "settings" && <SettingsView />}
            </>
          )}

          {area === "marketing" && <MarketingView />}
          {area === "ingenieria" && <EngineeringView />}
          {area === "directiva" && <BoardView />}
          {area === "rrhh" && <HRView />}
        </main>
      </div>

      <LeadDrawer />
    </div>
  );
}
