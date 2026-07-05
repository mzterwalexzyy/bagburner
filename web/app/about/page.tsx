import { Topbar } from "@/components/Topbar";

export default function AboutPage() {
  return (
    <div>
      <Topbar title="About" />
      <main className="p-8 max-w-2xl mx-auto space-y-4 text-sm">
        <h1 className="text-xl font-semibold">About BagBurner</h1>
        <p className="text-muted">
          BagBurner is a pay-per-call AI agent economy built for the BOT Chain Builder Challenge (AI Agent track). A
          host agent sells on-demand crypto tax analysis, and autonomous guest agents keep paying it to analyze
          wallets — all gated by real on-chain payment verification, not a shared database or API key.
        </p>
        <p className="text-muted">
          This is a mathematical analysis tool, not tax advice. Consult a qualified tax professional for your
          jurisdiction — rules vary significantly by country.
        </p>
      </main>
    </div>
  );
}
