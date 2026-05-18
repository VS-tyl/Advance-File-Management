import { GlassButton, GlassDock, GlassFilter } from "@/components/ui/liquid-glass";

const dockIcons = [
  {
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=256&q=80&auto=format&fit=crop",
    alt: "Code",
  },
  {
    src: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?w=256&q=80&auto=format&fit=crop",
    alt: "Analytics",
  },
  {
    src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=256&q=80&auto=format&fit=crop",
    alt: "Team",
  },
  {
    src: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=256&q=80&auto=format&fit=crop",
    alt: "Dashboard",
  },
  {
    src: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=256&q=80&auto=format&fit=crop",
    alt: "Workspace",
  },
  {
    src: "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?w=256&q=80&auto=format&fit=crop",
    alt: "Files",
  },
];

const DemoOne = () => {
  return (
    <div
      className="min-h-screen h-full flex items-center justify-center font-light relative overflow-hidden w-full"
      style={{
        background:
          'url("https://images.unsplash.com/photo-1432251407527-504a6b4174a2?q=80&w=1480&auto=format&fit=crop") center center / cover',
        animation: "moveBackground 60s linear infinite",
      }}
    >
      <GlassFilter />

      <div className="flex flex-col gap-6 items-center justify-center w-full">
        <GlassDock icons={dockIcons} href="https://x.com/notsurajgaud" />

        <GlassButton href="https://x.com/notsurajgaud">
          <div className="text-xl text-white">
            <p>How can I help you today?</p>
          </div>
        </GlassButton>
      </div>
    </div>
  );
};

export { DemoOne };

