import InstrumentCard from '../components/InstrumentCard';

export default function Home() {
  return (
    <div className="flex flex-row w-screen h-screen overflow-hidden">
      {/* Sidebar is rendered by the layout, so just leave space for it */}
      <div className="flex-1 h-full relative">
        <InstrumentCard />
      </div>
    </div>
  );
}
